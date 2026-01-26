use crate::{
    PGNumber,
    fraction::Fraction,
    structs::{CandidateNominationInput, ListVotes, SeatAssignmentInput},
};

pub fn candidate_nomination_fixture_with_given_number_of_seats(
    quota: Fraction,
    number_of_seats: u32,
    candidate_votes: Vec<Vec<u32>>,
    total_seats: Vec<u32>,
) -> CandidateNominationInput {
    let seat_assignment_input =
        seat_assignment_fixture_with_given_candidate_votes(number_of_seats, candidate_votes);

    CandidateNominationInput {
        number_of_seats: seat_assignment_input.number_of_seats,
        list_votes: seat_assignment_input.list_votes,
        quota,
        total_seats,
    }
}

/// Create a SeatAssignmentInput with given total votes and list votes.
pub fn seat_assignment_fixture_with_default_50_candidates(
    number_of_seats: u32,
    pg_votes: Vec<u32>,
) -> SeatAssignmentInput {
    let total_votes = pg_votes.iter().sum();

    let mut list_votes: Vec<ListVotes> = vec![];
    for (index, votes) in pg_votes.iter().enumerate() {
        // Create list with 50 candidates with 0 votes
        let mut candidate_votes: Vec<u32> = vec![0; 50];
        // Set votes to first candidate
        candidate_votes[0] = *votes;
        list_votes.push(ListVotes::from_test_data_auto(
            PGNumber::try_from(index + 1).unwrap(),
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
/// The number of lists is the length of the `pg_votes` vector.  
/// The number of candidates in each list is by default 50.
pub fn seat_assignment_fixture_with_given_candidate_votes(
    number_of_seats: u32,
    candidate_votes: Vec<Vec<u32>>,
) -> SeatAssignmentInput {
    let total_votes = candidate_votes.iter().flatten().sum();
    let mut list_votes: Vec<ListVotes> = vec![];
    for (pg_index, pg_candidate_votes) in candidate_votes.iter().enumerate() {
        list_votes.push(ListVotes::from_test_data_auto(
            PGNumber::try_from(pg_index + 1).unwrap(),
            pg_candidate_votes,
        ))
    }

    SeatAssignmentInput {
        number_of_seats,
        total_votes,
        list_votes,
    }
}
