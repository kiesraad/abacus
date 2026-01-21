use sqlx::SqliteConnection;

use crate::{
    APIError,
    api::adapters::CommitteeSessionStatusQueriesAdapter,
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionFilesUpdateRequest},
        committee_session_status::CommitteeSessionStatus,
    },
    infra::audit_log::{AuditEvent, AuditService},
    repository::{committee_session_repo, file_repo},
};

async fn delete_committee_session_files(
    conn: &mut SqliteConnection,
    audit_service: AuditService,
    committee_session: CommitteeSession,
) -> Result<(), APIError> {
    let file_ids: Vec<u32> = [
        committee_session.results_eml,
        committee_session.results_pdf,
        committee_session.overview_pdf,
    ]
    .into_iter()
    .flatten()
    .collect();

    if !file_ids.is_empty() {
        committee_session_repo::change_files(
            conn,
            committee_session.id,
            CommitteeSessionFilesUpdateRequest {
                results_eml: None,
                results_pdf: None,
                overview_pdf: None,
            },
        )
        .await?;

        for id in file_ids {
            delete_file(conn, &audit_service, id).await?;
        }
    }
    Ok(())
}

pub async fn delete_file(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    id: u32,
) -> Result<(), APIError> {
    if let Some(file) = file_repo::delete(conn, id).await? {
        audit_service
            .log(conn, &AuditEvent::FileDeleted(file.into()), None)
            .await?;
    }
    Ok(())
}

pub async fn change_committee_session_status(
    tx: &mut SqliteConnection,
    committee_session_id: u32,
    status: CommitteeSessionStatus,
    audit_service: AuditService,
) -> Result<(), APIError> {
    let committee_session = committee_session_repo::get(tx, committee_session_id).await?;
    let mut queries = CommitteeSessionStatusQueriesAdapter(tx);
    let new_status = match status {
        CommitteeSessionStatus::Created => {
            committee_session
                .status
                .prepare_data_entry(&committee_session, &mut queries)
                .await?
        }
        CommitteeSessionStatus::DataEntryNotStarted => {
            committee_session
                .status
                .ready_for_data_entry(&committee_session, &mut queries)
                .await?
        }
        CommitteeSessionStatus::DataEntryInProgress => {
            committee_session.status.start_data_entry()?
        }
        CommitteeSessionStatus::DataEntryPaused => committee_session.status.pause_data_entry()?,
        CommitteeSessionStatus::DataEntryFinished => {
            committee_session
                .status
                .finish_data_entry(committee_session.id, &mut queries)
                .await?
        }
    };

    // If resuming committee session, delete all files from committee session and files tables
    if committee_session.status == CommitteeSessionStatus::DataEntryFinished
        && new_status == CommitteeSessionStatus::DataEntryInProgress
    {
        delete_committee_session_files(tx, audit_service.clone(), committee_session).await?;
    }

    let committee_session =
        committee_session_repo::change_status(tx, committee_session_id, new_status).await?;

    audit_service
        .log(
            tx,
            &AuditEvent::CommitteeSessionUpdated(committee_session.into()),
            None,
        )
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use chrono::Utc;
    use sqlx::{SqliteConnection, SqlitePool};
    use test_log::test;

    use super::*;
    use crate::infra::audit_log::{AuditService, list_event_names};

    async fn generate_test_file(conn: &mut SqliteConnection) -> Result<u32, APIError> {
        let file = file_repo::create(
            conn,
            "filename.txt".into(),
            &[97, 98, 97, 99, 117, 115, 0],
            "text/plain".into(),
            Utc::now(),
        )
        .await?;
        Ok(file.id)
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_delete_files_on_resume_no_files(pool: SqlitePool) -> Result<(), APIError> {
        let mut conn = pool.acquire().await?;
        let audit_service = AuditService::new(None, Some(Ipv4Addr::new(203, 0, 113, 0).into()));

        // DataEntryInProgress --> DataEntryFinished
        change_committee_session_status(
            &mut conn,
            6,
            CommitteeSessionStatus::DataEntryFinished,
            audit_service.clone(),
        )
        .await
        .expect("DataEntryInProgress --> DataEntryFinished");
        let session = committee_session_repo::get(&mut conn, 6).await?;
        assert_eq!(session.status, CommitteeSessionStatus::DataEntryFinished);

        // DataEntryFinished --> DataEntryInProgress
        change_committee_session_status(
            &mut conn,
            6,
            CommitteeSessionStatus::DataEntryInProgress,
            audit_service,
        )
        .await
        .expect("DataEntryFinished --> DataEntryInProgress");

        let session = committee_session_repo::get(&mut conn, 6).await?;
        assert_eq!(session.status, CommitteeSessionStatus::DataEntryInProgress);

        // No FileDeleted events should be logged
        assert_eq!(
            list_event_names(&mut conn).await?,
            ["CommitteeSessionUpdated", "CommitteeSessionUpdated"]
        );
        Ok(())
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_delete_files_on_resume_with_files(pool: SqlitePool) -> Result<(), APIError> {
        let mut conn = pool.acquire().await?;
        let audit_service = AuditService::new(None, Some(Ipv4Addr::new(203, 0, 113, 0).into()));

        // DataEntryInProgress --> DataEntryFinished
        change_committee_session_status(
            &mut conn,
            6,
            CommitteeSessionStatus::DataEntryFinished,
            audit_service.clone(),
        )
        .await?;
        let session = committee_session_repo::get(&mut conn, 6).await?;
        assert_eq!(session.status, CommitteeSessionStatus::DataEntryFinished);

        let files_update = CommitteeSessionFilesUpdateRequest {
            results_eml: Some(generate_test_file(&mut conn).await?),
            results_pdf: Some(generate_test_file(&mut conn).await?),
            overview_pdf: Some(generate_test_file(&mut conn).await?),
        };
        committee_session_repo::change_files(&mut conn, 6, files_update).await?;

        // DataEntryFinished --> DataEntryInProgress
        change_committee_session_status(
            &mut conn,
            6,
            CommitteeSessionStatus::DataEntryInProgress,
            audit_service,
        )
        .await?;
        let session = committee_session_repo::get(&mut conn, 6).await?;
        assert_eq!(session.status, CommitteeSessionStatus::DataEntryInProgress);

        assert_eq!(
            list_event_names(&mut conn).await?,
            [
                "CommitteeSessionUpdated",
                "FileDeleted",
                "FileDeleted",
                "FileDeleted",
                "CommitteeSessionUpdated",
            ]
        );
        Ok(())
    }
}
