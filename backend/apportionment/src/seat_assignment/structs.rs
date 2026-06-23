use std::fmt::Debug;

use tracing::{debug, info};

use super::Fraction;
use crate::{ApportionmentError, ListDrawingLotsVariant, ListVotes};

/// The result of the seat assignment procedure. This contains the number of seats and the quota
/// that was used. It then contains the initial standing after full seats were assigned,
/// and each of the changes and intermediate standings. The final standing contains the
/// number of seats per list that was assigned after all seats were assigned.
#[derive(Debug, PartialEq)]
pub struct SeatAssignmentDetails<LN> {
    pub seats: u32,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub quota: Fraction,
    pub steps: Vec<SeatChangeStep<LN>>,
    pub standings: Vec<ListSeatAssignment<LN>>,
}

impl<LN: Copy> SeatAssignmentDetails<LN> {
    pub fn warnings(&self) -> Vec<ApportionmentWarning> {
        let mut warnings = Vec::new();
        let has_p9 = self
            .steps
            .iter()
            .any(|s| s.change.is_changed_by_absolute_majority_reassignment());
        let has_p10 = self
            .steps
            .iter()
            .any(|s| s.change.is_changed_by_list_exhaustion_removal());
        if has_p9 && has_p10 {
            warnings.push(ApportionmentWarning::AbsoluteMajorityAndListExhaustion);
        }
        if self.full_seats + self.residual_seats < self.seats {
            warnings.push(ApportionmentWarning::NotAllSeatsAssigned);
        }
        warnings
    }
}

/// Warnings derived from a completed seat assignment
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ApportionmentWarning {
    /// Both an absolute-majority reassignment (P9) and a list-exhaustion
    /// removal (P10) occurred in the same apportionment.
    AbsoluteMajorityAndListExhaustion,
    /// Not all seats could be assigned (e.g. all eligible lists exhausted).
    NotAllSeatsAssigned,
}

/// Contains information about the final assignment of seats for a specific list.
#[derive(Debug, PartialEq)]
pub struct ListSeatAssignment<LN> {
    /// List number for which this assignment applies
    pub list_number: LN,
    /// The number of votes cast for this list
    pub votes_cast: u64,
    /// The remainder votes that were not used to get full seats assigned to this list
    pub remainder_votes: Fraction,
    /// Whether this list met the threshold for largest remainder seat assignment
    pub meets_remainder_threshold: bool,
    /// The number of full seats assigned to this list
    pub full_seats: u32,
    /// The number of residual seats assigned to this list
    pub residual_seats: u32,
    /// The total number of seats assigned to this list
    pub total_seats: u32,
}

impl<LN: Copy + Debug> From<ListStanding<LN>> for ListSeatAssignment<LN> {
    /// Converts a list standing into a list seat assignment.
    fn from(list: ListStanding<LN>) -> Self {
        ListSeatAssignment {
            list_number: list.list_number,
            votes_cast: list.votes_cast,
            remainder_votes: list.remainder_votes,
            meets_remainder_threshold: list.meets_remainder_threshold,
            full_seats: list.full_seats,
            residual_seats: list.residual_seats,
            total_seats: list.total_seats(),
        }
    }
}

/// Contains the standing for a specific list. This is all the information
/// that is needed to compute the apportionment for that specific list.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ListStanding<LN> {
    /// List number for which this standing applies
    list_number: LN,
    /// The number of votes cast for this list
    votes_cast: u64,
    /// The remainder of votes that was not used to get full seats (does not have to be a whole number of votes)
    remainder_votes: Fraction,
    /// Whether the remainder votes meet the threshold to be applicable for largest remainder seat assignment
    meets_remainder_threshold: bool,
    /// The number of votes per seat if a new seat would be added to the current residual seats
    next_votes_per_seat: Fraction,
    /// The number of full seats this list got assigned
    full_seats: u32,
    /// The current number of residual seats this list got assigned
    residual_seats: u32,
}

