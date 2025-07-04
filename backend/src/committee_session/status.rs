use serde::{Deserialize, Serialize};
use sqlx::Type;
use std::fmt::Display;
use strum::VariantNames;
use utoipa::ToSchema;

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

impl CommitteeSessionStatus {
    pub fn prepare_data_entry(self) -> Result<Self, CommitteeSessionTransitionError> {
        match self {
            CommitteeSessionStatus::Created => Ok(self),
            CommitteeSessionStatus::DataEntryNotStarted => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryInProgress => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryPaused => Ok(CommitteeSessionStatus::Created),
            CommitteeSessionStatus::DataEntryFinished => Ok(CommitteeSessionStatus::Created),
        }
    }

    pub fn ready_for_data_entry(self) -> Result<Self, CommitteeSessionTransitionError> {
        match self {
            CommitteeSessionStatus::Created => Ok(self), // TODO: Check if a polling station is present
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

    pub fn finish_data_entry(self) -> Result<Self, CommitteeSessionTransitionError> {
        match self {
            CommitteeSessionStatus::Created => Err(CommitteeSessionTransitionError::Invalid),
            CommitteeSessionStatus::DataEntryNotStarted => {
                Err(CommitteeSessionTransitionError::Invalid)
            }
            CommitteeSessionStatus::DataEntryInProgress => {
                Ok(CommitteeSessionStatus::DataEntryFinished)
            } // TODO: check if all data entries are completed without errors and differences
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
