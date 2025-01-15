use std::fmt::Display;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

use crate::{
    data_entry::{entry_number::EntryNumber, PollingStationResults},
    election::Election,
    polling_station::PollingStation,
};

use super::{validate_polling_station_results, DataError, ValidationResults};

#[derive(Debug, PartialEq, Eq)]
pub enum DataEntryTransitionError {
    Invalid,
    EntryAlreadyClaimed,
    EntryAlreadyFinalised,
    ValidatorError(DataError),
    ValidationError(ValidationResults),
}

impl From<DataError> for DataEntryTransitionError {
    fn from(err: DataError) -> Self {
        Self::ValidatorError(err)
    }
}

impl From<ValidationResults> for DataEntryTransitionError {
    fn from(err: ValidationResults) -> Self {
        Self::ValidationError(err)
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(tag = "status", content = "state")]
pub enum DataEntryStatus {
    FirstEntryNotStarted, // First entry has not started yet
    FirstEntryInProgress(FirstEntryInProgress),
    SecondEntryNotStarted(SecondEntryNotStarted),
    SecondEntryInProgress(SecondEntryInProgress),
    EntriesDifferent(EntriesDifferent),
    Definitive(Definitive), // First and second entry are finished
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum DataEntryStatusName {
    FirstEntryNotStarted,
    FirstEntryInProgress,
    SecondEntryNotStarted,
    SecondEntryInProgress,
    EntriesDifferent,
    Definitive,
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

#[derive(Debug, Default, Serialize, Deserialize, Clone, Type, Eq, PartialEq)]
#[serde(transparent)]
pub struct ClientState(pub Option<serde_json::Value>);

impl ClientState {
    pub fn as_ref(&self) -> Option<&serde_json::Value> {
        self.0.as_ref()
    }

    pub fn new_from_str(s: Option<&str>) -> Result<ClientState, serde_json::Error> {
        let res = s.map(serde_json::from_str).transpose()?;
        Ok(ClientState(res))
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct SecondEntryNotStarted {
    /// Data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct SecondEntryInProgress {
    /// Data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
    /// When the first entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
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
pub struct EntriesDifferent {
    pub first_entry: PollingStationResults,
    pub second_entry: PollingStationResults,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct Definitive {
    #[schema(value_type = String)]
    pub finished_at: DateTime<Utc>,
}

impl DataEntryStatus {
    /// Claim of the first entry by a specific typist
    pub fn claim_first_entry(
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
            DataEntryStatus::FirstEntryInProgress(_) => {
                Err(DataEntryTransitionError::EntryAlreadyClaimed)
            }
            DataEntryStatus::Definitive(_) => Err(DataEntryTransitionError::EntryAlreadyFinalised),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Claim of the second entry by a specific typist
    pub fn claim_second_entry(
        self,
        progress: u8,
        entry: PollingStationResults,
        client_state: ClientState,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::SecondEntryNotStarted(state) => {
                Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                    finalised_first_entry: state.finalised_first_entry,
                    first_entry_finished_at: state.first_entry_finished_at,
                    progress,
                    second_entry: entry,
                    client_state,
                }))
            }
            DataEntryStatus::SecondEntryInProgress(_) => {
                Err(DataEntryTransitionError::EntryAlreadyClaimed)
            }
            DataEntryStatus::Definitive(_) => Err(DataEntryTransitionError::EntryAlreadyFinalised),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Update the data in the first entry while it is in progress
    pub fn update_first_entry(
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
            DataEntryStatus::FirstEntryNotStarted => todo!(),
            DataEntryStatus::SecondEntryNotStarted(_)
            | DataEntryStatus::SecondEntryInProgress(_) => {
                Err(DataEntryTransitionError::EntryAlreadyFinalised)
            }
            DataEntryStatus::Definitive(_) => Err(DataEntryTransitionError::EntryAlreadyFinalised),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Update the data in the second entry while it is in progress
    pub fn update_second_entry(
        self,
        progress: u8,
        entry: PollingStationResults,
        client_state: ClientState,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                first_entry_finished_at,
                ..
            }) => Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                first_entry_finished_at,
                progress,
                second_entry: entry,
                client_state,
            })),
            DataEntryStatus::Definitive(_) => Err(DataEntryTransitionError::EntryAlreadyFinalised),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Complete the first entry and allow a second entry to be started
    pub fn finalise_first_entry(
        self,
        polling_station: &PollingStation,
        election: &Election,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                let validation_results = validate_polling_station_results(
                    &state.first_entry,
                    polling_station,
                    election,
                )?;

                if validation_results.has_errors() {
                    return Err(validation_results.into());
                }

                Ok(Self::SecondEntryNotStarted(SecondEntryNotStarted {
                    finalised_first_entry: state.first_entry,
                    first_entry_finished_at: Utc::now(),
                }))
            }
            DataEntryStatus::SecondEntryNotStarted(_)
            | DataEntryStatus::SecondEntryInProgress(_)
            | DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::EntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Complete the second entry and compare the two entries, then either
    /// make the data entry process definitive or return the conflict
    pub fn finalise_second_entry(
        self,
        polling_station: &PollingStation,
        election: &Election,
    ) -> Result<(Self, Option<PollingStationResults>), DataEntryTransitionError> {
        match self {
            DataEntryStatus::SecondEntryInProgress(state) => {
                let validation_results = validate_polling_station_results(
                    &state.second_entry,
                    polling_station,
                    election,
                )?;

                if validation_results.has_errors() {
                    return Err(validation_results.into());
                }

                if state.finalised_first_entry == state.second_entry {
                    Ok((
                        Self::Definitive(Definitive {
                            finished_at: Utc::now(),
                        }),
                        Some(state.second_entry),
                    ))
                } else {
                    Ok((
                        Self::EntriesDifferent(EntriesDifferent {
                            first_entry: state.finalised_first_entry,
                            second_entry: state.second_entry,
                        }),
                        None,
                    ))
                }
            }
            DataEntryStatus::Definitive(_) => Err(DataEntryTransitionError::EntryAlreadyFinalised),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Delete the first entry while it is in progress
    pub fn delete_first_entry(self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(_) => Ok(DataEntryStatus::FirstEntryNotStarted),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Delete the second entry while it is in progress
    pub fn delete_second_entry(self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                first_entry_finished_at,
                ..
            }) => Ok(DataEntryStatus::SecondEntryNotStarted(
                SecondEntryNotStarted {
                    finalised_first_entry,
                    first_entry_finished_at,
                },
            )),
            DataEntryStatus::Definitive(_) => Err(DataEntryTransitionError::EntryAlreadyFinalised),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Delete both entries while resolving differences
    pub fn delete_entries(self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::EntriesDifferent(_) => Ok(Self::FirstEntryNotStarted),
            DataEntryStatus::Definitive(_) => Err(DataEntryTransitionError::EntryAlreadyFinalised),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Resolve a conflicted data entry process to either the first or the
    /// second entry
    pub fn resolve(
        self,
        entry_number: EntryNumber,
    ) -> Result<(Self, PollingStationResults), DataEntryTransitionError> {
        let DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry,
            second_entry,
        }) = self
        else {
            return Err(DataEntryTransitionError::Invalid);
        };

        match entry_number {
            EntryNumber::FirstEntry => Ok((
                Self::Definitive(Definitive {
                    finished_at: Utc::now(),
                }),
                first_entry,
            )),
            EntryNumber::SecondEntry => Ok((
                Self::Definitive(Definitive {
                    finished_at: Utc::now(),
                }),
                second_entry,
            )),
        }
    }

    /// Get the progress of the first entry (if there is a first entry), from
    /// 0 - 100
    pub fn get_first_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::FirstEntryNotStarted => None,
            DataEntryStatus::FirstEntryInProgress(state) => Some(state.progress),
            _ => Some(100),
        }
    }

    /// Get the progress of the second entry (if there is a second entry),
    /// from 0 - 100
    pub fn get_second_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::FirstEntryNotStarted
            | DataEntryStatus::FirstEntryInProgress(_)
            | DataEntryStatus::SecondEntryNotStarted(_) => None,
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.progress),
            _ => Some(100),
        }
    }

    /// Get the total progress of the data entry process (from 0 - 100)
    pub fn get_progress(&self) -> u8 {
        match self {
            DataEntryStatus::FirstEntryNotStarted => 0,
            DataEntryStatus::FirstEntryInProgress(state) => state.progress,
            DataEntryStatus::SecondEntryNotStarted(_) => 0,
            DataEntryStatus::SecondEntryInProgress(state) => state.progress,
            DataEntryStatus::EntriesDifferent(_) => 100,
            DataEntryStatus::Definitive(_) => 100,
        }
    }

    /// Get the data for the current entry if there is any
    pub fn get_data(&self) -> Option<&PollingStationResults> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => Some(&state.first_entry),
            DataEntryStatus::SecondEntryInProgress(state) => Some(&state.second_entry),
            _ => None,
        }
    }

    /// Extract the client state if there is any
    pub fn get_client_state(&self) -> Option<&serde_json::Value> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => state.client_state.as_ref(),
            DataEntryStatus::SecondEntryInProgress(state) => state.client_state.as_ref(),
            _ => None,
        }
    }

    /// Get the name of the current status
    pub fn status_name(&self) -> DataEntryStatusName {
        match self {
            DataEntryStatus::FirstEntryNotStarted => DataEntryStatusName::FirstEntryNotStarted,
            DataEntryStatus::FirstEntryInProgress(_) => DataEntryStatusName::FirstEntryInProgress,
            DataEntryStatus::SecondEntryNotStarted(_) => DataEntryStatusName::SecondEntryNotStarted,
            DataEntryStatus::SecondEntryInProgress(_) => DataEntryStatusName::SecondEntryInProgress,
            DataEntryStatus::EntriesDifferent(_) => DataEntryStatusName::EntriesDifferent,
            DataEntryStatus::Definitive(_) => DataEntryStatusName::Definitive,
        }
    }

    /// Returns true if the first entry is finished
    pub fn is_first_entry_finished(&self) -> bool {
        matches!(
            self,
            DataEntryStatus::FirstEntryNotStarted | DataEntryStatus::FirstEntryInProgress(_)
        )
    }

    /// Returns the timestamp at which point this data entry process was made definitive
    pub fn finished_at(&self) -> Option<&DateTime<Utc>> {
        match self {
            DataEntryStatus::SecondEntryNotStarted(SecondEntryNotStarted {
                first_entry_finished_at,
                ..
            }) => Some(first_entry_finished_at),
            DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
                first_entry_finished_at,
                ..
            }) => Some(first_entry_finished_at),
            DataEntryStatus::Definitive(Definitive { finished_at }) => Some(finished_at),
            _ => None,
        }
    }
}

impl Display for DataEntryTransitionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DataEntryTransitionError::EntryAlreadyClaimed => {
                write!(f, "Entry already claimed")
            }
            DataEntryTransitionError::EntryAlreadyFinalised => {
                write!(f, "Entry already finalised")
            }
            DataEntryTransitionError::Invalid => write!(f, "Invalid state transition"),
            DataEntryTransitionError::ValidatorError(data_error) => {
                write!(f, "Validator error: {}", data_error)
            }
            DataEntryTransitionError::ValidationError(_) => write!(f, "Validation errors"),
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
            .claim_first_entry(progress, entry.clone(), client_state.clone())
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
            status.claim_first_entry(0, PollingStationResults::default(), ClientState::default());
        assert_eq!(
            try_new_status,
            Err(DataEntryTransitionError::EntryAlreadyClaimed)
        );
    }
}
