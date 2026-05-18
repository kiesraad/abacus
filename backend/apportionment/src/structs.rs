use std::{
    collections::{HashMap, HashSet},
    fmt::Debug,
    hash::Hash,
};

use super::{
    candidate_nomination::CandidateNominationResult, fraction::Fraction,
    seat_assignment::SeatAssignmentResult,
};

pub(crate) const LARGE_COUNCIL_THRESHOLD: u32 = 19;

/// Errors that can occur during apportionment
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ApportionmentError {
    AllListsExhausted,
    DrawingOfLotsNotImplemented,
    ZeroVotesCast,
}

pub type DeceasedCandidates<T> = HashMap<
    <T as ListVotes>::ListNumber,
    HashSet<<<T as ListVotes>::Cv as CandidateVotes>::CandidateNumber>,
>;

pub trait ApportionmentInput {
    type List: ListVotes;

    fn number_of_seats(&self) -> u32;
    fn list_votes(&self) -> &[Self::List];
    fn deceased_candidates(&self) -> &DeceasedCandidates<Self::List>;
}

pub struct ApportionmentOutput<'a, T: ListVotes> {
    pub seat_assignment: SeatAssignmentResult<T>,
    pub candidate_nomination: CandidateNominationResult<'a, T>,
}

pub trait ListVotes: PartialEq + Debug {
    type Cv: CandidateVotes;
    type ListNumber: Copy + Debug + Eq + Hash;

    fn number(&self) -> Self::ListNumber;
    fn total_votes(&self) -> u32 {
        self.candidate_votes()
            .iter()
            .map(|candidate_votes| candidate_votes.votes())
            .sum()
    }
    fn candidate_votes(&self) -> &[Self::Cv];
}

pub trait CandidateVotes: PartialEq + Debug {
    type CandidateNumber: Copy + Debug + Eq + Hash;

    fn number(&self) -> Self::CandidateNumber;
    fn votes(&self) -> u32;
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct CandidateNominationInput<'a, L: ListVotes> {
    pub number_of_seats: u32,
    pub list_votes: &'a [L],
    pub deceased_candidates: &'a DeceasedCandidates<L>,
    pub quota: Fraction,
    pub total_seats_per_list: Vec<(L::ListNumber, u32)>,
}

pub(crate) type CandidateNominationInputType<'a, T> =
    CandidateNominationInput<'a, <T as ApportionmentInput>::List>;
