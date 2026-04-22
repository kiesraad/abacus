use std::fmt;

use apportionment::CandidateVotes;
use libfuzzer_sys::arbitrary::{Arbitrary, Result, Unstructured};

#[derive(Debug, Clone, PartialEq)]
pub struct SimpleCandidateVotes {
    candidate_number: u32,
    votes: u32,
}

impl SimpleCandidateVotes {
    pub fn new(candidate_number: u32, votes: u32) -> Self {
        Self {
            candidate_number,
            votes,
        }
    }

    pub fn get_votes(&self) -> &u32 { &self.votes }
}

impl apportionment::CandidateVotes for SimpleCandidateVotes {
    type CandidateNumber = u32;

    fn number(&self) -> Self::CandidateNumber {
        self.candidate_number
    }

    fn votes(&self) -> u32 {
        self.votes
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SimpleListVotes {
    pub number: u32,
    pub candidate_votes: Vec<SimpleCandidateVotes>,
}

impl SimpleListVotes {
    pub fn new(number: u32, candidate_votes: Vec<u32>) -> Self {
        Self {
            number,
            candidate_votes: candidate_votes
                .into_iter()
                .enumerate()
                .map(|(idx, votes)| SimpleCandidateVotes::new((idx + 1) as u32, votes))
                .collect(),
        }
    }
}

impl apportionment::ListVotes for SimpleListVotes {
    type Cv = SimpleCandidateVotes;
    type ListNumber = u32;

    fn number(&self) -> Self::ListNumber {
        self.number
    }

    fn candidate_votes(&self) -> &[Self::Cv] {
        &self.candidate_votes
    }
}

/// Fuzzed apportionment input that generates random election data
pub struct FuzzedApportionmentInput {
    pub seats: u32,
    pub list_votes: Vec<SimpleListVotes>,
}

impl<'a> Arbitrary<'a> for FuzzedApportionmentInput {
    fn arbitrary(u: &mut Unstructured<'a>) -> Result<Self> {
        // Select a number of seats
        let seats = u.int_in_range(9..=150)?;

        // Generate lists
        let list_count = u.int_in_range(1..=30)?;
        let mut list_votes = Vec::with_capacity(list_count);
        let mut total_votes: u32 = 0;

        for list_idx in 0..list_count {
            // Generate candidates for each list
            let candidate_count = u.int_in_range(1..=80)?;
            let mut candidate_votes = Vec::with_capacity(candidate_count);

            // Generate votes for each candidate
            for _ in 0..candidate_count {
                // Limit votes to ensure total doesn't exceed 100 million to prevent overflows
                let max_votes_per_candidate = 100_000_000u32.saturating_sub(total_votes);
                let votes: u32 = u.int_in_range(0..=max_votes_per_candidate)?;
                candidate_votes.push(votes);
                // Ensure total_votes does not overflow, which would cause a panic in the apportionment code (#3179)
                total_votes = total_votes
                    .checked_add(votes)
                    .ok_or(libfuzzer_sys::arbitrary::Error::IncorrectFormat)?;
            }

            list_votes.push(SimpleListVotes::new((list_idx + 1) as u32, candidate_votes));
        }

        Ok(FuzzedApportionmentInput { seats, list_votes })
    }
}

impl apportionment::ApportionmentInput for FuzzedApportionmentInput {
    type List = SimpleListVotes;

    fn number_of_seats(&self) -> u32 {
        self.seats
    }

    fn list_votes(&self) -> &[Self::List] {
        &self.list_votes
    }
}

pub fn get_total_seats(
    result: &apportionment::SeatAssignmentResult<SimpleListVotes>,
) -> Vec<u32> {
    result
        .final_standing
        .iter()
        .map(|p| p.total_seats)
        .collect()
}

impl fmt::Debug for FuzzedApportionmentInput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let total_votes: u64 = self
            .list_votes
            .iter()
            .flat_map(|list| list.candidate_votes.iter())
            .map(|cv| cv.votes() as u64)
            .sum();

        writeln!(f, "seats: {}, total_votes: {}", self.seats, total_votes)?;

        for list in &self.list_votes {
            let list_total_votes: u64 = list
                .candidate_votes
                .iter()
                .map(|cv| cv.votes() as u64)
                .sum();
            let candidate_votes_str: String = list
                .candidate_votes
                .iter()
                .map(|cv| format!("{: >2}", cv.votes()))
                .collect::<Vec<_>>()
                .join(", ");

            writeln!(
                f,
                "list {: >2}: {: >2} [{}]",
                list.number, list_total_votes, candidate_votes_str
            )?;
        }

        Ok(())
    }
}
