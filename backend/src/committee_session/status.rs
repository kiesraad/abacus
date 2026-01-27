use serde::{Deserialize, Serialize};
use sqlx::{Connection, SqliteConnection, Type};
use strum::VariantNames;
use utoipa::ToSchema;

use super::{
    CommitteeSession, CommitteeSessionError, CommitteeSessionFilesUpdateRequest,
    CommitteeSessionId, CommitteeSessionUpdated,
    repository::{change_files, change_status, get},
};
use crate::{
    APIError,
    audit_log::AuditService,
    data_entry::repository::are_results_complete_for_committee_session,
    files::{FileId, delete_file},
    investigation::list_investigations_for_committee_session,
    polling_station,
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
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    status: CommitteeSessionStatus,
    audit_service: AuditService,
) -> Result<(), APIError> {
    let mut tx = conn.begin().await?;

    let committee_session = get(&mut tx, committee_session_id).await?;
    let new_status = match status {
        CommitteeSessionStatus::Created => {
            committee_session
                .status
                .prepare_data_entry(&mut tx, &committee_session)
                .await?
        }
        CommitteeSessionStatus::InPreparation => {
            committee_session
                .status
                .ready_for_data_entry(&mut tx, &committee_session)
                .await?
        }
        CommitteeSessionStatus::DataEntry => committee_session.status.start_data_entry()?,
        CommitteeSessionStatus::Paused => committee_session.status.pause_data_entry()?,
        CommitteeSessionStatus::Completed => {
            committee_session
                .status
                .finish_data_entry(&mut tx, &committee_session)
                .await?
        }
    };

    // If resuming committee session, delete all files from committee session and files tables
    if committee_session.status == CommitteeSessionStatus::Completed
        && new_status == CommitteeSessionStatus::DataEntry
    {
        delete_committee_session_files(&mut tx, audit_service.clone(), committee_session).await?;
    }

    let committee_session = change_status(&mut tx, committee_session_id, new_status).await?;

    audit_service
        .log(
            &mut tx,
            CommitteeSessionUpdated(committee_session.into()),
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
            CommitteeSessionStatus::InPreparation
            | CommitteeSessionStatus::DataEntry
            | CommitteeSessionStatus::Paused
            | CommitteeSessionStatus::Completed => {
                let polling_stations = polling_station::list(conn, committee_session.id).await?;
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
                let polling_stations = polling_station::list(conn, committee_session.id).await?;
                if polling_stations.is_empty() {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                } else if committee_session.is_next_session() {
                    let investigations =
                        list_investigations_for_committee_session(conn, committee_session.id)
                            .await?;
                    if investigations.is_empty() {
                        Err(CommitteeSessionError::InvalidStatusTransition)
                    } else {
                        Ok(CommitteeSessionStatus::InPreparation)
                    }
                } else {
                    Ok(CommitteeSessionStatus::InPreparation)
                }
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

    pub async fn finish_data_entry(
        self,
        conn: &mut SqliteConnection,
        committee_session: &CommitteeSession,
    ) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created | CommitteeSessionStatus::InPreparation => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntry | CommitteeSessionStatus::Paused => {
                if !are_results_complete_for_committee_session(conn, committee_session.id).await? {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                } else {
                    Ok(CommitteeSessionStatus::Completed)
                }
            }
            CommitteeSessionStatus::Completed => Ok(self),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::committee_session::repository::get;

    mod change_committee_session_status {
        use test_log::test;

        use super::{
            CommitteeSessionFilesUpdateRequest, CommitteeSessionStatus,
            change_committee_session_status, change_files, get,
        };
        use crate::{
            APIError,
            audit_log::{AuditService, list_event_names},
            committee_session::CommitteeSessionId,
            files::{self, FileId},
        };
        use chrono::Utc;
        use sqlx::{SqliteConnection, SqlitePool};
        use std::net::Ipv4Addr;

        async fn generate_test_file(conn: &mut SqliteConnection) -> Result<FileId, APIError> {
            let file = files::repository::create(
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

    mod prepare_data_entry {
        use test_log::test;

        use super::{CommitteeSessionError, CommitteeSessionStatus, get};
        use crate::{
            committee_session::CommitteeSessionId,
            investigation::{
                PollingStationInvestigationCreateRequest, create_polling_station_investigation,
            },
            polling_station::PollingStationId,
        };
        use sqlx::SqlitePool;

        /// Created --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn created_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(7)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// InPreparation --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn in_preparation_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(7)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::InPreparation
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// InPreparation --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn in_preparation_to_created_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::InPreparation
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// InPreparation --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn in_preparation_to_created_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(704)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::InPreparation
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// InPreparation --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn in_preparation_to_created_next_session_with_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::InPreparation
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntry --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn data_entry_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(7)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntry --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_to_created_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntry --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn data_entry_to_created_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(704)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// DataEntry --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_to_created_next_session_with_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Paused --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn paused_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(7)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Paused
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// Paused --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn paused_to_created_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Paused
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Paused --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn paused_to_created_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(704)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Paused
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// Paused --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn paused_to_created_next_session_with_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::Paused
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Completed --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn completed_to_created_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(7)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Completed
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// Completed --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn completed_to_created_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Completed
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Completed --> Created
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn completed_to_created_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(704)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Completed
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Created)
            );
        }

        /// Completed --> Created
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn completed_to_created_next_session_with_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::Completed
                    .prepare_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod ready_for_data_entry {
        use test_log::test;

        use super::{CommitteeSessionError, CommitteeSessionStatus, get};
        use crate::{
            committee_session::CommitteeSessionId,
            investigation::{
                PollingStationInvestigationCreateRequest, create_polling_station_investigation,
            },
            polling_station::PollingStationId,
        };
        use sqlx::SqlitePool;

        /// Created --> InPreparation
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_6_no_polling_stations")
        )))]
        async fn created_to_in_preparation_no_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(7)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Created --> InPreparation
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn created_to_in_preparation_with_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::InPreparation)
            );
        }

        /// Created --> InPreparation
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn created_to_in_preparation_next_session_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(704)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Created --> InPreparation
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn created_to_in_preparation_next_session_with_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
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
                Ok(CommitteeSessionStatus::InPreparation)
            );
        }

        /// InPreparation --> InPreparation
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn in_preparation_to_in_preparation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::InPreparation
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::InPreparation)
            );
        }

        /// DataEntry --> InPreparation
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_to_in_preparation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Paused --> InPreparation
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn paused_to_in_preparation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Paused
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// Completed --> InPreparation
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn completed_to_in_preparation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Completed
                    .ready_for_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod start_data_entry {
        use test_log::test;

        use super::{CommitteeSessionError, CommitteeSessionStatus};

        /// Created --> DataEntry
        #[test]
        fn created_to_data_entry() {
            assert_eq!(
                CommitteeSessionStatus::Created.start_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// InPreparation --> DataEntry
        #[test]
        fn in_preparation_to_data_entry() {
            assert_eq!(
                CommitteeSessionStatus::InPreparation.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntry)
            );
        }

        /// DataEntry --> DataEntry
        #[test]
        fn data_entry_to_data_entry() {
            assert_eq!(
                CommitteeSessionStatus::DataEntry.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntry)
            );
        }

        /// Paused --> DataEntry
        #[test]
        fn paused_to_data_entry() {
            assert_eq!(
                CommitteeSessionStatus::Paused.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntry)
            );
        }

        /// Completed --> DataEntry
        #[test]
        fn completed_to_data_entry() {
            assert_eq!(
                CommitteeSessionStatus::Completed.start_data_entry(),
                Ok(CommitteeSessionStatus::DataEntry)
            );
        }
    }

    mod pause_data_entry {
        use test_log::test;

        use super::{CommitteeSessionError, CommitteeSessionStatus};

        /// Created --> Paused
        #[test]
        fn created_to_paused() {
            assert_eq!(
                CommitteeSessionStatus::Created.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// InPreparation --> Paused
        #[test]
        fn in_preparation_to_paused() {
            assert_eq!(
                CommitteeSessionStatus::InPreparation.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntry --> Paused
        #[test]
        fn data_entry_to_paused() {
            assert_eq!(
                CommitteeSessionStatus::DataEntry.pause_data_entry(),
                Ok(CommitteeSessionStatus::Paused)
            );
        }

        /// Paused --> Paused
        #[test]
        fn paused_to_paused() {
            assert_eq!(
                CommitteeSessionStatus::Paused.pause_data_entry(),
                Ok(CommitteeSessionStatus::Paused)
            );
        }

        /// Completed --> Paused
        #[test]
        fn completed_to_paused() {
            assert_eq!(
                CommitteeSessionStatus::Completed.pause_data_entry(),
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }
    }

    mod finish_data_entry {
        use super::{CommitteeSessionError, CommitteeSessionStatus, get};
        use crate::{
            authentication::user::UserId,
            committee_session::CommitteeSessionId,
            data_entry::{
                PollingStationResults,
                repository::{get_or_default, get_result, insert_test_result, make_definitive},
                status::{DataEntryStatus, Definitive},
            },
            investigation::{
                PollingStationInvestigationConcludeRequest,
                PollingStationInvestigationCreateRequest, conclude_polling_station_investigation,
                create_polling_station_investigation,
            },
            polling_station::PollingStationId,
        };
        use chrono::Utc;
        use sqlx::SqlitePool;
        use test_log::test;

        /// Created --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn created_to_completed(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Created
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// InPreparation --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn in_preparation_to_completed(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(2)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::InPreparation
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntry --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn data_entry_to_completed(pool: SqlitePool) {
            let committee_session_id = CommitteeSessionId::from(2);
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, committee_session_id).await.unwrap();

            // Ensure there is some data in the results table
            insert_test_result(
                &mut conn,
                PollingStationId::from(1),
                committee_session_id,
                &PollingStationResults::empty_cso_first_session(&[]),
            )
            .await
            .unwrap();

            insert_test_result(
                &mut conn,
                PollingStationId::from(2),
                committee_session_id,
                &PollingStationResults::empty_cso_first_session(&[]),
            )
            .await
            .unwrap();

            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Completed)
            );
        }

        /// DataEntry --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_to_completed_next_session_not_completed(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntry --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_to_completed_next_session_not_completed_no_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            conclude_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationConcludeRequest {
                    findings: "Test findings".to_string(),
                    corrected_results: true,
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Err(CommitteeSessionError::InvalidStatusTransition)
            );
        }

        /// DataEntry --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_to_completed_next_session_completed(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            create_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationCreateRequest {
                    reason: "Test reason".to_string(),
                },
            )
            .await
            .unwrap();
            conclude_polling_station_investigation(
                &mut conn,
                PollingStationId::from(9),
                PollingStationInvestigationConcludeRequest {
                    findings: "Test findings".to_string(),
                    corrected_results: false,
                },
            )
            .await
            .unwrap();
            assert_eq!(
                CommitteeSessionStatus::DataEntry
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Completed)
            );
        }

        /// DataEntry --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn data_entry_to_completed_next_session_completed_with_result(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            let polling_station_id = PollingStationId::from(9);

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
            let first_session_result = get_result(
                &mut conn,
                PollingStationId::from(8),
                CommitteeSessionId::from(5),
            )
            .await
            .unwrap();
            get_or_default(&mut conn, polling_station_id, committee_session.id)
                .await
                .unwrap();
            let state = DataEntryStatus::Definitive(Definitive {
                first_entry_user_id: UserId::from(5),
                second_entry_user_id: UserId::from(6),
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
                CommitteeSessionStatus::DataEntry
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Completed)
            );
        }

        /// Paused --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn paused_to_completed(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();

            assert_eq!(
                CommitteeSessionStatus::Paused
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Completed)
            );
        }

        /// Completed --> Completed
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn completed_to_completed(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session = get(&mut conn, CommitteeSessionId::from(6)).await.unwrap();
            assert_eq!(
                CommitteeSessionStatus::Completed
                    .finish_data_entry(&mut conn, &committee_session)
                    .await,
                Ok(CommitteeSessionStatus::Completed)
            );
        }
    }
}
