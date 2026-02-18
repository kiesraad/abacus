use super::{
    candidate_nomination::CandidateNominationResult, fraction::Fraction,
    seat_assignment::SeatAssignmentResult,
};
use std::fmt::Debug;

pub(crate) const LARGE_COUNCIL_THRESHOLD: u32 = 19;

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
    pub seat_assignment: SeatAssignmentResult<T>,
    pub candidate_nomination: CandidateNominationResult<'a, T>,
}

pub trait ListVotesTrait: PartialEq + Debug {
    type Cv: CandidateVotesTrait;
    type ListNumber: Copy + Debug + Eq;

    fn number(&self) -> Self::ListNumber;
    fn total_votes(&self) -> u32;
    fn candidate_votes(&self) -> &[Self::Cv];
}

pub trait CandidateVotesTrait: PartialEq + Debug {
    type CandidateNumber: Copy + Debug + Eq;

    fn number(&self) -> Self::CandidateNumber;
    fn votes(&self) -> u32;
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct CandidateNominationInput<'a, L: ListVotesTrait> {
    pub number_of_seats: u32,
    pub list_votes: &'a [L],
    pub quota: Fraction,
    pub total_seats_per_list: Vec<(L::ListNumber, u32)>,
}

pub(crate) type CandidateNominationInputType<'a, T> =
    CandidateNominationInput<'a, <T as ApportionmentInput>::List>;
