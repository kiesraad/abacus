use crate::{ApportionmentInput, CandidateVotesTrait, structs::CandidateNumber};

use super::{
    ListVotesTrait,
    fraction::Fraction,
    structs::{CandidateNominationInput, ListNumber},
};

pub struct ApportionmentInputMock {
    pub number_of_seats: u32,
    pub total_votes: u32,
    pub list_votes: Vec<ListVotesMock>,
}

impl ApportionmentInput for ApportionmentInputMock {
    type List = ListVotesMock;

    fn number_of_seats(&self) -> u32 {
        self.number_of_seats
    }

    fn total_votes(&self) -> u32 {
        self.total_votes
    }

    fn list_votes(&self) -> &[Self::List] {
        &self.list_votes
    }
}

#[derive(Debug, PartialEq)]
pub struct ListVotesMock {
    pub number: ListNumber,
    pub total_votes: u32,
    pub candidate_votes: Vec<CandidateVotesMock>,
}

impl ListVotesTrait for ListVotesMock {
    type Cv = CandidateVotesMock;

    fn number(&self) -> ListNumber {
        self.number
    }

    fn total_votes(&self) -> u32 {
        self.total_votes
    }

    fn candidate_votes(&self) -> &[Self::Cv] {
        &self.candidate_votes
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct CandidateVotesMock {
    pub number: CandidateNumber,
    pub votes: u32,
}

impl CandidateVotesTrait for CandidateVotesMock {
    fn number(&self) -> CandidateNumber {
        self.number
    }

    fn votes(&self) -> u32 {
        self.votes
    }
}

impl ListVotesMock {
    pub fn from_test_data_auto(number: ListNumber, candidate_votes: &[u32]) -> Self {
        ListVotesMock {
            number,
            total_votes: candidate_votes.iter().sum(),
            candidate_votes: candidate_votes
                .iter()
                .enumerate()
                .map(|(i, votes)| CandidateVotesMock {
                    number: CandidateNumber::try_from(i + 1).unwrap(),
                    votes: *votes,
                })
                .collect(),
        }
    }
}

pub fn candidate_nomination_fixture_with_given_number_of_seats(
    quota: Fraction,
    seat_assignment_input: &ApportionmentInputMock,
    total_seats_per_list: Vec<u32>,
) -> CandidateNominationInput<'_, ListVotesMock> {
    CandidateNominationInput {
        number_of_seats: seat_assignment_input.number_of_seats,
        list_votes: &seat_assignment_input.list_votes,
        quota,
        total_seats_per_list,
    }
}

/// Create a ApportionmentInputMock with given total votes and list votes.
pub fn seat_assignment_fixture_with_default_50_candidates(
    number_of_seats: u32,
    list_vote_counts: Vec<u32>,
) -> ApportionmentInputMock {
    let total_votes = list_vote_counts.iter().sum();

    let mut list_votes: Vec<ListVotesMock> = vec![];
    for (index, votes) in list_vote_counts.iter().enumerate() {
        // Create list with 50 candidates with 0 votes
        let mut candidate_votes: Vec<u32> = vec![0; 50];
        // Set votes to first candidate
        candidate_votes[0] = *votes;
        list_votes.push(ListVotesMock::from_test_data_auto(
            ListNumber::try_from(index + 1).unwrap(),
            &candidate_votes,
        ))
    }

    ApportionmentInputMock {
        number_of_seats,
        total_votes,
        list_votes,
    }
}

/// Create a ApportionmentInputMock with given votes per list.
/// The number of lists is the length of the `list_votes` vector.  
/// The number of candidates in each list is by default 50.
pub fn seat_assignment_fixture_with_given_candidate_votes(
    number_of_seats: u32,
    candidate_votes: Vec<Vec<u32>>,
) -> ApportionmentInputMock {
    let total_votes = candidate_votes.iter().flatten().sum();
    let mut list_votes: Vec<ListVotesMock> = vec![];
    for (list_index, list_candidate_votes) in candidate_votes.iter().enumerate() {
        list_votes.push(ListVotesMock::from_test_data_auto(
            ListNumber::try_from(list_index + 1).unwrap(),
            list_candidate_votes,
        ))
    }

    ApportionmentInputMock {
        number_of_seats,
        total_votes,
        list_votes,
    }
}
