use sqlx::{Connection, SqliteConnection};

use crate::{
    APIError,
    domain::{
        committee_session::{
            CommitteeSession, CommitteeSessionFilesUpdateRequest, CommitteeSessionId, CommitteeSessionUpdated,
        },
        committee_session_status::CommitteeSessionStatus,
        file::{FileDeleted, FileId},
    },
    infra::audit_log::AuditService,
    repository::{committee_session_repo, file_repo},
};

pub async fn change_committee_session_status(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    status: CommitteeSessionStatus,
    audit_service: AuditService,
) -> Result<(), APIError> {
    let mut tx = conn.begin().await?;

    let committee_session = committee_session_repo::get(&mut tx, committee_session_id).await?;
    let new_status = match status {
        CommitteeSessionStatus::Created => {
            committee_session
                .status
                .prepare_data_entry(&committee_session, &mut *tx)
                .await?
        }
        CommitteeSessionStatus::InPreparation => {
            committee_session
                .status
                .ready_for_data_entry(&committee_session, &mut *tx)
                .await?
        }
        CommitteeSessionStatus::DataEntry => committee_session.status.start_data_entry()?,
        CommitteeSessionStatus::Paused => committee_session.status.pause_data_entry()?,
        CommitteeSessionStatus::Completed => {
            committee_session
                .status
                .finish_data_entry(&committee_session, &mut *tx)
                .await?
        }
    };

    // If resuming committee session, delete all files from committee session and files tables
    if committee_session.status == CommitteeSessionStatus::Completed
        && new_status == CommitteeSessionStatus::DataEntry
    {
        delete_committee_session_files(&mut tx, audit_service.clone(), committee_session).await?;
    }

    let committee_session =
        committee_session_repo::change_status(&mut tx, committee_session_id, new_status).await?;

    audit_service
        .log(
            &mut tx,
            &CommitteeSessionUpdated(committee_session.into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(())
}

async fn delete_committee_session_files(
    conn: &mut SqliteConnection,
    audit_service: AuditService,
    committee_session: CommitteeSession,
) -> Result<(), APIError> {
    let file_ids: Vec<FileId> = [
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
            if let Some(file) = file_repo::delete(conn, id).await? {
                audit_service
                    .log(conn, &FileDeleted(file.into()), None)
                    .await?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use chrono::Utc;
    use sqlx::{SqliteConnection, SqlitePool};
    use test_log::test;

    use super::*;
    use crate::{
        infra::audit_log::{AuditService, list_event_names},
        repository::file_repo,
    };

    async fn generate_test_file(conn: &mut SqliteConnection) -> Result<FileId, APIError> {
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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_delete_files_on_resume_no_files(pool: SqlitePool) -> Result<(), APIError> {
        let mut conn = pool.acquire().await?;
        let audit_service = AuditService::new(None, Some(Ipv4Addr::new(203, 0, 113, 0).into()));

        let committee_session_id = CommitteeSessionId::from(6);

        // DataEntry --> Completed
        change_committee_session_status(
            &mut conn,
            committee_session_id,
            CommitteeSessionStatus::Completed,
            audit_service.clone(),
        )
        .await?;
        let session = committee_session_repo::get(&mut conn, committee_session_id).await?;
        assert_eq!(session.status, CommitteeSessionStatus::Completed);

        // Completed --> DataEntry
        change_committee_session_status(
            &mut conn,
            committee_session_id,
            CommitteeSessionStatus::DataEntry,
            audit_service,
        )
        .await?;
        let session = committee_session_repo::get(&mut conn, committee_session_id).await?;
        assert_eq!(session.status, CommitteeSessionStatus::DataEntry);

        // No FileDeleted events should be logged
        assert_eq!(
            list_event_names(&mut conn).await?,
            ["CommitteeSessionUpdated", "CommitteeSessionUpdated"]
        );
        Ok(())
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_delete_files_on_resume_with_files(pool: SqlitePool) -> Result<(), APIError> {
        let mut conn = pool.acquire().await?;
        let audit_service = AuditService::new(None, Some(Ipv4Addr::new(203, 0, 113, 0).into()));

        let committee_session_id = CommitteeSessionId::from(6);

        // DataEntry --> Completed
        change_committee_session_status(
            &mut conn,
            committee_session_id,
            CommitteeSessionStatus::Completed,
            audit_service.clone(),
        )
        .await?;
        let session = committee_session_repo::get(&mut conn, committee_session_id).await?;
        assert_eq!(session.status, CommitteeSessionStatus::Completed);

        let files_update = CommitteeSessionFilesUpdateRequest {
            results_eml: Some(generate_test_file(&mut conn).await?),
            results_pdf: Some(generate_test_file(&mut conn).await?),
            overview_pdf: Some(generate_test_file(&mut conn).await?),
        };
        committee_session_repo::change_files(&mut conn, committee_session_id, files_update).await?;

        // Completed --> DataEntry
        change_committee_session_status(
            &mut conn,
            committee_session_id,
            CommitteeSessionStatus::DataEntry,
            audit_service,
        )
        .await?;
        let session = committee_session_repo::get(&mut conn, committee_session_id).await?;
        assert_eq!(session.status, CommitteeSessionStatus::DataEntry);

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
