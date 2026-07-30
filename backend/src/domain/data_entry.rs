use std::fmt::Display;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type, types::Json};
use utoipa::ToSchema;

use crate::{
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionId},
        compare::Compare,
        election::ElectionWithPoliticalGroups,
        field_path::FieldPath,
        identifier::id,
        polling_station::{PollingStationForSession, PollingStationId, PollingStationNumber},
        results::Results,
        sub_committee::{SubCommitteeFirstSession, SubCommitteeId, SubCommitteeNumber},
        validate::{
            DataError, Validate, ValidateRoot, ValidationResult, ValidationResultCode,
            ValidationResults,
        },
    },
    repository::user_repo::UserId,
};

id!(DataEntryId);

#[derive(Debug, PartialEq, Eq)]
pub enum DataEntryTransitionError {
    Invalid,
    FirstEntryAlreadyClaimed,
    SecondEntryAlreadyClaimed,
    FirstEntryAlreadyFinalised,
    SecondEntryAlreadyFinalised,
    /// An existing first/second data entry needs to be saved, finalised, or discarded by the same user
    CannotTransitionUsingDifferentUser,
    /// The second data entry needs to be claimed by a user other than the one who claimed the first entry
    SecondEntryNeedsDifferentUser,
    /// Correction is not allowed because the second entry has errors
    CorrectionNotAllowed,
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

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryStatusResponse {
    pub status: DataEntryStatusName,
}

impl From<DataEntryStatus> for DataEntryStatusResponse {
    fn from(data_entry_status: DataEntryStatus) -> Self {
        DataEntryStatusResponse {
            status: data_entry_status.status_name(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, ToSchema, Debug, FromRow)]
#[serde(deny_unknown_fields)]
pub struct DataEntryRow {
    pub id: DataEntryId,
    #[schema(value_type = DataEntryStatus)]
    pub state: Json<DataEntryStatus>,
    #[schema(value_type = String)]
    pub updated_at: DateTime<Utc>,
}

impl From<DataEntryRow> for DataEntryStatusResponse {
    fn from(data_entry: DataEntryRow) -> Self {
        DataEntryStatusResponse {
            status: data_entry.state.0.status_name(),
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(tag = "type")]
pub enum DataEntrySource {
    PollingStation(PollingStationForSession),
    SubCommittee(SubCommitteeFirstSession),
}

impl DataEntrySource {
    pub fn committee_session_id(&self) -> CommitteeSessionId {
        match self {
            DataEntrySource::PollingStation(source) => source.committee_session_id(),
            DataEntrySource::SubCommittee(source) => source.committee_session_id,
        }
    }

    pub fn id(&self) -> DataEntrySourceId {
        match self {
            DataEntrySource::PollingStation(source) => {
                DataEntrySourceId::PollingStation(source.id())
            }
            DataEntrySource::SubCommittee(source) => {
                DataEntrySourceId::SubCommittee(source.sub_committee.id)
            }
        }
    }

    pub fn number(&self) -> DataEntrySourceNumber {
        match self {
            DataEntrySource::PollingStation(source) => {
                DataEntrySourceNumber::PollingStation(source.number())
            }
            DataEntrySource::SubCommittee(source) => {
                DataEntrySourceNumber::SubCommittee(source.sub_committee.number)
            }
        }
    }

    pub fn eml_reporting_unit_identifier_name(&self) -> String {
        match self {
            DataEntrySource::PollingStation(source) => {
                format!(
                    "{} (postcode: {})",
                    source.polling_station().name,
                    source.polling_station().postal_code
                )
            }
            DataEntrySource::SubCommittee(source) => source.sub_committee.name.clone(),
        }
    }

    pub fn eml_reporting_unit_identifier_number(&self, authority_id: &str) -> String {
        match self {
            DataEntrySource::PollingStation(source) => {
                format!("{authority_id}::SB{}", source.number())
            }
            DataEntrySource::SubCommittee(source) => format!("{:04}", source.sub_committee.number),
        }
    }

    pub fn eml_eligible_voter_count(&self) -> Option<u32> {
        match self {
            DataEntrySource::PollingStation(source) => source.polling_station().number_of_voters,
            DataEntrySource::SubCommittee(_) => None,
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(tag = "type", content = "number", deny_unknown_fields)]
pub enum DataEntrySourceNumber {
    PollingStation(PollingStationNumber),
    SubCommittee(SubCommitteeNumber),
}

impl Display for DataEntrySourceNumber {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DataEntrySourceNumber::PollingStation(number) => {
                write!(f, "Polling Station {}", number)
            }
            DataEntrySourceNumber::SubCommittee(number) => write!(f, "Sub-Committee {}", number),
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(tag = "type", content = "id", deny_unknown_fields)]
pub enum DataEntrySourceId {
    PollingStation(PollingStationId),
    SubCommittee(SubCommitteeId),
}

/// Context about which entity owns a given data entry
pub struct DataEntrySourceContext {
    pub source: DataEntrySource,
    pub election: ElectionWithPoliticalGroups,
    pub committee_session: CommitteeSession,
}

pub struct DataEntryStatusWithSource {
    pub data_entry_id: DataEntryId,
    pub source: DataEntrySource,
    pub status: DataEntryStatus,
}

impl From<SubCommitteeFirstSession> for DataEntrySource {
    fn from(sub_committee: SubCommitteeFirstSession) -> Self {
        DataEntrySource::SubCommittee(sub_committee)
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
    FirstEntryCorrection(FirstEntryCorrection),
    SecondEntryCorrection(SecondEntryCorrection),
    Definitive(Definitive), // First and second entry are finished
}

impl ValidateRoot for DataEntryStatus {}

impl Validate for DataEntryStatus {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
                first_entry: entry,
                ..
            })
            | DataEntryStatus::FirstEntryHasErrors(FirstEntryHasErrors {
                finalised_first_entry: entry,
                ..
            })
            | DataEntryStatus::FirstEntryFinalised(FirstEntryFinalised {
                finalised_first_entry: entry,
                ..
            })
            | DataEntryStatus::FirstEntryCorrection(FirstEntryCorrection {
                first_entry: entry,
                ..
            })
            | DataEntryStatus::SecondEntryCorrection(SecondEntryCorrection {
                second_entry: entry,
                ..
            })
            | DataEntryStatus::Definitive(Definitive { results: entry, .. }) => {
                entry.validate(election, &"data".into())
            }
            DataEntryStatus::SecondEntryInProgress(state) => {
                let mut validation_results =
                    state.second_entry.validate(election, &"data".into())?;
                let mut different_fields: Vec<String> = vec![];
                state.second_entry.compare(
                    &state.finalised_first_entry,
                    &mut different_fields,
                    path,
                );
                if !different_fields.is_empty() {
                    validation_results.warnings.push(ValidationResult {
                        fields: different_fields.clone(),
                        code: ValidationResultCode::W001,
                        context: None,
                    });
                }
                Ok(validation_results)
            }
            _ => Ok(ValidationResults::default()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, strum::Display, Clone, Copy, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
pub enum DataEntryStatusName {
    Empty,
    FirstEntryInProgress,
    FirstEntryHasErrors,
    FirstEntryFinalised,
    SecondEntryInProgress,
    EntriesDifferent,
    FirstEntryCorrection,
    SecondEntryCorrection,
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
    /// First data entry
    pub first_entry: Results,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
    /// Whether this entry was returned for correction
    #[serde(default)]
    pub is_correction: bool,
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
    /// First data entry
    pub finalised_first_entry: Results,
    /// When the first data entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct FirstEntryFinalised {
    /// User who did the first data entry
    pub first_entry_user_id: UserId,
    /// First data entry
    pub finalised_first_entry: Results,
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
    /// First data entry
    pub finalised_first_entry: Results,
    /// When the first data entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// User who is doing the second data entry
    pub second_entry_user_id: UserId,
    /// Second data entry
    pub second_entry: Results,
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
    /// First data entry
    pub first_entry: Results,
    /// Second data entry
    pub second_entry: Results,
    /// When the first data entry was finalised
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    /// When the second data entry was finalised
    #[schema(value_type = String)]
    pub second_entry_finished_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct FirstEntryCorrection {
    pub first_entry_user_id: UserId,
    pub second_entry_user_id: UserId,
    pub first_entry: Results,
    pub finalised_second_entry: Results,
    #[schema(value_type = String)]
    pub second_entry_finished_at: DateTime<Utc>,
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
}
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct SecondEntryCorrection {
    pub first_entry_user_id: UserId,
    pub second_entry_user_id: UserId,
    pub finalised_first_entry: Results,
    pub second_entry: Results,
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type)]
#[serde(deny_unknown_fields)]
pub struct Definitive {
    /// User who did the first data entry
    pub first_entry_user_id: UserId,
    /// User who did the second data entry
    pub second_entry_user_id: UserId,
    /// The definitive results data
    pub results: Results,
    /// When the result was finalised
    #[schema(value_type = String)]
    pub finished_at: DateTime<Utc>,
    /// Whether the result has warnings
    pub finalised_with_warnings: bool,
}

/// Data entry update, used for function parameters only
#[derive(Debug, Clone)]
pub struct DataEntryUpdate {
    pub progress: u8,
    pub user_id: UserId,
    pub entry: Results,
    pub client_state: ClientState,
}

impl DataEntryStatus {
    /// Claim of the first entry by a specific typist
    pub fn claim_first_entry(
        self,
        user_id: UserId,
        initial_results: Results,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::Empty => Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                progress: 0,
                first_entry_user_id: user_id,
                first_entry: initial_results,
                client_state: ClientState::default(),
                is_correction: false,
            })),
            DataEntryStatus::FirstEntryInProgress(_) | DataEntryStatus::FirstEntryCorrection(_) => {
                if user_id == self.get_first_entry_user_id().expect("user id is present") {
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
        user_id: UserId,
        initial_results: Results,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryFinalised(state) => {
                if user_id == state.first_entry_user_id {
                    Err(DataEntryTransitionError::SecondEntryNeedsDifferentUser)
                } else if !state.finalised_first_entry.is_same_model(&initial_results) {
                    Err(DataEntryTransitionError::Invalid)
                } else {
                    Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                        first_entry_user_id: state.first_entry_user_id,
                        finalised_first_entry: state.finalised_first_entry,
                        first_entry_finished_at: state.first_entry_finished_at,
                        progress: 0,
                        second_entry_user_id: user_id,
                        second_entry: initial_results,
                        client_state: ClientState::default(),
                    }))
                }
            }
            DataEntryStatus::SecondEntryInProgress(_)
            | DataEntryStatus::SecondEntryCorrection(_) => {
                if user_id == self.get_second_entry_user_id().expect("user id is present") {
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
        update: DataEntryUpdate,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                if state.first_entry_user_id != update.user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                if !state.first_entry.is_same_model(&update.entry) {
                    return Err(DataEntryTransitionError::Invalid);
                }

                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    progress: update.progress,
                    first_entry: update.entry,
                    client_state: update.client_state,
                    ..state
                }))
            }
            DataEntryStatus::FirstEntryCorrection(state) => {
                if state.first_entry_user_id != update.user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                if !state.first_entry.is_same_model(&update.entry) {
                    return Err(DataEntryTransitionError::Invalid);
                }

                Ok(Self::FirstEntryCorrection(FirstEntryCorrection {
                    progress: update.progress,
                    first_entry: update.entry,
                    client_state: update.client_state,
                    ..state
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
        update: DataEntryUpdate,
    ) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::SecondEntryInProgress(state) => {
                if state.second_entry_user_id != update.user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                if !state.second_entry.is_same_model(&update.entry) {
                    return Err(DataEntryTransitionError::Invalid);
                }

                Ok(Self::SecondEntryInProgress(SecondEntryInProgress {
                    progress: update.progress,
                    second_entry: update.entry,
                    client_state: update.client_state,
                    ..state
                }))
            }
            DataEntryStatus::SecondEntryCorrection(state) => {
                if state.second_entry_user_id != update.user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                if !state.second_entry.is_same_model(&update.entry) {
                    return Err(DataEntryTransitionError::Invalid);
                }

                Ok(Self::SecondEntryCorrection(SecondEntryCorrection {
                    progress: update.progress,
                    second_entry: update.entry,
                    client_state: update.client_state,
                    ..state
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
        election: &ElectionWithPoliticalGroups,
        user_id: UserId,
    ) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::FirstEntryInProgress(state) => {
                if state.first_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                let validation_results = self.start_validate(election)?;

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
            DataEntryStatus::FirstEntryCorrection(state) => {
                if state.first_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                if state.first_entry == state.finalised_second_entry {
                    let validation_results = self.start_validate(election)?;

                    if validation_results.has_errors() {
                        return Err(validation_results.into());
                    }

                    Ok(Self::Definitive(Definitive {
                        first_entry_user_id: state.first_entry_user_id,
                        second_entry_user_id: state.second_entry_user_id,
                        finished_at: Utc::now(),
                        finalised_with_warnings: validation_results.has_warnings(),
                        results: state.finalised_second_entry.clone(),
                    }))
                } else {
                    Ok(Self::EntriesDifferent(EntriesDifferent {
                        first_entry_user_id: state.first_entry_user_id,
                        second_entry_user_id: state.second_entry_user_id,
                        first_entry: state.first_entry.clone(),
                        second_entry: state.finalised_second_entry.clone(),
                        first_entry_finished_at: Utc::now(),
                        second_entry_finished_at: state.second_entry_finished_at,
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
        election: &ElectionWithPoliticalGroups,
        user_id: UserId,
    ) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::SecondEntryInProgress(state) => {
                if state.second_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                if state.finalised_first_entry == state.second_entry {
                    let validation_results = self.start_validate(election)?;

                    if validation_results.has_errors() {
                        return Err(validation_results.into());
                    }

                    Ok(Self::Definitive(Definitive {
                        first_entry_user_id: state.first_entry_user_id,
                        second_entry_user_id: state.second_entry_user_id,
                        finished_at: Utc::now(),
                        finalised_with_warnings: validation_results.has_warnings(),
                        results: state.second_entry.clone(),
                    }))
                } else {
                    Ok(Self::EntriesDifferent(EntriesDifferent {
                        first_entry_user_id: state.first_entry_user_id,
                        second_entry_user_id: state.second_entry_user_id,
                        first_entry: state.finalised_first_entry.clone(),
                        second_entry: state.second_entry.clone(),
                        first_entry_finished_at: state.first_entry_finished_at,
                        second_entry_finished_at: Utc::now(),
                    }))
                }
            }
            DataEntryStatus::SecondEntryCorrection(state) => {
                if state.second_entry_user_id != user_id {
                    return Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser);
                }

                if state.finalised_first_entry == state.second_entry {
                    let validation_results = self.start_validate(election)?;

                    if validation_results.has_errors() {
                        return Err(validation_results.into());
                    }

                    Ok(Self::Definitive(Definitive {
                        first_entry_user_id: state.first_entry_user_id,
                        second_entry_user_id: state.second_entry_user_id,
                        finished_at: Utc::now(),
                        finalised_with_warnings: validation_results.has_warnings(),
                        results: state.second_entry.clone(),
                    }))
                } else {
                    Ok(Self::EntriesDifferent(EntriesDifferent {
                        first_entry_user_id: state.first_entry_user_id,
                        second_entry_user_id: state.second_entry_user_id,
                        first_entry: state.finalised_first_entry.clone(),
                        second_entry: state.second_entry.clone(),
                        first_entry_finished_at: state.first_entry_finished_at,
                        second_entry_finished_at: Utc::now(),
                    }))
                }
            }
            DataEntryStatus::Definitive(_) => {
                Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Discard the first entry while it is in progress
    pub fn discard_first_entry_in_progress(
        self,
        user_id: UserId,
    ) -> Result<Self, DataEntryTransitionError> {
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

    /// Discard the second entry while it is in progress
    pub fn discard_second_entry_in_progress(
        self,
        user_id: UserId,
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

                let validation_results = finalised_first_entry.start_validate(election)?;

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
    pub fn resume_first_entry_with_errors(&self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryHasErrors(state) => {
                Ok(Self::FirstEntryInProgress(FirstEntryInProgress {
                    progress: 0,
                    first_entry_user_id: state.first_entry_user_id,
                    first_entry: state.finalised_first_entry.clone(),
                    client_state: Default::default(),
                    is_correction: true,
                }))
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Discard first data entry while resolving accepted errors
    pub fn discard_first_entry_with_errors(&self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::FirstEntryHasErrors(_) => Ok(Self::Empty),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Discard both entries while resolving differences
    pub fn discard_entries(self) -> Result<Self, DataEntryTransitionError> {
        match self {
            DataEntryStatus::EntriesDifferent(_) => Ok(Self::Empty),
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Keep first entry while resolving differences
    pub fn keep_first_entry(
        self,
        election: &ElectionWithPoliticalGroups,
    ) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::EntriesDifferent(state) => {
                let validation_results = state.first_entry.start_validate(election)?;

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
        election: &ElectionWithPoliticalGroups,
    ) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::EntriesDifferent(state) => {
                // Note that by setting the second entry to the first
                // entry, we keep the second entry and discard the first entry
                let validation_results = state.second_entry.start_validate(election)?;

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

    /// Correct first entry while resolving differences
    /// This is only allowed when the second entry has no errors.
    pub fn correct_first_entry(
        self,
        election: &ElectionWithPoliticalGroups,
    ) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::EntriesDifferent(state) => {
                if state.second_entry.start_validate(election)?.has_errors() {
                    return Err(DataEntryTransitionError::CorrectionNotAllowed);
                }

                Ok(Self::FirstEntryCorrection(FirstEntryCorrection {
                    first_entry_user_id: state.first_entry_user_id,
                    second_entry_user_id: state.second_entry_user_id,
                    first_entry: state.first_entry.clone(),
                    finalised_second_entry: state.second_entry.clone(),
                    second_entry_finished_at: state.second_entry_finished_at,
                    progress: 0,
                    client_state: ClientState::default(),
                }))
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Correct second entry while resolving differences
    pub fn correct_second_entry(self) -> Result<Self, DataEntryTransitionError> {
        match &self {
            DataEntryStatus::EntriesDifferent(state) => {
                Ok(Self::SecondEntryCorrection(SecondEntryCorrection {
                    first_entry_user_id: state.first_entry_user_id,
                    finalised_first_entry: state.first_entry.clone(),
                    second_entry_user_id: state.second_entry_user_id,
                    second_entry: state.second_entry.clone(),
                    first_entry_finished_at: state.first_entry_finished_at,
                    progress: 0,
                    client_state: ClientState::default(),
                }))
            }
            _ => Err(DataEntryTransitionError::Invalid),
        }
    }

    /// Get the progress of the current data entry (0..100) if data entry is in progress
    pub fn get_data_entry_progress(&self) -> Option<u8> {
        match self {
            DataEntryStatus::Empty => None,
            DataEntryStatus::FirstEntryInProgress(state) => Some(state.progress),
            DataEntryStatus::FirstEntryHasErrors(_) => None,
            DataEntryStatus::FirstEntryFinalised(_) => None,
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.progress),
            DataEntryStatus::EntriesDifferent(_) => None,
            DataEntryStatus::FirstEntryCorrection(state) => Some(state.progress),
            DataEntryStatus::SecondEntryCorrection(state) => Some(state.progress),
            DataEntryStatus::Definitive(_) => None,
        }
    }

    /// Get the user ID of the first entry typist
    pub fn get_first_entry_user_id(&self) -> Option<UserId> {
        match self {
            DataEntryStatus::Empty => None,
            DataEntryStatus::FirstEntryInProgress(state) => Some(state.first_entry_user_id),
            DataEntryStatus::FirstEntryHasErrors(state) => Some(state.first_entry_user_id),
            DataEntryStatus::FirstEntryFinalised(state) => Some(state.first_entry_user_id),
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.first_entry_user_id),
            DataEntryStatus::EntriesDifferent(state) => Some(state.first_entry_user_id),
            DataEntryStatus::FirstEntryCorrection(state) => Some(state.first_entry_user_id),
            DataEntryStatus::SecondEntryCorrection(state) => Some(state.first_entry_user_id),
            DataEntryStatus::Definitive(state) => Some(state.first_entry_user_id),
        }
    }

    /// Get the user ID of the second entry typist
    pub fn get_second_entry_user_id(&self) -> Option<UserId> {
        match self {
            DataEntryStatus::Empty
            | DataEntryStatus::FirstEntryInProgress(_)
            | DataEntryStatus::FirstEntryHasErrors(_)
            | DataEntryStatus::FirstEntryFinalised(_) => None,
            DataEntryStatus::SecondEntryInProgress(state) => Some(state.second_entry_user_id),
            DataEntryStatus::EntriesDifferent(state) => Some(state.second_entry_user_id),
            DataEntryStatus::FirstEntryCorrection(state) => Some(state.second_entry_user_id),
            DataEntryStatus::SecondEntryCorrection(state) => Some(state.second_entry_user_id),
            DataEntryStatus::Definitive(state) => Some(state.second_entry_user_id),
        }
    }

    /// Get the data for the current entry if there is any
    pub fn get_data(&self) -> Option<&Results> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => Some(&state.first_entry),
            DataEntryStatus::SecondEntryInProgress(state) => Some(&state.second_entry),
            DataEntryStatus::FirstEntryCorrection(state) => Some(&state.first_entry),
            DataEntryStatus::SecondEntryCorrection(state) => Some(&state.second_entry),
            DataEntryStatus::Empty
            | DataEntryStatus::FirstEntryHasErrors(_)
            | DataEntryStatus::FirstEntryFinalised(_)
            | DataEntryStatus::EntriesDifferent(_)
            | DataEntryStatus::Definitive(_) => None,
        }
    }

    /// Extract the client state if there is any
    pub fn get_client_state(&self) -> Option<&serde_json::Value> {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => state.client_state.as_ref(),
            DataEntryStatus::SecondEntryInProgress(state) => state.client_state.as_ref(),
            DataEntryStatus::FirstEntryCorrection(state) => state.client_state.as_ref(),
            DataEntryStatus::SecondEntryCorrection(state) => state.client_state.as_ref(),
            DataEntryStatus::Empty
            | DataEntryStatus::FirstEntryHasErrors(_)
            | DataEntryStatus::FirstEntryFinalised(_)
            | DataEntryStatus::EntriesDifferent(_)
            | DataEntryStatus::Definitive(_) => None,
        }
    }

    /// Whether the typist is correcting an entry that was completed before
    pub fn is_correction(&self) -> bool {
        match self {
            DataEntryStatus::FirstEntryInProgress(state) => state.is_correction,
            DataEntryStatus::FirstEntryCorrection(_)
            | DataEntryStatus::SecondEntryCorrection(_) => true,
            DataEntryStatus::Empty
            | DataEntryStatus::SecondEntryInProgress(_)
            | DataEntryStatus::FirstEntryHasErrors(_)
            | DataEntryStatus::FirstEntryFinalised(_)
            | DataEntryStatus::EntriesDifferent(_)
            | DataEntryStatus::Definitive(_) => false,
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
            DataEntryStatus::FirstEntryCorrection(_) => DataEntryStatusName::FirstEntryCorrection,
            DataEntryStatus::SecondEntryCorrection(_) => DataEntryStatusName::SecondEntryCorrection,
            DataEntryStatus::Definitive(_) => DataEntryStatusName::Definitive,
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
            DataEntryTransitionError::CorrectionNotAllowed => {
                write!(f, "Correction not allowed: second entry has errors")
            }
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
    use crate::domain::{
        election::{
            Candidate, CandidateNumber, CommitteeCategory, ElectionCategory, ElectionId,
            ElectionSubCategory, PGNumber, PoliticalGroup, VoteCountingMethod,
        },
        results::{
            cso_first_session_results::CSOFirstSessionResults,
            political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes},
            political_group_total_votes::PoliticalGroupTotalVotes,
            tests::example_results,
            voters_counts::VotersCounts,
            votes_counts::VotesCounts,
        },
        valid_default::ValidDefault,
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

    fn example_update(user_id: UserId) -> DataEntryUpdate {
        DataEntryUpdate {
            progress: 0,
            user_id,
            entry: example_results(),
            client_state: ClientState::default(),
        }
    }

    fn next_session_update() -> DataEntryUpdate {
        DataEntryUpdate {
            progress: 0,
            user_id: UserId::from(0),
            entry: Results::CSONextSession(Default::default()),
            client_state: ClientState::default(),
        }
    }

    fn election() -> ElectionWithPoliticalGroups {
        ElectionWithPoliticalGroups {
            id: ElectionId::from(1),
            name: "Test election".to_string(),
            committee_category: CommitteeCategory::GSB,
            counting_method: Some(VoteCountingMethod::CSO),
            election_id: "Test_2025".to_string(),
            location: "Test location".to_string(),
            domain_id: "0000".to_string(),
            category: ElectionCategory::Municipal,
            sub_category: ElectionSubCategory::GR1,
            number_of_seats: 18,
            number_of_voters: 1000,
            election_date: Utc::now().date_naive(),
            nomination_date: Utc::now().date_naive(),
            political_groups: (1..=2)
                .map(|number| PoliticalGroup {
                    number: PGNumber::from(number),
                    name: format!("Partij {number}"),
                    registered_name: format!("Partij {number}"),
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
            first_entry: example_results(),
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
            is_correction: false,
        })
    }

    fn first_entry_has_errors() -> DataEntryStatus {
        DataEntryStatus::FirstEntryHasErrors(FirstEntryHasErrors {
            first_entry_user_id: UserId::from(0),
            finalised_first_entry: example_results(),
            first_entry_finished_at: Utc::now(),
        })
    }

    fn first_entry_finalised() -> DataEntryStatus {
        DataEntryStatus::FirstEntryFinalised(FirstEntryFinalised {
            first_entry_user_id: UserId::from(0),
            finalised_first_entry: example_results(),
            first_entry_finished_at: Utc::now(),
            finalised_with_warnings: true,
        })
    }

    fn second_entry_in_progress() -> DataEntryStatus {
        DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            first_entry_user_id: UserId::from(0),
            finalised_first_entry: example_results(),
            first_entry_finished_at: Utc::now(),
            progress: 0,
            second_entry_user_id: UserId::from(0),
            second_entry: example_results(),
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        })
    }

    fn definitive() -> DataEntryStatus {
        DataEntryStatus::Definitive(Definitive {
            first_entry_user_id: UserId::from(0),
            second_entry_user_id: UserId::from(0),
            finished_at: Utc::now(),
            finalised_with_warnings: false,
            results: example_results(),
        })
    }

    fn entries_different() -> DataEntryStatus {
        DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: example_results(),
            first_entry_user_id: UserId::from(0),
            second_entry: example_results().with_difference(),
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
            DataEntryStatus::Empty.claim_first_entry(UserId::from(0), example_results()),
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ));
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: claim with same user
    #[test]
    fn first_entry_in_progress_claim_first_entry_ok() {
        assert!(matches!(
            first_entry_in_progress().claim_first_entry(UserId::from(0), example_results()),
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ));
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: claim with different user returns error
    #[test]
    fn first_entry_in_progress_claim_first_entry_other_user_error() {
        assert_eq!(
            first_entry_in_progress().claim_first_entry(UserId::from(1), example_results()),
            Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
        );
    }

    #[test]
    fn definitive_claim_first_entry_error() {
        assert_eq!(
            definitive().claim_first_entry(UserId::from(0), example_results()),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn first_entry_finalised_claim_first_entry_error() {
        assert_eq!(
            first_entry_finalised().claim_first_entry(UserId::from(0), example_results()),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }

    #[test]
    fn second_entry_in_progress_claim_first_entry_error() {
        assert_eq!(
            second_entry_in_progress().claim_first_entry(UserId::from(0), example_results()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: save
    #[test]
    fn first_entry_in_progress_to_first_entry_in_progress() {
        assert!(matches!(
            first_entry_in_progress().update_first_entry(example_update(UserId::from(0))),
            Ok(DataEntryStatus::FirstEntryInProgress(_))
        ));
    }

    /// FirstEntryInProgress --> FirstEntryFinalised: finalise
    #[test]
    fn first_entry_in_progress_to_first_entry_finalised() {
        // Happy path
        let status = first_entry_in_progress()
            .finalise_first_entry(&election(), UserId::from(0))
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
            first_entry_in_progress().update_first_entry(example_update(UserId::from(1))),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    #[test]
    fn first_entry_finalised_finalise_first_entry_error() {
        assert_eq!(
            first_entry_finalised().finalise_first_entry(&election(), UserId::from(0)),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }

    #[test]
    fn second_entry_in_progress_finalise_first_entry_error() {
        assert_eq!(
            second_entry_in_progress().finalise_first_entry(&election(), UserId::from(0)),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }

    #[test]
    fn definitive_finalise_first_entry_error() {
        assert_eq!(
            definitive().finalise_first_entry(&election(), UserId::from(0)),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn finalise_first_entry_validation_error() {
        // Create data with validation errors that will trigger FirstEntryHasErrors
        let invalid_entry = example_results().with_error();

        let initial = DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry_user_id: UserId::from(0),
            first_entry: invalid_entry,
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
            is_correction: false,
        });
        let next = initial
            .finalise_first_entry(&election(), UserId::from(0))
            .expect("should be Ok");
        assert!(
            matches!(next, DataEntryStatus::FirstEntryHasErrors(_)),
            "actual: {next:?}"
        );
    }

    /// FirstEntryInProgress --> Empty: discard
    #[test]
    fn first_entry_in_progress_to_empty() {
        // Happy path
        assert!(matches!(
            first_entry_in_progress()
                .discard_first_entry_in_progress(UserId::from(0))
                .unwrap(),
            DataEntryStatus::Empty
        ));
    }

    // Error states
    #[test]
    fn first_entry_finalised_discard_first_entry_error() {
        assert_eq!(
            first_entry_finalised().discard_first_entry_in_progress(UserId::from(0)),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }
    #[test]
    fn second_entry_in_progress_discard_first_entry_error() {
        assert_eq!(
            second_entry_in_progress().discard_first_entry_in_progress(UserId::from(0)),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        );
    }
    #[test]
    fn definitive_discard_first_entry_error() {
        assert_eq!(
            definitive().discard_first_entry_in_progress(UserId::from(0)),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    /// FirstEntryInProgress --> Empty: error when discarding as a different user
    #[test]
    fn first_entry_in_progress_discard_as_other_user_error() {
        assert_eq!(
            first_entry_in_progress().discard_first_entry_in_progress(UserId::from(1)),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// FirstEntryFinalised --> SecondEntryInProgress: claim
    #[test]
    fn first_entry_finalised_to_second_entry_in_progress() {
        assert!(matches!(
            first_entry_finalised()
                .claim_second_entry(UserId::from(1), example_results())
                .unwrap(),
            DataEntryStatus::SecondEntryInProgress(_)
        ));
    }

    /// FirstEntryFinalised --> SecondEntryInProgress: claim with same user as first entry returns error
    #[test]
    fn first_entry_finalised_claim_second_entry_same_user_error() {
        assert!(matches!(
            first_entry_finalised().claim_second_entry(UserId::from(0), example_results()),
            Err(DataEntryTransitionError::SecondEntryNeedsDifferentUser)
        ));
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: claim with same user
    #[test]
    fn second_entry_in_progress_claim_second_entry_ok() {
        assert!(matches!(
            second_entry_in_progress().claim_second_entry(UserId::from(0), example_results()),
            Ok(DataEntryStatus::SecondEntryInProgress(_))
        ));
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: claim with different user returns error
    #[test]
    fn second_entry_in_progress_claim_second_entry_other_user_error() {
        assert_eq!(
            second_entry_in_progress().claim_second_entry(UserId::from(1), example_results()),
            Err(DataEntryTransitionError::SecondEntryAlreadyClaimed)
        );
    }

    #[test]
    fn definitive_claim_second_entry_error() {
        assert_eq!(
            definitive().claim_second_entry(UserId::from(0), example_results()),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn empty_claim_second_entry_error() {
        assert_eq!(
            DataEntryStatus::Empty.claim_second_entry(UserId::from(0), example_results()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn claim_second_entry_wrong_model_error() {
        assert_eq!(
            first_entry_finalised()
                .claim_second_entry(UserId::from(1), Results::CSONextSession(Default::default())),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: save
    #[test]
    fn second_entry_in_progress_to_second_entry_in_progress() {
        assert!(matches!(
            second_entry_in_progress()
                .update_second_entry(example_update(UserId::from(0)))
                .unwrap(),
            DataEntryStatus::SecondEntryInProgress(_)
        ));
    }

    #[test]
    fn definitive_update_second_entry_error() {
        assert_eq!(
            definitive().update_second_entry(example_update(UserId::from(0))),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    #[test]
    fn first_entry_in_progress_update_second_entry_error() {
        assert_eq!(
            first_entry_in_progress().update_second_entry(example_update(UserId::from(0))),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: error when updating as a different user
    #[test]
    fn second_entry_in_progress_save_as_other_user_error() {
        assert_eq!(
            second_entry_in_progress().update_second_entry(example_update(UserId::from(1))),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    #[test]
    fn update_second_entry_wrong_model_error() {
        assert_eq!(
            second_entry_in_progress().update_second_entry(next_session_update()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// SecondEntryInProgress --> is_equal: finalise
    /// is_equal --> Definitive: equal? yes
    #[test]
    fn second_entry_in_progress_finalise_equal() {
        let status = second_entry_in_progress()
            .finalise_second_entry(&election(), UserId::from(0))
            .unwrap();
        assert_eq!(status.status_name(), DataEntryStatusName::Definitive);
    }

    #[test]
    fn second_entry_in_progress_finalise_not_equal_and_has_error() {
        let first_entry = example_results();
        let different_second_entry = Results::CSOFirstSession(CSOFirstSessionResults {
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
            .finalise_second_entry(&election(), UserId::from(0))
            .unwrap();
        assert!(matches!(next, DataEntryStatus::EntriesDifferent(_)));
    }

    /// FirstEntryInProgress --> FirstEntryFinalised: error when finalising as a different user
    #[test]
    fn first_entry_in_progress_finalise_as_other_user_error() {
        assert_eq!(
            first_entry_in_progress().finalise_first_entry(&election(), UserId::from(1)),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    /// SecondEntryInProgress --> Definitive: error when finalising as a different user
    #[test]
    fn second_entry_in_progress_finalise_as_other_user_error() {
        assert_eq!(
            second_entry_in_progress().finalise_second_entry(&election(), UserId::from(1)),
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
            finalised_first_entry: Results::CSOFirstSession(CSOFirstSessionResults {
                voters_counts: VotersCounts {
                    poll_card_count: 1,
                    proxy_certificate_count: 0,
                    voter_card_count: None,
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
            second_entry: Results::CSOFirstSession(CSOFirstSessionResults {
                voters_counts: VotersCounts {
                    poll_card_count: 1,
                    proxy_certificate_count: 0,
                    voter_card_count: None,
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
                &ElectionWithPoliticalGroups {
                    political_groups: vec![PoliticalGroup {
                        number: PGNumber::from(1),
                        name: "Test group".to_string(),
                        registered_name: "Test group".to_string(),
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
        assert!(matches!(next, DataEntryStatus::EntriesDifferent(_)));
    }

    /// SecondEntryInProgress --> FirstEntryFinalised: discard
    #[test]
    fn second_entry_in_progress_to_first_entry_finalised() {
        assert!(matches!(
            second_entry_in_progress()
                .discard_second_entry_in_progress(UserId::from(0), &election())
                .unwrap(),
            DataEntryStatus::FirstEntryFinalised(_)
        ));
    }

    /// SecondEntryInProgress --> FirstEntryFinalised: error when discarding as a different user
    #[test]
    fn second_entry_in_progress_discard_as_other_user_error() {
        assert_eq!(
            second_entry_in_progress()
                .discard_second_entry_in_progress(UserId::from(1), &election()),
            Err(DataEntryTransitionError::CannotTransitionUsingDifferentUser)
        );
    }

    #[test]
    fn has_errors_discard_first() {
        assert!(matches!(
            first_entry_has_errors().discard_first_entry_with_errors(),
            Ok(DataEntryStatus::Empty)
        ));
    }

    #[test]
    fn has_errors_resume_first() {
        let resumed = first_entry_has_errors()
            .resume_first_entry_with_errors()
            .expect("should be Ok");

        let DataEntryStatus::FirstEntryInProgress(state) = &resumed else {
            panic!("expected FirstEntryInProgress, got {resumed:?}");
        };
        assert_eq!(state.first_entry_user_id, UserId::from(0));
        assert!(resumed.is_correction());
    }

    #[test]
    fn claimed_first_entry_is_not_a_correction() {
        assert!(!first_entry_in_progress().is_correction());
        assert!(
            !DataEntryStatus::Empty
                .claim_first_entry(UserId::from(0), example_results())
                .expect("should be Ok")
                .is_correction()
        );
    }

    #[test]
    fn correction_survives_saving_the_first_entry() {
        let resumed = first_entry_has_errors()
            .resume_first_entry_with_errors()
            .expect("should be Ok");

        let saved = resumed
            .update_first_entry(DataEntryUpdate {
                progress: 60,
                user_id: UserId::from(0),
                entry: example_results(),
                client_state: ClientState::new_from_str(Some(r#"{"furthest":"save"}"#)).unwrap(),
            })
            .expect("should be Ok");

        assert!(saved.is_correction());
    }

    #[test]
    fn definitive_discard_second_entry_error() {
        assert_eq!(
            definitive().discard_second_entry_in_progress(UserId::from(0), &election()),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        );
    }

    /// EntriesDifferent --> SecondEntryInProgress: resolve (keep first entry)
    #[test]
    fn entries_different_to_first_entry_finalised_keep_first_entry() {
        // Create a difference, so we can check that we keep the right entry
        let first_entry = example_results();
        let second_entry = example_results().with_difference();

        let initial = entries_different();
        let next = initial.keep_first_entry(&election()).unwrap();

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
            definitive().keep_first_entry(&election()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn entries_different_to_first_entry_finalised_keep_second_entry() {
        // Create valid data without errors, so we transition to FirstEntryFinalised
        let first_entry = example_results();
        let second_entry = example_results().with_difference();

        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: first_entry.clone(),
            first_entry_user_id: UserId::from(0),
            second_entry: second_entry.clone(),
            second_entry_user_id: UserId::from(0),
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        });

        let next = initial.keep_second_entry(&election()).unwrap();

        if let DataEntryStatus::FirstEntryFinalised(kept_entry) = next {
            assert_eq!(kept_entry.finalised_first_entry, second_entry);
        } else {
            panic!("{next:?}")
        };
    }

    #[test]
    fn entries_different_to_first_entry_finalised_keep_second_entry_which_has_errors() {
        let first_entry = example_results();
        // Create second entry with validation errors that will trigger FirstEntryHasErrors
        let second_entry = example_results().with_error();

        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry: first_entry.clone(),
            first_entry_user_id: UserId::from(0),
            second_entry: second_entry.clone(),
            second_entry_user_id: UserId::from(0),
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        });
        let next = initial.keep_second_entry(&election()).unwrap();

        if let DataEntryStatus::FirstEntryHasErrors(kept_entry) = next {
            assert_eq!(kept_entry.finalised_first_entry, second_entry);
        } else {
            panic!("{next:?}")
        };
    }

    #[test]
    fn entries_different_keep_second_and_correct_first_with_errors_is_rejected() {
        let first_entry = example_results();
        let second_entry = example_results().with_error();

        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry,
            first_entry_user_id: UserId::from(0),
            second_entry,
            second_entry_user_id: UserId::from(0),
            first_entry_finished_at: Utc::now(),
            second_entry_finished_at: Utc::now(),
        });

        assert_eq!(
            initial.correct_first_entry(&election()),
            Err(DataEntryTransitionError::CorrectionNotAllowed)
        );
    }

    #[test]
    fn definitive_keep_second_entry_error() {
        assert_eq!(
            definitive().keep_second_entry(&election()),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    #[test]
    fn entries_different_to_empty() {
        let initial = entries_different();
        let next = initial.discard_entries().unwrap();
        assert!(matches!(next, DataEntryStatus::Empty));
    }

    #[test]
    fn definitive_discard_entries_error() {
        assert_eq!(
            definitive().discard_entries(),
            Err(DataEntryTransitionError::Invalid)
        );
    }

    /// update_first_entry should fail for other states
    #[test]
    fn first_entry_finalised_update_first_entry() {
        assert!(matches!(
            first_entry_finalised().update_first_entry(example_update(UserId::from(0))),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        ));
    }

    #[test]
    fn second_entry_in_progress_update_first_entry() {
        assert!(matches!(
            second_entry_in_progress().update_first_entry(example_update(UserId::from(0))),
            Err(DataEntryTransitionError::FirstEntryAlreadyFinalised)
        ));
    }

    #[test]
    fn entries_different_update_first_entry() {
        assert!(matches!(
            entries_different().update_first_entry(example_update(UserId::from(0))),
            Err(DataEntryTransitionError::Invalid)
        ));
    }

    #[test]
    fn definitive_entry_update_first_entry() {
        assert!(matches!(
            definitive().update_first_entry(example_update(UserId::from(0))),
            Err(DataEntryTransitionError::SecondEntryAlreadyFinalised)
        ));
    }

    #[test]
    fn update_first_entry_wrong_model_error() {
        assert_eq!(
            first_entry_in_progress().update_first_entry(next_session_update()),
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
    fn check_is_correction_return_values() {
        assert!(!DataEntryStatus::Empty.is_correction());
        assert!(!first_entry_in_progress().is_correction());
        assert!(!second_entry_in_progress().is_correction());
        assert!(!entries_different().is_correction());

        // an entry corrected to resolve differences is also a correction
        assert!(
            entries_different()
                .correct_first_entry(&election())
                .unwrap()
                .is_correction()
        );
        assert!(
            entries_different()
                .correct_second_entry()
                .unwrap()
                .is_correction()
        );
    }

    #[test]
    fn check_get_progress_method_return_values() {
        assert_eq!(first_entry_in_progress().get_data_entry_progress(), Some(0));
        assert_eq!(first_entry_finalised().get_data_entry_progress(), None);
        assert_eq!(
            second_entry_in_progress().get_data_entry_progress(),
            Some(0)
        );
        assert_eq!(entries_different().get_data_entry_progress(), None);
        assert_eq!(definitive().get_data_entry_progress(), None);
    }

    #[test]
    fn call_finalize_on_definitive_state() {
        assert_eq!(
            definitive().finalise_second_entry(&election(), UserId::from(1)),
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
            domain::{
                data_entry::{
                    DataEntryStatus,
                    tests::{
                        election, entries_different, example_results, first_entry_in_progress,
                        second_entry_in_progress,
                    },
                },
                results::Results,
            },
            repository::user_repo::UserId,
        };

        impl DataEntryStatus {
            pub fn set_first_entry(&mut self, results: Results) {
                match self {
                    DataEntryStatus::FirstEntryInProgress(state) => state.first_entry = results,
                    DataEntryStatus::SecondEntryInProgress(state) => {
                        state.finalised_first_entry = results
                    }
                    DataEntryStatus::EntriesDifferent(state) => state.first_entry = results,
                    _ => panic!("first_entry() not implemented for this status"),
                }
            }

            pub fn set_second_entry(&mut self, results: Results) {
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
                    .finalise_first_entry(&election(), UserId::from(0))
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }

        #[test]
        fn finalise_first_entry_with_warnings() {
            let mut status = first_entry_in_progress();
            status.set_first_entry(example_results().with_warning());
            assert_eq!(
                status
                    .finalise_first_entry(&election(), UserId::from(0))
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }

        #[test]
        fn finalise_second_entry_without_warnings() {
            assert_eq!(
                second_entry_in_progress()
                    .finalise_second_entry(&election(), UserId::from(0))
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }

        #[test]
        fn finalise_second_entry_with_warnings() {
            let mut status = second_entry_in_progress();
            status.set_first_entry(example_results().with_warning());
            status.set_second_entry(example_results().with_warning());

            assert_eq!(
                status
                    .finalise_second_entry(&election(), UserId::from(0))
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }

        #[test]
        fn discard_second_entry_without_warnings() {
            assert_eq!(
                second_entry_in_progress()
                    .discard_second_entry_in_progress(UserId::from(0), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }
        #[test]
        fn discard_second_entry_first_with_warnings() {
            let mut status = second_entry_in_progress();
            status.set_first_entry(example_results().with_warning());

            assert_eq!(
                status
                    .discard_second_entry_in_progress(UserId::from(0), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }

        #[test]
        fn discard_second_entry_second_with_warnings() {
            let mut status = second_entry_in_progress();
            status.set_second_entry(example_results().with_warning());

            assert_eq!(
                status
                    .discard_second_entry_in_progress(UserId::from(0), &election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }

        #[test]
        fn keep_first_entry_without_warnings() {
            assert_eq!(
                entries_different()
                    .keep_first_entry(&election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }

        #[test]
        fn keep_first_entry_with_warnings() {
            let mut status = entries_different();
            status.set_first_entry(example_results().with_warning());
            assert_eq!(
                status
                    .keep_first_entry(&election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }

        #[test]
        fn keep_second_entry_without_warnings() {
            assert_eq!(
                entries_different()
                    .keep_second_entry(&election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&false)
            )
        }
        #[test]
        fn keep_second_entry_with_warnings() {
            let mut status = entries_different();
            status.set_second_entry(example_results().with_warning());
            assert_eq!(
                status
                    .keep_second_entry(&election())
                    .unwrap()
                    .finalised_with_warnings(),
                Some(&true)
            )
        }
    }
}
