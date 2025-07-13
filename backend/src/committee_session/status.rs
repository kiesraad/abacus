use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Type};
use std::fmt::Display;
use strum::VariantNames;
use utoipa::ToSchema;

use crate::{
    APIError,
    audit_log::{AuditEvent, AuditService},
    committee_session::{CommitteeSession, repository::CommitteeSessions},
    data_entry::repository::PollingStationResultsEntries,
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

#[derive(Debug, PartialEq, Eq)]
pub enum CommitteeSessionTransitionError {
    Invalid,
}

impl From<sqlx::Error> for CommitteeSessionTransitionError {
    fn from(_: sqlx::Error) -> Self {
        CommitteeSessionTransitionError::Invalid
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
                .ready_for_data_entry(committee_session, polling_stations_repo)
                .await?
        }
        CommitteeSessionStatus::DataEntryInProgress => {
            committee_session.status.start_data_entry()?
        }
        CommitteeSessionStatus::DataEntryPaused => committee_session.status.pause_data_entry()?,
        CommitteeSessionStatus::DataEntryFinished => {
            let polling_station_results_entries_repo =
                PollingStationResultsEntries::new(pool.clone());
            committee_session
                .status
                .finish_data_entry(
                    committee_session,
                    polling_stations_repo,
                    polling_station_results_entries_repo,
                )
                .await?
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
    pub fn prepare_data_entry(self) -> Result<Self, CommitteeSessionTransitionError> {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::DataEntryNotStarted => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryInProgress => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryPaused => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryFinished => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
        }
    }

    pub async fn ready_for_data_entry(
        self,
        committee_session: CommitteeSession,
        polling_stations_repo: PollingStations,
    ) -> Result<Self, CommitteeSessionTransitionError> {
        match self {
            CommitteeSessionStatus::Created => {
                let polling_stations = polling_stations_repo
                    .list(committee_session.election_id)
                    .await?;
                if polling_stations.is_empty() {
                    Err(CommitteeSessionTransitionError::Invalid)
                } else {
                    Ok(CommitteeSessionStatus::DataEntryNotStarted)
                }
            }
            CommitteeSessionStatus::DataEntryNotStarted => Ok(self),
            CommitteeSessionStatus::DataEntryInProgress => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
            CommitteeSessionStatus::DataEntryPaused => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
            CommitteeSessionStatus::DataEntryFinished => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
        }
    }

    pub fn start_data_entry(self) -> Result<Self, CommitteeSessionTransitionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionTransitionError::Invalid),
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

    pub fn pause_data_entry(self) -> Result<Self, CommitteeSessionTransitionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionTransitionError::Invalid),
            CommitteeSessionStatus::DataEntryNotStarted => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
            CommitteeSessionStatus::DataEntryInProgress => {
                Ok(CommitteeSessionStatus::DataEntryPaused)
            }
            CommitteeSessionStatus::DataEntryPaused => Ok(self),
            CommitteeSessionStatus::DataEntryFinished => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
        }
    }

    pub async fn finish_data_entry(
        self,
        committee_session: CommitteeSession,
        polling_stations_repo: PollingStations,
        polling_station_results_entries_repo: PollingStationResultsEntries,
    ) -> Result<Self, CommitteeSessionTransitionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionTransitionError::Invalid),
            CommitteeSessionStatus::DataEntryNotStarted => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
            CommitteeSessionStatus::DataEntryInProgress => {
                let polling_station_results = polling_station_results_entries_repo
                    .list_with_polling_stations(
                        polling_stations_repo,
                        committee_session.election_id,
                    )
                    .await?;
                if polling_station_results.is_empty() {
                    Err(CommitteeSessionTransitionError::Invalid)
                } else {
                    Ok(CommitteeSessionStatus::DataEntryFinished)
                }
            }
            CommitteeSessionStatus::DataEntryPaused => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
            CommitteeSessionStatus::DataEntryFinished => Ok(self),
        }
    }
}

impl Display for CommitteeSessionTransitionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CommitteeSessionTransitionError::Invalid => {
                write!(f, "Invalid state transition")
            }
        }
    }
}

impl Default for CommitteeSessionStatus {
    fn default() -> Self {
        Self::Created
    }
}
