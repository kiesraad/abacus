use tracing::{debug, info};

use super::{
    super::structs::{ListNumber, ListVotes},
    Fraction,
};

/// The result of the seat assignment procedure. This contains the number of seats and the quota
/// that was used. It then contains the initial standing after full seats were assigned,
/// and each of the changes and intermediate standings. The final standing contains the
/// number of seats per list that was assigned after all seats were assigned.
#[derive(Debug, PartialEq)]
pub struct SeatAssignmentResult {
    pub seats: u32,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub quota: Fraction,
    pub steps: Vec<SeatChangeStep>,
    pub final_standing: Vec<ListSeatAssignment>,
}

/// Contains information about the final assignment of seats for a specific list.
#[derive(Debug, PartialEq)]
pub struct ListSeatAssignment {
    /// List number for which this assignment applies
    list_number: ListNumber,
    /// The number of votes cast for this group
    votes_cast: u64,
    /// The remainder votes that were not used to get full seats assigned to this list
    remainder_votes: Fraction,
    /// Whether this group met the threshold for largest remainder seat assignment
    meets_remainder_threshold: bool,
    /// The number of full seats assigned to this group
    full_seats: u32,
    /// The number of residual seats assigned to this group
    residual_seats: u32,
    /// The total number of seats assigned to this group
    pub total_seats: u32,
}

impl From<ListStanding> for ListSeatAssignment {
    fn from(list: ListStanding) -> Self {
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
pub struct ListStanding {
    /// List number for which this standing applies
    pub list_number: ListNumber,
    /// The number of votes cast for this group
    pub votes_cast: u64,
    /// The remainder of votes that was not used to get full seats (does not have to be a whole number of votes)
    pub remainder_votes: Fraction,
    /// Whether the remainder votes meet the threshold to be applicable for largest remainder seat assignment
    pub meets_remainder_threshold: bool,
    /// The number of votes per seat if a new seat would be added to the current residual seats
    pub next_votes_per_seat: Fraction,
    /// The number of full seats this list got assigned
    pub full_seats: u32,
    /// The current number of residual seats this list got assigned
    pub residual_seats: u32,
}

impl ListStanding {
    /// Create a new instance computing the whole number of seats that
    /// were assigned to a list.
    pub(crate) fn new(list: &ListVotes, quota: Fraction) -> Self {
        let votes_cast = Fraction::from(list.list_votes);
        let list_seats = if votes_cast > Fraction::ZERO {
            u32::try_from((votes_cast / quota).integer_part()).expect("list_seats fit in u32")
        } else {
            0
        };

        let remainder_votes = votes_cast - (Fraction::from(list_seats) * quota);

        debug!(
            "List {} has {list_seats} full seats with {} votes",
            *list.number, list.list_votes
        );
        ListStanding {
            list_number: list.number,
            votes_cast: list.list_votes.into(),
            remainder_votes,
            meets_remainder_threshold: votes_cast >= quota * Fraction::new(3, 4),
            next_votes_per_seat: votes_cast / Fraction::from(list_seats + 1),
            full_seats: list_seats,
            residual_seats: 0,
        }
    }

    /// Add a residual seat to the list and return the updated instance
    pub fn add_residual_seat(self) -> Self {
        info!("Adding residual seat to list {}", *self.list_number);
        ListStanding {
            residual_seats: self.residual_seats + 1,
            next_votes_per_seat: Fraction::from(self.votes_cast)
                / Fraction::from(self.total_seats() + 2),
            ..self
        }
    }

    /// Returns the total number of seats assigned to this list
    pub fn total_seats(&self) -> u32 {
        self.full_seats + self.residual_seats
    }
}

/// Records the change for a specific seat, and how the standing is once
/// that seat was assigned or removed
#[derive(Clone, Debug, PartialEq)]
pub struct SeatChangeStep {
    pub residual_seat_number: Option<u32>,
    pub change: SeatChange,
    pub standings: Vec<ListStanding>,
}

/// Records the list and specific change for a specific residual seat
#[derive(Clone, Debug, PartialEq)]
pub enum SeatChange {
    HighestAverageAssignment(HighestAverageAssignedSeat),
    UniqueHighestAverageAssignment(HighestAverageAssignedSeat),
    LargestRemainderAssignment(LargestRemainderAssignedSeat),
    AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat),
    ListExhaustionRemoval(ListExhaustionRemovedSeat),
}

impl SeatChange {
    /// Get the list number for the list this step has assigned a seat to
    pub fn list_number_assigned(&self) -> ListNumber {
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
            Self::ListExhaustionRemoval(_) => unimplemented!(),
        }
    }

