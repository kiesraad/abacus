use serde::{Deserialize, Serialize};
use sqlx::{SqliteConnection, Type};
use strum::VariantNames;
use utoipa::ToSchema;

use crate::{
    APIError,
    api::committee_session::CommitteeSessionError,
    domain::{
        committee_session::{
            CommitteeSession, CommitteeSessionFilesUpdateRequest, CommitteeSessionId,
        },
        file::{FileId, delete_file},
    },
    infra::audit_log::{AuditEvent, AuditService},
    repository::committee_session_repo::{change_files, change_status, get},
};

/// Committee session status
#[derive(
    Serialize,
    Deserialize,
    VariantNames,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    ToSchema,
    Type,
    strum::Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
#[derive(Default)]
pub enum CommitteeSessionStatus {
    #[default]
    Created,
    InPreparation,
    DataEntry,
    Paused,
    Completed,
}

impl From<sqlx::Error> for CommitteeSessionError {
    fn from(_: sqlx::Error) -> Self {
        CommitteeSessionError::InvalidStatusTransition
    }
}

pub trait CommitteeSessionHasPollingStationsProvider {
    fn has_polling_stations(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
}

pub trait CommitteeSessionHasInvestigationsProvider {
    fn has_investigations(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
}

pub trait DataEntryCompleteResultsProvider {
    fn has_complete_results(
        &mut self,
        committee_session_id: CommitteeSessionId,
    ) -> impl Future<Output = Result<bool, CommitteeSessionError>>;
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
        change_files(
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

pub async fn change_committee_session_status(
    tx: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    status: CommitteeSessionStatus,
    audit_service: AuditService,
) -> Result<(), APIError> {
    let committee_session = get(tx, committee_session_id).await?;
    let new_status = match status {
        CommitteeSessionStatus::Created => {
            committee_session
                .status
                .prepare_data_entry(&committee_session, tx)
                .await?
        }
        CommitteeSessionStatus::InPreparation => {
            committee_session
                .status
                .ready_for_data_entry(&committee_session, tx)
                .await?
        }
        CommitteeSessionStatus::DataEntry => committee_session.status.start_data_entry()?,
        CommitteeSessionStatus::Paused => committee_session.status.pause_data_entry()?,
        CommitteeSessionStatus::Completed => {
            committee_session
                .status
                .finish_data_entry(&committee_session, tx)
                .await?
        }
    };

    // If resuming committee session, delete all files from committee session and files tables
    if committee_session.status == CommitteeSessionStatus::Completed
        && new_status == CommitteeSessionStatus::DataEntry
    {
        delete_committee_session_files(tx, audit_service.clone(), committee_session).await?;
    }

    let committee_session = change_status(tx, committee_session_id, new_status).await?;

    audit_service
        .log(
            tx,
            &AuditEvent::CommitteeSessionUpdated(committee_session.into()),
            None,
        )
        .await?;

    Ok(())
}

impl CommitteeSessionStatus {
    pub async fn prepare_data_entry<T>(
        self,
        committee_session: &CommitteeSession,
        provider: &mut T,
    ) -> Result<Self, CommitteeSessionError>
    where
        T: CommitteeSessionHasPollingStationsProvider + CommitteeSessionHasInvestigationsProvider,
    {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::InPreparation
            | CommitteeSessionStatus::DataEntry
            | CommitteeSessionStatus::Paused
            | CommitteeSessionStatus::Completed => {
                if !provider.has_polling_stations(committee_session.id).await?
                    || (committee_session.is_next_session()
                        && !provider.has_investigations(committee_session.id).await?)
                {
                    return Ok(CommitteeSessionStatus::Created);
                }
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn ready_for_data_entry<T>(
        self,
        committee_session: &CommitteeSession,
        provider: &mut T,
    ) -> Result<Self, CommitteeSessionError>
    where
        T: CommitteeSessionHasPollingStationsProvider + CommitteeSessionHasInvestigationsProvider,
    {
        match self {
            CommitteeSessionStatus::Created => {
                if !provider.has_polling_stations(committee_session.id).await?
                    || (committee_session.is_next_session()
                        && !provider.has_investigations(committee_session.id).await?)
                {
                    return Err(CommitteeSessionError::InvalidStatusTransition);
                }
                Ok(CommitteeSessionStatus::InPreparation)
            }
            CommitteeSessionStatus::InPreparation => Ok(self),
            CommitteeSessionStatus::DataEntry
            | CommitteeSessionStatus::Paused
            | CommitteeSessionStatus::Completed => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub fn start_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionError::InvalidStatusTransition),
            CommitteeSessionStatus::InPreparation => Ok(CommitteeSessionStatus::DataEntry),
            CommitteeSessionStatus::DataEntry => Ok(self),
            CommitteeSessionStatus::Paused | CommitteeSessionStatus::Completed => {
                Ok(CommitteeSessionStatus::DataEntry)
            }
        }
    }

    pub fn pause_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::InPreparation => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntry => Ok(CommitteeSessionStatus::Paused),
            CommitteeSessionStatus::Paused => Ok(self),
            CommitteeSessionStatus::Completed => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn finish_data_entry<T>(
        self,
        committee_session: &CommitteeSession,
        provider: &mut T,
    ) -> Result<Self, CommitteeSessionError>
    where
        T: DataEntryCompleteResultsProvider,
    {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::InPreparation => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntry | CommitteeSessionStatus::Paused => {
                if !provider.has_complete_results(committee_session.id).await? {
                    return Err(CommitteeSessionError::InvalidStatusTransition);
                }
                Ok(CommitteeSessionStatus::Completed)
            }
            CommitteeSessionStatus::Completed => Ok(self),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct HasPollingStationsOrInvestigationsMock(bool, bool);
    struct HasCompleteResultsMock(bool);

    impl CommitteeSessionHasPollingStationsProvider for HasPollingStationsOrInvestigationsMock {
        async fn has_polling_stations(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.0)
        }
    }

    impl CommitteeSessionHasInvestigationsProvider for HasPollingStationsOrInvestigationsMock {
        async fn has_investigations(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.1)
        }
    }

    impl DataEntryCompleteResultsProvider for HasCompleteResultsMock {
        async fn has_complete_results(
            &mut self,
            _: CommitteeSessionId,
        ) -> Result<bool, CommitteeSessionError> {
            Ok(self.0)
        }
    }

    mod change_committee_session_status {
        use std::net::Ipv4Addr;

        use chrono::Utc;
        use sqlx::{SqliteConnection, SqlitePool};
        use test_log::test;

        use super::*;
        use crate::{
            APIError,
            domain::file::FileId,
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
            let session = get(&mut conn, committee_session_id).await?;
            assert_eq!(session.status, CommitteeSessionStatus::Completed);

            // Completed --> DataEntry
            change_committee_session_status(
                &mut conn,
                committee_session_id,
                CommitteeSessionStatus::DataEntry,
                audit_service,
            )
            .await?;
            let session = get(&mut conn, committee_session_id).await?;
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
            let session = get(&mut conn, committee_session_id).await?;
            assert_eq!(session.status, CommitteeSessionStatus::Completed);

            let files_update = CommitteeSessionFilesUpdateRequest {
                results_eml: Some(generate_test_file(&mut conn).await?),
                results_pdf: Some(generate_test_file(&mut conn).await?),
                overview_pdf: Some(generate_test_file(&mut conn).await?),
            };
            change_files(&mut conn, committee_session_id, files_update).await?;

            // Completed --> DataEntry
            change_committee_session_status(
                &mut conn,
                committee_session_id,
                CommitteeSessionStatus::DataEntry,
                audit_service,
            )
            .await?;
            let session = get(&mut conn, committee_session_id).await?;
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

    mod status_transitions {
        use test_log::test;

        use super::*;

        #[derive(Debug)]
        enum SessionType {
            First,
            Next,
        }

        fn err() -> Result<CommitteeSessionStatus, CommitteeSessionError> {
            Err(CommitteeSessionError::InvalidStatusTransition)
        }

        fn session(session_type: &SessionType) -> CommitteeSession {
            match session_type {
                SessionType::First => CommitteeSession::first_session(),
                SessionType::Next => CommitteeSession::next_session(),
            }
        }

        #[test(tokio::test)]
        async fn prepare_data_entry() {
            use CommitteeSessionStatus::*;
            use SessionType::*;
            for (from, session_type, has_polling_stations, has_investigations, expected) in [
                // Created stays Created
                (Created, First, false, false, Ok(Created)),
                (Created, First, true, false, Ok(Created)),
                (Created, Next, true, true, Ok(Created)),
                // No polling stations
                (InPreparation, First, false, false, Ok(Created)),
                (DataEntry, First, false, false, Ok(Created)),
                (Paused, First, false, false, Ok(Created)),
                (Completed, First, false, false, Ok(Created)),
                // First session + polling stations
                (InPreparation, First, true, false, err()),
                (DataEntry, First, true, false, err()),
                (Paused, First, true, false, err()),
                (Completed, First, true, false, err()),
                // Next session + polling stations but no investigations
                (InPreparation, Next, true, false, Ok(Created)),
                (DataEntry, Next, true, false, Ok(Created)),
                (Paused, Next, true, false, Ok(Created)),
                (Completed, Next, true, false, Ok(Created)),
                // Next session + polling stations + investigations
                (InPreparation, Next, true, true, err()),
                (DataEntry, Next, true, true, err()),
                (Paused, Next, true, true, err()),
                (Completed, Next, true, true, err()),
            ] {
                assert_eq!(
                    from.prepare_data_entry(
                        &session(&session_type),
                        &mut HasPollingStationsOrInvestigationsMock(
                            has_polling_stations,
                            has_investigations
                        )
                    )
                    .await,
                    expected,
                    "{from:?} (session_type={session_type:?}, has_polling_stations={has_polling_stations}, has_investigations={has_investigations})"
                );
            }
        }

        #[test(tokio::test)]
        async fn ready_for_data_entry() {
            use CommitteeSessionStatus::*;
            use SessionType::*;
            for (from, session_type, has_polling_stations, has_investigations, expected) in [
                // Created: needs polling stations in first session
                (Created, First, false, false, err()),
                (Created, First, true, false, Ok(InPreparation)),
                // Created: needs polling stations and investigations in next session
                (Created, Next, false, false, err()),
                (Created, Next, true, false, err()),
                (Created, Next, true, true, Ok(InPreparation)),
                // InPreparation stays InPreparation
                (InPreparation, First, true, false, Ok(InPreparation)),
                (InPreparation, Next, true, true, Ok(InPreparation)),
                // DataEntry, Paused, Completed are not allowed
                (DataEntry, First, true, false, err()),
                (Paused, First, true, false, err()),
                (Completed, First, true, false, err()),
            ] {
                assert_eq!(
                    from.ready_for_data_entry(
                        &session(&session_type),
                        &mut HasPollingStationsOrInvestigationsMock(
                            has_polling_stations,
                            has_investigations
                        )
                    )
                    .await,
                    expected,
                    "{from:?} (session_type={session_type:?}, has_polling_stations={has_polling_stations}, has_investigations={has_investigations})"
                );
            }
        }

        #[test]
        fn start_data_entry() {
            use CommitteeSessionStatus::*;
            for (from, expected) in [
                (Created, err()),
                (InPreparation, Ok(DataEntry)),
                (DataEntry, Ok(DataEntry)),
                (Paused, Ok(DataEntry)),
                (Completed, Ok(DataEntry)),
            ] {
                assert_eq!(from.start_data_entry(), expected, "{from:?}");
            }
        }

        #[test]
        fn pause_data_entry() {
            use CommitteeSessionStatus::*;
            for (from, expected) in [
                (Created, err()),
                (InPreparation, err()),
                (DataEntry, Ok(Paused)),
                (Paused, Ok(Paused)),
                (Completed, err()),
            ] {
                assert_eq!(from.pause_data_entry(), expected, "{from:?}");
            }
        }

        #[test(tokio::test)]
        async fn finish_data_entry() {
            use CommitteeSessionStatus::*;
            for (from, has_complete_results, expected) in [
                // Created/InPreparation are not allowed
                (Created, false, err()),
                (Created, true, err()),
                (InPreparation, false, err()),
                (InPreparation, true, err()),
                // DataEntry/Paused needs complete results
                (DataEntry, false, err()),
                (DataEntry, true, Ok(Completed)),
                (Paused, false, err()),
                (Paused, true, Ok(Completed)),
                // Completed stays Completed
                (Completed, false, Ok(Completed)),
                (Completed, true, Ok(Completed)),
            ] {
                assert_eq!(
                    from.finish_data_entry(
                        &session(&SessionType::First),
                        &mut HasCompleteResultsMock(has_complete_results)
                    )
                    .await,
                    expected,
                    "{from:?} (first session, has_complete_results={has_complete_results})"
                );
                assert_eq!(
                    from.finish_data_entry(
                        &session(&SessionType::Next),
                        &mut HasCompleteResultsMock(has_complete_results)
                    )
                    .await,
                    expected,
                    "{from:?} (next session, has_complete_results={has_complete_results})"
                );
            }
        }
    }
}
