use crate::{
    ApportionmentInput, CandidateVotesTrait, SeatAssignmentResult,
    candidate_nomination::{Candidate, ListCandidateNomination, candidate_votes_numbers},
    structs::CandidateNumber,
};

use super::{
    ListVotesTrait,
    fraction::Fraction,
    structs::{CandidateNominationInput, ListNumber},
};

pub struct ApportionmentInputMock {
    pub number_of_seats: u32,
    pub list_votes: Vec<ListVotesMock>,
}

impl ApportionmentInput for ApportionmentInputMock {
    type List = ListVotesMock;

    fn number_of_seats(&self) -> u32 {
        self.number_of_seats
    }

    fn list_votes(&self) -> &[Self::List] {
        &self.list_votes
    }
}

#[derive(Debug, PartialEq)]
pub struct ListVotesMock {
    pub number: ListNumber,
    pub candidate_votes: Vec<CandidateVotesMock>,
}

impl ListVotesTrait for ListVotesMock {
    type Cv = CandidateVotesMock;

    fn number(&self) -> ListNumber {
        self.number
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

pub fn get_total_seats_from_apportionment_result(result: &SeatAssignmentResult) -> Vec<u32> {
    result
        .final_standing
        .iter()
        .map(|p| p.total_seats)
        .collect::<Vec<_>>()
}

pub fn check_list_candidate_nomination<T: CandidateVotesTrait>(
    nomination: &ListCandidateNomination<T>,
    expected_preferential_nomination: &[u32],
    expected_other_nomination: &[u32],
    expected_updated_ranking: &[u32],
) {
    assert_eq!(
        candidate_votes_numbers(&nomination.preferential_candidate_nomination),
        expected_preferential_nomination
    );
    assert_eq!(
        candidate_votes_numbers(&nomination.other_candidate_nomination),
        expected_other_nomination
    );

    assert_eq!(
        nomination.updated_candidate_ranking.to_vec(),
        expected_updated_ranking
    );
}

pub fn check_chosen_candidates<T: CandidateVotesTrait>(
    chosen_candidates: &[Candidate],
    list_number: &ListNumber,
    expected_chosen_candidates: &[T],
    expected_not_chosen_candidates: &[T],
) {
    assert!(expected_chosen_candidates.iter().all(|expected_candidate| {
        chosen_candidates.iter().any(|chosen_candidate| {
            chosen_candidate.list_number == *list_number
                && chosen_candidate.candidate_number == expected_candidate.number()
        })
    }));
    assert!(
        expected_not_chosen_candidates
            .iter()
            .all(|expected_candidate| {
                !chosen_candidates.iter().any(|chosen_candidate| {
                    chosen_candidate.list_number == *list_number
                        && chosen_candidate.candidate_number == expected_candidate.number()
                })
            })
    );
}

pub fn get_chosen_and_not_chosen_candidates_for_a_list<T: CandidateVotesTrait + Clone>(
    list_candidates: &[T],
    list_preferential_nominated_candidate_numbers: &[u32],
    list_other_nominated_candidate_numbers: &[u32],
) -> (Vec<T>, Vec<T>) {
    let nominated_numbers: Vec<&u32> = list_preferential_nominated_candidate_numbers
        .iter()
        .chain(list_other_nominated_candidate_numbers)
        .collect();

    let chosen_candidates: Vec<T> = list_candidates
        .iter()
        .filter(|c| nominated_numbers.iter().any(|&&n| c.number() == n))
        .cloned()
        .collect();
    let not_chosen_candidates: Vec<T> = list_candidates
        .iter()
        .filter(|c| !nominated_numbers.iter().any(|&&n| c.number() == n))
        .cloned()
        .collect();
    (chosen_candidates, not_chosen_candidates)
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
        list_votes,
    }
}

/// Create a ApportionmentInputMock with given number of seats and list numbers and votes.
pub fn seat_assignment_fixture_with_given_list_numbers_and_candidate_votes(
    number_of_seats: u32,
    list_candidate_votes: Vec<(u32, Vec<u32>)>,
) -> ApportionmentInputMock {
    let mut list_votes: Vec<ListVotesMock> = vec![];
    for (list_number, list_candidate_votes) in list_candidate_votes.iter() {
        list_votes.push(ListVotesMock::from_test_data_auto(
            ListNumber::from(*list_number),
            list_candidate_votes,
        ))
    }

    ApportionmentInputMock {
        number_of_seats,
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
    let mut list_votes: Vec<ListVotesMock> = vec![];
    for (list_index, list_candidate_votes) in candidate_votes.iter().enumerate() {
        list_votes.push(ListVotesMock::from_test_data_auto(
            ListNumber::try_from(list_index + 1).unwrap(),
            list_candidate_votes,
        ))
    }

    ApportionmentInputMock {
        number_of_seats,
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
    let mut list_votes: Vec<ListVotesMock> = vec![];
    for (list_number, list_candidate_votes) in list_number_candidate_votes.iter() {
        list_votes.push(ListVotesMock {
            number: ListNumber::from(*list_number),
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
        list_votes,
    }
}
