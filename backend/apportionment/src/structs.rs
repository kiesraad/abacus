use super::{
    candidate_nomination::CandidateNominationResult,
    fraction::Fraction,
    int_newtype_macro::int_newtype,
    seat_assignment::{SeatAssignmentResult, get_total_seats_from_apportionment_result},
};
use std::fmt::Debug;

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

pub struct ApportionmentOutput<'a, T: ListVotesTrait> {
    pub seat_assignment: SeatAssignmentResult,
    pub candidate_nomination: CandidateNominationResult<'a, T::Cv>,
}

pub trait ListVotesTrait: PartialEq + Debug {
    type Cv: CandidateVotesTrait;

    fn number(&self) -> ListNumber;
    fn total_votes(&self) -> u32;
    fn candidate_votes(&self) -> &[Self::Cv];
}

pub trait CandidateVotesTrait: PartialEq + Debug {
    fn number(&self) -> CandidateNumber;
    fn votes(&self) -> u32;
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct CandidateNominationInput<'a, L: ListVotesTrait> {
    pub number_of_seats: u32,
    pub list_votes: &'a [L],
    pub quota: Fraction,
    // TODO: #2785 Should be mapped by ListNumber, not index
    pub total_seats_per_list: Vec<u32>,
}

pub(crate) type CandidateNominationInputType<'a, T> =
    CandidateNominationInput<'a, <T as ApportionmentInput>::List>;

pub(crate) fn as_candidate_nomination_input<'a, T: ApportionmentInput>(
    input: &'a T,
    seat_assignment: &SeatAssignmentResult,
) -> CandidateNominationInputType<'a, T> {
    CandidateNominationInput {
        number_of_seats: input.number_of_seats(),
        list_votes: input.list_votes(),
        quota: seat_assignment.quota,
        total_seats_per_list: get_total_seats_from_apportionment_result(seat_assignment),
    }
}