impl<LN: Debug> ListStanding<LN> {
    /// Create a new instance computing the whole number of seats that
    /// were assigned to a list.
    pub(crate) fn new<T: ListVotes<ListNumber = LN>>(list: &T, quota: Fraction) -> Self {
        let votes_cast = Fraction::from(list.total_votes());
        let full_seats = if votes_cast > Fraction::ZERO {
            u32::try_from((votes_cast / quota).integer_part()).expect("full_seats fit in u32")
        } else {
            0
        };

        let remainder_votes = votes_cast - (Fraction::from(full_seats) * quota);

        debug!(
            "List {:?} has {full_seats} full seats with {:?} votes",
            list.number(),
            list.total_votes()
        );
        ListStanding {
            list_number: list.number(),
            votes_cast: list.total_votes().into(),
            remainder_votes,
            meets_remainder_threshold: votes_cast >= quota * Fraction::new(3, 4),
            next_votes_per_seat: votes_cast / Fraction::from(full_seats + 1),
            full_seats,
            residual_seats: 0,
        }
    }

    /// Remove a full seat from the list
    pub fn remove_full_seat(&mut self) {
        assert!(self.full_seats > 0);
        info!("Removing full seat from list {:?}", self.list_number);
        self.full_seats -= 1;
        self.next_votes_per_seat =
            Fraction::from(self.votes_cast) / Fraction::from(self.total_seats() + 1);
        // NB: remainder_votes is not updated!
    }

    /// Add a residual seat to the list
    pub fn add_residual_seat(&mut self) {
        info!("Adding residual seat to list {:?}", self.list_number);
        self.residual_seats += 1;
        self.next_votes_per_seat =
            Fraction::from(self.votes_cast) / Fraction::from(self.total_seats() + 1);
    }

    /// Remove a residual seat from the list
    pub fn remove_residual_seat(&mut self) {
        assert!(self.residual_seats > 0);
        info!("Removing residual seat from list {:?}", self.list_number);
        self.residual_seats -= 1;
        self.next_votes_per_seat =
            Fraction::from(self.votes_cast) / Fraction::from(self.total_seats() + 1);
    }

    /// Returns the total number of seats assigned to this list
    pub fn total_seats(&self) -> u32 {
        self.full_seats + self.residual_seats
    }
}

impl<LN: Copy> ListStanding<LN> {
    pub fn list_number(self) -> LN {
        self.list_number
    }
    pub fn votes_cast(self) -> u64 {
        self.votes_cast
    }
    pub fn remainder_votes(self) -> Fraction {
        self.remainder_votes
    }
    pub fn meets_remainder_threshold(self) -> bool {
        self.meets_remainder_threshold
    }
    pub fn next_votes_per_seat(self) -> Fraction {
        self.next_votes_per_seat
    }
    pub fn full_seats(self) -> u32 {
        self.full_seats
    }
    pub fn residual_seats(self) -> u32 {
        self.residual_seats
    }
}

pub trait GetListStandingByNumber {
    type ListNumber;

    fn get_by_number(&self, number: Self::ListNumber) -> &ListStanding<Self::ListNumber>;

    fn get_by_number_mut(
        &mut self,
        number: Self::ListNumber,
    ) -> &mut ListStanding<Self::ListNumber>;
}

impl<LN: Copy + PartialEq> GetListStandingByNumber for [ListStanding<LN>] {
    type ListNumber = LN;

    fn get_by_number(&self, number: Self::ListNumber) -> &ListStanding<Self::ListNumber> {
        self.iter()
            .find(|s| s.list_number() == number)
            .expect("ListStanding should exist")
    }

    fn get_by_number_mut(
        &mut self,
        number: Self::ListNumber,
    ) -> &mut ListStanding<Self::ListNumber> {
        self.iter_mut()
            .find(|s| s.list_number() == number)
            .expect("ListStanding should exist")
    }
}

