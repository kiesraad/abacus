/*
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PollingStationStatusEntry {
    pub id: u32,
    pub status: PollingStationStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    #[schema(maximum = 100)]
    /// Data entry progress between 0 and 100
    pub data_entry_progress: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub finished_at: Option<i64>,
    }
 */

use std::fmt::Display;

use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

use crate::data_entry::{entry_number::EntryNumber, DataEntry, PollingStationResults};

#[derive(Debug)]
pub enum PollingStationTransitionError {
    Invalid,
    FirstEntryAlreadyClaimed,
    SecondEntryAlreadyClaimed,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, Clone, PartialEq)]
#[serde(tag = "status", content = "state")]
pub enum PollingStationStatus {
    FirstEntryNotStarted, // First entry has not started yet
    FirstEntryInProgress(FirstEntryInProgress),
    SecondEntryNotStarted(SecondEntryNotStarted),
    SecondEntryInProgress(SecondEntryInProgress),
    EntriesNotEqual(EntriesNotEqual),
    EntryResult(EntryResult), // First and second entry are finished
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct FirstEntryInProgress {
    pub first_entry_state: DataEntry,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct SecondEntryNotStarted {
    pub finalised_first_entry: DataEntry,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct SecondEntryInProgress {
    pub finalised_first_entry: DataEntry,
    pub second_entry_state: DataEntry,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct EntriesNotEqual {
    pub first_entry: DataEntry,
    pub second_entry: DataEntry,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash, ToSchema, Type)]
pub struct EntryResult {
    pub finalised_entry: DataEntry,
}

impl PollingStationStatus {
    pub fn claim_entry(self, state: DataEntry) -> Result<Self, PollingStationTransitionError> {
        match self {
            PollingStationStatus::FirstEntryNotStarted => {
                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    first_entry_state: state,
                }))
            }
            PollingStationStatus::SecondEntryNotStarted(SecondEntryNotStarted {
                finalised_first_entry,
            }) => Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                second_entry_state: state,
            })),
            _ => Err(PollingStationTransitionError::Invalid),
        }
    }

    pub fn save_entry(self, state: DataEntry) -> Result<Self, PollingStationTransitionError> {
        match self {
            PollingStationStatus::FirstEntryInProgress(_) => {
                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    first_entry_state: state,
                }))
            }
            PollingStationStatus::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                ..
            }) => Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                second_entry_state: state,
            })),
            _ => Err(PollingStationTransitionError::Invalid),
        }
    }

    pub fn finalise_entry(self, state: DataEntry) -> Result<Self, PollingStationTransitionError> {
        match self {
            PollingStationStatus::FirstEntryInProgress(_) => {
                Ok(Self::SecondEntryNotStarted(SecondEntryNotStarted {
                    finalised_first_entry: state,
                }))
            }
            PollingStationStatus::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                second_entry_state,
            }) => {
                // TODO: Add the check implemented in #745
                if true {
                    Ok(Self::EntryResult(EntryResult {
                        finalised_entry: second_entry_state,
                    }))
                } else {
                    Ok(Self::EntriesNotEqual(EntriesNotEqual {
                        first_entry: finalised_first_entry,
                        second_entry: second_entry_state,
                    }))
                }
            }
            _ => Err(PollingStationTransitionError::Invalid),
        }
    }

    pub fn abort(self) -> Result<Self, PollingStationTransitionError> {
        match self {
            PollingStationStatus::FirstEntryInProgress(_) => {
                Ok(PollingStationStatus::FirstEntryNotStarted)
            }
            PollingStationStatus::SecondEntryNotStarted(_) => todo!(),
            PollingStationStatus::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                ..
            }) => Ok(PollingStationStatus::SecondEntryNotStarted(
                SecondEntryNotStarted {
                    finalised_first_entry,
                },
            )),
            PollingStationStatus::EntriesNotEqual(_) => {
                Ok(PollingStationStatus::FirstEntryNotStarted)
            }
            _ => Err(PollingStationTransitionError::Invalid),
        }
    }

    pub fn resolve(self, entry_number: EntryNumber) -> Result<Self, PollingStationTransitionError> {
        let PollingStationStatus::EntriesNotEqual(EntriesNotEqual {
            first_entry,
            second_entry,
        }) = self
        else {
            return Err(PollingStationTransitionError::Invalid);
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
            PollingStationStatus::FirstEntryNotStarted => 0,
            PollingStationStatus::FirstEntryInProgress(state) => state.first_entry_state.progress,
            PollingStationStatus::SecondEntryNotStarted(_) => 0,
            PollingStationStatus::SecondEntryInProgress(state) => state.second_entry_state.progress,
            PollingStationStatus::EntriesNotEqual(_) => 100,
            PollingStationStatus::EntryResult(_) => 100,
        }
    }

    pub fn get_data(&self) -> Option<PollingStationResults> {
        match self {
            PollingStationStatus::FirstEntryInProgress(state) => {
                Some(state.first_entry_state.data.clone())
            }
            PollingStationStatus::SecondEntryInProgress(state) => {
                Some(state.second_entry_state.data.clone())
            }
            PollingStationStatus::EntriesNotEqual(state) => Some(state.second_entry.data.clone()),
            PollingStationStatus::EntryResult(state) => Some(state.finalised_entry.data.clone()),
            _ => None,
        }
    }

    pub fn get_client_state(&self) -> Option<serde_json::Value> {
        match self {
            PollingStationStatus::FirstEntryInProgress(state) => {
                state.first_entry_state.client_state.clone()
            }
            PollingStationStatus::SecondEntryInProgress(state) => {
                state.second_entry_state.client_state.clone()
            }
            PollingStationStatus::EntriesNotEqual(state) => state.second_entry.client_state.clone(),
            PollingStationStatus::EntryResult(state) => state.finalised_entry.client_state.clone(),
            _ => None,
        }
    }
}

impl Display for PollingStationTransitionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PollingStationTransitionError::FirstEntryAlreadyClaimed => {
                write!(f, "First entry already claimed")
            }
            PollingStationTransitionError::SecondEntryAlreadyClaimed => {
                write!(f, "First entry already claimed")
            }
            PollingStationTransitionError::Invalid => write!(f, "Invalid state transition"),
        }
    }
}

impl Default for PollingStationStatus {
    fn default() -> Self {
        Self::FirstEntryNotStarted
    }
}
