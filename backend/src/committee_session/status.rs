use serde::{Deserialize, Serialize};
use sqlx::{Connection, SqliteConnection, Type};
use strum::VariantNames;
use utoipa::ToSchema;

use super::{
    CommitteeSession, CommitteeSessionError, CommitteeSessionFilesUpdateRequest,
    repository::change_files,
};
use crate::{
    APIError,
    audit_log::{AuditEvent, AuditService},
    data_entry::repository::are_results_complete_for_committee_session,
    investigation::list_investigations_for_committee_session,
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

pub async fn change_committee_session_status(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
    status: CommitteeSessionStatus,
    audit_service: AuditService,
) -> Result<(), APIError> {
    let mut tx = conn.begin().await?;

    let committee_session =
        crate::committee_session::repository::get(&mut tx, committee_session_id).await?;
    let new_status = match status {
        CommitteeSessionStatus::Created => committee_session.status.prepare_data_entry()?,
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
        let file_ids: Vec<u32> = [
            committee_session.results_eml,
            committee_session.results_pdf,
            committee_session.overview_pdf,
        ]
        .into_iter()
        .flatten()
        .collect();

        if !file_ids.is_empty() {
            change_files(
                &mut tx,
                committee_session.id,
                CommitteeSessionFilesUpdateRequest {
                    results_eml: None,
                    results_pdf: None,
                    overview_pdf: None,
                },
            )
            .await?;

            for id in file_ids {
                if let Some(file) = crate::files::repository::delete_file(&mut tx, id).await? {
                    audit_service
                        .log(&mut tx, &AuditEvent::FileDeleted(file.into()), None)
                        .await?;
                }
            }
        }
    }

    let committee_session = crate::committee_session::repository::change_status(
        &mut tx,
        committee_session_id,
        new_status,
    )
    .await?;

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
    pub fn prepare_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::DataEntryNotStarted
            | CommitteeSessionStatus::DataEntryInProgress
            | CommitteeSessionStatus::DataEntryPaused
            | CommitteeSessionStatus::DataEntryFinished => Ok(CommitteeSessionStatus::Created),
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
                    crate::polling_station::repository::list(conn, committee_session.id).await?;
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
    use crate::{
        committee_session::repository::get,
        data_entry::{
            PollingStationResults,
            repository::{get_or_default, get_result, insert_test_result, make_definitive},
            status::{DataEntryStatus, Definitive},
        },
        investigation::{
            PollingStationInvestigationConcludeRequest, PollingStationInvestigationCreateRequest,
            conclude_polling_station_investigation, create_polling_station_investigation,
        },
    };
    use chrono::Utc;
    use sqlx::SqlitePool;
    use test_log::test;

    mod change_committee_session_status {
        use test_log::test;

        use crate::{
            APIError,
            audit_log::{AuditService, list_event_names},
            committee_session,
            committee_session::{
                CommitteeSessionFilesUpdateRequest,
                status::{CommitteeSessionStatus, change_committee_session_status},
            },
            files,
        };
        use sqlx::{SqliteConnection, SqlitePool};
        use std::net::Ipv4Addr;

        async fn generate_file(conn: &mut SqliteConnection) -> Result<u32, APIError> {
            let file = files::repository::create_file(
                conn,
                "filename.txt".into(),
                &[97, 98, 97, 99, 117, 115, 0],
                "text/plain".into(),
            )
            .await?;
            Ok(file.id)
        }

        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_delete_files_on_resume_no_files(pool: SqlitePool) -> Result<(), APIError> {
            let mut conn = pool.acquire().await.unwrap();
            let audit_service = AuditService::new(None, Some(Ipv4Addr::new(203, 0, 113, 0).into()));

            let session = committee_session::repository::get(&mut conn, 703).await?;
            assert_eq!(session.status, CommitteeSessionStatus::DataEntryFinished);

            change_committee_session_status(
                &mut conn,
                703,
                CommitteeSessionStatus::DataEntryInProgress,
                audit_service,
            )
            .await?;

            assert_eq!(
                list_event_names(&mut conn).await?,
                ["CommitteeSessionUpdated"]
            );
            Ok(())
        }

        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_delete_files_on_resume_with_files(pool: SqlitePool) -> Result<(), APIError> {
            let mut conn = pool.acquire().await?;
            let audit_service = AuditService::new(None, Some(Ipv4Addr::new(203, 0, 113, 0).into()));

            let session = committee_session::repository::get(&mut conn, 703).await?;
            assert_eq!(session.status, CommitteeSessionStatus::DataEntryFinished);

            let files_update = CommitteeSessionFilesUpdateRequest {
                results_eml: Some(generate_file(&mut conn).await?),
                results_pdf: Some(generate_file(&mut conn).await?),
                overview_pdf: Some(generate_file(&mut conn).await?),
            };
            committee_session::repository::change_files(&mut conn, 703, files_update).await?;

            change_committee_session_status(
                &mut conn,
                703,
                CommitteeSessionStatus::DataEntryInProgress,
                audit_service,
            )
            .await?;

            assert_eq!(
                list_event_names(&mut conn).await?,
                [
                    "FileDeleted",
                    "FileDeleted",
                    "FileDeleted",
                    "CommitteeSessionUpdated",
                ]
            );
            Ok(())
        }
    }

    /// Created --> Created: prepare_data_entry
    #[test]
    fn committee_session_status_created_to_created() {
        assert_eq!(
            CommitteeSessionStatus::Created.prepare_data_entry(),
            Ok(CommitteeSessionStatus::Created)
        );
    }

    /// DataEntryNotStarted --> Created: prepare_data_entry
    #[test]
    fn committee_session_status_data_entry_not_started_to_created() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryNotStarted.prepare_data_entry(),
            Ok(CommitteeSessionStatus::Created)
        );
    }

    /// DataEntryInProgress --> Created: prepare_data_entry
    #[test]
    fn committee_session_status_data_entry_in_progress_to_created() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryInProgress.prepare_data_entry(),
            Ok(CommitteeSessionStatus::Created)
        );
    }

    /// DataEntryPaused --> Created: prepare_data_entry
    #[test]
    fn committee_session_status_data_entry_paused_to_created() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryPaused.prepare_data_entry(),
            Ok(CommitteeSessionStatus::Created)
        );
    }

    /// DataEntryFinished --> Created: prepare_data_entry
    #[test]
    fn committee_session_status_data_entry_finished_to_created() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryFinished.prepare_data_entry(),
            Ok(CommitteeSessionStatus::Created)
        );
    }

    /// Created --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_6_no_polling_stations")
    )))]
    async fn committee_session_status_created_to_data_entry_not_started_no_polling_stations(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 7).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::Created
                .ready_for_data_entry(&mut conn, &committee_session)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// Created --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_created_to_data_entry_not_started_with_polling_stations(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 2).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::Created
                .ready_for_data_entry(&mut conn, &committee_session)
                .await,
            Ok(CommitteeSessionStatus::DataEntryNotStarted)
        );
    }

    /// Created --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn committee_session_status_created_to_data_entry_not_started_second_session_no_investigation(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 6).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::Created
                .ready_for_data_entry(&mut conn, &committee_session)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// Created --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn committee_session_status_created_to_data_entry_not_started_second_session_with_investigation(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 6).await.unwrap();
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

    /// DataEntryNotStarted --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_not_started_to_data_entry_not_started(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 2).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::DataEntryNotStarted
                .ready_for_data_entry(&mut conn, &committee_session)
                .await,
            Ok(CommitteeSessionStatus::DataEntryNotStarted)
        );
    }

    /// DataEntryInProgress --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_in_progress_to_data_entry_not_started(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 2).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::DataEntryInProgress
                .ready_for_data_entry(&mut conn, &committee_session)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryPaused --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_paused_to_data_entry_not_started(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 2).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::DataEntryPaused
                .ready_for_data_entry(&mut conn, &committee_session)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryFinished --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_finished_to_data_entry_not_started(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 2).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::DataEntryFinished
                .ready_for_data_entry(&mut conn, &committee_session)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// Created --> DataEntryInProgress: start_data_entry
    #[test]
    fn committee_session_status_created_to_data_entry_in_progress() {
        assert_eq!(
            CommitteeSessionStatus::Created.start_data_entry(),
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryNotStarted --> DataEntryInProgress: start_data_entry
    #[test]
    fn committee_session_status_data_entry_not_started_to_data_entry_in_progress() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryNotStarted.start_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryInProgress)
        );
    }

    /// DataEntryInProgress --> DataEntryInProgress: start_data_entry
    #[test]
    fn committee_session_status_data_entry_in_progress_to_data_entry_in_progress() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryInProgress.start_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryInProgress)
        );
    }

    /// DataEntryPaused --> DataEntryInProgress: start_data_entry
    #[test]
    fn committee_session_status_data_entry_paused_to_data_entry_in_progress() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryPaused.start_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryInProgress)
        );
    }

    /// DataEntryFinished --> DataEntryInProgress: start_data_entry
    #[test]
    fn committee_session_status_data_entry_finished_to_data_entry_in_progress() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryFinished.start_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryInProgress)
        );
    }

    /// Created --> DataEntryPaused: pause_data_entry
    #[test]
    fn committee_session_status_created_to_data_entry_paused() {
        assert_eq!(
            CommitteeSessionStatus::Created.pause_data_entry(),
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryNotStarted --> DataEntryPaused: pause_data_entry
    #[test]
    fn committee_session_status_data_entry_not_started_to_data_entry_paused() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryNotStarted.pause_data_entry(),
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryInProgress --> DataEntryPaused: pause_data_entry
    #[test]
    fn committee_session_status_data_entry_in_progress_to_data_entry_paused() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryInProgress.pause_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryPaused)
        );
    }

    /// DataEntryPaused --> DataEntryPaused: pause_data_entry
    #[test]
    fn committee_session_status_data_entry_paused_to_data_entry_paused() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryPaused.pause_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryPaused)
        );
    }

    /// DataEntryFinished --> DataEntryPaused: pause_data_entry
    #[test]
    fn committee_session_status_data_entry_finished_to_data_entry_paused() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryFinished.pause_data_entry(),
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// Created --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_created_to_data_entry_finished(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 2).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::Created
                .finish_data_entry(&mut conn, &committee_session)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryNotStarted --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_not_started_to_data_entry_finished(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 2).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::DataEntryNotStarted
                .finish_data_entry(&mut conn, &committee_session)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryInProgress --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_in_progress_to_data_entry_finished(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 2).await.unwrap();

        // Ensure there is some data in the results table
        insert_test_result(
            &mut conn,
            1,
            2,
            &PollingStationResults::empty_cso_first_session(&[]),
        )
        .await
        .unwrap();

        insert_test_result(
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

    /// DataEntryInProgress --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn committee_session_status_data_entry_in_progress_to_data_entry_finished_second_session_not_finished(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 6).await.unwrap();
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

    /// DataEntryInProgress --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn committee_session_status_data_entry_in_progress_to_data_entry_finished_second_session_not_finished_no_results(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 6).await.unwrap();
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

    /// DataEntryInProgress --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn committee_session_status_data_entry_in_progress_to_data_entry_finished_second_session_finished(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 6).await.unwrap();
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

    /// DataEntryInProgress --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn committee_session_status_data_entry_in_progress_to_data_entry_finished_second_session_finished_with_result(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 6).await.unwrap();
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
        let first_session_result = get_result(&mut conn, 8, 5).await.unwrap();
        get_or_default(&mut conn, polling_station_id, committee_session.id)
            .await
            .unwrap();
        let state = DataEntryStatus::Definitive(Definitive {
            first_entry_user_id: 5,
            second_entry_user_id: 6,
            finished_at: Utc::now(),
            has_warnings: false,
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

    /// DataEntryPaused --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn committee_session_status_data_entry_paused_to_data_entry_finished(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 6).await.unwrap();

        assert_eq!(
            CommitteeSessionStatus::DataEntryPaused
                .finish_data_entry(&mut conn, &committee_session)
                .await,
            Ok(CommitteeSessionStatus::DataEntryFinished)
        );
    }

    /// DataEntryFinished --> DataEntryFinished: finish_data_entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn committee_session_status_data_entry_finished_to_data_entry_finished(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let committee_session = get(&mut conn, 6).await.unwrap();
        assert_eq!(
            CommitteeSessionStatus::DataEntryFinished
                .finish_data_entry(&mut conn, &committee_session)
                .await,
            Ok(CommitteeSessionStatus::DataEntryFinished)
        );
    }
}