/// Records the change for a specific seat, and how the standing is once
/// that seat was assigned or removed
#[derive(Clone, Debug, PartialEq)]
pub struct SeatChangeStep<LN> {
    pub residual_seat_number: Option<u32>,
    pub change: SeatChange<LN>,
    pub standings: Vec<ListStanding<LN>>,
}

/// Records the list and specific change for a specific residual seat
#[derive(Clone, Debug, PartialEq)]
pub enum SeatChange<LN> {
    HighestAverageAssignment(HighestAverageAssignedSeat<LN>),
    UniqueHighestAverageAssignment(HighestAverageAssignedSeat<LN>),
    LargestRemainderAssignment(LargestRemainderAssignedSeat<LN>),
    AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat<LN>),
    ListExhaustionRemoval(ListExhaustionRemovedSeat<LN>),
}

impl<LN: Copy> SeatChange<LN> {
    /// Get the list number for the list this step has assigned a seat to
    pub fn list_number_assigned(&self) -> LN {
        match self {
            Self::HighestAverageAssignment(highest_average_assigned_seat) => {
                highest_average_assigned_seat.selected_list_number
            }
            Self::UniqueHighestAverageAssignment(unique_highest_average_assigned_seat) => {
                unique_highest_average_assigned_seat.selected_list_number
            }
            Self::LargestRemainderAssignment(largest_remainder_assigned_seat) => {
                largest_remainder_assigned_seat.selected_list_number
            }
            Self::AbsoluteMajorityReassignment(absolute_majority_reassigned_seat) => {
                absolute_majority_reassigned_seat.list_assigned_seat
            }
            Self::ListExhaustionRemoval(_) => unreachable!(),
        }
    }

    /// Get the list number for the list this step has retracted a seat from
    pub fn list_number_retracted(&self) -> LN {
        match self {
            Self::HighestAverageAssignment(_)
            | Self::UniqueHighestAverageAssignment(_)
            | Self::LargestRemainderAssignment(_) => unreachable!(),
            Self::AbsoluteMajorityReassignment(absolute_majority_reassigned_seat) => {
                absolute_majority_reassigned_seat.list_retracted_seat
            }
            Self::ListExhaustionRemoval(list_exhaustion_removed_seat) => {
                list_exhaustion_removed_seat.list_retracted_seat
            }
        }
    }

    /// Get the list of lists with the same average, that have not been assigned a seat
    pub fn list_options(&self) -> Vec<LN> {
        match self {
            Self::HighestAverageAssignment(highest_average_assigned_seat) => {
                highest_average_assigned_seat.list_options.clone()
            }
            Self::UniqueHighestAverageAssignment(unique_highest_average_assigned_seat) => {
                unique_highest_average_assigned_seat.list_options.clone()
            }
            Self::LargestRemainderAssignment(largest_remainder_assigned_seat) => {
                largest_remainder_assigned_seat.list_options.clone()
            }
            Self::AbsoluteMajorityReassignment(_) | Self::ListExhaustionRemoval(_) => {
                unreachable!()
            }
        }
    }

    /// Get the list of lists with the same average or remainder, that have been assigned a seat
    pub fn list_assigned(&self) -> Vec<LN> {
        match self {
            Self::HighestAverageAssignment(highest_average_assigned_seat) => {
                highest_average_assigned_seat.list_assigned.clone()
            }
            Self::UniqueHighestAverageAssignment(unique_highest_average_assigned_seat) => {
                unique_highest_average_assigned_seat.list_assigned.clone()
            }
            Self::LargestRemainderAssignment(largest_remainder_assigned_seat) => {
                largest_remainder_assigned_seat.list_assigned.clone()
            }
            Self::AbsoluteMajorityReassignment(_) | Self::ListExhaustionRemoval(_) => {
                unreachable!()
            }
        }
    }

