pub use self::{api::*, candidate_nomination::*, fraction::*, seat_assignment::*};

mod api;
mod candidate_nomination;
mod fraction;
mod seat_assignment;

#[cfg(test)]
pub(crate) mod test_helpers {
    use crate::{
        data_entry::{Count, PoliticalGroupVotes, VotersCounts, VotesCounts},
        election::PGNumber,
        summary::{ElectionSummary, SummaryDifferencesCounts},
    };

    /// Create a test election summary with given total votes and political group votes.
    pub fn election_summary_fixture_given_political_group_votes(
        total_votes: Count,
        political_group_votes: Vec<PoliticalGroupVotes>,
    ) -> ElectionSummary {
        ElectionSummary {
            voters_counts: VotersCounts {
                poll_card_count: total_votes,
                proxy_certificate_count: 0,
                total_admitted_voters_count: total_votes,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: total_votes,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: total_votes,
            },
            differences_counts: SummaryDifferencesCounts::zero(),
            political_group_votes,
        }
    }

    /// Create a test election summary with given votes per political group.  
    /// The number of political groups is the length of the `pg_votes` vector.  
    /// The number of candidates in each political group is by default 50.
    pub fn election_summary_fixture_with_default_50_candidates(
        pg_votes: Vec<Count>,
    ) -> ElectionSummary {
        let total_votes = pg_votes.iter().sum();
        let mut political_group_votes: Vec<PoliticalGroupVotes> = vec![];
        for (index, votes) in pg_votes.iter().enumerate() {
            // Create list with 50 candidates with 0 votes
            let mut candidate_votes: Vec<Count> = vec![0; 50];
            // Set votes to first candidate
            candidate_votes[0] = *votes;
            political_group_votes.push(PoliticalGroupVotes::from_test_data_auto(
                PGNumber::try_from(index + 1).unwrap(),
                &candidate_votes,
            ))
        }
        election_summary_fixture_given_political_group_votes(total_votes, political_group_votes)
    }

    /// Create a test election summary with given candidate votes per political group.  
    /// The number of political groups is the length of the `candidate_votes` vector.  
    /// The number of candidates in each political group is equal to the value in the vector at that index.
    pub fn election_summary_fixture_with_given_candidate_votes(
        candidate_votes: Vec<Vec<Count>>,
    ) -> ElectionSummary {
        let total_votes = candidate_votes.iter().flatten().sum();
        let mut political_group_votes: Vec<PoliticalGroupVotes> = vec![];
        for (pg_index, pg_candidate_votes) in candidate_votes.iter().enumerate() {
            political_group_votes.push(PoliticalGroupVotes::from_test_data_auto(
                PGNumber::try_from(pg_index + 1).unwrap(),
                pg_candidate_votes,
            ))
        }
        election_summary_fixture_given_political_group_votes(total_votes, political_group_votes)
    }
}
