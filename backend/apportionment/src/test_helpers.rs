use crate::{
    ApportionmentInput, CandidateVotes, SeatAssignmentResult,
    candidate_nomination::{Candidate, ListCandidateNomination, candidate_votes_numbers},
};

use super::{ListVotes, fraction::Fraction, structs::CandidateNominationInput};

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
    pub number: u32,
    pub candidate_votes: Vec<CandidateVotesMock>,
}

impl ListVotes for ListVotesMock {
    type Cv = CandidateVotesMock;
    type ListNumber = u32;

    fn number(&self) -> Self::ListNumber {
        self.number
    }

    fn candidate_votes(&self) -> &[Self::Cv] {
        &self.candidate_votes
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct CandidateVotesMock {
    pub number: u32,
    pub votes: u32,
}

impl CandidateVotes for CandidateVotesMock {
    type CandidateNumber = u32;

    fn number(&self) -> Self::CandidateNumber {
        self.number
    }

    fn votes(&self) -> u32 {
        self.votes
    }
}

impl ListVotesMock {
    pub fn from_test_data_auto(number: u32, candidate_votes: Vec<u32>) -> Self {
        ListVotesMock {
            number,
            candidate_votes: candidate_votes
                .into_iter()
                .enumerate()
                .map(|(i, votes)| CandidateVotesMock {
                    number: u32::try_from(i + 1).unwrap(),
                    votes,
                })
                .collect(),
        }
    }
}

pub fn get_total_seats_from_apportionment_result(
    result: &SeatAssignmentResult<ListVotesMock>,
) -> Vec<u32> {
    result
        .final_standing
        .iter()
        .map(|p| p.total_seats)
        .collect::<Vec<_>>()
}

pub fn check_list_candidate_nomination(
    nomination: &ListCandidateNomination<ListVotesMock>,
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

pub fn check_chosen_candidates(
    chosen_candidates: &[Candidate<ListVotesMock>],
    list_number: u32,
    expected_chosen_candidates: &[CandidateVotesMock],
    expected_not_chosen_candidates: &[CandidateVotesMock],
) {
    assert!(expected_chosen_candidates.iter().all(|expected_candidate| {
        chosen_candidates.iter().any(|chosen_candidate| {
            chosen_candidate.list_number == list_number
                && chosen_candidate.candidate_number == expected_candidate.number()
        })
    }));
    assert!(
        expected_not_chosen_candidates
            .iter()
            .all(|expected_candidate| {
                !chosen_candidates.iter().any(|chosen_candidate| {
                    chosen_candidate.list_number == list_number
                        && chosen_candidate.candidate_number == expected_candidate.number()
                })
            })
    );
}

pub fn get_chosen_and_not_chosen_candidates_for_a_list(
    list_candidates: &[CandidateVotesMock],
    list_preferential_nominated_candidate_numbers: &[u32],
    list_other_nominated_candidate_numbers: &[u32],
) -> (Vec<CandidateVotesMock>, Vec<CandidateVotesMock>) {
    let nominated_numbers: Vec<&u32> = list_preferential_nominated_candidate_numbers
        .iter()
        .chain(list_other_nominated_candidate_numbers)
        .collect();

    // TODO: Using clones, but it is testcode. Could be improved.
    let chosen_candidates = list_candidates
        .iter()
        .filter(|c| nominated_numbers.iter().any(|&&n| c.number() == n))
        .cloned()
        .collect();
    let not_chosen_candidates = list_candidates
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
            .into_iter()
            .enumerate()
            .map(|(list_index, total_seats)| (u32::try_from(list_index + 1).unwrap(), total_seats))
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
        total_seats_per_list: total_seats_per_list_number,
    }
}

/// Create a ApportionmentInputMock with consecutive list numbers
/// and given list votes and number of seats.
pub fn seat_assignment_fixture_with_default_50_candidates(
    number_of_seats: u32,
    list_vote_counts: Vec<u32>,
) -> ApportionmentInputMock {
    let mut list_votes: Vec<ListVotesMock> = vec![];
    for (index, votes) in list_vote_counts.into_iter().enumerate() {
        // Create list with 50 candidates with 0 votes
        let mut candidate_votes: Vec<u32> = vec![0; 50];
        // Set votes to first candidate
        candidate_votes[0] = votes;
        list_votes.push(ListVotesMock::from_test_data_auto(
            u32::try_from(index + 1).unwrap(),
            candidate_votes,
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
    for (list_number, list_candidate_votes) in list_candidate_votes.into_iter() {
        list_votes.push(ListVotesMock::from_test_data_auto(
            list_number,
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
    for (list_index, list_candidate_votes) in candidate_votes.into_iter().enumerate() {
        list_votes.push(ListVotesMock::from_test_data_auto(
            u32::try_from(list_index + 1).unwrap(),
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
    for (list_number, list_candidate_votes) in list_number_candidate_votes.into_iter() {
        list_votes.push(ListVotesMock {
            number: list_number,
            candidate_votes: list_candidate_votes
                .into_iter()
                .map(|(number, candidate_votes)| CandidateVotesMock {
                    number,
                    votes: candidate_votes,
                })
                .collect(),
        })
    }

    ApportionmentInputMock {
        number_of_seats,
        list_votes,
    }
}
