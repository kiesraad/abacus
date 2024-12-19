use std::fmt::Display;

use serde::{Deserialize, Serialize};
use serde_json::value::RawValue;
use sqlx::Type;
use utoipa::ToSchema;

use crate::data_entry::{entry_number::EntryNumber, PollingStationResults};

#[derive(Debug, PartialEq, Eq)]
pub enum DataEntryTransitionError {
    Invalid,
    FirstEntryAlreadyClaimed,
    SecondEntryAlreadyClaimed,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(tag = "status", content = "state")]
pub enum DataEntryStatus {
    FirstEntryNotStarted, // First entry has not started yet
    FirstEntryInProgress(FirstEntryInProgress),
    SecondEntryNotStarted(SecondEntryNotStarted),
    SecondEntryInProgress(SecondEntryInProgress),
    EntriesNotEqual(EntriesNotEqual),
    EntryResult(EntryResult), // First and second entry are finished
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
pub enum DataEntryStatusName {
    FirstEntryNotStarted,
    FirstEntryInProgress,
    SecondEntryNotStarted,
    SecondEntryInProgress,
    EntriesNotEqual,
    EntryResult,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct FirstEntryInProgress {
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// Data entry for a polling station
    pub first_entry: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone, Type)]
#[serde(transparent)]
pub struct ClientState(pub Option<Box<RawValue>>);

impl ClientState {
    pub fn as_ref(&self) -> Option<&RawValue> {
        self.0.as_ref().map(|v| v.as_ref())
    }

    pub fn new_from_str(s: Option<&str>) -> Result<ClientState, serde_json::Error> {
        let res = s
            .map(|v| RawValue::from_string(v.to_string()))
            .transpose()?;
        Ok(ClientState(res))
    }
}

impl PartialEq for ClientState {
    fn eq(&self, other: &Self) -> bool {
        self.0.as_ref().map(|v| v.get()) == other.0.as_ref().map(|v| v.get())
    }
}

impl Eq for ClientState {}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct SecondEntryNotStarted {
    /// Data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
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
    pub client_state: ClientState,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct EntriesNotEqual {
    pub first_entry: PollingStationResults,
    pub second_entry: PollingStationResults,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct EntryResult {
    pub finalised_entry: PollingStationResults,
}

impl DataEntryStatus {
    pub fn claim_entry(
        self,
        progress: u8,
        entry: PollingStationResults,
        client_state: ClientState,
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
            DataEntryStatus::FirstEntryInProgress(_) => {
                Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
            }
            DataEntryStatus::SecondEntryInProgress(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyClaimed)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    pub fn save_entry(
        self,
        progress: u8,
        entry: PollingStationResults,
        client_state: ClientState,
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

    pub fn get_first_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::FirstEntryNotStarted => None,
            DataEntryStatus::FirstEntryInProgress(state) => Some(state.progress),
            _ => Some(100),
        }
    }

    pub fn get_second_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::FirstEntryNotStarted
            | DataEntryStatus::FirstEntryInProgress(_)
            | DataEntryStatus::SecondEntryNotStarted(_) => None,
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.progress),
            _ => Some(100),
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

    /// Get the data for the current entry if there is any
    pub fn get_data(&self) -> Result<&PollingStationResults, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => Ok(&state.first_entry),
            DataEntryStatus::SecondEntryInProgress(state) => Ok(&state.second_entry),
            DataEntryStatus::EntriesNotEqual(state) => Ok(&state.second_entry),
            DataEntryStatus::EntryResult(state) => Ok(&state.finalised_entry),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Extract the client state if there is any
    pub fn get_client_state(&self) -> Option<&RawValue> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => state.client_state.as_ref(),
            DataEntryStatus::SecondEntryInProgress(state) => state.client_state.as_ref(),
            _ => None,
        }
    }

    /// Get the name of the current status as a string
    pub fn status_name(&self) -> DataEntryStatusName {
        match self {
            DataEntryStatus::FirstEntryNotStarted => DataEntryStatusName::FirstEntryNotStarted,
            DataEntryStatus::FirstEntryInProgress(_) => DataEntryStatusName::FirstEntryInProgress,
            DataEntryStatus::SecondEntryNotStarted(_) => DataEntryStatusName::SecondEntryNotStarted,
            DataEntryStatus::SecondEntryInProgress(_) => DataEntryStatusName::SecondEntryInProgress,
            DataEntryStatus::EntriesNotEqual(_) => DataEntryStatusName::EntriesNotEqual,
            DataEntryStatus::EntryResult(_) => DataEntryStatusName::EntryResult,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn can_claim_not_started() {
        let status = DataEntryStatus::FirstEntryNotStarted;
        let entry = PollingStationResults::default();
        let client_state = ClientState::new_from_str(Some("{}")).unwrap();
        let progress = 0;

        let new_status = status
            .claim_entry(progress, entry.clone(), client_state.clone())
            .unwrap();

        assert_eq!(
            new_status,
            DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
                progress,
                first_entry: entry,
                client_state
            })
        );
    }

    #[test]
    fn cannot_claim_already_claimed() {
        let mut initial_entry = PollingStationResults::default();
        initial_entry.votes_counts.votes_candidates_count = 100;
        let initial_entry = initial_entry;

        let status = DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry: initial_entry,
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        });

        let try_new_status =
            status.claim_entry(0, PollingStationResults::default(), ClientState::default());
        assert_eq!(
            try_new_status,
            Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
        );
    }
}
