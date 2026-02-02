use super::{
    candidate_nomination::CandidateNominationResult,
    fraction::Fraction,
    int_newtype_macro::int_newtype,
    seat_assignment::{SeatAssignmentResult, get_total_seats_from_apportionment_result},
};

pub(crate) const LARGE_COUNCIL_THRESHOLD: u32 = 19;

int_newtype!(CandidateNumber);
int_newtype!(ListNumber);

/// Errors that can occur during apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentError {
    AllListsExhausted,
    ApportionmentNotAvailableUntilDataEntryFinalised,
    DrawingOfLotsNotImplemented,
    ZeroVotesCast,
}

pub trait ApportionmentInput {
    type List: ListVotesTrait;

    fn number_of_seats(&self) -> u32;
    fn total_votes(&self) -> u32;
    fn list_votes(&self) -> &[Self::List];
}

pub struct ApportionmentOutput {
    pub seat_assignment: SeatAssignmentResult,
    pub candidate_nomination: CandidateNominationResult,
}

pub trait ListVotesTrait {
    type Cv: CandidateVotesTrait;

    fn number(&self) -> u32;
    fn total(&self) -> u32;
    fn candidate_votes(&self) -> &[Self::Cv];
}

pub trait CandidateVotesTrait {
    fn number(&self) -> u32;
    fn votes(&self) -> u32;
}

// Internal
pub(crate) struct SeatAssignmentInput {
    pub number_of_seats: u32,
    pub total_votes: u32,
    pub list_votes: Vec<ListVotes>,
}

impl SeatAssignmentInput {
    pub fn new(input: &impl ApportionmentInput) -> Self {
        SeatAssignmentInput {
            number_of_seats: input.number_of_seats(),
            total_votes: input.total_votes(),
            list_votes: list_votes_from_input(input),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct ListVotes {
    pub number: ListNumber,
    pub list_votes: u32,
    pub candidate_votes: Vec<CandidateVotes>,
}

impl ListVotes {
    #[cfg(test)]
    pub fn from_test_data_auto(number: ListNumber, candidate_votes: &[u32]) -> Self {
        use crate::structs::CandidateVotes;

        ListVotes {
            number,
            list_votes: candidate_votes.iter().sum(),
            candidate_votes: candidate_votes
                .iter()
                .enumerate()
                .map(|(i, votes)| CandidateVotes {
                    number: CandidateNumber::try_from(i + 1).unwrap(),
                    votes: *votes,
                })
                .collect(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CandidateVotes {
    pub number: CandidateNumber,
    pub votes: u32,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct CandidateNominationInput {
    pub number_of_seats: u32,
    pub list_votes: Vec<ListVotes>,
    pub quota: Fraction,
    // TODO: #2785 Should be mapped by ListNumber, not index
    pub total_seats_per_list: Vec<u32>,
}

impl CandidateNominationInput {
    pub fn new(input: &impl ApportionmentInput, seat_assignment: &SeatAssignmentResult) -> Self {
        CandidateNominationInput {
            number_of_seats: input.number_of_seats(),
            list_votes: list_votes_from_input(input),

            quota: seat_assignment.quota,
            total_seats_per_list: get_total_seats_from_apportionment_result(seat_assignment),
        }
    }
}

fn list_votes_from_input<T: ApportionmentInput>(input: &T) -> Vec<ListVotes> {
    input
        .list_votes()
        .iter()
        .map(|list| ListVotes {
            number: ListNumber::from(list.number()),
            list_votes: list.total(),
            candidate_votes: list
                .candidate_votes()
                .iter()
                .map(|cv| CandidateVotes {
                    number: CandidateNumber::from(cv.number()),
                    votes: cv.votes(),
                })
                .collect(),
        })
        .collect()
}
