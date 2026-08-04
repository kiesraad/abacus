use common_polling_station_results::CommonPollingStationResults;
use cso_first_session_results::CSOFirstSessionResults;
use next_session_results::NextSessionResults;
use political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes};
use political_group_total_votes::PoliticalGroupTotalVotes;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use voters_counts::VotersCounts;
use votes_counts::VotesCounts;

use crate::domain::{
    committee_session::CommitteeSession,
    compare::Compare,
    election::{CommitteeCategory, ElectionWithPoliticalGroups, PoliticalGroup},
    field_path::FieldPath,
    results::{
        count::Count, dso_first_session_results::DSOFirstSessionResults, gsb_results::GSBResults,
    },
    validate::{DataError, Validate, ValidateRoot, ValidationResults},
};

pub mod about_report;
pub mod checks_and_corrections;
pub mod common_polling_station_results;
pub mod common_validation;
pub mod count;
pub mod counting_differences_polling_station;
pub mod cso_first_session_results;
pub mod differences_counts;
pub mod dso_first_session_results;
pub mod extra_investigation;
pub mod gsb_differences_counts;
pub mod gsb_results;
pub mod next_session_results;
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
    /// Results for decentrally counted (DSO) elections, first election committee session.
    /// This contains the data entry values from Model Model N 10-1 and possibly in combination with the values from Model Na 14-1 versie 1.
    DSOFirstSession(DSOFirstSessionResults),
    /// Results for decentrally counted (DSO) elections, any subsequent election committee session.
    /// This contains the data entry values from Model Na 14-1 versie 2.
    DSONextSession(NextSessionResults),

    /// Results for centrally counted (CSO) elections, first election committee session.
    /// This contains the data entry values from Model Na 31-2 Bijlage 1.
    CSOFirstSession(CSOFirstSessionResults),
    /// Results for centrally counted (CSO) elections, any subsequent election committee session.
    /// This contains the data entry values from Model Na 14-2 Bijlage 1.
    CSONextSession(NextSessionResults),

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
    pub fn new(
        election: &ElectionWithPoliticalGroups,
        committee_session: &CommitteeSession,
        previous_results: Option<&CommonPollingStationResults>,
    ) -> Self {
        match (
            election.committee_category,
            committee_session.is_next_session(),
        ) {
            (CommitteeCategory::GSB, false) => {
                Results::CSOFirstSession(CSOFirstSessionResults::empty(election))
            }
            (CommitteeCategory::GSB, true) => {
                if let Some(prev) = previous_results {
                    let mut copy = NextSessionResults {
                        voters_counts: prev.voters_counts.clone(),
                        votes_counts: prev.votes_counts.clone(),
                        differences_counts: prev.differences_counts.clone(),
                        political_group_votes: prev.political_group_votes.to_vec(),
                    };

                    // clear checkboxes in differences because they always need to be re-entered
                    copy.differences_counts.compare_votes_cast_admitted_voters = Default::default();
                    copy.differences_counts.difference_completely_accounted_for =
                        Default::default();

                    Results::CSONextSession(copy)
                } else {
                    Results::CSONextSession(NextSessionResults::empty(election))
                }
            }
            (CommitteeCategory::CSB, _) => Results::GSB(GSBResults::empty(election)),
        }
    }

    /// Common accessor for voter counts regardless of the underlying model.
    pub fn voters_counts(&self) -> &VotersCounts {
        match self {
            Results::DSOFirstSession(results) => &results.voters_counts,
            Results::CSOFirstSession(results) => &results.voters_counts,
            Results::DSONextSession(results) => &results.voters_counts,
            Results::CSONextSession(results) => &results.voters_counts,
            Results::GSB(results) => &results.voters_counts,
        }
    }

    /// Common mutable accessor for voter counts regardless of the underlying model.
    #[cfg(test)]
    pub fn voters_counts_mut(&mut self) -> &mut VotersCounts {
        match self {
            Results::DSOFirstSession(results) => &mut results.voters_counts,
            Results::CSOFirstSession(results) => &mut results.voters_counts,
            Results::DSONextSession(results) => &mut results.voters_counts,
            Results::CSONextSession(results) => &mut results.voters_counts,
            Results::GSB(results) => &mut results.voters_counts,
        }
    }

    /// Common accessor for votes counts regardless of the underlying model.
    pub fn votes_counts(&self) -> &VotesCounts {
        match self {
            Results::DSOFirstSession(results) => &results.votes_counts,
            Results::CSOFirstSession(results) => &results.votes_counts,
            Results::DSONextSession(results) => &results.votes_counts,
            Results::CSONextSession(results) => &results.votes_counts,
            Results::GSB(results) => &results.votes_counts,
        }
    }

    /// Common mutable accessor for votes counts regardless of the underlying model.
    #[cfg(test)]
    pub fn votes_counts_mut(&mut self) -> &mut VotesCounts {
        match self {
            Results::DSOFirstSession(results) => &mut results.votes_counts,
            Results::CSOFirstSession(results) => &mut results.votes_counts,
            Results::DSONextSession(results) => &mut results.votes_counts,
            Results::CSONextSession(results) => &mut results.votes_counts,
            Results::GSB(results) => &mut results.votes_counts,
        }
    }

    /// Common accessor for differences counts regardless of the underlying model.
    pub fn differences_counts(&self) -> CommonDifferencesCounts<'_> {
        match self {
            Results::DSOFirstSession(results) => CommonDifferencesCounts {
                more_ballots_count: &results.differences_counts.more_ballots_count,
                fewer_ballots_count: &results.differences_counts.fewer_ballots_count,
            },
            Results::CSOFirstSession(results) => CommonDifferencesCounts {
                more_ballots_count: &results.differences_counts.more_ballots_count,
                fewer_ballots_count: &results.differences_counts.fewer_ballots_count,
            },
            Results::DSONextSession(results) => CommonDifferencesCounts {
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
            Results::DSOFirstSession(results) => CommonDifferenceCountsMut {
                more_ballots_count: &mut results.differences_counts.more_ballots_count,
                fewer_ballots_count: &mut results.differences_counts.fewer_ballots_count,
            },
            Results::CSOFirstSession(results) => CommonDifferenceCountsMut {
                more_ballots_count: &mut results.differences_counts.more_ballots_count,
                fewer_ballots_count: &mut results.differences_counts.fewer_ballots_count,
            },
            Results::DSONextSession(results) => CommonDifferenceCountsMut {
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
            Results::DSOFirstSession(results) => &results.political_group_votes,
            Results::CSOFirstSession(results) => &results.political_group_votes,
            Results::DSONextSession(results) => &results.political_group_votes,
            Results::CSONextSession(results) => &results.political_group_votes,
            Results::GSB(results) => &results.political_group_votes,
        }
    }

    /// Common mutable accessor for political group votes regardless of the underlying model.
    #[cfg(test)]
    pub fn political_group_votes_mut(&mut self) -> &mut Vec<PoliticalGroupCandidateVotes> {
        match self {
            Results::DSOFirstSession(results) => &mut results.political_group_votes,
            Results::CSOFirstSession(results) => &mut results.political_group_votes,
            Results::DSONextSession(results) => &mut results.political_group_votes,
            Results::CSONextSession(results) => &mut results.political_group_votes,
            Results::GSB(results) => &mut results.political_group_votes,
        }
    }

    /// Returns true if both are of the same model variant, false otherwise.
    pub fn is_same_model(&self, other: &Self) -> bool {
        matches!(
            (self, other),
            (Results::DSOFirstSession(_), Results::DSOFirstSession(_))
                | (Results::CSOFirstSession(_), Results::CSOFirstSession(_))
                | (Results::DSONextSession(_), Results::DSONextSession(_))
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

    /// Create a default value for `voters_counts`, with all counts set to 0.
    /// Voter cards ("kiezerspassen") only exist for non-local elections.
    pub fn default_voters_counts(election: &ElectionWithPoliticalGroups) -> VotersCounts {
        VotersCounts {
            voter_card_count: (!election.category.is_local_election()).then_some(0),
            ..Default::default()
        }
    }
}

/// Contains common functions which are specific to polling station results
pub trait PollingStationResults {
    /// Convert to CommonPollingStationResults, which contains only the common fields.
    fn as_common(&self) -> CommonPollingStationResults;

    fn empty(election: &ElectionWithPoliticalGroups) -> Self;
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

    fn empty(election: &ElectionWithPoliticalGroups) -> Self {
        Self {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: Results::default_voters_counts(election),
            votes_counts: VotesCounts {
                political_group_total_votes: Results::default_political_group_total_votes(
                    &election.political_groups,
                ),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: Results::default_political_group_votes(
                &election.political_groups,
            ),
        }
    }
}

impl PollingStationResults for NextSessionResults {
    fn as_common(&self) -> CommonPollingStationResults {
        CommonPollingStationResults {
            voters_counts: self.voters_counts.clone(),
            votes_counts: self.votes_counts.clone(),
            differences_counts: self.differences_counts.clone(),
            political_group_votes: self.political_group_votes.to_vec(),
        }
    }

    fn empty(election: &ElectionWithPoliticalGroups) -> Self {
        Self {
            voters_counts: Results::default_voters_counts(election),
            votes_counts: VotesCounts {
                political_group_total_votes: Results::default_political_group_total_votes(
                    &election.political_groups,
                ),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: Results::default_political_group_votes(
                &election.political_groups,
            ),
        }
    }
}

impl GSBResults {
    pub fn empty(election: &ElectionWithPoliticalGroups) -> Self {
        Self {
            number_of_voters: 0,
            voters_counts: Results::default_voters_counts(election),
            votes_counts: VotesCounts {
                political_group_total_votes: Results::default_political_group_total_votes(
                    &election.political_groups,
                ),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: Results::default_political_group_votes(
                &election.political_groups,
            ),
        }
    }
}

impl Compare for Results {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        match (self, first_entry) {
            (Results::DSOFirstSession(s), Results::DSOFirstSession(f)) => {
                s.compare(f, different_fields, path)
            }
            (Results::CSOFirstSession(s), Results::CSOFirstSession(f)) => {
                s.compare(f, different_fields, path)
            }
            (Results::DSONextSession(s), Results::DSONextSession(f)) => {
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
        path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        match self {
            Results::DSOFirstSession(_) | Results::DSONextSession(_) => {
                // TODO: https://github.com/kiesraad/abacus/issues/3687
                Ok(ValidationResults::default())
            }
            Results::CSOFirstSession(results) => {
                let mut validation_results = results
                    .extra_investigation
                    .validate(election, &path.field("extra_investigation"))?;
                validation_results.join(results.counting_differences_polling_station.validate(
                    election,
                    &path.field("counting_differences_polling_station"),
                )?);
                validation_results.join(results.as_common().validate(election, path)?);
                Ok(validation_results)
            }
            Results::CSONextSession(results) => results.as_common().validate(election, path),
            Results::GSB(results) => results.validate(election, path),
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::domain::{
        election::{ElectionCategory, PGNumber, tests::election_fixture},
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
                voter_card_count: None,
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

    #[test]
    fn test_initial_voter_card_count() {
        let first_session = CommitteeSession::first_session();

        // Voter cards only exist for non-local elections
        let cases = [
            (ElectionCategory::Municipal, None),
            (ElectionCategory::Provincial, Some(0)),
            (ElectionCategory::WaterAuthority, Some(0)),
        ];

        for (category, expected_voter_card_count) in cases {
            for committee_category in [CommitteeCategory::GSB, CommitteeCategory::CSB] {
                let election = election_fixture(category, committee_category, &[2]);
                let results = Results::new(&election, &first_session, None);

                assert_eq!(
                    results.voters_counts().voter_card_count,
                    expected_voter_card_count,
                    "election category {category:?}, committee category {committee_category:?}"
                );
            }
        }
    }

    #[test]
    fn test_initial_voter_card_count_next_session() {
        let election = election_fixture(ElectionCategory::Provincial, CommitteeCategory::GSB, &[2]);
        let mut previous_results = CSOFirstSessionResults::empty(&election).as_common();
        previous_results.voters_counts.voter_card_count = Some(5);

        let results = Results::new(
            &election,
            &CommitteeSession::next_session(),
            Some(&previous_results),
        );

        assert!(matches!(results, Results::CSONextSession(_)));
        assert_eq!(results.voters_counts().voter_card_count, Some(5));
    }
}
