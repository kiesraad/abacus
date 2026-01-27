use super::{
    fraction::Fraction,
    structs::{CandidateNominationInput, ListNumber, ListVotes, SeatAssignmentInput},
};

pub fn candidate_nomination_fixture_with_given_number_of_seats(
    quota: Fraction,
    number_of_seats: u32,
    candidate_votes: Vec<Vec<u32>>,
    total_seats_per_list: Vec<u32>,
) -> CandidateNominationInput {
    let seat_assignment_input =
        seat_assignment_fixture_with_given_candidate_votes(number_of_seats, candidate_votes);

    CandidateNominationInput {
        number_of_seats: seat_assignment_input.number_of_seats,
        list_votes: seat_assignment_input.list_votes,
        quota,
        total_seats_per_list,
    }
}

/// Create a SeatAssignmentInput with given total votes and list votes.
pub fn seat_assignment_fixture_with_default_50_candidates(
    number_of_seats: u32,
    list_vote_counts: Vec<u32>,
) -> SeatAssignmentInput {
    let total_votes = list_vote_counts.iter().sum();

    let mut list_votes: Vec<ListVotes> = vec![];
    for (index, votes) in list_vote_counts.iter().enumerate() {
        // Create list with 50 candidates with 0 votes
        let mut candidate_votes: Vec<u32> = vec![0; 50];
        // Set votes to first candidate
        candidate_votes[0] = *votes;
        list_votes.push(ListVotes::from_test_data_auto(
            ListNumber::try_from(index + 1).unwrap(),
            &candidate_votes,
        ))
    }

    SeatAssignmentInput {
        number_of_seats,
        total_votes,
        list_votes,
    }
}

/// Create a SeatAssignmentInput with given votes per list.  
/// The number of lists is the length of the `list_votes` vector.  
/// The number of candidates in each list is by default 50.
pub fn seat_assignment_fixture_with_given_candidate_votes(
    number_of_seats: u32,
    candidate_votes: Vec<Vec<u32>>,
) -> SeatAssignmentInput {
    let total_votes = candidate_votes.iter().flatten().sum();
    let mut list_votes: Vec<ListVotes> = vec![];
    for (list_index, list_candidate_votes) in candidate_votes.iter().enumerate() {
        list_votes.push(ListVotes::from_test_data_auto(
            ListNumber::try_from(list_index + 1).unwrap(),
            list_candidate_votes,
        ))
    }

    SeatAssignmentInput {
        number_of_seats,
        total_votes,
        list_votes,
    }
}
