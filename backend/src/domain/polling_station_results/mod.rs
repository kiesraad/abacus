use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub mod common_polling_station_results;
pub mod count;
pub mod counting_differences_polling_station;
pub mod cso_first_session_results;
pub mod cso_next_session_results;
pub mod differences_counts;
pub mod extra_investigation;
pub mod political_group_candidate_votes;
pub mod voters_counts;
pub mod votes_counts;

use crate::domain::{
    compare::Compare,
    election::{ElectionWithPoliticalGroups, PoliticalGroup},
    field_path::FieldPath,
    political_group_total_votes::PoliticalGroupTotalVotes,
    polling_station::PollingStation,
    polling_station_results::{
        common_polling_station_results::CommonPollingStationResults,
        cso_first_session_results::CSOFirstSessionResults,
        cso_next_session_results::CSONextSessionResults, differences_counts::DifferencesCounts,
        political_group_candidate_votes::PoliticalGroupCandidateVotes, voters_counts::VotersCounts,
        votes_counts::VotesCounts,
    },
    validate::{DataError, Validate, ValidateRoot, ValidationResults},
};

/// PollingStationResults contains the results for a polling station.
///
/// The exact type of results depends on the election counting method and
/// whether this is the first or any subsequent data entry session. Based on
/// this, any of four different models can apply
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(tag = "model")]
pub enum PollingStationResults {
    /// Results for centrally counted (CSO) elections, first election committee session.
    /// This contains the data entry values from Model Na 31-2 Bijlage 2.
    CSOFirstSession(CSOFirstSessionResults),
    /// Results for centrally counted (CSO) elections, any subsequent election committee session.
    /// This contains the data entry values from Model Na 14-2 Bijlage 1.
    CSONextSession(CSONextSessionResults),
}

impl PollingStationResults {
    /// Get a reference to the inner CSOFirstSessionResults, if this is of that type.
    pub fn as_cso_first_session(&self) -> Option<&CSOFirstSessionResults> {
        match self {
            PollingStationResults::CSOFirstSession(results) => Some(results),
            _ => None,
        }
    }

    /// Get a mutable reference to the inner CSOFirstSessionResults, if this is of that type.
    pub fn as_cso_first_session_mut(&mut self) -> Option<&mut CSOFirstSessionResults> {
        match self {
            PollingStationResults::CSOFirstSession(results) => Some(results),
            _ => None,
        }
    }

    /// Consume self and return the inner CSOFirstSessionResults, if this is of that type.
    pub fn into_cso_first_session(self) -> Option<CSOFirstSessionResults> {
        match self {
            PollingStationResults::CSOFirstSession(results) => Some(results),
            _ => None,
        }
    }

