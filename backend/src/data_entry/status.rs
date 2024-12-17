use std::fmt::Display;

use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

use crate::data_entry::{entry_number::EntryNumber, PollingStationResults};

#[derive(Debug)]
pub enum DataEntryTransitionError {
    Invalid,
    FirstEntryAlreadyClaimed,
    SecondEntryAlreadyClaimed,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone, PartialEq)]
#[serde(tag = "status", content = "state")]
pub enum DataEntryStatus {
    FirstEntryNotStarted, // First entry has not started yet
    FirstEntryInProgress(FirstEntryInProgress),
    SecondEntryNotStarted(SecondEntryNotStarted),
    SecondEntryInProgress(SecondEntryInProgress),
    EntriesNotEqual(EntriesNotEqual),
    EntryResult(EntryResult), // First and second entry are finished
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct FirstEntryInProgress {
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// Data entry for a polling station
    pub first_entry: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct SecondEntryNotStarted {
    /// Data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct SecondEntryInProgress {
    /// Data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// Data entry for a polling station
    pub second_entry: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct EntriesNotEqual {
    pub first_entry: PollingStationResults,
    pub second_entry: PollingStationResults,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct EntryResult {
    pub finalised_entry: PollingStationResults,
}

impl DataEntryStatus {
    pub fn claim_entry(
        self,
        progress: u8,
        entry: PollingStationResults,
        client_state: Option<serde_json::Value>,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryNotStarted => {
                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    progress,
                    first_entry: entry,
                    client_state,
                }))
            }
            DataEntryStatus::SecondEntryNotStarted(SecondEntryNotStarted {
                finalised_first_entry,
            }) => Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                progress,
                second_entry: entry,
                client_state,
            })),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    pub fn save_entry(
        self,
        progress: u8,
        entry: PollingStationResults,
        client_state: Option<serde_json::Value>,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(_) => {
                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    progress,
                    first_entry: entry,
                    client_state,
                }))
            }
            DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                ..
            }) => Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                progress,
                second_entry: entry,
                client_state,
            })),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    pub fn finalise_entry(self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                Ok(Self::SecondEntryNotStarted(SecondEntryNotStarted {
                    finalised_first_entry: state.first_entry,
                }))
            }
            DataEntryStatus::SecondEntryInProgress(state) => {
                // TODO: Add the check implemented in #745
                if true {
                    Ok(Self::EntryResult(EntryResult {
                        finalised_entry: state.second_entry,
                    }))
                } else {
                    Ok(Self::EntriesNotEqual(EntriesNotEqual {
                        first_entry: state.finalised_first_entry,
                        second_entry: state.second_entry,
                    }))
                }
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    pub fn delete(self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(_) => Ok(DataEntryStatus::FirstEntryNotStarted),
            DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                ..
            }) => Ok(DataEntryStatus::SecondEntryNotStarted(
                SecondEntryNotStarted {
                    finalised_first_entry,
                },
            )),
            DataEntryStatus::EntriesNotEqual(_) => Ok(DataEntryStatus::FirstEntryNotStarted),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    pub fn resolve(self, entry_number: EntryNumber) -> Result<Self, DataEntryTransitionError> {
        let DataEntryStatus::EntriesNotEqual(EntriesNotEqual {
            first_entry,
            second_entry,
        }) = self
        else {
            return Err(DataEntryTransitionError::Invalid);
        };

        match entry_number {
            EntryNumber::FirstEntry => Ok(Self::EntryResult(EntryResult {
                finalised_entry: first_entry,
            })),
            EntryNumber::SecondEntry => Ok(Self::EntryResult(EntryResult {
                finalised_entry: second_entry,
            })),
        }
    }

    pub fn get_progress(&self) -> u8 {
        match self {
            DataEntryStatus::FirstEntryNotStarted => 0,
            DataEntryStatus::FirstEntryInProgress(state) => state.progress,
            DataEntryStatus::SecondEntryNotStarted(_) => 0,
            DataEntryStatus::SecondEntryInProgress(state) => state.progress,
            DataEntryStatus::EntriesNotEqual(_) => 100,
            DataEntryStatus::EntryResult(_) => 100,
        }
    }

    pub fn get_data(&self) -> Result<&PollingStationResults, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => Ok(&state.first_entry),
            DataEntryStatus::SecondEntryInProgress(state) => Ok(&state.second_entry),
            DataEntryStatus::EntriesNotEqual(state) => Ok(&state.second_entry),
            DataEntryStatus::EntryResult(state) => Ok(&state.finalised_entry),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    pub fn get_client_state(&self) -> Option<&serde_json::Value> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => state.client_state.as_ref(),
            DataEntryStatus::SecondEntryInProgress(state) => state.client_state.as_ref(),
            _ => None,
        }
    }
}

impl Display for DataEntryTransitionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DataEntryTransitionError::FirstEntryAlreadyClaimed => {
                write!(f, "First entry already claimed")
            }
            DataEntryTransitionError::SecondEntryAlreadyClaimed => {
                write!(f, "First entry already claimed")
            }
            DataEntryTransitionError::Invalid => write!(f, "Invalid state transition"),
        }
    }
}

impl Default for DataEntryStatus {
    fn default() -> Self {
        Self::FirstEntryNotStarted
    }
}
