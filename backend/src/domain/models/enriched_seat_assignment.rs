use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    domain::{
        apportionment::{DisplayFraction, ListSeatAssignment, SeatAssignment, SeatChangeStep},
        election::PGNumber,
        summary::ElectionSummaryCSB,
    },
};

struct InitialSteps<'a> {
    initial_largest_remainder_steps: Vec<&'a SeatChangeStep>,
    initial_unique_highest_average_steps: Vec<&'a SeatChangeStep>,
    initial_highest_average_steps: Vec<SeatChangeStep>,
}

/// Retrieves [SeatChangeStep]s of type LargestRemainderAssignment/UniqueHighestAverageAssignment
/// before absolute majority reassignment or list exhaustion removal takes place
fn get_initial_steps(seat_assignment: &SeatAssignment) -> InitialSteps<'_> {
    let mut initial_largest_remainder_steps = vec![];
    let mut initial_unique_highest_average_steps = vec![];
    let mut initial_highest_average_steps = vec![];
    for step in &seat_assignment.steps {
        if step.change.is_changed_by_largest_remainder_assignment() {
            initial_largest_remainder_steps.push(step);
        }
        if step
            .change
            .is_changed_by_unique_highest_average_assignment()
        {
            initial_unique_highest_average_steps.push(step);
        }
        if step.change.is_changed_by_highest_average_assignment() {
            initial_highest_average_steps.push(step.clone());
        }
        // We stop when an absolute majority reassignment or list exhaustion removal step is found,
        // since this means all initial residual seat assignment steps are found
        if step.change.is_changed_by_absolute_majority_reassignment()
            || step.change.is_changed_by_list_exhaustion_removal()
        {
            break;
        }
    }
    InitialSteps {
        initial_largest_remainder_steps,
        initial_unique_highest_average_steps,
        initial_highest_average_steps,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedSeatAssignment {
    quota: DisplayFraction,
    list_seat_assignment: Vec<EnrichedListSeatAssignment>,
    #[serde(skip_serializing_if = "Option::is_none")]
    initial_highest_average_steps: Option<Vec<SeatChangeStep>>,
    initial_total_full_seats: u32,
    initial_total_residual_seats: u32,
}

struct ListSeatAssignments {
    initial_total_full_seats: u32,
    enriched_list_seat_assignments: Vec<EnrichedListSeatAssignment>,
    initial_highest_average_steps: Vec<SeatChangeStep>,
}

impl EnrichedSeatAssignment {
    fn get_initial_full_seats(seat_assignment: &SeatAssignment, list_number: PGNumber) -> u32 {
        if !seat_assignment.steps.is_empty() {
            // In case remaining seats have been assigned, take the full seats from the standing
            // of the first residual seat assignment, which will be equal to the initial standing
            seat_assignment.steps[0]
                .standings
                .iter()
                .find(|standing| standing.list_number == list_number)
                .expect("Standing exists for each political group")
                .full_seats
        } else {
            // Otherwise take the full seats from the final standing
            // since it will be equal to the initial standing
            seat_assignment
                .final_standing
                .iter()
                .find(|standing| standing.list_number == list_number)
                .expect("Standing exists for each political group")
                .full_seats
        }
    }

    fn get_largest_remainders(
        seat_assignment: &SeatAssignment,
        initial_largest_remainder_steps: &[&SeatChangeStep],
    ) -> Vec<(PGNumber, LargestRemainder)> {
        let final_standing_pgs_meeting_threshold: Vec<&ListSeatAssignment> = seat_assignment
            .final_standing
            .iter()
            .filter(|list_seat_assignment| list_seat_assignment.meets_remainder_threshold)
            .collect();
        let mut largest_remainders = Vec::new();
        for standing in final_standing_pgs_meeting_threshold.iter() {
            let assigned_seat = initial_largest_remainder_steps
                .iter()
                .find(|step| step.change.list_number_assigned() == standing.list_number);
            let largest_remainder = LargestRemainder {
                remainder_votes: standing.remainder_votes.clone(),
                residual_seats: if assigned_seat.is_some() { 1 } else { 0 },
            };
            largest_remainders.push((standing.list_number, largest_remainder));
        }
        largest_remainders
    }

    fn get_unique_highest_average(
        list_number: PGNumber,
        initial_full_seats: u32,
        largest_remainder: &Option<LargestRemainder>,
        initial_unique_highest_average_steps: &[&SeatChangeStep],
    ) -> Option<UniqueHighestAverage> {
        if !initial_unique_highest_average_steps.is_empty() {
            let assigned_seat = initial_unique_highest_average_steps
                .iter()
                .find(|step| step.change.list_number_assigned() == list_number);
            let average = &initial_unique_highest_average_steps
                .first()
                .expect("There should be at least one step since is_empty is checked")
                .standings
                .iter()
                .find(|standing| standing.list_number == list_number)
                .expect("Standing exists for each list")
                .next_votes_per_seat;
            let mut already_assigned_seats = initial_full_seats;
            if let Some(largest_remainder_details) = largest_remainder.clone() {
                already_assigned_seats += largest_remainder_details.residual_seats
            };
            let unique_highest_average = UniqueHighestAverage {
                already_assigned_seats,
                next_votes_per_seat: average.clone(),
                residual_seats: u32::from(assigned_seat.is_some()),
            };
            Some(unique_highest_average)
        } else {
            None
        }
    }

    fn get_list_seat_assignments(
        summary: &ElectionSummaryCSB,
        seat_assignment: &SeatAssignment,
    ) -> Result<ListSeatAssignments, APIError> {
        let mut enriched_list_seat_assignments = Vec::new();
        let mut initial_total_full_seats = 0;

        let initial_steps = get_initial_steps(seat_assignment);
        let largest_remainders = Self::get_largest_remainders(
            seat_assignment,
            &initial_steps.initial_largest_remainder_steps,
        );

        for pg_votes in summary.votes_counts.political_group_total_votes.iter() {
            let initial_full_seats = Self::get_initial_full_seats(seat_assignment, pg_votes.number);
            let largest_remainder = largest_remainders
                .iter()
                .find(|(pg_number, _)| *pg_number == pg_votes.number)
                .map(|(_, largest_remainder)| largest_remainder.clone());
            let unique_highest_average = Self::get_unique_highest_average(
                pg_votes.number,
                initial_full_seats,
                &largest_remainder,
                &initial_steps.initial_unique_highest_average_steps,
            );
            initial_total_full_seats += initial_full_seats;

            enriched_list_seat_assignments.push(EnrichedListSeatAssignment {
                number: pg_votes.number,
                name: pg_votes.name.clone(),
                total: pg_votes.total,
                initial_full_seats,
                largest_remainder,
                unique_highest_average,
            })
        }
        Ok(ListSeatAssignments {
            initial_total_full_seats,
            enriched_list_seat_assignments,
            initial_highest_average_steps: initial_steps.initial_highest_average_steps,
        })
    }

    pub fn new(
        number_of_seats: u32,
        summary: &ElectionSummaryCSB,
        seat_assignment: &SeatAssignment,
    ) -> Result<Self, APIError> {
        let list_seat_assignments = Self::get_list_seat_assignments(summary, seat_assignment)?;
        Ok(EnrichedSeatAssignment {
            quota: seat_assignment.quota.clone(),
            list_seat_assignment: list_seat_assignments.enriched_list_seat_assignments,
            initial_highest_average_steps: Some(
                list_seat_assignments.initial_highest_average_steps,
            ),
            initial_total_full_seats: list_seat_assignments.initial_total_full_seats,
            initial_total_residual_seats: number_of_seats
                - list_seat_assignments.initial_total_full_seats,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedListSeatAssignment {
    /// Political group number
    number: PGNumber,
    /// Political group display name
    name: String,
    /// Total votes for the political group
    total: u32,
    /// Political group initial full seats
    initial_full_seats: u32,
    /// Political group largest remainder details if threshold was met
    #[serde(skip_serializing_if = "Option::is_none")]
    largest_remainder: Option<LargestRemainder>,
    /// Political group unique highest average details
    #[serde(skip_serializing_if = "Option::is_none")]
    unique_highest_average: Option<UniqueHighestAverage>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LargestRemainder {
    /// The remainder of votes that was not used to get full seats
    remainder_votes: DisplayFraction,
    /// Political group assigned residual seats
    residual_seats: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UniqueHighestAverage {
    /// Political group already assigned seats
    already_assigned_seats: u32,
    /// The number of votes per seat if a new seat would be added to the current residual seats
    next_votes_per_seat: DisplayFraction,
    /// Political group assigned residual seats
    residual_seats: u32,
}
