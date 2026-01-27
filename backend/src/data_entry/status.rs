use std::fmt::Display;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

use super::{DataError, ValidateRoot, ValidationResults};
use crate::{
    authentication::user::UserId, data_entry::PollingStationResults,
    election::ElectionWithPoliticalGroups, polling_station::PollingStation,
};

#[derive(Debug, PartialEq, Eq)]
pub enum DataEntryTransitionError {
    Invalid,
    FirstEntryAlreadyClaimed,
    SecondEntryAlreadyClaimed,
    FirstEntryAlreadyFinalised,
    SecondEntryAlreadyFinalised,
    /// An existing first/second data entry needs to be saved, finalised, or deleted by the same user
    CannotTransitionUsingDifferentUser,
    /// The second data entry needs to be claimed by a user other than the one who claimed the first entry
    SecondEntryNeedsDifferentUser,
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
#[serde(deny_unknown_fields, tag = "status", content = "state")]
#[derive(Default)]
pub enum DataEntryStatus {
    #[default]
    Empty, // First entry has not started yet
    FirstEntryInProgress(FirstEntryInProgress),
    FirstEntryHasErrors(FirstEntryHasErrors),
    FirstEntryFinalised(FirstEntryFinalised),
    SecondEntryInProgress(SecondEntryInProgress),
    EntriesDifferent(EntriesDifferent),
    Definitive(Definitive), // First and second entry are finished
}

#[derive(Debug, Serialize, Deserialize, strum::Display, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum DataEntryStatusName {
    Empty,
    FirstEntryInProgress,
    FirstEntryHasErrors,
    FirstEntryFinalised,
    SecondEntryInProgress,
    EntriesDifferent,
    Definitive,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct FirstEntryInProgress {
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// User who is doing the first data entry
    pub first_entry_user_id: UserId,
    /// First data entry for a polling station
    pub first_entry: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone, Type, Eq, PartialEq)]