    pub fn empty_cso_first_session(political_groups: &[PoliticalGroup]) -> Self {
        PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: Default::default(),
            votes_counts: VotesCounts {
                political_group_total_votes:
                    PollingStationResults::default_political_group_total_votes(political_groups),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: PollingStationResults::default_political_group_votes(
                political_groups,
            ),
        })
    }

    pub fn empty_cso_next_session(political_groups: &[PoliticalGroup]) -> Self {
        PollingStationResults::CSONextSession(CSONextSessionResults {
            voters_counts: Default::default(),
            votes_counts: VotesCounts {
                political_group_total_votes:
                    PollingStationResults::default_political_group_total_votes(political_groups),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: PollingStationResults::default_political_group_votes(
                political_groups,
            ),
        })
    }

    /// Get a reference to the inner CSONextSessionResults, if this is of that type.
    pub fn as_cso_next_session(&self) -> Option<&CSONextSessionResults> {
        match self {
            PollingStationResults::CSONextSession(results) => Some(results),
            _ => None,
        }
    }

    /// Get a mutable reference to the inner CSONextSessionResults, if this is of that type.
    pub fn as_cso_next_session_mut(&mut self) -> Option<&mut CSONextSessionResults> {
        match self {
            PollingStationResults::CSONextSession(results) => Some(results),
            _ => None,
        }
    }

    /// Consume self and return the inner CSONextSessionResults, if this is of that type.
    pub fn into_cso_next_session(self) -> Option<CSONextSessionResults> {
        match self {
            PollingStationResults::CSONextSession(results) => Some(results),
            _ => None,
        }
    }

    /// Common accessor for voter counts regardless of the underlying model.
    pub fn voters_counts(&self) -> &VotersCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &results.voters_counts,
            PollingStationResults::CSONextSession(results) => &results.voters_counts,
        }
    }

    /// Common mutable accessor for voter counts regardless of the underlying model.
    #[cfg(test)]
    pub fn voters_counts_mut(&mut self) -> &mut VotersCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &mut results.voters_counts,
            PollingStationResults::CSONextSession(results) => &mut results.voters_counts,
        }
    }

    /// Common accessor for votes counts regardless of the underlying model.
    pub fn votes_counts(&self) -> &VotesCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &results.votes_counts,
            PollingStationResults::CSONextSession(results) => &results.votes_counts,
        }
    }

    /// Common mutable accessor for votes counts regardless of the underlying model.
    #[cfg(test)]
    pub fn votes_counts_mut(&mut self) -> &mut VotesCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &mut results.votes_counts,
            PollingStationResults::CSONextSession(results) => &mut results.votes_counts,
        }
    }

    /// Common accessor for differences counts regardless of the underlying model.
    pub fn differences_counts(&self) -> &DifferencesCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &results.differences_counts,
            PollingStationResults::CSONextSession(results) => &results.differences_counts,
        }
    }

    /// Common mutable accessor for differences counts regardless of the underlying model.
    #[cfg(test)]
    pub fn differences_counts_mut(&mut self) -> &mut DifferencesCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &mut results.differences_counts,
            PollingStationResults::CSONextSession(results) => &mut results.differences_counts,
        }
    }

    /// Common accessor for political group votes regardless of the underlying model.
    pub fn political_group_votes(&self) -> &[PoliticalGroupCandidateVotes] {
        match self {
            PollingStationResults::CSOFirstSession(results) => &results.political_group_votes,
            PollingStationResults::CSONextSession(results) => &results.political_group_votes,
        }
    }

    /// Common mutable accessor for political group votes regardless of the underlying model.
    #[cfg(test)]
    pub fn political_group_votes_mut(&mut self) -> &mut Vec<PoliticalGroupCandidateVotes> {
        match self {
            PollingStationResults::CSOFirstSession(results) => &mut results.political_group_votes,
            PollingStationResults::CSONextSession(results) => &mut results.political_group_votes,
        }
    }

    /// Convert to CommonPollingStationResults, which contains only the common fields.
    pub fn as_common(&self) -> CommonPollingStationResults {
        CommonPollingStationResults {
            voters_counts: self.voters_counts().clone(),
            votes_counts: self.votes_counts().clone(),
            differences_counts: self.differences_counts().clone(),
            political_group_votes: self.political_group_votes().to_vec(),
        }
    }

    /// Returns true if both are of the same model variant, false otherwise.
    pub fn is_same_model(&self, other: &Self) -> bool {
        matches!(
            (self, other),
            (
                PollingStationResults::CSOFirstSession(_),
                PollingStationResults::CSOFirstSession(_)
            ) | (
                PollingStationResults::CSONextSession(_),
                PollingStationResults::CSONextSession(_)
            )
        )
    }

    /// Create a default value for `political_group_votes` (type `Vec<PoliticalGroup>`)
    /// for the given political groups, with all votes set to 0.
    pub fn default_political_group_votes(
        political_groups: &[PoliticalGroup],
    ) -> Vec<PoliticalGroupCandidateVotes> {
        political_groups
            .iter()
            .map(|pg| PoliticalGroupCandidateVotes {
                number: pg.number,
                total: 0,
                candidate_votes: pg
                    .candidates
                    .iter()
                    .map(|c| political_group_candidate_votes::CandidateVotes {
                        number: c.number,
                        votes: 0,
                    })
                    .collect(),
            })
            .collect()
    }

    /// Create a default value for `political_group_total_votes` in `votes_counts`
    pub fn default_political_group_total_votes(
        political_groups: &[PoliticalGroup],
    ) -> Vec<PoliticalGroupTotalVotes> {
        political_groups
            .iter()
            .map(|pg| PoliticalGroupTotalVotes {
                number: pg.number,
                total: 0,
            })
            .collect()
    }

    #[cfg(test)]
    pub fn example_polling_station_results() -> PollingStationResults {
        use crate::domain::{election::PGNumber, valid_default::ValidDefault, yes_no::YesNo};

        PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 99,
                proxy_certificate_count: 1,
                total_admitted_voters_count: 100,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 56,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 40,
                    },
                ],
                total_votes_candidates_count: 96,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 100,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                compare_votes_cast_admitted_voters:
                    differences_counts::DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: true,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: YesNo::yes(),
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[36, 20]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[30, 10]),
            ],
        })
    }

    #[cfg(test)]
    pub fn with_warning(mut self) -> Self {
        let extra_blank_votes = 100;

        let voters_counts = self.voters_counts_mut();
        voters_counts.poll_card_count += extra_blank_votes;
        voters_counts.total_admitted_voters_count += extra_blank_votes;

        let votes_counts = self.votes_counts_mut();
        votes_counts.blank_votes_count += extra_blank_votes;
        votes_counts.total_votes_cast_count += extra_blank_votes;

        self
    }

    #[cfg(test)]
    pub fn with_error(mut self) -> Self {
        let voters_counts = self.voters_counts_mut();
        voters_counts.poll_card_count = 10;
        voters_counts.proxy_certificate_count = 10;
        voters_counts.total_admitted_voters_count = 80;

        self
    }

    #[cfg(test)]
    pub fn with_difference(mut self) -> Self {
        let extra_proxy_certificate = 10;

        let voters_counts = self.voters_counts_mut();
        voters_counts.poll_card_count -= extra_proxy_certificate;
        voters_counts.proxy_certificate_count += extra_proxy_certificate;

        self
    }
}

