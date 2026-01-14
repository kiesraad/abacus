use serde::{Deserialize, Serialize};
use sqlx::{Connection, SqliteConnection, Type};
use strum::VariantNames;
use utoipa::ToSchema;

use crate::{
    APIError,
    api::election::committee_session::CommitteeSessionError,
    domain::committee_session::{CommitteeSession, CommitteeSessionFilesUpdateRequest},
    repository::{
        committee_session_repo, file_repo,
        investigation_repo::list_investigations_for_committee_session, polling_station_repo,
    },
    service::{
        audit_log::{AuditEvent, AuditService},
        data_entry::are_results_complete_for_committee_session,
    },
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
    DataEntryNotStarted,
    DataEntryInProgress,
    DataEntryPaused,
    DataEntryFinished,
}

impl From<sqlx::Error> for CommitteeSessionError {
    fn from(_: sqlx::Error) -> Self {
        CommitteeSessionError::InvalidStatusTransition
    }
}

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
    conn: &mut SqliteConnection,
    committee_session_id: u32,
    status: CommitteeSessionStatus,
    audit_service: AuditService,
) -> Result<(), APIError> {
    let mut tx = conn.begin().await?;

    let committee_session = committee_session_repo::get(&mut tx, committee_session_id).await?;
    let new_status = match status {
        CommitteeSessionStatus::Created => {
            committee_session
                .status
                .prepare_data_entry(&mut tx, &committee_session)
                .await?
        }
        CommitteeSessionStatus::DataEntryNotStarted => {
            committee_session
                .status
                .ready_for_data_entry(&mut tx, &committee_session)
                .await?
        }
        CommitteeSessionStatus::DataEntryInProgress => {
            committee_session.status.start_data_entry()?
        }
        CommitteeSessionStatus::DataEntryPaused => committee_session.status.pause_data_entry()?,
        CommitteeSessionStatus::DataEntryFinished => {
            committee_session
                .status
                .finish_data_entry(&mut tx, &committee_session)
                .await?
        }
    };

    // If resuming committee session, delete all files from committee session and files tables
    if committee_session.status == CommitteeSessionStatus::DataEntryFinished
        && new_status == CommitteeSessionStatus::DataEntryInProgress
    {
        delete_committee_session_files(&mut tx, audit_service.clone(), committee_session).await?;
    }

    let committee_session =
        committee_session_repo::change_status(&mut tx, committee_session_id, new_status).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::CommitteeSessionUpdated(committee_session.into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(())
}

impl CommitteeSessionStatus {
    pub async fn prepare_data_entry(
        self,
        conn: &mut SqliteConnection,
        committee_session: &CommitteeSession,
    ) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::DataEntryNotStarted
            | CommitteeSessionStatus::DataEntryInProgress
            | CommitteeSessionStatus::DataEntryPaused
            | CommitteeSessionStatus::DataEntryFinished => {
                let polling_stations =
                    polling_station_repo::list(conn, committee_session.id).await?;
                if polling_stations.is_empty() {
                    return Ok(CommitteeSessionStatus::Created);
                } else if committee_session.is_next_session() {
                    let investigations =
                        list_investigations_for_committee_session(conn, committee_session.id)
                            .await?;
                    if investigations.is_empty() {
                        return Ok(CommitteeSessionStatus::Created);
                    }
                }
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn ready_for_data_entry(
        self,
        conn: &mut SqliteConnection,
        committee_session: &CommitteeSession,
    ) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => {
                let polling_stations =
                    polling_station_repo::list(conn, committee_session.id).await?;
                if polling_stations.is_empty() {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                } else if committee_session.is_next_session() {
                    let investigations =
                        list_investigations_for_committee_session(conn, committee_session.id)
                            .await?;
                    if investigations.is_empty() {
                        Err(CommitteeSessionError::InvalidStatusTransition)
                    } else {
                        Ok(CommitteeSessionStatus::DataEntryNotStarted)
                    }
                } else {
                    Ok(CommitteeSessionStatus::DataEntryNotStarted)
                }
            }
            CommitteeSessionStatus::DataEntryNotStarted => Ok(self),
            CommitteeSessionStatus::DataEntryInProgress
            | CommitteeSessionStatus::DataEntryPaused
            | CommitteeSessionStatus::DataEntryFinished => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub fn start_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionError::InvalidStatusTransition),
            CommitteeSessionStatus::DataEntryNotStarted => {
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            }
            CommitteeSessionStatus::DataEntryInProgress => Ok(self),
            CommitteeSessionStatus::DataEntryPaused | CommitteeSessionStatus::DataEntryFinished => {
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            }
        }
    }

    pub fn pause_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::DataEntryNotStarted => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntryInProgress => {
                Ok(CommitteeSessionStatus::DataEntryPaused)
            }
            CommitteeSessionStatus::DataEntryPaused => Ok(self),
            CommitteeSessionStatus::DataEntryFinished => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn finish_data_entry(
        self,
        conn: &mut SqliteConnection,
        committee_session: &CommitteeSession,
    ) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::DataEntryNotStarted => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntryInProgress
            | CommitteeSessionStatus::DataEntryPaused => {
                if !are_results_complete_for_committee_session(conn, committee_session.id).await? {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                } else {
                    Ok(CommitteeSessionStatus::DataEntryFinished)
                }
            }
            CommitteeSessionStatus::DataEntryFinished => Ok(self),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    mod change_committee_session_status {
        use std::net::Ipv4Addr;

        use chrono::Utc;
        use sqlx::{SqliteConnection, SqlitePool};
        use test_log::test;

        use super::*;
        use crate::service::audit_log::{AuditService, list_event_names};

        async fn generate_test_file(conn: &mut SqliteConnection) -> Result<u32, APIError> {
            let file = crate::repository::file_repo::create(
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

    mod prepare_data_entry {
        use sqlx::SqlitePool;
        use test_log::test;

        use super::*;
        use crate::{
            domain::investigation::PollingStationInvestigationCreateRequest,
            repository::investigation_repo::create_polling_station_investigation,
        };

        /// Created --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn created_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 7).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryNotStarted --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn data_entry_not_started_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 7).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryNotStarted --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_not_started_to_created_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryNotStarted --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn data_entry_not_started_to_created_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 704).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryNotStarted --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_not_started_to_created_next_session_with_investigation(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn data_entry_in_progress_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 7).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryInProgress --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_in_progress_to_created_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn data_entry_in_progress_to_created_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 704).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryInProgress --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_in_progress_to_created_next_session_with_investigation(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryPaused --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn data_entry_paused_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 7).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryPaused --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_paused_to_created_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryPaused --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn data_entry_paused_to_created_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 704).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryPaused --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_paused_to_created_next_session_with_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryFinished --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn data_entry_finished_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 7).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryFinished --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_finished_to_created_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryFinished --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn data_entry_finished_to_created_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 704).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntryFinished --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_finished_to_created_next_session_with_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod ready_for_data_entry {
        use sqlx::SqlitePool;
        use test_log::test;

        use crate::{
            api::election::committee_session::CommitteeSessionError,
            domain::{
                committee_session_status::CommitteeSessionStatus,
                investigation::PollingStationInvestigationCreateRequest,
            },
            repository::{
                committee_session_repo, investigation_repo::create_polling_station_investigation,
            },
        };

        /// Created --> DataEntryNotStarted
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn created_to_data_entry_not_started_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 7).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Created --> DataEntryNotStarted
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn created_to_data_entry_not_started_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::DataEntryNotStarted)
            );
        }

        /// Created --> DataEntryNotStarted
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn created_to_data_entry_not_started_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 704).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Created --> DataEntryNotStarted
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn created_to_data_entry_not_started_next_session_with_investigation(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::DataEntryNotStarted)
            );
        }

        /// DataEntryNotStarted --> DataEntryNotStarted
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_not_started_to_data_entry_not_started(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::DataEntryNotStarted)
            );
        }

        /// DataEntryInProgress --> DataEntryNotStarted
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_in_progress_to_data_entry_not_started(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryPaused --> DataEntryNotStarted
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_paused_to_data_entry_not_started(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryFinished --> DataEntryNotStarted
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_finished_to_data_entry_not_started(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod start_data_entry {
        use test_log::test;

        use crate::{
            api::election::committee_session::CommitteeSessionError,
            domain::committee_session_status::CommitteeSessionStatus,
        };

        /// Created --> DataEntryInProgress
        #[test]
        fn created_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::Created.start_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryNotStarted --> DataEntryInProgress
        #[test]
        fn data_entry_not_started_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            );
        }

        /// DataEntryInProgress --> DataEntryInProgress
        #[test]
        fn data_entry_in_progress_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            );
        }

        /// DataEntryPaused --> DataEntryInProgress
        #[test]
        fn data_entry_paused_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            );
        }

        /// DataEntryFinished --> DataEntryInProgress
        #[test]
        fn data_entry_finished_to_data_entry_in_progress() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            );
        }
    }

    mod pause_data_entry {
        use test_log::test;

        use crate::{
            api::election::committee_session::CommitteeSessionError,
            domain::committee_session_status::CommitteeSessionStatus,
        };

        /// Created --> DataEntryPaused
        #[test]
        fn created_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::Created.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryNotStarted --> DataEntryPaused
        #[test]
        fn data_entry_not_started_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> DataEntryPaused
        #[test]
        fn data_entry_in_progress_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress.pause_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryPaused)
            );
        }

        /// DataEntryPaused --> DataEntryPaused
        #[test]
        fn data_entry_paused_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused.pause_data_entry(),
                Ok(CommitteeSessionStatus::DataEntryPaused)
            );
        }

        /// DataEntryFinished --> DataEntryPaused
        #[test]
        fn data_entry_finished_to_data_entry_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod finish_data_entry {
        use chrono::Utc;
        use sqlx::SqlitePool;
        use test_log::test;

        use super::*;
        use crate::{
            domain::{
                data_entry_status::{DataEntryStatus, Definitive},
                investigation::{
                    PollingStationInvestigationConcludeRequest,
                    PollingStationInvestigationCreateRequest,
                },
                polling_station_results::PollingStationResults,
            },
            repository::{
                data_entry_repo,
                investigation_repo::{
                    conclude_polling_station_investigation, create_polling_station_investigation,
                },
                polling_station_result_repo,
            },
            service::data_entry::make_definitive,
        };

        /// Created --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn created_to_data_entry_finished(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryNotStarted --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_not_started_to_data_entry_finished(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryNotStarted
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_in_progress_to_data_entry_finished(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 2).await.unwrap();

            // Ensure there is some data in the results table
            polling_station_result_repo::insert_test_result(
                &mut conn,
                1,
                2,
                &PollingStationResults::empty_cso_first_session(&[]),
            )
            .await
            .unwrap();

            polling_station_result_repo::insert_test_result(
                &mut conn,
                2,
                2,
                &PollingStationResults::empty_cso_first_session(&[]),
            )
            .await
            .unwrap();

            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::DataEntryFinished)
            );
        }

        /// DataEntryInProgress --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_in_progress_to_data_entry_finished_next_session_not_finished(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_in_progress_to_data_entry_finished_next_session_not_finished_no_results(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            conclude_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationConcludeRequest {
                    findings: "Test findings".to_string(),
                    corrected_results: true,
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntryInProgress --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_in_progress_to_data_entry_finished_next_session_finished(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            conclude_polling_station_investigation(
                &mut conn,
                9,
                PollingStationInvestigationConcludeRequest {
                    findings: "Test findings".to_string(),
                    corrected_results: false,
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::DataEntryFinished)
            );
        }

        /// DataEntryInProgress --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_in_progress_to_data_entry_finished_next_session_finished_with_result(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            let polling_station_id = 9;

            // Add investigation with corrected results
            create_polling_station_investigation(
                &mut conn,
                polling_station_id,
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            conclude_polling_station_investigation(
                &mut conn,
                polling_station_id,
                PollingStationInvestigationConcludeRequest {
                    findings: "Test findings".to_string(),
                    corrected_results: true,
                },
            )
            .await
            .unwrap();

            // Save original result as corrected result
            let first_session_result = polling_station_result_repo::get_result(&mut conn, 8, 5)
                .await
                .unwrap();
            data_entry_repo::get_or_default(&mut conn, polling_station_id, committee_session.id)
                .await
                .unwrap();
            let state = DataEntryStatus::Definitive(Definitive {
                first_entry_user_id: 5,
                second_entry_user_id: 6,
                finished_at: Utc::now(),
                finalised_with_warnings: false,
            });
            make_definitive(
                &mut conn,
                polling_station_id,
                committee_session.id,
                &state,
                &first_session_result.data,
            )
            .await
            .unwrap();

            assert_eq!(
                CommitteeSessionStatus::DataEntryInProgress
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::DataEntryFinished)
            );
        }

        /// DataEntryPaused --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_paused_to_data_entry_finished(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();

            assert_eq!(
                CommitteeSessionStatus::DataEntryPaused
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::DataEntryFinished)
            );
        }

        /// DataEntryFinished --> DataEntryFinished
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_finished_to_data_entry_finished(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = committee_session_repo::get(&mut conn, 6).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntryFinished
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::DataEntryFinished)
            );
        }
    }
}