#[serde(deny_unknown_fields, transparent)]
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
#[serde(deny_unknown_fields)]
pub struct FirstEntryHasErrors {
    /// User who did the first data entry
    pub first_entry_user_id: UserId,
    /// First data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
    /// When the first data entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct FirstEntryFinalised {
    /// User who did the first data entry
    pub first_entry_user_id: UserId,
    /// First data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
    /// When the first data entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    /// Whether the first data entry was finalised with warnings
    pub finalised_with_warnings: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct SecondEntryInProgress {
    /// User who did the first data entry
    pub first_entry_user_id: UserId,
    /// First data entry for a polling station
    pub finalised_first_entry: PollingStationResults,
    /// When the first data entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// User who is doing the second data entry
    pub second_entry_user_id: UserId,
    /// Second data entry for a polling station
    pub second_entry: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct EntriesDifferent {
    /// User who did the first data entry
    pub first_entry_user_id: UserId,
    /// User who did the second data entry
    pub second_entry_user_id: UserId,
    /// First data entry for a polling station
    pub first_entry: PollingStationResults,
    /// Second data entry for a polling station
    pub second_entry: PollingStationResults,
    /// When the first data entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    /// When the second data entry was finalised
    #[schema(value_type = String)]
    pub second_entry_finished_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct Definitive {
    /// User who did the first data entry
    pub first_entry_user_id: UserId,
    /// User who did the second data entry
    pub second_entry_user_id: UserId,
    /// When both data entries were finalised
    #[schema(value_type = String)]
    pub finished_at: DateTime<Utc>,
    /// Whether the second data entry was finalised with warnings
    pub finalised_with_warnings: bool,
}

/// Current data entry, used for function parameters only
#[derive(Debug, Clone)]
pub struct CurrentDataEntry {
    pub progress: Option<u8>,
    pub user_id: UserId,
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
            DataEntryStatus::Empty => Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                progress: current_data_entry.progress.unwrap_or(0),
                first_entry_user_id: current_data_entry.user_id,
                first_entry: current_data_entry.entry,
                client_state: current_data_entry.client_state.unwrap_or_default(),
            })),
            DataEntryStatus::FirstEntryInProgress(_) => {
                if current_data_entry.user_id
                    == self.get_first_entry_user_id().expect("user id is present")
                {
                    Ok(self)
                } else {
                    Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
                }
            }
            DataEntryStatus::FirstEntryFinalised(_) => {
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
            DataEntryStatus::FirstEntryFinalised(state) => {
                if current_data_entry.user_id == state.first_entry_user_id {
                    Err(DataEntryTransitionError::SecondEntryNeedsDifferentUser)
                } else if !state
                    .finalised_first_entry
                    .is_same_model(&current_data_entry.entry)
                {
                    Err(DataEntryTransitionError::Invalid)
                } else {
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

                if !state.first_entry.is_same_model(&current_data_entry.entry) {
                    return Err(DataEntryTransitionError::Invalid);
                }

                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    progress: current_data_entry.progress.unwrap_or(0),
                    first_entry_user_id: state.first_entry_user_id,
                    first_entry: current_data_entry.entry,
                    client_state: current_data_entry.client_state.unwrap_or_default(),
                }))
            }
            DataEntryStatus::FirstEntryFinalised(_) | DataEntryStatus::SecondEntryInProgress(_) => {
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

                if !state.second_entry.is_same_model(&current_data_entry.entry) {
                    return Err(DataEntryTransitionError::Invalid);
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
        election: &ElectionWithPoliticalGroups,
        user_id: UserId,
    ) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                if state.first_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                let validation_results = self.start_validate(polling_station, election)?;

                if validation_results.has_errors() {
                    Ok(Self::FirstEntryHasErrors(FirstEntryHasErrors {
                        first_entry_user_id: state.first_entry_user_id,
                        finalised_first_entry: state.first_entry.clone(),
                        first_entry_finished_at: Utc::now(),
                    }))
                } else {
                    Ok(Self::FirstEntryFinalised(FirstEntryFinalised {
                        first_entry_user_id: state.first_entry_user_id,
                        finalised_first_entry: state.first_entry.clone(),
                        first_entry_finished_at: Utc::now(),
                        finalised_with_warnings: validation_results.has_warnings(),
                    }))
                }
            }
            DataEntryStatus::FirstEntryFinalised(_) | DataEntryStatus::SecondEntryInProgress(_) => {
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
        election: &ElectionWithPoliticalGroups,
        user_id: UserId,
    ) -> Result<(Self, Option<PollingStationResults>), DataEntryTransitionError> {
        match &self {
            DataEntryStatus::SecondEntryInProgress(state) => {
                if state.second_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                if state.finalised_first_entry == state.second_entry {
                    let validation_results = self.start_validate(polling_station, election)?;

                    if validation_results.has_errors() {
                        return Err(validation_results.into());
                    }

                    Ok((
                        Self::Definitive(Definitive {
                            first_entry_user_id: state.first_entry_user_id,
                            second_entry_user_id: state.second_entry_user_id,
                            finished_at: Utc::now(),
                            finalised_with_warnings: validation_results.has_warnings(),
                        }),
                        Some(state.second_entry.clone()),
                    ))
                } else {
                    Ok((
                        Self::EntriesDifferent(EntriesDifferent {
                            first_entry_user_id: state.first_entry_user_id,
                            second_entry_user_id: state.second_entry_user_id,
                            first_entry: state.finalised_first_entry.clone(),
                            second_entry: state.second_entry.clone(),
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
    pub fn delete_first_entry(self, user_id: UserId) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                if state.first_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                Ok(DataEntryStatus::Empty)
            }
            DataEntryStatus::FirstEntryFinalised(_) | DataEntryStatus::SecondEntryInProgress(_) => {
                Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Delete the second entry while it is in progress
    pub fn delete_second_entry(
        self,
        user_id: UserId,
        polling_station: &PollingStation,
        election: &ElectionWithPoliticalGroups,
    ) -> Result<Self, DataEntryTransitionError> {
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

                let validation_results =
                    finalised_first_entry.start_validate(polling_station, election)?;

                Ok(DataEntryStatus::FirstEntryFinalised(FirstEntryFinalised {
                    first_entry_user_id,
                    finalised_first_entry,
                    first_entry_finished_at,
                    finalised_with_warnings: validation_results.has_warnings(),
                }))
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Resume first data entry while resolving accepted errors
    pub fn resume_first_entry(&self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryHasErrors(state) => {
                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    progress: 0,
                    first_entry_user_id: state.first_entry_user_id,
                    first_entry: state.finalised_first_entry.clone(),
                    client_state: Default::default(),
                }))
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Discard first data entry while resolving accepted errors
    pub fn discard_first_entry(&self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryHasErrors(_) => Ok(Self::Empty),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Delete both entries while resolving differences
    pub fn delete_entries(self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::EntriesDifferent(_) => Ok(Self::Empty),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Keep first entry while resolving differences
    pub fn keep_first_entry(
        self,
        polling_station: &PollingStation,
        election: &ElectionWithPoliticalGroups,
    ) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::EntriesDifferent(state) => {
                let validation_results = state
                    .first_entry
                    .start_validate(polling_station, election)?;

                Ok(Self::FirstEntryFinalised(FirstEntryFinalised {
                    first_entry_user_id: state.first_entry_user_id,
                    finalised_first_entry: state.first_entry.clone(),
                    first_entry_finished_at: state.first_entry_finished_at,
                    finalised_with_warnings: validation_results.has_warnings(),
                }))
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Keep second entry while resolving differences; it becomes the first entry
    pub fn keep_second_entry(
        self,
        polling_station: &PollingStation,
        election: &ElectionWithPoliticalGroups,
    ) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::EntriesDifferent(state) => {
                // Note that by setting the second entry to the first
                // entry, we keep the second entry and discard the first entry
                let validation_results = state
                    .second_entry
                    .start_validate(polling_station, election)?;

                if validation_results.has_errors() {
                    Ok(Self::FirstEntryHasErrors(FirstEntryHasErrors {
                        first_entry_user_id: state.second_entry_user_id,
                        finalised_first_entry: state.second_entry.clone(),
                        first_entry_finished_at: state.second_entry_finished_at,
                    }))
                } else {
                    Ok(Self::FirstEntryFinalised(FirstEntryFinalised {
                        first_entry_user_id: state.second_entry_user_id,
                        finalised_first_entry: state.second_entry.clone(),
                        first_entry_finished_at: state.second_entry_finished_at,
                        finalised_with_warnings: validation_results.has_warnings(),
                    }))
                }
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Get the progress of the first entry (if there is a first entry), from 0 to 100
    pub fn get_first_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::Empty => None,
            DataEntryStatus::FirstEntryInProgress(state) => Some(state.progress),
            _ => Some(100),
        }
    }

    /// Get the progress of the second entry (if there is a second entry), from 0 to 100
    pub fn get_second_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::Empty
            | DataEntryStatus::FirstEntryInProgress(_)
            | DataEntryStatus::FirstEntryFinalised(_) => None,
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.progress),
            _ => Some(100),
        }
    }

    /// Get the total progress of the data entry process, from 0 to 100
    pub fn get_progress(&self) -> u8 {
        match self {
            DataEntryStatus::Empty => 0,
            DataEntryStatus::FirstEntryInProgress(state) => state.progress,
            DataEntryStatus::FirstEntryHasErrors(_) => 100,
            DataEntryStatus::FirstEntryFinalised(_) => 0,
            DataEntryStatus::SecondEntryInProgress(state) => state.progress,
            DataEntryStatus::EntriesDifferent(_) => 100,
            DataEntryStatus::Definitive(_) => 100,
        }
    }

    /// Get the user ID of the first entry typist
    pub fn get_first_entry_user_id(&self) -> Option<UserId> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => Some(state.first_entry_user_id),
            DataEntryStatus::FirstEntryFinalised(state) => Some(state.first_entry_user_id),
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.first_entry_user_id),
            DataEntryStatus::EntriesDifferent(state) => Some(state.first_entry_user_id),
            DataEntryStatus::Definitive(state) => Some(state.first_entry_user_id),
            _ => None,
        }
    }

    /// Get the user ID of the second entry typist
    pub fn get_second_entry_user_id(&self) -> Option<UserId> {
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
            DataEntryStatus::Empty => DataEntryStatusName::Empty,
            DataEntryStatus::FirstEntryInProgress(_) => DataEntryStatusName::FirstEntryInProgress,
            DataEntryStatus::FirstEntryHasErrors(_) => DataEntryStatusName::FirstEntryHasErrors,
            DataEntryStatus::FirstEntryFinalised(_) => DataEntryStatusName::FirstEntryFinalised,
            DataEntryStatus::SecondEntryInProgress(_) => DataEntryStatusName::SecondEntryInProgress,
            DataEntryStatus::EntriesDifferent(_) => DataEntryStatusName::EntriesDifferent,
            DataEntryStatus::Definitive(_) => DataEntryStatusName::Definitive,
        }
    }

    /// Returns the timestamp at which point this data entry process was made definitive
    pub fn finished_at(&self) -> Option<&DateTime<Utc>> {
        match self {
            DataEntryStatus::FirstEntryFinalised(FirstEntryFinalised {
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

    /// Returns whether the finalised first or second data entry has warnings
    pub fn finalised_with_warnings(&self) -> Option<&bool> {
        match self {
            DataEntryStatus::FirstEntryFinalised(FirstEntryFinalised {
                finalised_with_warnings,
                ..
            }) => Some(finalised_with_warnings),
            DataEntryStatus::Definitive(Definitive {
                finalised_with_warnings,
                ..
            }) => Some(finalised_with_warnings),
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
            DataEntryTransitionError::SecondEntryNeedsDifferentUser => {
                write!(
                    f,
                    "Second entry needs a different user than the first entry"
                )
            }
            DataEntryTransitionError::Invalid => write!(f, "Invalid state transition"),
            DataEntryTransitionError::ValidatorError(data_error) => {
                write!(f, "Validator error: {data_error}")
            }
            DataEntryTransitionError::ValidationError(_) => write!(f, "Validation errors"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        committee_session::CommitteeSessionId,
        data_entry::{
            CSOFirstSessionResults, CandidateVotes, PoliticalGroupCandidateVotes,
            PoliticalGroupTotalVotes, VotersCounts, VotesCounts,
            structs::tests::{ValidDefault, example_polling_station_results},
        },
        election::{
            Candidate, CandidateNumber, ElectionCategory, ElectionId, ElectionWithPoliticalGroups,
            PGNumber, PoliticalGroup, VoteCountingMethod,
        },
        polling_station::{PollingStation, PollingStationId, PollingStationType},
    };

    fn cso_first_session_result() -> CSOFirstSessionResults {
        CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: Default::default(),
            votes_counts: Default::default(),
            differences_counts: ValidDefault::valid_default(),
            political_group_votes: vec![],
        }
    }

    fn empty_current_data_entry() -> CurrentDataEntry {
        CurrentDataEntry {
            progress: None,
            user_id: UserId::from(0),
            entry: example_polling_station_results(),
            client_state: None,
        }
    }

    fn empty_current_second_data_entry() -> CurrentDataEntry {
        CurrentDataEntry {
            progress: None,
            user_id: UserId::from(1),
            entry: example_polling_station_results(),
            client_state: None,
        }
    }

    fn next_session_data_entry() -> CurrentDataEntry {
        CurrentDataEntry {
            progress: None,
            user_id: UserId::from(0),
            entry: PollingStationResults::CSONextSession(Default::default()),
            client_state: None,
        }
    }

    fn next_session_second_data_entry() -> CurrentDataEntry {
        CurrentDataEntry {
            progress: None,
            user_id: UserId::from(1),
            entry: PollingStationResults::CSONextSession(Default::default()),
            client_state: None,
        }
    }

    fn polling_station() -> PollingStation {
        PollingStation {
            id: PollingStationId::from(1),
            election_id: ElectionId::from(1),
            committee_session_id: CommitteeSessionId::from(1),
            id_prev_session: None,
            name: "Test polling station".to_string(),
            number: 1,
            number_of_voters: None,
            polling_station_type: Some(PollingStationType::FixedLocation),
            address: "Test street".to_string(),
            postal_code: "1234 YQ".to_string(),
            locality: "Test city".to_string(),
        }
    }

    fn election() -> ElectionWithPoliticalGroups {
        ElectionWithPoliticalGroups {
            id: ElectionId::from(1),
            name: "Test election".to_string(),
            counting_method: VoteCountingMethod::CSO,
            election_id: "Test_2025".to_string(),
            location: "Test location".to_string(),
            domain_id: "0000".to_string(),
            category: ElectionCategory::Municipal,
            number_of_seats: 18,
            number_of_voters: 1000,
            election_date: Utc::now().date_naive(),
            nomination_date: Utc::now().date_naive(),
            political_groups: (1..=2)
                .map(|number| PoliticalGroup {
                    number: PGNumber::from(number),
                    name: format!("Partij {number}"),
                    candidates: (1..=2)
                        .map(|number| Candidate {
                            number: CandidateNumber::from(number),
                            initials: "A".to_string(),
                            first_name: None,
                            last_name_prefix: None,
                            last_name: format!("Kandidaat {number}"),
                            locality: "Juinen".to_string(),
                            country_code: None,
                            gender: None,
                        })
                        .collect(),
                })
                .collect(),
        }
    }

    fn first_entry_in_progress() -> DataEntryStatus {
        DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry_user_id: UserId::from(0),
            first_entry: example_polling_station_results(),
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        })
    }

    fn first_entry_has_errors() -> DataEntryStatus {
        DataEntryStatus::FirstEntryHasErrors(FirstEntryHasErrors {
            first_entry_user_id: UserId::from(0),
            finalised_first_entry: example_polling_station_results(),
            first_entry_finished_at: Utc::now(),
        })
    }

    fn first_entry_finalised() -> DataEntryStatus {
        DataEntryStatus::FirstEntryFinalised(FirstEntryFinalised {
            first_entry_user_id: UserId::from(0),
            finalised_first_entry: example_polling_station_results(),
            first_entry_finished_at: Utc::now(),
            finalised_with_warnings: true,
        })
    }

    fn second_entry_in_progress() -> DataEntryStatus {
        DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            first_entry_user_id: UserId::from(0),
            finalised_first_entry: example_polling_station_results(),
            first_entry_finished_at: Utc::now(),
            progress: 0,
            second_entry_user_id: UserId::from(0),
            second_entry: example_polling_station_results(),
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        })
    }

    fn definitive() -> DataEntryStatus {
        DataEntryStatus::Definitive(Definitive {
            first_entry_user_id: UserId::from(0),
            second_entry_user_id: UserId::from(0),
            finished_at: Utc::now(),
            finalised_with_warnings: false,
        })
    }

    fn entries_different() -> DataEntryStatus {
        DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: example_polling_station_results(),
            first_entry_user_id: UserId::from(0),
            second_entry: example_polling_station_results().with_difference(),
            second_entry_user_id: UserId::from(0),
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        })
    }

    /// Empty --> FirstEntryInProgress: claim
    #[test]
    fn empty_to_first_entry_in_progress() {
        // Happy path
        assert!(matches!(
            DataEntryStatus::Empty.claim_first_entry(empty_current_data_entry()),
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ));
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: claim with same user
    #[test]
    fn first_entry_in_progress_claim_first_entry_ok() {
        assert!(matches!(
            first_entry_in_progress().claim_first_entry(empty_current_data_entry()),
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ));
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: claim with different user returns error
    #[test]
    fn first_entry_in_progress_claim_first_entry_other_user_error() {
        let current_data_entry = CurrentDataEntry {
            progress: None,
            user_id: UserId::from(1),
            entry: example_polling_station_results(),
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
    fn first_entry_finalised_claim_first_entry_error() {
        assert_eq!(
            first_entry_finalised().claim_first_entry(empty_current_data_entry()),
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
            first_entry_in_progress().update_first_entry(empty_current_data_entry()),
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ));
    }

    /// FirstEntryInProgress --> FirstEntryFinalised: finalise
    #[test]
    fn first_entry_in_progress_to_first_entry_finalised() {
        // Happy path
        let status = first_entry_in_progress()
            .finalise_first_entry(&polling_station(), &election(), UserId::from(0))
            .unwrap();

        assert_eq!(
            status.status_name(),
            DataEntryStatusName::FirstEntryFinalised
        );
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: error when updating as a different user
    #[test]
    fn first_entry_in_progress_save_as_other_user_error() {
        assert_eq!(
            first_entry_in_progress().update_first_entry(CurrentDataEntry {
                progress: None,
                user_id: UserId::from(1),
                entry: example_polling_station_results(),
                client_state: None,
            }),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    #[test]
    fn first_entry_finalised_finalise_first_entry_error() {
        assert_eq!(
            first_entry_finalised().finalise_first_entry(
                &polling_station(),
                &election(),
                UserId::from(0)
            ),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }

    #[test]
    fn second_entry_in_progress_finalise_first_entry_error() {
        assert_eq!(
            second_entry_in_progress().finalise_first_entry(
                &polling_station(),
                &election(),
                UserId::from(0)
            ),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }

    #[test]
    fn definitive_finalise_first_entry_error() {
        assert_eq!(
            definitive().finalise_first_entry(&polling_station(), &election(), UserId::from(0)),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn finalise_first_entry_validation_error() {
        // Create data with validation errors that will trigger FirstEntryHasErrors
        let invalid_entry = example_polling_station_results().with_error();

        let initial = DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry_user_id: UserId::from(0),
            first_entry: invalid_entry,
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        });
        let next = initial
            .finalise_first_entry(&polling_station(), &election(), UserId::from(0))
            .expect("should be Ok");
        assert!(
            matches!(next, DataEntryStatus::FirstEntryHasErrors(_)),
            "actual: {next:?}"
        );
    }

    /// FirstEntryInProgress --> Empty: delete
    #[test]
    fn first_entry_in_progress_to_empty() {
        // Happy path
        assert!(matches!(
            first_entry_in_progress()
                .delete_first_entry(UserId::from(0))
                .unwrap(),
            DataEntryStatus::Empty
        ));
    }

    // Error states
    #[test]
    fn first_entry_finalised_delete_first_entry_error() {
        assert_eq!(
            first_entry_finalised().delete_first_entry(UserId::from(0)),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }
    #[test]
    fn second_entry_in_progress_delete_first_entry_error() {
        assert_eq!(
            second_entry_in_progress().delete_first_entry(UserId::from(0)),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }
    #[test]
    fn definitive_delete_first_entry_error() {
        assert_eq!(
            definitive().delete_first_entry(UserId::from(0)),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    /// FirstEntryInProgress --> Empty: error when deleting as a different user
    #[test]
    fn first_entry_in_progress_delete_as_other_user_error() {
        assert_eq!(
            first_entry_in_progress().delete_first_entry(UserId::from(1)),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// FirstEntryFinalised --> SecondEntryInProgress: claim
    #[test]
    fn first_entry_finalised_to_second_entry_in_progress() {
        assert!(matches!(
            first_entry_finalised()
                .claim_second_entry(empty_current_second_data_entry())
                .unwrap(),
            DataEntryStatus::SecondEntryInProgress(_)
        ));
    }

    /// FirstEntryFinalised --> SecondEntryInProgress: claim with same user as first entry returns error
    #[test]
    fn first_entry_finalised_claim_second_entry_same_user_error() {
        assert!(matches!(
            first_entry_finalised().claim_second_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::SecondEntryNeedsDifferentUser)
        ));
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: claim with same user
    #[test]
    fn second_entry_in_progress_claim_second_entry_ok() {
        assert!(matches!(
            second_entry_in_progress().claim_second_entry(empty_current_data_entry()),
            Ok(DataEntryStatus::SecondEntryInProgress(_))
        ));
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: claim with different user returns error
    #[test]
    fn second_entry_in_progress_claim_second_entry_other_user_error() {
        let current_data_entry = CurrentDataEntry {
            progress: None,
            user_id: UserId::from(1),
            entry: example_polling_station_results(),
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
    fn empty_claim_second_entry_error() {
        assert_eq!(
            DataEntryStatus::Empty.claim_second_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn claim_second_entry_wrong_model_error() {
        assert_eq!(
            first_entry_finalised().claim_second_entry(next_session_second_data_entry()),
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
                user_id: UserId::from(1),
                entry: example_polling_station_results(),
                client_state: None,
            }),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    #[test]
    fn update_second_entry_wrong_model_error() {
        assert_eq!(
            second_entry_in_progress().update_second_entry(next_session_data_entry()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// SecondEntryInProgress --> is_equal: finalise
    /// is_equal --> Definitive: equal? yes
    #[test]
    fn second_entry_in_progress_finalise_equal() {
        let status = second_entry_in_progress()
            .finalise_second_entry(&polling_station(), &election(), UserId::from(0))
            .unwrap()
            .0;
        assert_eq!(status.status_name(), DataEntryStatusName::Definitive);
    }

    #[test]
    fn second_entry_in_progress_finalise_not_equal_and_has_error() {
        let first_entry = example_polling_station_results();
        let different_second_entry =
            PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
                votes_counts: VotesCounts {
                    political_group_total_votes: vec![],
                    total_votes_candidates_count: 0,
                    blank_votes_count: 1, // Different from first entry which has blank_votes_count: 0
                    invalid_votes_count: 0,
                    total_votes_cast_count: 1,
                },
                ..cso_first_session_result()
            });

        let initial = DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            progress: 0,
            second_entry_user_id: UserId::from(0),
            second_entry: different_second_entry,
            client_state: Default::default(),
            first_entry_user_id: UserId::from(0),
            finalised_first_entry: first_entry,
            first_entry_finished_at: Utc::now(),
        });
        let next = initial
            .finalise_second_entry(&polling_station(), &election(), UserId::from(0))
            .unwrap();
        assert!(matches!(next.0, DataEntryStatus::EntriesDifferent(_)));
    }

    /// FirstEntryInProgress --> FirstEntryFinalised: error when finalising as a different user
    #[test]
    fn first_entry_in_progress_finalise_as_other_user_error() {
        assert_eq!(
            first_entry_in_progress().finalise_first_entry(
                &polling_station(),
                &election(),
                UserId::from(1)
            ),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// SecondEntryInProgress --> Definitive: error when finalising as a different user
    #[test]
    fn second_entry_in_progress_finalise_as_other_user_error() {
        assert_eq!(
            second_entry_in_progress().finalise_second_entry(
                &polling_station(),
                &election(),
                UserId::from(1)
            ),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// SecondEntryInProgress --> is_equal: finalise
    /// is_equal --> EntriesDifferent: equal? no
    #[allow(clippy::too_many_lines)]
    #[test]
    fn second_entry_in_progress_finalise_not_equal() {
        let initial = DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            first_entry_user_id: UserId::from(0),
            finalised_first_entry: PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
                voters_counts: VotersCounts {
                    poll_card_count: 1,
                    proxy_certificate_count: 0,
                    total_admitted_voters_count: 1,
                },
                votes_counts: VotesCounts {
                    political_group_total_votes: vec![PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 0,
                    }],
                    total_votes_candidates_count: 0,
                    blank_votes_count: 1,
                    invalid_votes_count: 0,
                    total_votes_cast_count: 1,
                },
                political_group_votes: vec![PoliticalGroupCandidateVotes {
                    number: PGNumber::from(1),
                    total: 0,
                    candidate_votes: vec![CandidateVotes {
                        number: CandidateNumber::from(1),
                        votes: 0,
                    }],
                }],
                ..cso_first_session_result()
            }),
            first_entry_finished_at: Utc::now(),
            progress: 0,
            second_entry_user_id: UserId::from(0),
            second_entry: PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
                voters_counts: VotersCounts {
                    poll_card_count: 1,
                    proxy_certificate_count: 0,
                    total_admitted_voters_count: 1,
                },
                votes_counts: VotesCounts {
                    political_group_total_votes: vec![PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 1,
                    }],
                    total_votes_candidates_count: 1,
                    blank_votes_count: 0,
                    invalid_votes_count: 0,
                    total_votes_cast_count: 1,
                },
                political_group_votes: vec![PoliticalGroupCandidateVotes {
                    number: PGNumber::from(1),
                    total: 1,
                    candidate_votes: vec![CandidateVotes {
                        number: CandidateNumber::from(1),
                        votes: 1,
                    }],
                }],
                ..cso_first_session_result()
            }),
            client_state: ClientState::default(),
        });

        let next = initial
            .finalise_second_entry(
                &polling_station(),
                &ElectionWithPoliticalGroups {
                    political_groups: vec![PoliticalGroup {
                        number: PGNumber::from(1),
                        name: "Test group".to_string(),
                        candidates: vec![Candidate {
                            number: CandidateNumber::from(1),
                            initials: "A.".to_string(),
                            first_name: None,
                            last_name_prefix: None,
                            last_name: "Candidate".to_string(),
                            locality: "Test locality".to_string(),
                            country_code: None,
                            gender: None,
                        }],
                    }],
                    ..election()
                },
                UserId::from(0),
            )
            .unwrap();
        assert!(matches!(next.0, DataEntryStatus::EntriesDifferent(_)));
    }

    /// SecondEntryInProgress --> FirstEntryFinalised: delete
    #[test]
    fn second_entry_in_progress_to_first_entry_finalised() {
        assert!(matches!(
            second_entry_in_progress()
                .delete_second_entry(UserId::from(0), &polling_station(), &election())
                .unwrap(),
            DataEntryStatus::FirstEntryFinalised(_)
        ));
    }

    /// SecondEntryInProgress --> FirstEntryFinalised: error when deleting as a different user
    #[test]
    fn second_entry_in_progress_delete_as_other_user_error() {
        assert_eq!(
            second_entry_in_progress().delete_second_entry(
                UserId::from(1),
                &polling_station(),
                &election()
            ),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    #[test]
    fn has_errors_discard_first() {
        assert!(matches!(
            first_entry_has_errors().discard_first_entry(),
            Ok(DataEntryStatus::Empty)
        ));
    }

    #[test]
    fn has_errors_resume_first() {
        assert!(matches!(
            first_entry_has_errors().resume_first_entry(),
            Ok(DataEntryStatus::FirstEntryInProgress(
                FirstEntryInProgress {
                    first_entry_user_id,
                    ..
                }
            )) if first_entry_user_id == UserId::from(0)
        ));
    }

    #[test]
    fn definitive_delete_second_entry_error() {
        assert_eq!(
            definitive().delete_second_entry(UserId::from(0), &polling_station(), &election()),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    /// EntriesDifferent --> SecondEntryInProgress: resolve (keep first entry)
    #[test]
    fn entries_different_to_first_entry_finalised_keep_first_entry() {
        // Create a difference, so we can check that we keep the right entry
        let first_entry = example_polling_station_results();
        let second_entry = example_polling_station_results().with_difference();

        let initial = entries_different();
        let next = initial
            .keep_first_entry(&polling_station(), &election())
            .unwrap();

        if let DataEntryStatus::FirstEntryFinalised(kept_entry) = next {
            assert_eq!(kept_entry.finalised_first_entry, first_entry);
            assert_ne!(kept_entry.finalised_first_entry, second_entry);
        } else {
            panic!()
        };
    }

    #[test]
    fn definitive_keep_first_entry_error() {
        assert_eq!(
            definitive().keep_first_entry(&polling_station(), &election()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn entries_different_to_first_entry_finalised_keep_second_entry() {
        // Create valid data without errors, so we transition to FirstEntryFinalised
        let first_entry = example_polling_station_results();
        let second_entry = example_polling_station_results().with_difference();

        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: first_entry.clone(),
            first_entry_user_id: UserId::from(0),
            second_entry: second_entry.clone(),
            second_entry_user_id: UserId::from(0),
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        });

        let next = initial
            .keep_second_entry(&polling_station(), &election())
            .unwrap();

        if let DataEntryStatus::FirstEntryFinalised(kept_entry) = next {
            assert_eq!(kept_entry.finalised_first_entry, second_entry);
        } else {
            panic!("{next:?}")
        };
    }

    #[test]
    fn entries_different_to_first_entry_finalised_keep_second_entry_which_has_errors() {
        let first_entry = example_polling_station_results();
        // Create second entry with validation errors that will trigger FirstEntryHasErrors
        let second_entry = example_polling_station_results().with_error();

        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: first_entry.clone(),
            first_entry_user_id: UserId::from(0),
            second_entry: second_entry.clone(),
            second_entry_user_id: UserId::from(0),
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        });
        let next = initial
            .keep_second_entry(&polling_station(), &election())
            .unwrap();

        if let DataEntryStatus::FirstEntryHasErrors(kept_entry) = next {
            assert_eq!(kept_entry.finalised_first_entry, second_entry);
        } else {
            panic!("{next:?}")
        };
    }

    #[test]
    fn definitive_keep_second_entry_error() {
        assert_eq!(
            definitive().keep_second_entry(&polling_station(), &election()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn entries_different_to_empty() {
        let initial = entries_different();
        let next = initial.delete_entries().unwrap();
        assert!(matches!(next, DataEntryStatus::Empty));
    }

    #[test]
    fn definitive_delete_entries_error() {
        assert_eq!(
            definitive().delete_entries(),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// update_first_entry should fail for other states
    #[test]
    fn first_entry_finalised_update_first_entry() {
        assert!(matches!(
            first_entry_finalised().update_first_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        ));
    }

    #[test]
    fn second_entry_in_progress_update_first_entry() {
        assert!(matches!(
            second_entry_in_progress().update_first_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        ));
    }

    #[test]
    fn entries_different_update_first_entry() {
        assert!(matches!(
            entries_different().update_first_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::Invalid)
        ));
    }

    #[test]
    fn definitive_entry_update_first_entry() {
        assert!(matches!(
            definitive().update_first_entry(empty_current_data_entry()),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        ));
    }

    #[test]
    fn update_first_entry_wrong_model_error() {
        assert_eq!(
            first_entry_in_progress().update_first_entry(next_session_data_entry()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn check_get_client_state_return_values() {
        assert!(DataEntryStatus::Empty.get_client_state().is_none());
        assert!(first_entry_in_progress().get_client_state().is_some());
        assert!(first_entry_finalised().get_client_state().is_none());
        assert!(second_entry_in_progress().get_client_state().is_some());
        assert!(entries_different().get_client_state().is_none());
    }

    #[test]
    fn check_finished_at_method_return_values() {
        assert!(first_entry_in_progress().finished_at().is_none());
        assert!(entries_different().finished_at().is_none());
        assert!(first_entry_finalised().finished_at().is_some());
        assert!(second_entry_in_progress().finished_at().is_some());
        assert!(definitive().finished_at().is_some());
    }

    #[test]
    fn check_get_progress_method_return_values() {
        assert_eq!(first_entry_in_progress().get_progress(), 0);
        assert_eq!(first_entry_finalised().get_progress(), 0);
        assert_eq!(second_entry_in_progress().get_progress(), 0);
        assert_eq!(entries_different().get_progress(), 100);
        assert_eq!(definitive().get_progress(), 100);
    }

    #[test]
    fn call_finalize_on_definitive_state() {
        assert_eq!(
            definitive().finalise_second_entry(&polling_station(), &election(), UserId::from(1)),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn check_first_entry_user_id() {
        assert!(DataEntryStatus::Empty.get_first_entry_user_id().is_none());
        assert!(
            first_entry_in_progress()
                .get_first_entry_user_id()
                .is_some()
        );
        assert!(first_entry_finalised().get_first_entry_user_id().is_some());
        assert!(
            second_entry_in_progress()
                .get_first_entry_user_id()
                .is_some()
        );
        assert!(entries_different().get_first_entry_user_id().is_some());
        assert!(definitive().get_first_entry_user_id().is_some());
    }

    #[test]
    fn check_second_entry_user_id() {
        assert!(DataEntryStatus::Empty.get_second_entry_user_id().is_none());
        assert!(
            first_entry_in_progress()
                .get_second_entry_user_id()
                .is_none()
        );
        assert!(first_entry_finalised().get_second_entry_user_id().is_none());
        assert!(
            second_entry_in_progress()
                .get_second_entry_user_id()
                .is_some()
        );
        assert!(entries_different().get_second_entry_user_id().is_some());
        assert!(definitive().get_second_entry_user_id().is_some());
    }

    mod finalised_with_warnings {
        use crate::{
            authentication::user::UserId,
            data_entry::{
                PollingStationResults,
                status::{
                    DataEntryStatus,
                    tests::{
                        election, entries_different, example_polling_station_results,
                        first_entry_in_progress, polling_station, second_entry_in_progress,
                    },
                },
            },
        };

        impl DataEntryStatus {
            pub fn set_first_entry(&mut self, results: PollingStationResults) {
                match self {
                    DataEntryStatus::FirstEntryInProgress(state) => state.first_entry = results,
                    DataEntryStatus::SecondEntryInProgress(state) => {
                        state.finalised_first_entry = results
                    }
                    DataEntryStatus::EntriesDifferent(state) => state.first_entry = results,
                    _ => panic!("first_entry() not implemented for this status"),
                }
            }

            pub fn set_second_entry(&mut self, results: PollingStationResults) {
                match self {
                    DataEntryStatus::SecondEntryInProgress(state) => state.second_entry = results,
                    DataEntryStatus::EntriesDifferent(state) => state.second_entry = results,
                    _ => panic!("second_entry() not implemented for this status"),
                }
            }
        }

        #[test]
        fn finalise_first_entry_without_warnings() {
            assert_eq!(
                first_entry_in_progress()
                    .finalise_first_entry(&polling_station(), &election(), UserId::from(0))
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }

        #[test]
        fn finalise_first_entry_with_warnings() {
            let mut status = first_entry_in_progress();
            status.set_first_entry(example_polling_station_results().with_warning());
            assert_eq!(
                status
                    .finalise_first_entry(&polling_station(), &election(), UserId::from(0))
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }

        #[test]
        fn finalise_second_entry_without_warnings() {
            assert_eq!(
                second_entry_in_progress()
                    .finalise_second_entry(&polling_station(), &election(), UserId::from(0))
                    .unwrap()
                    .0
                    .finalised_with_warnings(),
                Some(&false)
            )
        }

        #[test]
        fn finalise_second_entry_with_warnings() {
            let mut status = second_entry_in_progress();
            status.set_first_entry(example_polling_station_results().with_warning());
            status.set_second_entry(example_polling_station_results().with_warning());

            assert_eq!(
                status
                    .finalise_second_entry(&polling_station(), &election(), UserId::from(0))
                    .unwrap()
                    .0
                    .finalised_with_warnings(),
                Some(&true)
            )
        }

        #[test]
        fn delete_second_entry_without_warnings() {
            assert_eq!(
                second_entry_in_progress()
                    .delete_second_entry(UserId::from(0), &polling_station(), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }
        #[test]
        fn delete_second_entry_first_with_warnings() {
            let mut status = second_entry_in_progress();
            status.set_first_entry(example_polling_station_results().with_warning());

            assert_eq!(
                status
                    .delete_second_entry(UserId::from(0), &polling_station(), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }

        #[test]
        fn delete_second_entry_second_with_warnings() {
            let mut status = second_entry_in_progress();
            status.set_second_entry(example_polling_station_results().with_warning());

            assert_eq!(
                status
                    .delete_second_entry(UserId::from(0), &polling_station(), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }

        #[test]
        fn keep_first_entry_without_warnings() {
            assert_eq!(
                entries_different()
                    .keep_first_entry(&polling_station(), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }

        #[test]
        fn keep_first_entry_with_warnings() {
            let mut status = entries_different();
            status.set_first_entry(example_polling_station_results().with_warning());
            assert_eq!(
                status
                    .keep_first_entry(&polling_station(), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }

        #[test]
        fn keep_second_entry_without_warnings() {
            assert_eq!(
                entries_different()
                    .keep_second_entry(&polling_station(), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }
        #[test]
        fn keep_second_entry_with_warnings() {
            let mut status = entries_different();
            status.set_second_entry(example_polling_station_results().with_warning());
            assert_eq!(
                status
                    .keep_second_entry(&polling_station(), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }
    }
}