impl Compare for PollingStationResults {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        match (self, first_entry) {
            (
                PollingStationResults::CSOFirstSession(s),
                PollingStationResults::CSOFirstSession(f),
            ) => s.compare(f, different_fields, path),
            (
                PollingStationResults::CSONextSession(s),
                PollingStationResults::CSONextSession(f),
            ) => s.compare(f, different_fields, path),
            _ => {
                different_fields.push(path.to_string());
            }
        }
    }
}

impl ValidateRoot for PollingStationResults {}

impl Validate for PollingStationResults {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        match self {
            PollingStationResults::CSOFirstSession(results) => {
                results.extra_investigation.validate(
                    election,
                    polling_station,
                    validation_results,
                    &path.field("extra_investigation"),
                )?;

                results.counting_differences_polling_station.validate(
                    election,
                    polling_station,
                    validation_results,
                    &path.field("counting_differences_polling_station"),
                )?;

                self.as_common()
                    .validate(election, polling_station, validation_results, path)
            }
            PollingStationResults::CSONextSession(_) => {
                self.as_common()
                    .validate(election, polling_station, validation_results, path)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cso_first_session_as() {
        let cso_first_session = PollingStationResults::CSOFirstSession(Default::default());
        assert!(cso_first_session.as_cso_first_session().is_some());
        assert!(cso_first_session.as_cso_next_session().is_none());
        assert!(
            cso_first_session
                .clone()
                .as_cso_first_session_mut()
                .is_some()
        );
        assert!(
            cso_first_session
                .clone()
                .as_cso_next_session_mut()
                .is_none()
        );
    }

    #[test]
    fn test_cso_next_session_as() {
        let cso_next_session = PollingStationResults::CSONextSession(Default::default());
        assert!(cso_next_session.as_cso_first_session().is_none());
        assert!(cso_next_session.as_cso_next_session().is_some());

        assert!(
            cso_next_session
                .clone()
                .as_cso_first_session_mut()
                .is_none()
        );
        assert!(cso_next_session.clone().as_cso_next_session_mut().is_some());
    }

    #[test]
    fn test_cso_first_session_into() {
        let cso_first_session = PollingStationResults::CSOFirstSession(Default::default());
        assert!(cso_first_session.clone().into_cso_first_session().is_some());
        assert!(cso_first_session.clone().into_cso_next_session().is_none());
    }

    #[test]
    fn test_cso_next_session_into() {
        let cso_next_session = PollingStationResults::CSONextSession(Default::default());
        assert!(cso_next_session.clone().into_cso_first_session().is_none());
        assert!(cso_next_session.clone().into_cso_next_session().is_some());
    }
}
