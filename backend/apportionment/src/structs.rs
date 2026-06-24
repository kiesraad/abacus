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

    /// Validate the list drawn against this variant.
    ///
    /// Return [[ApportionmentError::InvalidLotDrawing]] if the variant is different
    /// or the list drawn is not one of the options.
    pub fn validate(&self, list_drawn: &impl ListDrawn<LN>) -> Result<(), ApportionmentError> {
        if list_drawn.variant() != *self {
            return Err(ApportionmentError::InvalidLotDrawing(
                "Variant mismatch".to_string(),
            ));
        }

        if !self.options().contains(list_drawn.drawn()) {
            return Err(ApportionmentError::InvalidLotDrawing(
                "Invalid number drawn".to_string(),
            ));
        }

        Ok(())
    }
}

impl<LN> ListDrawingLotsVariant<LN> {
    /// The list numbers that are options for drawing lots
    pub fn options(&self) -> &[LN] {
        match self {
            Self::HighestAverageResidualSeat(v) => &v.options,
            Self::LargestRemainderResidualSeat(v) => &v.options,
            Self::AbsoluteMajorityLargestRemainder(v) => &v.options,
            Self::AbsoluteMajorityHighestAverage(v) => &v.options,
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
pub struct CandidateDrawingLotsVariant<LN: PartialEq, CN: PartialEq> {
    pub list: LN,
    pub options: Vec<CN>,
}

impl<LN: PartialEq, CN: PartialEq> CandidateDrawingLotsVariant<LN, CN> {
    /// Validate the candidate drawn against this variant.
    ///
    /// Return [[ApportionmentError::InvalidLotDrawing]] if the variant is different
    /// or the candidate drawn is not one of the options.
    pub fn validate(
        &self,
        candidate_drawn: &impl CandidateDrawn<LN, CN>,
    ) -> Result<(), ApportionmentError> {
        if candidate_drawn.variant() != *self {
            return Err(ApportionmentError::InvalidLotDrawing(
                "Variant mismatch".to_string(),
            ));
        }

        if !self.options.contains(candidate_drawn.drawn()) {
            return Err(ApportionmentError::InvalidLotDrawing(
                "Invalid number drawn".to_string(),
            ));
        }

        Ok(())
    }
}

/// The candidate that has been drawn and the variant with all information about the drawing
pub trait CandidateDrawn<LN: PartialEq, CN: PartialEq> {
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
    pub total_seats_per_list: HashMap<L::ListNumber, u32>,
}

#[cfg(test)]
mod tests {
    use std::assert_matches;

    use super::*;
    use crate::{
        seat_assignment::{LargestRemainderAssignedSeat, ListExhaustionRemovedSeat},
        test_helpers::ListDrawnMock,
    };

    #[test]
    fn test_absolute_majority_for_seat_change_ok() {
        let details = AbsoluteMajorityDrawingLots {
            assign_to: 1,
            options: vec![1],
        };

        let seat_change = SeatChange::LargestRemainderAssignment(LargestRemainderAssignedSeat {
            selected_list_number: 1,
            list_options: vec![1],
            list_assigned: vec![1],
            remainder_votes: Fraction::ZERO,
            drawing_lots: None,
        });

        assert_eq!(
            ListDrawingLotsVariant::absolute_majority_for_seat_change(
                &seat_change,
                details.clone()
            ),
            Ok(ListDrawingLotsVariant::AbsoluteMajorityLargestRemainder(
                details
            ))
        );
    }

    #[test]
    fn test_absolute_majority_for_seat_change_err() {
        let details = AbsoluteMajorityDrawingLots {
            assign_to: 1,
            options: vec![1],
        };

        let seat_change = SeatChange::ListExhaustionRemoval(ListExhaustionRemovedSeat {
            list_retracted_seat: 1,
            full_seat: false,
        });

        assert_matches!(
            ListDrawingLotsVariant::absolute_majority_for_seat_change(&seat_change, details),
            Err(ApportionmentError::InvalidState(_))
        );
    }

    #[test]
    fn test_list_drawing_lots_variant_validate() {
        let variant =
            ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(AbsoluteMajorityDrawingLots {
                assign_to: 1,
                options: vec![2, 3],
            });

        let another_variant =
            ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(AbsoluteMajorityDrawingLots {
                assign_to: 4,
                options: vec![2, 3],
            });

        assert_eq!(
            variant.validate(&ListDrawnMock::new(&another_variant, 3)),
            Err(ApportionmentError::InvalidLotDrawing(
                "Variant mismatch".to_string()
            ))
        );

        assert_eq!(
            variant.validate(&ListDrawnMock::new(&variant, 9)),
            Err(ApportionmentError::InvalidLotDrawing(
                "Invalid number drawn".to_string()
            ))
        );

        assert_eq!(variant.validate(&ListDrawnMock::new(&variant, 2)), Ok(()));
    }
}
