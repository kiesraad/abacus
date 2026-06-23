use std::{
    collections::{HashMap, HashSet},
    fmt::Debug,
    hash::Hash,
};

use super::{
    SeatChange, candidate_nomination::CandidateNominationDetails, fraction::Fraction,
    seat_assignment::SeatAssignmentDetails,
};

pub(crate) const LARGE_COUNCIL_THRESHOLD: u32 = 19;

/// Type alias for the ListNumber in the ListVotes trait
pub type ListNumber<LV> = <LV as ListVotes>::ListNumber;
/// Type alias for the CandidateNumber in the CandidateVotes trait
pub type CandidateNumber<LV> = <<LV as ListVotes>::Cv as CandidateVotes>::CandidateNumber;

/// Errors that can occur during apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentError {
    InvalidLotDrawing(String),
    InvalidState(String),
}

/// Different variants of drawing lots for lists, with all the information needed to do the drawing
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ListDrawingLotsVariant<LN> {
    /// Draw lots for assigning a highest average residual seat
    HighestAverageResidualSeat(HighestAverageResidualSeatDrawingLots<LN>),
    /// Draw lots for assigning a largest remainder residual seat
    LargestRemainderResidualSeat(LargestRemainderResidualSeatDrawingLots<LN>),
    /// Draw lots for retracting a seat to be reassigned because of absolute majority (P9),
    /// retracted seat was from a highest average assignment
    AbsoluteMajorityHighestAverage(AbsoluteMajorityDrawingLots<LN>),
    /// Draw lots for retracting a seat to be reassigned because of absolute majority (P9),
    /// retracted seat was from a largest remainder assignment
    AbsoluteMajorityLargestRemainder(AbsoluteMajorityDrawingLots<LN>),
}

impl<LN: Debug + PartialEq> ListDrawingLotsVariant<LN> {
    /// Return the absolute majority ListDrawingLotsVariant variant that corresponds
    /// with the seat change given.
    pub fn absolute_majority_for_seat_change(
        seat_change: &SeatChange<LN>,
        drawing_lots_details: AbsoluteMajorityDrawingLots<LN>,
    ) -> Result<ListDrawingLotsVariant<LN>, ApportionmentError> {
        match seat_change {
            SeatChange::HighestAverageAssignment(_)
            | SeatChange::UniqueHighestAverageAssignment(_) => Ok(
                ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(drawing_lots_details),
            ),
            SeatChange::LargestRemainderAssignment(_) => Ok(
                ListDrawingLotsVariant::AbsoluteMajorityLargestRemainder(drawing_lots_details),
            ),
            _ => Err(ApportionmentError::InvalidState(format!(
                "Expected seat change highest average or largest remainder but got {:?}",
                seat_change
            ))),
        }
    }

    /// Ensure that this variant is the same as the other variant.
    /// Return [[ApportionmentError::InvalidLotDrawing]] when they are different.
    pub fn ensure_eq(&self, other: &Self) -> Result<(), ApportionmentError> {
        if self != other {
            Err(ApportionmentError::InvalidLotDrawing(
                "Variant mismatch".to_string(),
            ))
        } else {
            Ok(())
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct HighestAverageResidualSeatDrawingLots<LN> {
    pub max_average: Fraction,
    pub residual_seat_numbers: Vec<u32>,
    pub options: Vec<LN>,
    pub list_averages: Vec<(LN, Fraction)>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LargestRemainderResidualSeatDrawingLots<LN> {
    pub max_remainder: Fraction,
    pub residual_seat_numbers: Vec<u32>,
    pub options: Vec<LN>,
    pub list_remainders: Vec<(LN, Fraction)>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AbsoluteMajorityDrawingLots<LN> {
    /// The list where the reassigned residual seat will go to
    pub assign_to: LN,
    /// The list options where the residual seat should come from
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

#[derive(Debug, PartialEq)]
pub struct ApportionmentDetails<'a, T: ListVotes> {
    pub seat_assignment: SeatAssignmentDetails<ListNumber<T>>,
    pub candidate_nomination: CandidateNominationDetails<'a, T>,
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
