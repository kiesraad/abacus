use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    domain::{
        election::PoliticalGroup,
        results::{
            political_group_total_votes::EnrichedPoliticalGroupTotalVotes,
            voters_counts::VotersCounts,
            votes_counts::{EnrichedVotesCounts, VotesCounts},
        },
        tabulation::{CommitteeSpecificTotals, DifferencesTotals, ElectionTotals},
    },
};

/// A version of ElectionTotals without the political group votes and committee specific totals.
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ElectionTotalsWithoutVotes {
    /// The total number of voters
    pub voters_counts: VotersCounts,
    /// The total number of votes
    pub votes_counts: VotesCounts,
    /// The differences between voters and votes
    pub differences_counts: DifferencesTotals,
}

impl From<&ElectionTotals> for ElectionTotalsWithoutVotes {
    fn from(totals: &ElectionTotals) -> Self {
        ElectionTotalsWithoutVotes {
            voters_counts: totals.voters_counts.clone(),
            votes_counts: totals.votes_counts.clone(),
            differences_counts: totals.differences_counts.clone(),
        }
    }
}

/// A version of ElectionTotals without the political group votes and investigations
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ElectionTotalsCSB {
    /// The number of voters (i.e. "Kiesgerechtigden")
    pub number_of_voters: u32,
    /// The total number of voters
    pub voters_counts: VotersCounts,
    /// The total number of votes
    pub votes_counts: EnrichedVotesCounts,
    /// The differences between voters and votes
    pub differences_counts: DifferencesTotals,
}

impl ElectionTotalsCSB {
    pub fn new(
        totals: &ElectionTotals,
        political_groups: &[PoliticalGroup],
    ) -> Result<Self, APIError> {
        let CommitteeSpecificTotals::CSB { number_of_voters } = totals.committee_specific else {
            return Err(APIError::DataIntegrityError(
                "CSB election totals can only be created for CSB totals".to_string(),
            ));
        };

        Ok(ElectionTotalsCSB {
            number_of_voters,
            voters_counts: totals.voters_counts.clone(),
            votes_counts: EnrichedVotesCounts {
                political_group_total_votes: totals
                    .votes_counts
                    .political_group_total_votes
                    .iter()
                    .map(|pg_votes| EnrichedPoliticalGroupTotalVotes {
                        number: pg_votes.number,
                        name: political_groups
                            .iter()
                            .find(|pg| pg.number == pg_votes.number)
                            .expect("Political group should exist")
                            .name
                            .clone(),
                        total: pg_votes.total,
                    })
                    .collect(),
                total_votes_candidates_count: totals.votes_counts.total_votes_candidates_count,
                blank_votes_count: totals.votes_counts.blank_votes_count,
                invalid_votes_count: totals.votes_counts.invalid_votes_count,
                total_votes_cast_count: totals.votes_counts.total_votes_cast_count,
            },
            differences_counts: totals.differences_counts.clone(),
        })
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::election::{
        CommitteeCategory::{CSB, GSB},
        ElectionCategory,
        tests::election_fixture,
    };

    #[test]
    fn test_election_totals_csb_requires_csb_totals() {
        let csb_election = election_fixture(ElectionCategory::Municipal, CSB, &[2, 3]);
        let csb_totals = ElectionTotals::tabulate(&csb_election, &[]).unwrap();
        assert!(ElectionTotalsCSB::new(&csb_totals, &csb_election.political_groups).is_ok());

        let gsb_election = election_fixture(ElectionCategory::Municipal, GSB, &[2, 3]);
        let gsb_totals = ElectionTotals::tabulate(&gsb_election, &[]).unwrap();
        assert!(ElectionTotalsCSB::new(&gsb_totals, &gsb_election.political_groups).is_err());
    }
}
