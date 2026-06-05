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

// Type alias for the ListNumber in the ListVotes trait
pub type ListNumber<LV> = <LV as ListVotes>::ListNumber;
// Type alias for the CandidateNumber in the CandidateVotes trait
pub type CandidateNumber<LV> = <<LV as ListVotes>::Cv as CandidateVotes>::CandidateNumber;

/// Errors that can occur during apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentError<LN, CN> {
    ListDrawingLotsRequired(ListDrawingLotsRequired<LN>),
    CandidateDrawingLotsRequired(CandidateDrawingLotsRequired<LN, CN>),
}

/// Used in [ApportionmentError] to indicate that drawing lots for a list is needed,
/// containing all the information needed to do the drawing
#[derive(Debug, PartialEq)]
pub struct ListDrawingLotsRequired<LN> {
    pub variant: ListDrawingLotsVariant,
    pub options: Vec<LN>,
}

impl<LN, CN> From<ListDrawingLotsRequired<LN>> for ApportionmentError<LN, CN> {
    fn from(value: ListDrawingLotsRequired<LN>) -> Self {
        ApportionmentError::ListDrawingLotsRequired(value)
    }
}

/// Used in [ApportionmentError] to indicate that drawing lots for a candidate is needed,
/// containing all the information needed to do the drawing
#[derive(Debug, PartialEq)]
pub struct CandidateDrawingLotsRequired<LN, CN> {
    pub list: LN,
    pub options: Vec<CN>,
}

impl<LN, CN> From<CandidateDrawingLotsRequired<LN, CN>> for ApportionmentError<LN, CN> {
    fn from(value: CandidateDrawingLotsRequired<LN, CN>) -> Self {
        ApportionmentError::CandidateDrawingLotsRequired(value)
    }
}

#[derive(Copy, Clone, Debug, PartialEq)]
pub enum ListDrawingLotsVariant {
    // Draw lots for assigning a highest average residual seat
    HighestAverageResidualSeat,
    // Draw lots for assigning a largest remainder residual seat
    LargestRemainderResidualSeat,
    // Draw lots for removing a seat to be reassigned because of absolute majority (P9)
    AbsoluteMajority,
}

/// The list that has been drawn plus information to assert the correct drawing
pub trait ListDrawn<LN> {
    // The type of seat assignment or removal that lots need to be drawn for
    fn variant(&self) -> ListDrawingLotsVariant;
    // The lists that lots are drawn for
    fn options(&self) -> &[LN];
    // The list that the lot was drawn for
    fn drawn(&self) -> &LN;
}

/// The candidate that has been drawn plus information to assert the correct drawing
pub trait CandidateDrawn<LN, CN> {
    // The list the candidate need to be drawn from
    fn list(&self) -> &LN;
    // The candidates that lots are drawn for
    fn options(&self) -> &[CN];
    // The candidate that the lot was drawn for
    fn drawn(&self) -> &CN;
}

/// [HashMap] of a list number to a [HashSet] of candidate numbers that are deceased,
/// to enforce that they are unique and easily retrievable.
pub type DeceasedCandidates<LV> = HashMap<ListNumber<LV>, HashSet<CandidateNumber<LV>>>;

pub trait ApportionmentInput {
    type List: ListVotes;
    type ListDrawn: ListDrawn<ListNumber<Self::List>>;
    type CandidateDrawn: CandidateDrawn<ListNumber<Self::List>, CandidateNumber<Self::List>>;

    fn number_of_seats(&self) -> u32;
    fn list_votes(&self) -> &[Self::List];
    fn deceased_candidates(&self) -> &DeceasedCandidates<Self::List>;
    fn lists_drawn(&self) -> impl Iterator<Item = &Self::ListDrawn>;
    fn candidates_drawn(&self) -> impl Iterator<Item = &Self::CandidateDrawn>;
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
