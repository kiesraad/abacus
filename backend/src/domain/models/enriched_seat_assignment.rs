use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    domain::{
        apportionment::{DisplayFraction, ListSeatAssignment, SeatAssignment, SeatChangeStep},
        election::PGNumber,
        summary::ElectionSummaryCSB,
    },
};

fn get_steps(seat_assignment: &SeatAssignment) -> Result<Vec<&SeatChangeStep>, APIError> {
    let mut initial_largest_remainder_steps = vec![];
    //let mut initial_highest_average_assigned_seats = vec![];
    for step in &seat_assignment.steps {
        if step.change.is_changed_by_largest_remainder_assignment() {
            initial_largest_remainder_steps.push(step);
        }
    }
    Ok(initial_largest_remainder_steps)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnrichedSeatAssignment {
    quota: DisplayFraction,
    list_seat_assignment: Vec<EnrichedListSeatAssignment>,
    initial_total_full_seats: u32,
    initial_total_residual_seats: u32,
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

    fn get_largest_remainder_columns(
        seat_assignment: &SeatAssignment,
        initial_largest_remainder_steps: Vec<&SeatChangeStep>,
    ) -> Vec<(PGNumber, LargestRemainderColumn)> {
        let final_standing_pgs_meeting_threshold: Vec<&ListSeatAssignment> = seat_assignment
            .final_standing
            .iter()
            .filter(|list_seat_assignment| list_seat_assignment.meets_remainder_threshold)
            .collect();
        let mut columns = Vec::new();
        for standing in final_standing_pgs_meeting_threshold.iter() {
            let assigned_seat = initial_largest_remainder_steps
                .iter()
                .find(|step| step.change.list_number_assigned() == standing.list_number);
            let largest_remainder_column = LargestRemainderColumn {
                remainder_votes: standing.remainder_votes.clone(),
                residual_seats: if assigned_seat.is_some() { 1 } else { 0 },
            };
            columns.push((standing.list_number, largest_remainder_column));
        }
        columns
    }

    fn get_list_seat_assignment(
        summary: &ElectionSummaryCSB,
        seat_assignment: &SeatAssignment,
    ) -> Result<(u32, Vec<EnrichedListSeatAssignment>), APIError> {
        let mut columns = Vec::new();
        let mut initial_total_full_seats = 0;

        let initial_largest_remainder_steps = get_steps(seat_assignment)?;
        let largest_remainder_columns =
            Self::get_largest_remainder_columns(seat_assignment, initial_largest_remainder_steps);

        for pg_votes in summary.votes_counts.political_group_total_votes.iter() {
            let initial_full_seats = Self::get_initial_full_seats(seat_assignment, pg_votes.number);
            initial_total_full_seats += initial_full_seats;

            columns.push(EnrichedListSeatAssignment {
                number: pg_votes.number,
                name: pg_votes.name.clone(),
                total: pg_votes.total,
                initial_full_seats,
                largest_remainder_column: largest_remainder_columns
                    .iter()
                    .find(|(pg_number, _)| *pg_number == pg_votes.number)
                    .map(|(_, column)| column.clone()),
            })
        }
        Ok((initial_total_full_seats, columns))
    }

    pub fn new(
        number_of_seats: u32,
        summary: &ElectionSummaryCSB,
        seat_assignment: &SeatAssignment,
    ) -> Result<Self, APIError> {
        let (initial_total_full_seats, columns) =
            Self::get_list_seat_assignment(summary, seat_assignment)?;
        Ok(EnrichedSeatAssignment {
            quota: seat_assignment.quota.clone(),
            list_seat_assignment: columns,
            initial_total_full_seats,
            initial_total_residual_seats: number_of_seats - initial_total_full_seats,
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
    /// Political group largest remainder column if threshold was met
    largest_remainder_column: Option<LargestRemainderColumn>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LargestRemainderColumn {
    /// Political group remainder votes
    remainder_votes: DisplayFraction,
    /// Political group assigned residual seats
    residual_seats: u32,
}