    /// Returns true if the seat was changed through the largest remainder assignment
    pub fn is_changed_by_largest_remainder_assignment(&self) -> bool {
        matches!(self, Self::LargestRemainderAssignment(_))
    }

    /// Returns true if the seat was changed through the highest average assignment
    pub fn is_changed_by_highest_average_assignment(&self) -> bool {
        matches!(self, Self::HighestAverageAssignment(_))
    }

    /// Returns true if the seat was changed through the unique highest average assignment
    pub fn is_changed_by_unique_highest_average_assignment(&self) -> bool {
        matches!(self, Self::UniqueHighestAverageAssignment(_))
    }

    /// Returns true if the seat was changed through the absolute majority reassignment
    pub fn is_changed_by_absolute_majority_reassignment(&self) -> bool {
        matches!(self, Self::AbsoluteMajorityReassignment(_))
    }

    /// Whether the seat was changed through the list exhaustion removal
    pub fn is_changed_by_list_exhaustion_removal(&self) -> bool {
        matches!(self, Self::ListExhaustionRemoval(_))
    }
}

/// Contains the details for an assigned seat, assigned through the highest average method.
#[derive(Clone, Debug, PartialEq)]
pub struct HighestAverageAssignedSeat<LN> {
    /// The list that was selected for this seat has this list number
    pub selected_list_number: LN,
    /// Collection of lists with the same average, that have not been assigned a seat
    pub list_options: Vec<LN>,
    /// Collection of lists with the same average, that have been assigned a seat
    pub list_assigned: Vec<LN>,
    /// Collection of lists that are exhausted, and will not be assigned a seat
    pub list_exhausted: Vec<LN>,
    /// This is the votes per seat achieved by the selected list
    pub votes_per_seat: Fraction,
}

/// Contains the details for an assigned seat, assigned through the largest remainder method.
#[derive(Clone, Debug, PartialEq)]
pub struct LargestRemainderAssignedSeat<LN> {
    /// The list that was selected for this seat has this list number
    pub selected_list_number: LN,
    /// Collection of lists with the same remainder, that have not been assigned a seat
    pub list_options: Vec<LN>,
    /// Collection of lists with the same remainder, that have been assigned a seat
    pub list_assigned: Vec<LN>,
    /// The number of remainder votes achieved by the selected list
    pub remainder_votes: Fraction,
}

/// Contains information about the enactment of article P 9 of the Kieswet.
#[derive(Clone, Debug, PartialEq)]
pub struct AbsoluteMajorityReassignedSeat<LN> {
    /// List number which the residual seat is retracted from
    pub list_retracted_seat: LN,
    /// List number which the residual seat is assigned to
    pub list_assigned_seat: LN,
}

/// Contains information about the enactment of article P 10 of the Kieswet.
#[derive(Clone, Debug, PartialEq)]
pub struct ListExhaustionRemovedSeat<LN> {
    /// List number which the seat is retracted from
    pub list_retracted_seat: LN,
    /// Whether the removed seat was a full seat
    pub full_seat: bool,
}

/// Result type for residual seat (re)assignment: steps taken and final standings.
pub type RemainderAssignmentResult<LN> = Result<RemainderAssignment<LN>, ApportionmentError>;

pub enum RemainderAssignment<LN> {
    Completed(Vec<SeatChangeStep<LN>>, Vec<ListStanding<LN>>),
    DrawingLotsRequired(
        ListDrawingLotsVariant<LN>,
        Vec<SeatChangeStep<LN>>,
        Vec<ListStanding<LN>>,
    ),
}

/// Result type for absolute majority reassignment: updated standings and optional seat change.
pub type AbsoluteMajorityResult<LN> = Result<AbsoluteMajority<LN>, ApportionmentError>;

pub enum AbsoluteMajority<LN> {
    Completed(Vec<ListStanding<LN>>, Option<SeatChange<LN>>),
    DrawingLotsRequired(ListDrawingLotsVariant<LN>),
}
