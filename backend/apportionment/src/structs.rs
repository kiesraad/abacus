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

/// Type alias for the ListNumber in the ListVotes trait
pub type ListNumber<LV> = <LV as ListVotes>::ListNumber;
/// Type alias for the CandidateNumber in the CandidateVotes trait
pub type CandidateNumber<LV> = <<LV as ListVotes>::Cv as CandidateVotes>::CandidateNumber;

/// Errors that can occur during apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentError<LN, CN> {
    ListDrawingLotsRequired(ListDrawingLotsVariant<LN>),
    CandidateDrawingLotsRequired(CandidateDrawingLotsVariant<LN, CN>),
    InvalidLotDrawing(String),
}

/// Used in [ApportionmentError] to indicate that drawing lots for a list is needed,
/// containing all the information needed to do the drawing
#[derive(Debug, PartialEq)]
pub enum ListDrawingLotsError<LN> {
    DrawingLotsRequired(ListDrawingLotsVariant<LN>),
    InvalidLotDrawing(String),
}

impl<LN, CN> From<ListDrawingLotsError<LN>> for ApportionmentError<LN, CN> {
    fn from(value: ListDrawingLotsError<LN>) -> Self {
        match value {
            ListDrawingLotsError::DrawingLotsRequired(variant) => {
                ApportionmentError::ListDrawingLotsRequired(variant)
            }
            ListDrawingLotsError::InvalidLotDrawing(message) => {
                ApportionmentError::InvalidLotDrawing(message)
            }
        }
    }
}

/// Errors that can occur when drawing lots for a candidate  is needed during apportionment
#[derive(Debug, PartialEq)]
pub enum CandidateDrawingLotsError<LN, CN> {
    DrawingLotsRequired(CandidateDrawingLotsVariant<LN, CN>),
}

impl<LN, CN> From<CandidateDrawingLotsError<LN, CN>> for ApportionmentError<LN, CN> {
    fn from(value: CandidateDrawingLotsError<LN, CN>) -> Self {
        match value {
            CandidateDrawingLotsError::DrawingLotsRequired(variant) => {
                ApportionmentError::CandidateDrawingLotsRequired(variant)
            }
        }
    }
}

/// Different variants of drawing lots for lists, with all the information needed to do the drawing
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ListDrawingLotsVariant<LN> {
    /// Draw lots for assigning a highest average residual seat
    HighestAverageResidualSeat(HighestAverageResidualSeatDrawingLots<LN>),
    /// Draw lots for assigning a largest remainder residual seat
    LargestRemainderResidualSeat(LargestRemainderResidualSeatDrawingLots<LN>),
    /// Draw lots for retracting a seat to be reassigned because of absolute majority (P9)
    AbsoluteMajority(AbsoluteMajorityDrawingLots<LN>),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HighestAverageResidualSeatDrawingLots<LN> {
    pub average: Fraction,
    pub residual_seat_numbers: Vec<u32>,
    pub options: Vec<LN>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LargestRemainderResidualSeatDrawingLots<LN> {
    pub remainder: Fraction,
    pub residual_seat_numbers: Vec<u32>,
    pub options: Vec<LN>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AbsoluteMajorityDrawingLots<LN> {
    pub options: Vec<LN>,
}

/// The list that has been drawn and the variant with all information about the drawing
pub trait ListDrawn<LN> {
    /// The type of seat assignment or retraction that lots need to be drawn for
    fn variant(&self) -> ListDrawingLotsVariant<LN>;
    /// The list that the lot was drawn for
    fn drawn(&self) -> &LN;
}

/// Variant of drawing lots for candidates, with all the information needed to do the drawing
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CandidateDrawingLotsVariant<LN, CN> {
    pub list: LN,
    pub options: Vec<CN>,
}

/// The candidate that has been drawn and the variant with all information about the drawing
pub trait CandidateDrawn<LN, CN> {
    /// The type and information for drawing lots
    fn variant(&self) -> CandidateDrawingLotsVariant<LN, CN>;
    /// The candidate that the lot was drawn for
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
