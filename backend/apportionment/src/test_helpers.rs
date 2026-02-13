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

pub fn convert_total_seats_per_u32_list_number_to_total_seats_per_list_number(
    total_seats_per_list_number: Vec<(u32, u32)>,
) -> Vec<(ListNumber, u32)> {
    total_seats_per_list_number
        .iter()
        .map(|(number, total_seats)| (ListNumber::from(*number), *total_seats))
        .collect()
}

/// Create a CandidateNominationInput with consecutive list numbers and
/// given quota, seat assignment input and total seats per list.
pub fn candidate_nomination_fixture_with_given_number_of_seats(
    quota: Fraction,
    seat_assignment_input: &ApportionmentInputMock,
    total_seats_per_list: Vec<u32>,
) -> CandidateNominationInput<'_, ListVotesMock> {
    CandidateNominationInput {
        number_of_seats: seat_assignment_input.number_of_seats,
        list_votes: &seat_assignment_input.list_votes,
        quota,
        total_seats_per_list: total_seats_per_list
            .iter()
            .enumerate()
            .map(|(list_index, total_seats)| {
                (ListNumber::try_from(list_index + 1).unwrap(), *total_seats)
            })
            .collect(),
    }
}

/// Create a CandidateNominationInput with given quota, seat assignment input
/// and total seats per list number.
pub fn candidate_nomination_fixture_with_given_list_numbers_and_number_of_seats(
    quota: Fraction,
    seat_assignment_input: &ApportionmentInputMock,
    total_seats_per_list_number: Vec<(u32, u32)>,
) -> CandidateNominationInput<'_, ListVotesMock> {
    CandidateNominationInput {
        number_of_seats: seat_assignment_input.number_of_seats,
        list_votes: &seat_assignment_input.list_votes,
        quota,
        total_seats_per_list:
            convert_total_seats_per_u32_list_number_to_total_seats_per_list_number(
                total_seats_per_list_number,
            ),
    }
}

/// Create a ApportionmentInputMock with consecutive list numbers
/// and given list votes and number of seats.
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

/// Create a ApportionmentInputMock with given number of seats and list numbers and votes.
pub fn seat_assignment_fixture_with_given_list_numbers_and_candidate_votes(
    number_of_seats: u32,
    list_candidate_votes: Vec<(u32, Vec<u32>)>,
) -> ApportionmentInputMock {
    let total_votes = list_candidate_votes
        .iter()
        .map(|(_, candidate_votes)| candidate_votes.iter().sum::<u32>())
        .sum();

    let mut list_votes: Vec<ListVotesMock> = vec![];
    for (list_number, list_candidate_votes) in list_candidate_votes.iter() {
        list_votes.push(ListVotesMock::from_test_data_auto(
            ListNumber::from(*list_number),
            list_candidate_votes,
        ))
    }

    ApportionmentInputMock {
        number_of_seats,
        total_votes,
        list_votes,
    }
}

/// Create a ApportionmentInputMock with consecutive list numbers
/// and given candidate votes per list and number of seats.
/// The number of lists is the length of the `candidate_votes` vector.
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

/// Create a ApportionmentInputMock with given list numbers and
/// given candidate numbers and votes per list and number of seats.
/// The number of lists is the length of the `list_number_candidate_votes` vector.
pub fn seat_assignment_fixture_with_given_list_numbers_candidate_numbers_and_votes(
    number_of_seats: u32,
    list_number_candidate_votes: Vec<(u32, Vec<(u32, u32)>)>,
) -> ApportionmentInputMock {
    let mut total_votes = 0;
    let mut list_votes: Vec<ListVotesMock> = vec![];
    for (list_number, list_candidate_votes) in list_number_candidate_votes.iter() {
        let list_total_votes = list_candidate_votes
            .iter()
            .map(|(_, candidate_votes)| candidate_votes)
            .sum();
        total_votes += list_total_votes;
        list_votes.push(ListVotesMock {
            number: ListNumber::from(*list_number),
            total_votes: list_total_votes,
            candidate_votes: list_candidate_votes
                .iter()
                .map(|(number, candidate_votes)| CandidateVotesMock {
                    number: CandidateNumber::from(*number),
                    votes: *candidate_votes,
                })
                .collect(),
        })
    }

    ApportionmentInputMock {
        number_of_seats,
        total_votes,
        list_votes,
    }
}
