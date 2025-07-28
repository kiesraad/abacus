use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Type};
use strum::VariantNames;
use utoipa::ToSchema;

use crate::{
    APIError,
    audit_log::{AuditEvent, AuditService},
    committee_session::{CommitteeSessionError, repository::CommitteeSessions},
    polling_station::repository::PollingStations,
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
pub enum CommitteeSessionStatus {
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
    committee_session_id: u32,
    status: CommitteeSessionStatus,
    pool: SqlitePool,
    audit_service: AuditService,
) -> Result<(), APIError> {
    let committee_sessions_repo = CommitteeSessions::new(pool.clone());
    let polling_stations_repo = PollingStations::new(pool.clone());
    let committee_session = committee_sessions_repo.get(committee_session_id).await?;
    let new_status = match status {
        CommitteeSessionStatus::Created => committee_session.status.prepare_data_entry()?,
        CommitteeSessionStatus::DataEntryNotStarted => {
            committee_session
                .status
                .ready_for_data_entry(committee_session.election_id, polling_stations_repo)
                .await?
        }
        CommitteeSessionStatus::DataEntryInProgress => {
            committee_session.status.start_data_entry()?
        }
        CommitteeSessionStatus::DataEntryPaused => committee_session.status.pause_data_entry()?,
        CommitteeSessionStatus::DataEntryFinished => {
            committee_session.status.finish_data_entry()?
        }
    };

    let committee_session = committee_sessions_repo
        .change_status(committee_session_id, new_status)
        .await?;

    audit_service
        .log(
            &AuditEvent::CommitteeSessionUpdated(committee_session.clone().into()),
            None,
        )
        .await?;

    Ok(())
}

impl CommitteeSessionStatus {
    pub fn prepare_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::DataEntryNotStarted => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryInProgress => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryPaused => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryFinished => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
        }
    }

    pub async fn ready_for_data_entry(
        self,
        election_id: u32,
        polling_stations_repo: PollingStations,
    ) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => {
                let polling_stations = polling_stations_repo.list(election_id).await?;
                if polling_stations.is_empty() {
                    Err(CommitteeSessionError::InvalidStatusTransition)
                } else {
                    Ok(CommitteeSessionStatus::DataEntryNotStarted)
                }
            }
            CommitteeSessionStatus::DataEntryNotStarted => Ok(self),
            CommitteeSessionStatus::DataEntryInProgress => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntryPaused => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntryFinished => {
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
            CommitteeSessionStatus::DataEntryPaused => {
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            }
            CommitteeSessionStatus::DataEntryFinished => {
                Ok(CommitteeSessionStatus::DataEntryInProgress)
            }
        }
    }

    pub fn pause_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionError::InvalidStatusTransition),
            CommitteeSessionStatus::DataEntryNotStarted => {
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

    pub fn finish_data_entry(self) -> Result<Self, CommitteeSessionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionError::InvalidStatusTransition),
            CommitteeSessionStatus::DataEntryNotStarted => {
                Err(CommitteeSessionError::InvalidStatusTransition)
            }
            CommitteeSessionStatus::DataEntryInProgress => {
                Ok(CommitteeSessionStatus::DataEntryFinished)
            }
            CommitteeSessionStatus::DataEntryPaused => {
                Ok(CommitteeSessionStatus::DataEntryFinished)
            }
            CommitteeSessionStatus::DataEntryFinished => Ok(self),
        }
    }
}

impl Default for CommitteeSessionStatus {
    fn default() -> Self {
        Self::Created
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use test_log::test;

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
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// Created --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_6"))))]
    async fn committee_session_status_created_to_data_entry_not_started_no_polling_stations(
        pool: SqlitePool,
    ) {
        let polling_stations_repo = PollingStations::new(pool.clone());
        assert_eq!(
            CommitteeSessionStatus::Created
                .ready_for_data_entry(6, polling_stations_repo)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// Created --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_created_to_data_entry_not_started_with_polling_stations(
        pool: SqlitePool,
    ) {
        let polling_stations_repo = PollingStations::new(pool.clone());
        assert_eq!(
            CommitteeSessionStatus::Created
                .ready_for_data_entry(2, polling_stations_repo)
                .await,
            Ok(CommitteeSessionStatus::DataEntryNotStarted)
        );
    }

    /// DataEntryNotStarted --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_not_started_to_data_entry_not_started(
        pool: SqlitePool,
    ) {
        let polling_stations_repo = PollingStations::new(pool.clone());
        assert_eq!(
            CommitteeSessionStatus::DataEntryNotStarted
                .ready_for_data_entry(2, polling_stations_repo)
                .await,
            Ok(CommitteeSessionStatus::DataEntryNotStarted)
        );
    }

    /// DataEntryInProgress --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_in_progress_to_data_entry_not_started(
        pool: SqlitePool,
    ) {
        let polling_stations_repo = PollingStations::new(pool.clone());
        assert_eq!(
            CommitteeSessionStatus::DataEntryInProgress
                .ready_for_data_entry(2, polling_stations_repo)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryPaused --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_paused_to_data_entry_not_started(
        pool: SqlitePool,
    ) {
        let polling_stations_repo = PollingStations::new(pool.clone());
        assert_eq!(
            CommitteeSessionStatus::DataEntryPaused
                .ready_for_data_entry(2, polling_stations_repo)
                .await,
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryFinished --> DataEntryNotStarted: ready for data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn committee_session_status_data_entry_finished_to_data_entry_not_started(
        pool: SqlitePool,
    ) {
        let polling_stations_repo = PollingStations::new(pool.clone());
        assert_eq!(
            CommitteeSessionStatus::DataEntryFinished
                .ready_for_data_entry(2, polling_stations_repo)
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
    #[test]
    fn committee_session_status_created_to_data_entry_finished() {
        assert_eq!(
            CommitteeSessionStatus::Created.finish_data_entry(),
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryNotStarted --> DataEntryFinished: finish_data_entry
    #[test]
    fn committee_session_status_data_entry_not_started_to_data_entry_finished() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryNotStarted.finish_data_entry(),
            Err(CommitteeSessionError::InvalidStatusTransition)
        );
    }

    /// DataEntryInProgress --> DataEntryFinished: finish_data_entry
    #[test]
    fn committee_session_status_data_entry_in_progress_to_data_entry_finished() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryInProgress.finish_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryFinished)
        );
    }

    /// DataEntryPaused --> DataEntryFinished: finish_data_entry
    #[test]
    fn committee_session_status_data_entry_paused_to_data_entry_finished() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryPaused.finish_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryFinished)
        );
    }

    /// DataEntryFinished --> DataEntryFinished: finish_data_entry
    #[test]
    fn committee_session_status_data_entry_finished_to_data_entry_finished() {
        assert_eq!(
            CommitteeSessionStatus::DataEntryFinished.finish_data_entry(),
            Ok(CommitteeSessionStatus::DataEntryFinished)
        );
    }
}
