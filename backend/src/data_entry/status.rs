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
    FirstEntryAlreadyClaimed,
    SecondEntryAlreadyClaimed,
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
                Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
            }
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
                Err(DataEntryTransitionError::SecondEntryAlreadyClaimed)
            }
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
            DataEntryTransitionError::FirstEntryAlreadyClaimed => {
                write!(f, "First entry already claimed")
            }
            DataEntryTransitionError::SecondEntryAlreadyClaimed => {
                write!(f, "Second entry already claimed")
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
    use crate::data_entry::{CandidateVotes, PoliticalGroupVotes, VotersCounts, VotesCounts};
    use crate::election::{Candidate, Election, ElectionCategory, ElectionStatus, PoliticalGroup};
    use crate::polling_station::{PollingStation, PollingStationType};

    fn polling_station_result() -> PollingStationResults {
        PollingStationResults {
            recounted: Some(false),
            ..Default::default()
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
            election_date: chrono::Utc::now().date_naive(),
            nomination_date: chrono::Utc::now().date_naive(),
            status: ElectionStatus::DataEntryInProgress,
            political_groups: Some(vec![]),
        }
    }

    #[test]
    fn can_claim_not_started() {
        let status = DataEntryStatus::FirstEntryNotStarted;
        let entry = polling_station_result();
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
        let mut initial_entry = polling_station_result();
        initial_entry.votes_counts.votes_candidates_count = 100;
        let initial_entry = initial_entry;

        let status = DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry: initial_entry,
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        });

        let try_new_status =
            status.claim_first_entry(0, polling_station_result(), ClientState::default());
        assert_eq!(
            try_new_status,
            Err(DataEntryTransitionError::FirstEntryAlreadyClaimed)
        );
    }

    /// FirstEntryNotStarted --> FirstEntryInProgress: claim
    #[test]
    fn first_entry_not_started_to_first_entry_in_progress() {
        let initial = DataEntryStatus::FirstEntryNotStarted;
        let next = initial
            .claim_first_entry(0, polling_station_result(), ClientState::default())
            .unwrap();
        assert!(matches!(next, DataEntryStatus::FirstEntryInProgress(_)));
    }

    /// FirstEntryInProgress --> FirstEntryInProgress: save
    #[test]
    fn first_entry_in_progress_to_first_entry_in_progress() {
        let initial = DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry: polling_station_result(),
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        });

        let next = initial
            .update_first_entry(0, polling_station_result(), ClientState::default())
            .unwrap();
        assert!(matches!(next, DataEntryStatus::FirstEntryInProgress(_)));
    }

    /// FirstEntryInProgress --> SecondEntryNotStarted: finalise
    #[test]
    fn first_entry_in_progress_to_second_entry_not_started() {
        let initial = DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry: polling_station_result(),
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        });

        let next = initial
            .finalise_first_entry(&polling_station(), &election())
            .unwrap();
        assert!(matches!(next, DataEntryStatus::SecondEntryNotStarted(_)));
    }

    /// FirstEntryInProgress --> FirstEntryNotStarted: delete
    #[test]
    fn first_entry_in_progress_to_first_entry_not_started() {
        let initial = DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
            progress: 0,
            first_entry: polling_station_result(),
            client_state: ClientState::new_from_str(Some("{}")).unwrap(),
        });

        let next = initial.delete_first_entry().unwrap();
        assert!(matches!(next, DataEntryStatus::FirstEntryNotStarted));
    }

    /// SecondEntryNotStarted --> SecondEntryInProgress: claim
    #[test]
    fn second_entry_not_started_to_second_entry_in_progress() {
        let initial = DataEntryStatus::SecondEntryNotStarted(SecondEntryNotStarted {
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: chrono::Utc::now(),
        });
        let next = initial
            .claim_second_entry(0, polling_station_result(), ClientState::default())
            .unwrap();
        assert!(matches!(next, DataEntryStatus::SecondEntryInProgress(_)));
    }

    /// SecondEntryInProgress --> SecondEntryInProgress: save
    #[test]
    fn second_entry_in_progress_to_second_entry_in_progress() {
        let initial = DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: chrono::Utc::now(),
            progress: 0,
            second_entry: polling_station_result(),
            client_state: ClientState::default(),
        });
        let next = initial
            .update_second_entry(0, polling_station_result(), ClientState::default())
            .unwrap();
        assert!(matches!(next, DataEntryStatus::SecondEntryInProgress(_)));
    }

    /// SecondEntryInProgress --> is_equal: finalise
    /// is_equal --> Definitive: equal? yes
    #[test]
    fn second_entry_in_progress_finalise_equal() {
        let initial_equal = DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: chrono::Utc::now(),
            progress: 0,
            second_entry: polling_station_result(),
            client_state: ClientState::default(),
        });

        let next_equal = initial_equal
            .finalise_second_entry(&polling_station(), &election())
            .unwrap();
        assert!(matches!(next_equal.0, DataEntryStatus::Definitive(_)));
    }

    /// SecondEntryInProgress --> is_equal: finalise
    /// is_equal --> EntriesDifferent: equal? no
    #[test]
    fn second_entry_in_progress_finalise_not_equal() {
        let initial = DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: chrono::Utc::now(),
            progress: 0,
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
            )
            .unwrap();
        assert!(matches!(next.0, DataEntryStatus::EntriesDifferent(_)));
    }

    /// SecondEntryInProgress --> SecondEntryNotStarted: delete
    #[test]
    fn second_entry_in_progress_to_second_entry_not_started() {
        let initial = DataEntryStatus::SecondEntryInProgress(SecondEntryInProgress {
            finalised_first_entry: polling_station_result(),
            first_entry_finished_at: chrono::Utc::now(),
            progress: 0,
            second_entry: polling_station_result(),
            client_state: ClientState::default(),
        });
        let next = initial.delete_second_entry().unwrap();
        assert!(matches!(next, DataEntryStatus::SecondEntryNotStarted(_)));
    }

    /// EntriesDifferent --> Definitive: resolve
    #[test]
    fn entries_not_equal_to_definitive() {
        let initial = DataEntryStatus::EntriesDifferent(EntriesDifferent {
            second_entry: polling_station_result(),
            first_entry: PollingStationResults::default(),
        });
        let next = initial.resolve(EntryNumber::SecondEntry).unwrap();
        assert!(matches!(next.0, DataEntryStatus::Definitive(_)));
    }

    //TODO: Will be Implemented in #130:
    // EntriesNotEqual --> NotStarted: delete
    /*
    #[test]
    fn entries_not_equal_to_definitive() {
        todo!();
    }
    */
}
