use std::fmt::Display;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

use crate::{
    data_entry::PollingStationResults, election::Election, polling_station::PollingStation,
};

use super::{DataError, ValidationResults, validate_polling_station_results};

#[derive(Debug, PartialEq, Eq)]
pub enum DataEntryTransitionError {
    Invalid,
    FirstEntryAlreadyClaimed,
    SecondEntryAlreadyClaimed,
    FirstEntryAlreadyFinalised,
    SecondEntryAlreadyFinalised,
    /// An existing first/second data entry needs to be saved, finalised, or deleted by the same user
    CannotTransitionUsingDifferentUser,
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
    /// User who is doing the first data entry
    pub first_entry_user_id: u32,
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
    //// User who did the first data entry
    pub first_entry_user_id: u32,
    /// Data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct SecondEntryInProgress {
    //// User who did the first data entry
    pub first_entry_user_id: u32,
    /// Data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
    /// When the first entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// User who is doing the second data entry
    pub second_entry_user_id: u32,
    /// Data entry for a polling station
    pub second_entry: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct EntriesDifferent {
    /// User who did the first data entry
    pub first_entry_user_id: u32,
    /// User who did the second data entry
    pub second_entry_user_id: u32,
    pub first_entry: PollingStationResults,
    pub second_entry: PollingStationResults,
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    #[schema(value_type = String)]
    pub second_entry_finished_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
pub struct Definitive {
    /// User who did the first data entry
    pub first_entry_user_id: u32,
    /// User who did the second data entry
    pub second_entry_user_id: u32,
    #[schema(value_type = String)]
    pub finished_at: DateTime<Utc>,
}

/// Current data entry, used for function parameters only
#[derive(Debug)]
pub struct CurrentDataEntry {
    pub progress: Option<u8>,
    pub user_id: u32,
    pub entry: PollingStationResults,
    pub client_state: Option<ClientState>,
}

impl DataEntryStatus {
    /// Claim of the first entry by a specific typist
    pub fn claim_first_entry(
        self,
        current_data_entry: CurrentDataEntry,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryNotStarted => {
                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    progress: current_data_entry.progress.unwrap_or(0),
                    first_entry_user_id: current_data_entry.user_id,
                    first_entry: current_data_entry.entry,
                    client_state: current_data_entry.client_state.unwrap_or_default(),
                }))
            }
            DataEntryStatus::FirstEntryInProgress(_) => {
                if current_data_entry.user_id
                    == self.get_first_entry_user_id().expect("user id is present")
                {
                    Ok(self)
                } else {
                    Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
                }
            }
            DataEntryStatus::SecondEntryNotStarted(_) => {
                Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Claim of the second entry by a specific typist
    pub fn claim_second_entry(
        self,
        current_data_entry: CurrentDataEntry,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            // TODO: #698 require second data entry user to be different from first data entry user
            DataEntryStatus::SecondEntryNotStarted(state) => {
                Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                    first_entry_user_id: state.first_entry_user_id,
                    finalised_first_entry: state.finalised_first_entry,
                    first_entry_finished_at: state.first_entry_finished_at,
                    progress: current_data_entry.progress.unwrap_or(0),
                    second_entry_user_id: current_data_entry.user_id,
                    second_entry: current_data_entry.entry,
                    client_state: current_data_entry.client_state.unwrap_or_default(),
                }))
            }
            DataEntryStatus::SecondEntryInProgress(_) => {
                if current_data_entry.user_id
                    == self.get_second_entry_user_id().expect("user id is present")
                {
                    Ok(self)
                } else {
                    Err(DataEntryTransitionError::SecondEntryAlreadyClaimed)
                }
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Update the data in the first entry while it is in progress
    pub fn update_first_entry(
        self,
        current_data_entry: CurrentDataEntry,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                if state.first_entry_user_id != current_data_entry.user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    progress: current_data_entry.progress.unwrap_or(0),
                    first_entry_user_id: state.first_entry_user_id,
                    first_entry: current_data_entry.entry,
                    client_state: current_data_entry.client_state.unwrap_or_default(),
                }))
            }
            DataEntryStatus::SecondEntryNotStarted(_)
            | DataEntryStatus::SecondEntryInProgress(_) => {
                Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Update the data in the second entry while it is in progress
    pub fn update_second_entry(
        self,
        current_data_entry: CurrentDataEntry,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::SecondEntryInProgress(state) => {
                if state.second_entry_user_id != current_data_entry.user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                    first_entry_user_id: state.first_entry_user_id,
                    finalised_first_entry: state.finalised_first_entry,
                    first_entry_finished_at: state.first_entry_finished_at,
                    progress: current_data_entry.progress.unwrap_or(0),
                    second_entry_user_id: state.second_entry_user_id,
                    second_entry: current_data_entry.entry,
                    client_state: current_data_entry.client_state.unwrap_or_default(),
                }))
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Complete the first entry and allow a second entry to be started
    pub fn finalise_first_entry(
        self,
        polling_station: &PollingStation,
        election: &Election,
        user_id: u32,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                if state.first_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                let validation_results = validate_polling_station_results(
                    &state.first_entry,
                    polling_station,
                    election,
                )?;

                if validation_results.has_errors() {
                    return Err(validation_results.into());
                }

                Ok(Self::SecondEntryNotStarted(SecondEntryNotStarted {
                    first_entry_user_id: state.first_entry_user_id,
                    finalised_first_entry: state.first_entry,
                    first_entry_finished_at: Utc::now(),
                }))
            }
            DataEntryStatus::SecondEntryNotStarted(_)
            | DataEntryStatus::SecondEntryInProgress(_) => {
                Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
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
        user_id: u32,
    ) -> Result<(Self, Option<PollingStationResults>), DataEntryTransitionError> {
        match self {
            DataEntryStatus::SecondEntryInProgress(state) => {
                if state.second_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

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
                            first_entry_user_id: state.first_entry_user_id,
                            second_entry_user_id: state.second_entry_user_id,
                            finished_at: Utc::now(),
                        }),
                        Some(state.second_entry),
                    ))
                } else {
                    Ok((
                        Self::EntriesDifferent(EntriesDifferent {
                            first_entry_user_id: state.first_entry_user_id,
                            second_entry_user_id: state.second_entry_user_id,
                            first_entry: state.finalised_first_entry,
                            second_entry: state.second_entry,
                            first_entry_finished_at: state.first_entry_finished_at,
                            second_entry_finished_at: Utc::now(),
                        }),
                        None,
                    ))
                }
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Delete the first entry while it is in progress
    pub fn delete_first_entry(self, user_id: u32) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                if state.first_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                Ok(DataEntryStatus::FirstEntryNotStarted)
            }
            DataEntryStatus::SecondEntryNotStarted(_)
            | DataEntryStatus::SecondEntryInProgress(_) => {
                Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Delete the second entry while it is in progress
    pub fn delete_second_entry(self, user_id: u32) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
                finalised_first_entry,
                first_entry_finished_at,
                first_entry_user_id,
                second_entry_user_id,
                ..
            }) => {
                if second_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                Ok(DataEntryStatus::SecondEntryNotStarted(
                    SecondEntryNotStarted {
                        first_entry_user_id,
                        finalised_first_entry,
                        first_entry_finished_at,
                    },
                ))
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Delete both entries while resolving differences
    pub fn delete_entries(self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::EntriesDifferent(_) => Ok(Self::FirstEntryNotStarted),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    pub fn keep_first_entry(self) -> Result<Self, DataEntryTransitionError> {
        let DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry,
            first_entry_user_id,
            first_entry_finished_at,
            ..
        }) = self
        else {
            return Err(DataEntryTransitionError::Invalid);
        };

        Ok(Self::SecondEntryNotStarted(SecondEntryNotStarted {
            // Note that by setting the second entry to the first
            // entry, we keep the second entry and discard the first entry
            first_entry_user_id,
            finalised_first_entry: first_entry.clone(),
            first_entry_finished_at,
        }))
    }

    /// Resolve a conflicted data entry process to either the first or the
    /// second entry
    pub fn keep_second_entry(self) -> Result<Self, DataEntryTransitionError> {
        let DataEntryStatus::EntriesDifferent(EntriesDifferent {
            second_entry,
            second_entry_user_id,
            second_entry_finished_at,
            ..
        }) = self
        else {
            return Err(DataEntryTransitionError::Invalid);
        };

        Ok(Self::SecondEntryNotStarted(SecondEntryNotStarted {
            // Note that by setting the second entry to the first
            // entry, we keep the second entry and discard the first entry
            first_entry_user_id: second_entry_user_id,
            finalised_first_entry: second_entry.clone(),
            first_entry_finished_at: second_entry_finished_at,
        }))
    }

    /// Get the progress of the first entry (if there is a first entry), from 0 to 100
    pub fn get_first_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::FirstEntryNotStarted => None,
            DataEntryStatus::FirstEntryInProgress(state) => Some(state.progress),
            _ => Some(100),
        }
    }

    /// Get the progress of the second entry (if there is a second entry), from 0 to 100
    pub fn get_second_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::FirstEntryNotStarted
            | DataEntryStatus::FirstEntryInProgress(_)
            | DataEntryStatus::SecondEntryNotStarted(_) => None,
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.progress),
            _ => Some(100),
        }
    }

    /// Get the total progress of the data entry process, from 0 to 100
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

    /// Get the user ID of the first entry typist
    pub fn get_first_entry_user_id(&self) -> Option<u32> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => Some(state.first_entry_user_id),
            DataEntryStatus::SecondEntryNotStarted(state) => Some(state.first_entry_user_id),
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.first_entry_user_id),
            DataEntryStatus::EntriesDifferent(state) => Some(state.first_entry_user_id),
            DataEntryStatus::Definitive(state) => Some(state.first_entry_user_id),
            _ => None,
        }
    }

    /// Get the user ID of the second entry typist
    pub fn get_second_entry_user_id(&self) -> Option<u32> {
        match self {
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.second_entry_user_id),
            DataEntryStatus::EntriesDifferent(state) => Some(state.second_entry_user_id),
            DataEntryStatus::Definitive(state) => Some(state.second_entry_user_id),
            _ => None,
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
            DataEntryStatus::Definitive(Definitive { finished_at, .. }) => Some(finished_at),
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
                write!(f, "Second entry already claimed")
            }
            DataEntryTransitionError::SecondEntryAlreadyFinalised => {
                write!(f, "Second entry already finalised")
            }
            DataEntryTransitionError::FirstEntryAlreadyFinalised => {
                write!(f, "First entry already finalised")
            }
            DataEntryTransitionError::CannotTransitionUsingDifferentUser => {
                write!(f, "Cannot save using a different user")
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
    use crate::{
        data_entry::{CandidateVotes, PoliticalGroupVotes, VotersCounts, VotesCounts},
        election::{Candidate, Election, ElectionCategory, ElectionStatus, PoliticalGroup},
        polling_station::{PollingStation, PollingStationType},
    };
    use test_log::test;

    fn polling_station_result() -> PollingStationResults {
        PollingStationResults {
            recounted: Some(false),
            voters_counts: Default::default(),
            votes_counts: Default::default(),
            voters_recounts: None,
            differences_counts: Default::default(),
            political_group_votes: vec![],
        }
    }

    fn empty_current_data_entry() -> CurrentDataEntry {
        CurrentDataEntry {
            progress: None,
            user_id: 0,
            entry: polling_station_result(),
            client_state: None,
        }
    }

    fn polling_station() -> PollingStation {
        PollingStation {
            id: 1,
            election_id: 1,
            name: "Test polling station".to_string(),
            number: 1,
            number_of_voters: None,
            polling_station_type: Some(PollingStationType::FixedLocation),
            address: "Test street".to_string(),
            postal_code: "1234 YQ".to_string(),
            locality: "Test city".to_string(),
        }
    }

    fn election() -> Election {
        Election {
            id: 1,
            name: "Test election".to_string(),
            location: "Test location".to_string(),
            number_of_voters: 100,
            category: ElectionCategory::Municipal,
            number_of_seats: 18,
            election_date: Utc::now().date_naive(),
            nomination_date: Utc::now().date_naive(),
            status: ElectionStatus::DataEntryInProgress,
            political_groups: Some(vec![]),
        }
    }

    fn first_entry_in_progress() -> DataEntryStatus {
        DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry_user_id: 0, // Add the appropriate user ID here
            first_entry: polling_station_result(),
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        })
    }

    fn second_entry_not_started() -> DataEntryStatus {
        DataEntryStatus::SecondEntryNotStarted(SecondEntryNotStarted {
            first_entry_user_id: 0,
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: Utc::now(),
        })
    }

    fn second_entry_in_progress() -> DataEntryStatus {
        DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            first_entry_user_id: 0,
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: Utc::now(),
            progress: 0,
            second_entry_user_id: 0,
            second_entry: polling_station_result(),
            client_state: ClientState::default(),
        })
    }

    fn definitive() -> DataEntryStatus {
        DataEntryStatus::Definitive(Definitive {
            first_entry_user_id: 0,
            second_entry_user_id: 0,
            finished_at: Utc::now(),
        })
    }

    /// FirstEntryNotStarted --> FirstEntryInProgress: claim
    #[test]
    fn first_entry_not_started_to_first_entry_in_progress() {
        // Happy path
        let initial = DataEntryStatus::FirstEntryNotStarted;
        let next = initial
            .claim_first_entry(empty_current_data_entry())
            .unwrap();
        assert!(matches!(next, DataEntryStatus::FirstEntryInProgress(_)));
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: claim with same user
    #[test]
    fn first_entry_in_progress_claim_first_entry_ok() {
        let next = first_entry_in_progress().claim_first_entry(empty_current_data_entry());
        assert!(matches!(next, Ok(DataEntryStatus::FirstEntryInProgress(_))));
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: claim with different user returns error
    #[test]
    fn first_entry_in_progress_claim_first_entry_other_user_error() {
        let current_data_entry = CurrentDataEntry {
            progress: None,
            user_id: 1,
            entry: polling_station_result(),
            client_state: None,
        };
        assert_eq!(
            first_entry_in_progress().claim_first_entry(current_data_entry),
            Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
        );
    }

    #[test]
    fn definitive_claim_first_entry_error() {
        assert_eq!(
            definitive().claim_first_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn second_entry_not_started_claim_first_entry_error() {
        assert_eq!(
            second_entry_not_started().claim_first_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }

    #[test]
    fn second_entry_in_progress_claim_first_entry_error() {
        assert_eq!(
            second_entry_in_progress().claim_first_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: save
    #[test]
    fn first_entry_in_progress_to_first_entry_in_progress() {
        assert!(matches!(
            first_entry_in_progress()
                .update_first_entry(empty_current_data_entry())
                .unwrap(),
            DataEntryStatus::FirstEntryInProgress(_)
        ));
    }

    /// FirstEntryInProgress --> SecondEntryNotStarted: finalise
    #[test]
    fn first_entry_in_progress_to_second_entry_not_started() {
        // Happy path
        assert!(matches!(
            first_entry_in_progress()
                .finalise_first_entry(&polling_station(), &election(), 0)
                .unwrap(),
            DataEntryStatus::SecondEntryNotStarted(_)
        ));
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: error when updating as a different user
    #[test]
    fn first_entry_in_progress_save_as_other_user_error() {
        assert_eq!(
            first_entry_in_progress().update_first_entry(CurrentDataEntry {
                progress: None,
                user_id: 1,
                entry: polling_station_result(),
                client_state: None,
            }),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    #[test]
    fn second_entry_not_started_finalise_first_entry_error() {
        assert_eq!(
            second_entry_not_started().finalise_first_entry(&polling_station(), &election(), 0),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }

    #[test]
    fn second_entry_in_progress_finalise_first_entry_error() {
        assert_eq!(
            second_entry_in_progress().finalise_first_entry(&polling_station(), &election(), 0),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }

    #[test]
    fn definitive_finalise_first_entry_error() {
        assert_eq!(
            definitive().finalise_first_entry(&polling_station(), &election(), 0),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn finalise_first_entry_validation_error() {
        let initial = DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry_user_id: 0,
            first_entry: PollingStationResults {
                recounted: Some(true),
                ..polling_station_result()
            },
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        });
        let next = initial.finalise_first_entry(&polling_station(), &election(), 0);
        assert!(matches!(
            next,
            Err(DataEntryTransitionError::ValidatorError(_))
        ));
    }

    /// FirstEntryInProgress --> FirstEntryNotStarted: delete
    #[test]
    fn first_entry_in_progress_to_first_entry_not_started() {
        // Happy path
        assert!(matches!(
            first_entry_in_progress().delete_first_entry(0).unwrap(),
            DataEntryStatus::FirstEntryNotStarted
        ));
    }
    // Error states
    #[test]
    fn second_entry_not_started_delete_first_entry_error() {
        assert_eq!(
            second_entry_not_started().delete_first_entry(0),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }
    #[test]
    fn second_entry_in_progress_delete_first_entry_error() {
        assert_eq!(
            second_entry_in_progress().delete_first_entry(0),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }
    #[test]
    fn definitive_delete_first_entry_error() {
        assert_eq!(
            definitive().delete_first_entry(0),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    /// FirstEntryInProgress --> FirstEntryNotStarted: error when deleting as a different user
    #[test]
    fn first_entry_in_progress_delete_as_other_user_error() {
        assert_eq!(
            first_entry_in_progress().delete_first_entry(1),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// SecondEntryNotStarted --> SecondEntryInProgress: claim
    #[test]
    fn second_entry_not_started_to_second_entry_in_progress() {
        assert!(matches!(
            second_entry_not_started()
                .claim_second_entry(empty_current_data_entry())
                .unwrap(),
            DataEntryStatus::SecondEntryInProgress(_)
        ));
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: claim with same user
    #[test]
    fn second_entry_in_progress_claim_second_entry_ok() {
        let next = second_entry_in_progress().claim_second_entry(empty_current_data_entry());
        assert!(matches!(
            next,
            Ok(DataEntryStatus::SecondEntryInProgress(_))
        ));
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: claim with different user returns error
    #[test]
    fn second_entry_in_progress_claim_second_entry_other_user_error() {
        let current_data_entry = CurrentDataEntry {
            progress: None,
            user_id: 1,
            entry: polling_station_result(),
            client_state: None,
        };
        assert_eq!(
            second_entry_in_progress().claim_second_entry(current_data_entry),
            Err(DataEntryTransitionError::SecondEntryAlreadyClaimed)
        );
    }

    #[test]
    fn definitive_claim_second_entry_error() {
        assert_eq!(
            definitive().claim_second_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn first_entry_not_started_claim_second_entry_error() {
        assert_eq!(
            DataEntryStatus::FirstEntryNotStarted.claim_second_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: save
    #[test]
    fn second_entry_in_progress_to_second_entry_in_progress() {
        assert!(matches!(
            second_entry_in_progress()
                .update_second_entry(empty_current_data_entry())
                .unwrap(),
            DataEntryStatus::SecondEntryInProgress(_)
        ));
    }

    #[test]
    fn definitive_update_second_entry_error() {
        assert_eq!(
            definitive().update_second_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn first_entry_in_progress_update_second_entry_error() {
        assert_eq!(
            first_entry_in_progress().update_second_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: error when updating as a different user
    #[test]
    fn second_entry_in_progress_save_as_other_user_error() {
        assert_eq!(
            second_entry_in_progress().update_second_entry(CurrentDataEntry {
                progress: None,
                user_id: 1,
                entry: polling_station_result(),
                client_state: None,
            }),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// SecondEntryInProgress --> is_equal: finalise
    /// is_equal --> Definitive: equal? yes
    #[test]
    fn second_entry_in_progress_finalise_equal() {
        assert!(matches!(
            second_entry_in_progress()
                .finalise_second_entry(&polling_station(), &election(), 0)
                .unwrap()
                .0,
            DataEntryStatus::Definitive(_)
        ));
    }

    #[test]
    fn second_entry_in_progress_finalise_validation_error() {
        let initial = DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            progress: 0,
            second_entry_user_id: 0,
            second_entry: PollingStationResults {
                recounted: Some(true),
                ..polling_station_result()
            },
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
            first_entry_user_id: 0,
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: Utc::now(),
        });
        let next = initial.finalise_second_entry(&polling_station(), &election(), 0);
        assert!(matches!(
            next,
            Err(DataEntryTransitionError::ValidatorError(_))
        ));
    }

    /// FirstEntryInProgress --> SecondEntryNotStarted: error when finalising as a different user
    #[test]
    fn first_entry_in_progress_finalise_as_other_user_error() {
        assert_eq!(
            first_entry_in_progress().finalise_first_entry(&polling_station(), &election(), 1),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// SecondEntryInProgress --> Definitive: error when finalising as a different user
    #[test]
    fn second_entry_in_progress_finalise_as_other_user_error() {
        assert_eq!(
            second_entry_in_progress().finalise_second_entry(&polling_station(), &election(), 1),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// SecondEntryInProgress --> is_equal: finalise
    /// is_equal --> EntriesDifferent: equal? no
    #[test]
    fn second_entry_in_progress_finalise_not_equal() {
        let initial = DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            first_entry_user_id: 0,
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: Utc::now(),
            progress: 0,
            second_entry_user_id: 0,
            second_entry: PollingStationResults {
                voters_counts: VotersCounts {
                    poll_card_count: 1,
                    proxy_certificate_count: 0,
                    voter_card_count: 0,
                    total_admitted_voters_count: 1,
                },
                votes_counts: VotesCounts {
                    votes_candidates_count: 1,
                    blank_votes_count: 0,
                    invalid_votes_count: 0,
                    total_votes_cast_count: 1,
                },
                political_group_votes: vec![PoliticalGroupVotes {
                    number: 1,
                    total: 1,
                    candidate_votes: vec![CandidateVotes {
                        number: 1,
                        votes: 1,
                    }],
                }],
                ..polling_station_result()
            },
            client_state: ClientState::default(),
        });

        let next = initial
            .finalise_second_entry(
                &polling_station(),
                &Election {
                    political_groups: Some(vec![PoliticalGroup {
                        number: 1,
                        name: "Test group".to_string(),
                        candidates: vec![Candidate {
                            number: 1,
                            initials: "A.".to_string(),
                            first_name: None,
                            last_name_prefix: None,
                            last_name: "Candidate".to_string(),
                            locality: "Test locality".to_string(),
                            country_code: None,
                            gender: None,
                        }],
                    }]),
                    ..election()
                },
                0,
            )
            .unwrap();
        assert!(matches!(next.0, DataEntryStatus::EntriesDifferent(_)));
    }

    /// SecondEntryInProgress --> SecondEntryNotStarted: delete
    #[test]
    fn second_entry_in_progress_to_second_entry_not_started() {
        assert!(matches!(
            second_entry_in_progress().delete_second_entry(0).unwrap(),
            DataEntryStatus::SecondEntryNotStarted(_)
        ));
    }

    /// SecondEntryInProgress --> SecondEntryNotStarted: error when deleting as a different user
    #[test]
    fn second_entry_in_progress_delete_as_other_user_error() {
        assert_eq!(
            second_entry_in_progress().delete_second_entry(1),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    #[test]
    fn definitive_delete_second_entry_error() {
        assert_eq!(
            definitive().delete_second_entry(0),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    /// EntriesDifferent --> SecondEntryInProgress: resolve (keep first entry)
    #[test]
    fn entries_different_to_second_entry_not_started_keep_first_entry() {
        // Create a difference, so we can check that we keep the right entry
        let first_entry = polling_station_result();
        let mut second_entry = polling_station_result();
        second_entry.recounted = Some(true);

        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: polling_station_result(),
            first_entry_user_id: 0,
            second_entry: polling_station_result(),
            second_entry_user_id: 0,
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        });
        let next = initial.keep_first_entry().unwrap();

        if let DataEntryStatus::SecondEntryNotStarted(kept_entry) = next {
            assert_eq!(kept_entry.finalised_first_entry, first_entry);
            assert_ne!(kept_entry.finalised_first_entry, second_entry);
        } else {
            panic!()
        };
    }

    #[test]
    fn definitive_keep_first_entry_error() {
        assert_eq!(
            definitive().keep_first_entry(),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn entries_different_to_second_entry_not_started_keep_second_entry() {
        // Create a difference, so we can check that we keep the right entry
        let first_entry = polling_station_result();
        let mut second_entry = polling_station_result();
        second_entry.recounted = Some(true);

        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: first_entry.clone(),
            first_entry_user_id: 0,
            second_entry: second_entry.clone(),
            second_entry_user_id: 0,
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        });
        let next = initial.keep_second_entry().unwrap();

        if let DataEntryStatus::SecondEntryNotStarted(kept_entry) = next {
            assert_eq!(kept_entry.finalised_first_entry, second_entry);
            assert_ne!(kept_entry.finalised_first_entry, first_entry);
        } else {
            panic!()
        };
    }

    #[test]
    fn definitive_keep_second_entry_error() {
        assert_eq!(
            definitive().keep_second_entry(),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn entries_different_to_first_entry_not_started() {
        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: polling_station_result(),
            first_entry_user_id: 0,
            second_entry: polling_station_result(),
            second_entry_user_id: 0,
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        });
        let next = initial.delete_entries().unwrap();
        assert!(matches!(next, DataEntryStatus::FirstEntryNotStarted));
    }

    #[test]
    fn definitive_delete_entries_error() {
        assert_eq!(
            definitive().delete_entries(),
            Err(DataEntryTransitionError::Invalid)
        );
    }
}
