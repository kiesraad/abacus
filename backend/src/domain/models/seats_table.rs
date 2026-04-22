use serde::{Deserialize, Serialize};

use crate::{
    APIError,
    domain::{
        apportionment::{DisplayFraction, SeatAssignment},
        election::PGNumber,
        summary::ElectionSummaryCSB,
    },
};

#[derive(Debug, Serialize, Deserialize)]
pub struct InitialFullSeatsTable {
    quota: DisplayFraction,
    list_initial_full_seats_columns: Vec<InitialFullSeatsColumn>,
    initial_total_full_seats: u32,
}

impl InitialFullSeatsTable {
    fn get_list_initial_full_seats_columns(
        summary: &ElectionSummaryCSB,
        seat_assignment: &SeatAssignment,
    ) -> Result<(u32, Vec<InitialFullSeatsColumn>), APIError> {
        let mut columns = Vec::new();
        let mut initial_total_full_seats = 0;

        for pg_votes in summary.votes_counts.political_group_total_votes.iter() {
            let initial_full_seats = if !seat_assignment.steps.is_empty() {
                // In case remaining seats have been assigned, take the full seats from the standing
                // of the first residual seat assignment, which will be equal to the initial standing
                seat_assignment.steps[0]
                    .standings
                    .iter()
                    .find(|standing| standing.list_number == pg_votes.number)
                    .expect("Standing exists for each political group")
                    .full_seats
            } else {
                // Otherwise take the full seats from the final standing
                // since it will be equal to the initial standing
                seat_assignment
                    .final_standing
                    .iter()
                    .find(|standing| standing.list_number == pg_votes.number)
                    .expect("Standing exists for each political group")
                    .full_seats
            };
            initial_total_full_seats += initial_full_seats;
            columns.push(InitialFullSeatsColumn {
                number: pg_votes.number,
                name: pg_votes.name.clone(),
                total: pg_votes.total,
                initial_full_seats,
            })
        }
        Ok((initial_total_full_seats, columns))
    }

    pub fn new(
        summary: &ElectionSummaryCSB,
        seat_assignment: &SeatAssignment,
    ) -> Result<Self, APIError> {
        let (initial_total_full_seats, columns) =
            Self::get_list_initial_full_seats_columns(summary, seat_assignment)?;
        Ok(InitialFullSeatsTable {
            quota: seat_assignment.quota.clone(),
            list_initial_full_seats_columns: columns,
            initial_total_full_seats,
        })
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InitialFullSeatsColumn {
    /// Political group number
    number: PGNumber,
    /// Political group display name
    name: String,
    /// Total votes for the political group
    total: u32,
    /// Political group initial full seats
    initial_full_seats: u32,
}