    /// Get the list number for the list this step has retracted a seat from
    pub fn list_number_retracted(&self) -> ListNumber {
        match self {
            Self::HighestAverageAssignment(_) => unimplemented!(),
            Self::UniqueHighestAverageAssignment(_) => unimplemented!(),
            Self::LargestRemainderAssignment(_) => unimplemented!(),
            Self::AbsoluteMajorityReassignment(absolute_majority_reassigned_seat) => {
                absolute_majority_reassigned_seat.list_retracted_seat
            }
            Self::ListExhaustionRemoval(list_exhaustion_removed_seat) => {
                list_exhaustion_removed_seat.list_retracted_seat
            }
        }
    }

    /// Get the list of lists with the same average, that have not been assigned a seat
    pub fn list_options(&self) -> Vec<ListNumber> {
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
            Self::AbsoluteMajorityReassignment(_) => unimplemented!(),
            Self::ListExhaustionRemoval(_) => unimplemented!(),
        }
    }

    /// Get the list of lists with the same average, that have been assigned a seat
    pub fn list_assigned(&self) -> Vec<ListNumber> {
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
            Self::AbsoluteMajorityReassignment(_) => unimplemented!(),
            Self::ListExhaustionRemoval(_) => unimplemented!(),
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
}

/// Contains the details for an assigned seat, assigned through the highest average method.
#[derive(Clone, Debug, PartialEq)]
pub struct HighestAverageAssignedSeat {
    /// The list that was selected for this seat has this list number
    pub selected_list_number: ListNumber,
    /// Collection of lists with the same average, that have not been assigned a seat
    pub list_options: Vec<ListNumber>,
    /// Collection of lists with the same average, that have been assigned a seat
    pub list_assigned: Vec<ListNumber>,
    /// Collection of lists that are exhausted, and will not be assigned a seat
    pub list_exhausted: Vec<ListNumber>,
    /// This is the votes per seat achieved by the selected list
    pub votes_per_seat: Fraction,
}

/// Contains the details for an assigned seat, assigned through the largest remainder method.
#[derive(Clone, Debug, PartialEq)]
pub struct LargestRemainderAssignedSeat {
    /// The list that was selected for this seat has this list number
    pub selected_list_number: ListNumber,
    /// Collection of lists with the same remainder, that have not been assigned a seat
    pub list_options: Vec<ListNumber>,
    /// Collection of lists with the same remainder, that have been assigned a seat
    pub list_assigned: Vec<ListNumber>,
    /// The number of remainder votes achieved by the selected list
    pub remainder_votes: Fraction,
}

/// Contains information about the enactment of article P 9 of the Kieswet.
#[derive(Clone, Debug, PartialEq)]
pub struct AbsoluteMajorityReassignedSeat {
    /// List number which the residual seat is retracted from
    pub list_retracted_seat: ListNumber,
    /// List number which the residual seat is assigned to
    pub list_assigned_seat: ListNumber,
}

/// Contains information about the enactment of article P 10 of the Kieswet.
#[derive(Clone, Debug, PartialEq)]
pub struct ListExhaustionRemovedSeat {
    /// List number which the seat is retracted from
    pub list_retracted_seat: ListNumber,
    /// Whether the removed seat was a full seat
    pub full_seat: bool,
}
