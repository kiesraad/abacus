use common_polling_station_results::CommonPollingStationResults;
use cso_first_session_results::CSOFirstSessionResults;
use cso_next_session_results::CSONextSessionResults;
use political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes};
use political_group_total_votes::PoliticalGroupTotalVotes;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use voters_counts::VotersCounts;
use votes_counts::VotesCounts;

use crate::domain::{
    compare::Compare,
    election::{ElectionWithPoliticalGroups, PoliticalGroup},
    field_path::FieldPath,
    results::{count::Count, gsb_results::GSBResults},
    validate::{DataError, Validate, ValidateRoot, ValidationResults},
};

pub mod common_polling_station_results;
pub mod common_results;
pub mod count;
pub mod counting_differences_polling_station;
pub mod cso_first_session_results;
pub mod cso_next_session_results;
pub mod differences_counts;
pub mod extra_investigation;
pub mod gsb_differences_counts;
pub mod gsb_results;
pub mod political_group_candidate_votes;
pub mod political_group_total_votes;
pub mod voters_counts;
pub mod votes_counts;
pub mod yes_no;

/// Results contains the results for a data entry
///
/// The exact type of results depends on the election counting method,
/// election committee category and whether this is the first or any subsequent data entry session.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(tag = "model")]
pub enum Results {
    /// Results for centrally counted (CSO) elections, first election committee session.
    /// This contains the data entry values from Model Na 31-2 Bijlage 1.
    CSOFirstSession(CSOFirstSessionResults),
    /// Results for centrally counted (CSO) elections, any subsequent election committee session.
    /// This contains the data entry values from Model Na 14-2 Bijlage 1.
    CSONextSession(CSONextSessionResults),
    /// HSB/CSB enters GSB results
    /// This contains the data entry values from Model Na 31-2.
    GSB(GSBResults),
}

pub struct CommonDifferencesCounts<'a> {
    pub more_ballots_count: &'a Count,
    pub fewer_ballots_count: &'a Count,
}

#[cfg(test)]
pub struct CommonDifferenceCountsMut<'a> {
    pub more_ballots_count: &'a mut Count,
    pub fewer_ballots_count: &'a mut Count,
}

/// Contains common functions for all result models
impl Results {
    /// Common accessor for voter counts regardless of the underlying model.
    pub fn voters_counts(&self) -> &VotersCounts {
        match self {
            Results::CSOFirstSession(results) => &results.voters_counts,
            Results::CSONextSession(results) => &results.voters_counts,
            Results::GSB(results) => &results.voters_counts,
        }
    }

    /// Common mutable accessor for voter counts regardless of the underlying model.
    #[cfg(test)]
    pub fn voters_counts_mut(&mut self) -> &mut VotersCounts {
        match self {
            Results::CSOFirstSession(results) => &mut results.voters_counts,
            Results::CSONextSession(results) => &mut results.voters_counts,
            Results::GSB(results) => &mut results.voters_counts,
        }
    }

    /// Common accessor for votes counts regardless of the underlying model.
    pub fn votes_counts(&self) -> &VotesCounts {
        match self {
            Results::CSOFirstSession(results) => &results.votes_counts,
            Results::CSONextSession(results) => &results.votes_counts,
            Results::GSB(results) => &results.votes_counts,
        }
    }

    /// Common mutable accessor for votes counts regardless of the underlying model.
    #[cfg(test)]
    pub fn votes_counts_mut(&mut self) -> &mut VotesCounts {
        match self {
            Results::CSOFirstSession(results) => &mut results.votes_counts,
            Results::CSONextSession(results) => &mut results.votes_counts,
            Results::GSB(results) => &mut results.votes_counts,
        }
    }

    /// Common accessor for differences counts regardless of the underlying model.
    pub fn differences_counts(&self) -> CommonDifferencesCounts<'_> {
        match self {
            Results::CSOFirstSession(results) => CommonDifferencesCounts {
                more_ballots_count: &results.differences_counts.more_ballots_count,
                fewer_ballots_count: &results.differences_counts.fewer_ballots_count,
            },
            Results::CSONextSession(results) => CommonDifferencesCounts {
                more_ballots_count: &results.differences_counts.more_ballots_count,
                fewer_ballots_count: &results.differences_counts.fewer_ballots_count,
            },
            Results::GSB(results) => CommonDifferencesCounts {
                more_ballots_count: &results.differences_counts.more_ballots_count,
                fewer_ballots_count: &results.differences_counts.fewer_ballots_count,
            },
        }
    }

    /// Common mutable accessor for differences counts regardless of the underlying model.
    #[cfg(test)]
    pub fn differences_counts_mut(&mut self) -> CommonDifferenceCountsMut<'_> {
        match self {
            Results::CSOFirstSession(results) => CommonDifferenceCountsMut {
                more_ballots_count: &mut results.differences_counts.more_ballots_count,
                fewer_ballots_count: &mut results.differences_counts.fewer_ballots_count,
            },
            Results::CSONextSession(results) => CommonDifferenceCountsMut {
                more_ballots_count: &mut results.differences_counts.more_ballots_count,
                fewer_ballots_count: &mut results.differences_counts.fewer_ballots_count,
            },
            Results::GSB(results) => CommonDifferenceCountsMut {
                more_ballots_count: &mut results.differences_counts.more_ballots_count,
                fewer_ballots_count: &mut results.differences_counts.fewer_ballots_count,
            },
        }
    }

    /// Common accessor for political group votes regardless of the underlying model.
    pub fn political_group_votes(&self) -> &[PoliticalGroupCandidateVotes] {
        match self {
            Results::CSOFirstSession(results) => &results.political_group_votes,
            Results::CSONextSession(results) => &results.political_group_votes,
            Results::GSB(results) => &results.political_group_votes,
        }
    }

    /// Common mutable accessor for political group votes regardless of the underlying model.
    #[cfg(test)]
    pub fn political_group_votes_mut(&mut self) -> &mut Vec<PoliticalGroupCandidateVotes> {
        match self {
            Results::CSOFirstSession(results) => &mut results.political_group_votes,
            Results::CSONextSession(results) => &mut results.political_group_votes,
            Results::GSB(results) => &mut results.political_group_votes,
        }
    }

    /// Returns true if both are of the same model variant, false otherwise.
    pub fn is_same_model(&self, other: &Self) -> bool {
        matches!(
            (self, other),
            (Results::CSOFirstSession(_), Results::CSOFirstSession(_))
                | (Results::CSONextSession(_), Results::CSONextSession(_))
                | (Results::GSB(_), Results::GSB(_))
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
                    .map(|c| CandidateVotes {
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
}

/// Contains common functions which are specific to polling station results
pub trait PollingStationResults {
    /// Convert to CommonPollingStationResults, which contains only the common fields.
    fn as_common(&self) -> CommonPollingStationResults;

    fn empty(political_groups: &[PoliticalGroup]) -> Self;
}

impl PollingStationResults for CSOFirstSessionResults {
    fn as_common(&self) -> CommonPollingStationResults {
        CommonPollingStationResults {
            voters_counts: self.voters_counts.clone(),
            votes_counts: self.votes_counts.clone(),
            differences_counts: self.differences_counts.clone(),
            political_group_votes: self.political_group_votes.to_vec(),
        }
    }

    fn empty(political_groups: &[PoliticalGroup]) -> Self {
        Self {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: Default::default(),
            votes_counts: VotesCounts {
                political_group_total_votes: Results::default_political_group_total_votes(
                    political_groups,
                ),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: Results::default_political_group_votes(political_groups),
        }
    }
}

impl PollingStationResults for CSONextSessionResults {
    fn as_common(&self) -> CommonPollingStationResults {
        CommonPollingStationResults {
            voters_counts: self.voters_counts.clone(),
            votes_counts: self.votes_counts.clone(),
            differences_counts: self.differences_counts.clone(),
            political_group_votes: self.political_group_votes.to_vec(),
        }
    }

    fn empty(political_groups: &[PoliticalGroup]) -> Self {
        Self {
            voters_counts: Default::default(),
            votes_counts: VotesCounts {
                political_group_total_votes: Results::default_political_group_total_votes(
                    political_groups,
                ),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: Results::default_political_group_votes(political_groups),
        }
    }
}

impl GSBResults {
    pub fn empty(political_groups: &[PoliticalGroup]) -> Self {
        Self {
            number_of_voters: 0,
            voters_counts: Default::default(),
            votes_counts: VotesCounts {
                political_group_total_votes: Results::default_political_group_total_votes(
                    political_groups,
                ),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: Results::default_political_group_votes(political_groups),
        }
    }
}

impl Compare for Results {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        match (self, first_entry) {
            (Results::CSOFirstSession(s), Results::CSOFirstSession(f)) => {
                s.compare(f, different_fields, path)
            }
            (Results::CSONextSession(s), Results::CSONextSession(f)) => {
                s.compare(f, different_fields, path)
            }
            (Results::GSB(s), Results::GSB(f)) => s.compare(f, different_fields, path),
            _ => {
                different_fields.push(path.to_string());
            }
        }
    }
}

impl ValidateRoot for Results {}

impl Validate for Results {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        match self {
            Results::CSOFirstSession(results) => {
                results.extra_investigation.validate(
                    election,
                    validation_results,
                    &path.field("extra_investigation"),
                )?;

                results.counting_differences_polling_station.validate(
                    election,
                    validation_results,
                    &path.field("counting_differences_polling_station"),
                )?;

                results
                    .as_common()
                    .validate(election, validation_results, path)
            }
            Results::CSONextSession(results) => {
                results
                    .as_common()
                    .validate(election, validation_results, path)
            }
            Results::GSB(results) => results.validate(election, validation_results, path),
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::domain::{
        election::PGNumber,
        results::{
            count::Count,
            differences_counts::{
                DifferenceCountsCompareVotesCastAdmittedVoters, DifferencesCounts,
            },
            yes_no::YesNo,
        },
        valid_default::ValidDefault,
    };

    pub fn example_results() -> Results {
        Results::CSOFirstSession(CSOFirstSessionResults {
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
                    DifferenceCountsCompareVotesCastAdmittedVoters {
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

    impl Results {
        pub fn with_warning(mut self) -> Self {
            let extra_blank_votes: Count = 100;

            let voters_counts = self.voters_counts_mut();
            voters_counts.poll_card_count += extra_blank_votes;
            voters_counts.total_admitted_voters_count += extra_blank_votes;

            let votes_counts = self.votes_counts_mut();
            votes_counts.blank_votes_count += extra_blank_votes;
            votes_counts.total_votes_cast_count += extra_blank_votes;

            self
        }

        pub fn with_error(mut self) -> Self {
            let voters_counts = self.voters_counts_mut();
            voters_counts.poll_card_count = 10;
            voters_counts.proxy_certificate_count = 10;
            voters_counts.total_admitted_voters_count = 80;

            self
        }

        pub fn with_difference(mut self) -> Self {
            let extra_proxy_certificate: Count = 10;

            let voters_counts = self.voters_counts_mut();
            voters_counts.poll_card_count -= extra_proxy_certificate;
            voters_counts.proxy_certificate_count += extra_proxy_certificate;

            self
        }
    }
}
