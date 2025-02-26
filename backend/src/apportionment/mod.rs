use serde::{Deserialize, Serialize};
use tracing::{debug, info};
use utoipa::ToSchema;

use crate::election::PGNumber;
use crate::{data_entry::PoliticalGroupVotes, summary::ElectionSummary};

pub use self::{api::*, fraction::*};

mod api;
mod fraction;

/// The result of the apportionment procedure. This contains the number of seats and the quota
/// that was used. It then contains the initial standing after full seats were assigned,
/// and each of the changes and intermediate standings. The final standing contains the
/// number of seats per political group that was assigned after all seats were assigned.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ApportionmentResult {
    pub seats: u64,
    pub full_seats: u64,
    pub residual_seats: u64,
    pub quota: Fraction,
    pub steps: Vec<ApportionmentStep>,
    pub final_standing: Vec<PoliticalGroupSeatAssignment>,
}

/// Contains information about the enactment of article P 9 of the Kieswet.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct AbsoluteMajorityChange {
    /// Political group number which the residual seat is retracted from
    #[schema(value_type = u32)]
    pg_retracted_seat: PGNumber,
    /// Political group number which the residual seat is assigned to
    #[schema(value_type = u32)]
    pg_assigned_seat: PGNumber,
}

/// Contains information about the final assignment of seats for a specific political group.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct PoliticalGroupSeatAssignment {
    /// Political group number for which this assignment applies
    #[schema(value_type = u32)]
    pg_number: PGNumber,
    /// The number of votes cast for this group
    votes_cast: u64,
    /// The remainder votes that were not used to get full seats assigned to this political group
    remainder_votes: Fraction,
    /// Whether this group met the threshold for largest remainder seat assignment
    meets_remainder_threshold: bool,
    /// The number of full seats assigned to this group
    full_seats: u64,
    /// The number of residual seats assigned to this group
    residual_seats: u64,
    /// The total number of seats assigned to this group
    pub total_seats: u64,
}

impl From<PoliticalGroupStanding> for PoliticalGroupSeatAssignment {
    fn from(pg: PoliticalGroupStanding) -> Self {
        PoliticalGroupSeatAssignment {
            pg_number: pg.pg_number,
            votes_cast: pg.votes_cast,
            remainder_votes: pg.remainder_votes,
            meets_remainder_threshold: pg.meets_remainder_threshold,
            full_seats: pg.full_seats,
            residual_seats: pg.residual_seats,
            total_seats: pg.total_seats(),
        }
    }
}

/// Contains the standing for a specific political group. This is all the information
/// that is needed to compute the apportionment for that specific political group.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub struct PoliticalGroupStanding {
    /// Political group number for which this standing applies
    #[schema(value_type = u32)]
    pg_number: PGNumber,
    /// The number of votes cast for this group
    votes_cast: u64,
    /// The remainder of votes that was not used to get full seats (does not have to be a whole number of votes)
    remainder_votes: Fraction,
    /// Whether the remainder votes meet the threshold to be applicable for largest remainder seat assignment
    meets_remainder_threshold: bool,
    /// The number of votes per seat if a new seat would be added to the current residual seats
    next_votes_per_seat: Fraction,
    /// The number of full seats this political group got assigned
    full_seats: u64,
    /// The current number of residual seats this political group got assigned
    residual_seats: u64,
}

impl PoliticalGroupStanding {
    /// Create a new instance computing the whole number of seats that
    /// were assigned to a political group.
    fn new(pg: &PoliticalGroupVotes, quota: Fraction) -> Self {
        let votes_cast = Fraction::from(pg.total);
        let mut pg_seats = 0;
        if votes_cast > Fraction::ZERO {
            pg_seats = (votes_cast / quota).integer_part();
        }

        let remainder_votes = votes_cast - (Fraction::from(pg_seats) * quota);

        debug!(
            "Political group {} has {pg_seats} full seats with {} votes",
            pg.number, pg.total
        );
        PoliticalGroupStanding {
            votes_cast: pg.total.into(),
            remainder_votes,
            meets_remainder_threshold: votes_cast >= quota * Fraction::new(3, 4),
            next_votes_per_seat: votes_cast / Fraction::from(pg_seats + 1),
            pg_number: pg.number,
            full_seats: pg_seats,
            residual_seats: 0,
        }
    }

    /// Add a residual seat to the political group and return the updated instance
    fn add_residual_seat(self) -> Self {
        info!("Adding residual seat to political group {}", self.pg_number);
        PoliticalGroupStanding {
            residual_seats: self.residual_seats + 1,
            next_votes_per_seat: Fraction::from(self.votes_cast)
                / Fraction::from(self.total_seats() + 2),
            ..self
        }
    }

    /// Returns the total number of seats assigned to this political group
    fn total_seats(&self) -> u64 {
        self.full_seats + self.residual_seats
    }
}

/// Initial construction of the data required per political group
fn initial_full_seats_per_political_group(
    pg_votes: &[PoliticalGroupVotes],
    quota: Fraction,
) -> Vec<PoliticalGroupStanding> {
    pg_votes
        .iter()
        .map(|pg| PoliticalGroupStanding::new(pg, quota))
        .collect()
}

/// Compute the political groups with the largest average votes per seats.
/// This is determined based on seeing what would happen to the average votes
/// per seat if one additional seat would be assigned to each political group.
///
/// It then returns all the political groups for which this fraction is the largest.
/// If there are more political groups than there are residual seats to be assigned,
/// a drawing of lots is required.
///
/// This function will always return at least one group.
fn political_groups_with_largest_average<'a>(
    assigned_seats: impl IntoIterator<Item = &'a PoliticalGroupStanding>,
    residual_seats: u64,
) -> Result<Vec<&'a PoliticalGroupStanding>, ApportionmentError> {
    // We are now going to find the political groups that have the largest average
    // votes per seat if we would were to add one additional seat to them
    let (max_average, political_groups) = assigned_seats.into_iter().fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), pg| {
            // If this average is higher than any previously seen, we reset the list of groups matching
            if pg.next_votes_per_seat > current_max {
                (pg.next_votes_per_seat, vec![pg])
            } else {
                // If the next average seats for this political group is the same as the
                // max we add it to the list of groups that have that current maximum
                if pg.next_votes_per_seat == current_max {
                    max_groups.push(pg);
                }
                (current_max, max_groups)
            }
        },
    );

    // Programming error if political groups is empty at this point
    debug_assert!(!political_groups.is_empty());

    debug!(
        "Found {max_average} votes per seat as the maximum for political groups: {:?}",
        political_group_numbers(&political_groups)
    );

    // Check if we can actually assign all these political groups a seat, otherwise we would need to draw lots
    if political_groups.len() as u64 > residual_seats {
        // TODO: #788 if multiple political groups have the same largest average and not enough residual seats are available, use drawing of lots
        debug!(
            "Drawing of lots is required for political groups: {:?}, only {residual_seats} seats available",
            political_group_numbers(&political_groups)
        );
        Err(ApportionmentError::DrawingOfLotsNotImplemented)
    } else {
        Ok(political_groups)
    }
}

/// Compute the political groups with the largest votes remainder.
///
/// It returns all the political groups for which this remainder fraction is the largest.
/// If there are more political groups than there are residual seats to be assigned,
/// a drawing of lots is required.
///
/// This function will always return at least one group.
fn political_groups_with_largest_remainder<'a>(
    assigned_seats: impl IntoIterator<Item = &'a PoliticalGroupStanding>,
    residual_seats: u64,
) -> Result<Vec<&'a PoliticalGroupStanding>, ApportionmentError> {
    // We are now going to find the political groups that have the largest remainder
    let (max_remainder, political_groups) = assigned_seats.into_iter().fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), pg| {
            // If this remainder is higher than any previously seen, we reset the list of groups matching
            if pg.remainder_votes > current_max {
                (pg.remainder_votes, vec![pg])
            } else {
                // If the remainder for this political group is the same as the
                // max we add it to the list of groups that have that current maximum
                if pg.remainder_votes == current_max {
                    max_groups.push(pg);
                }
                (current_max, max_groups)
            }
        },
    );

    // Programming error if zero political groups were selected at this point
    debug_assert!(!political_groups.is_empty());

    debug!(
        "Found {max_remainder} remainder votes as the maximum for political groups: {:?}",
        political_group_numbers(&political_groups)
    );

    // Check if we can actually assign all these political groups
    if political_groups.len() as u64 > residual_seats {
        // TODO: #788 if multiple political groups have the same largest remainder and not enough residual seats are available, use drawing of lots
        debug!(
            "Drawing of lots is required for political groups: {:?}, only {residual_seats} seats available",
            political_group_numbers(&political_groups)
        );
        Err(ApportionmentError::DrawingOfLotsNotImplemented)
    } else {
        Ok(political_groups)
    }
}

/// If a political group got the absolute majority of votes but not the absolute majority of seats,
/// re-assign the last residual seat to the political group with the absolute majority.
/// This re-assignment is done according to article P 9 of the Kieswet.
fn reallocate_residual_seat_for_absolute_majority(
    seats: u64,
    totals: &ElectionSummary,
    pgs_last_residual_seat: &[PGNumber],
    standing: Vec<PoliticalGroupStanding>,
) -> Result<(Vec<PoliticalGroupStanding>, Option<AssignedSeat>), ApportionmentError> {
    let half_of_votes_count: Fraction =
        Fraction::from(totals.votes_counts.votes_candidates_count) * Fraction::new(1, 2);

    // Find political group with an absolute majority of votes. Return early if we find none
    let Some(majority_pg_votes) = totals
        .political_group_votes
        .iter()
        .find(|pg| Fraction::from(pg.total) > half_of_votes_count)
    else {
        return Ok((standing, None));
    };

    let half_of_seats_count: Fraction = Fraction::from(seats) * Fraction::new(1, 2);
    let pg_final_standing_majority_votes = standing
        .iter()
        .find(|pg_standing| pg_standing.pg_number == majority_pg_votes.number)
        .expect("PG exists");

    let pg_seats = Fraction::from(pg_final_standing_majority_votes.total_seats());

    if pg_seats <= half_of_seats_count {
        if pgs_last_residual_seat.len() > 1 {
            debug!(
                "Drawing of lots is required for political groups: {:?} to pick a political group which the residual seat gets retracted from",
                pgs_last_residual_seat
            );
            return Err(ApportionmentError::DrawingOfLotsNotImplemented);
        }

        // Do the reassignment of the seat
        let mut standing = standing.clone();
        standing[pgs_last_residual_seat[0] as usize - 1].residual_seats -= 1;
        standing[majority_pg_votes.number as usize - 1].residual_seats += 1;

        info!(
            "Residual seat first allocated to list {} has been re-allocated to list {} in accordance with Article P 9 Kieswet",
            pgs_last_residual_seat[0], majority_pg_votes.number
        );
        Ok((
            standing,
            Some(AssignedSeat::AbsoluteMajorityChange(
                AbsoluteMajorityChange {
                    pg_retracted_seat: pgs_last_residual_seat[0],
                    pg_assigned_seat: majority_pg_votes.number,
                },
            )),
        ))
    } else {
        Ok((standing, None))
    }
}

/// Apportionment
pub fn apportionment(
    seats: u64,
    totals: &ElectionSummary,
) -> Result<ApportionmentResult, ApportionmentError> {
    info!("Seat allocation");
    debug!("Totals {:#?}", totals);
    info!("Seats: {}", seats);

    // Article P 5 Kieswet
    // Calculate electoral quota (kiesdeler) as a proper fraction
    let quota = Fraction::from(totals.votes_counts.votes_candidates_count) / Fraction::from(seats);
    info!("Quota: {}", quota);

    // Article P 6 Kieswet
    let initial_standing =
        initial_full_seats_per_political_group(&totals.political_group_votes, quota);
    let full_seats = initial_standing.iter().map(|pg| pg.full_seats).sum::<u64>();
    let residual_seats = seats - full_seats;

    let (steps, final_standing) = if residual_seats > 0 {
        allocate_remainder(&initial_standing, totals, seats, residual_seats)?
    } else {
        info!("All seats have been allocated without any residual seats");
        (vec![], initial_standing)
    };

    // TODO: #797 Article P 19a Kieswet mark deceased candidates

    // TODO: #787 Article P 10 Kieswet check for list exhaustion
    //  (allocated seats cannot be more than total candidates)
    //  Article P 15 assignment of seats to candidates that exceeded preference threshold
    //  Article P 17 assignment of seats to other candidates based on list position
    //  Article P 19 reordering of political group candidate list if seats have been assigned

    Ok(ApportionmentResult {
        seats,
        full_seats,
        residual_seats,
        quota,
        steps,
        final_standing: final_standing.into_iter().map(Into::into).collect(),
    })
}

/// This function allocates the residual seats that remain after full seat allocation is finished.
/// These residual seats are assigned through two different procedures,
/// depending on how many total seats are available in the election.
fn allocate_remainder(
    initial_standing: &[PoliticalGroupStanding],
    totals: &ElectionSummary,
    seats: u64,
    total_residual_seats: u64,
) -> Result<(Vec<ApportionmentStep>, Vec<PoliticalGroupStanding>), ApportionmentError> {
    let mut steps = vec![];
    let mut residual_seat_number = 0;

    let mut current_standing = initial_standing.to_vec();

    while residual_seat_number != total_residual_seats {
        let residual_seats = total_residual_seats - residual_seat_number;
        residual_seat_number += 1;
        let step = if seats >= 19 {
            // Article P 7 Kieswet
            step_allocate_remainder_using_largest_averages(
                &current_standing,
                residual_seats,
                &steps,
            )?
        } else {
            // Article P 8 Kieswet
            step_allocate_remainder_using_largest_remainder(
                &current_standing,
                residual_seats,
                &steps,
            )?
        };

        let standing = current_standing.clone();

        // update the current standing by finding the selected group and
        // adding the residual seat to their tally
        current_standing = current_standing
            .into_iter()
            .map(|p| {
                if p.pg_number == step.political_group_number() {
                    p.add_residual_seat()
                } else {
                    p
                }
            })
            .collect();

        // add the update to the remainder assignment steps
        steps.push(ApportionmentStep {
            standing,
            residual_seat_number,
            change: step,
        });
    }

    // Apply Article P 9 Kieswet
    let (current_standing, assigned_seat) = if let Some(last_step) = steps.last() {
        reallocate_residual_seat_for_absolute_majority(
            seats,
            totals,
            &last_step.change.pg_assigned(),
            current_standing,
        )?
    } else {
        (current_standing, None)
    };

    if let Some(assigned_seat) = assigned_seat {
        // add the absolute majority change to the remainder assignment steps
        steps.push(ApportionmentStep {
            standing: current_standing.clone(),
            residual_seat_number,
            change: assigned_seat,
        });
    }

    Ok((steps, current_standing))
}

/// Get a vector with the political group number that was assigned the last residual seat.
/// If the last residual seat was assigned to a political group with the same remainder
/// as political groups assigned a seat in previous steps,
/// return all political group numbers that had the same remainder.
fn pg_assigned_from_previous_remainder_step(
    selected_pg: &PoliticalGroupStanding,
    previous: &[ApportionmentStep],
) -> Vec<PGNumber> {
    let mut pg_assigned = Vec::new();
    if let Some(previous_step) = previous.last() {
        if previous_step.change.is_assigned_by_largest_remainder()
            && previous_step
                .change
                .pg_options()
                .contains(&selected_pg.pg_number)
        {
            pg_assigned = previous_step.change.pg_assigned()
        }
    }
    pg_assigned.push(selected_pg.pg_number);
    pg_assigned
}

/// Get a vector with the political group number that was assigned the last residual seat.
/// If the last residual seat was assigned to a political group with the same votes per seat
/// as political groups assigned a seat in previous steps,
/// return all political group numbers that had the same votes per seat.
fn pg_assigned_from_previous_average_step(
    selected_pg: &PoliticalGroupStanding,
    previous: &[ApportionmentStep],
) -> Vec<PGNumber> {
    let mut pg_assigned = Vec::new();
    if let Some(previous_step) = previous.last() {
        if previous_step.change.is_assigned_by_largest_average()
            && previous_step
                .change
                .pg_options()
                .contains(&selected_pg.pg_number)
        {
            pg_assigned = previous_step.change.pg_assigned()
        }
    }
    pg_assigned.push(selected_pg.pg_number);
    pg_assigned
}

/// Assign the next residual seat, and return which group that seat was assigned to.
/// This assignment is done according to the rules for elections with 19 seats or more.
fn step_allocate_remainder_using_largest_averages(
    standing: &[PoliticalGroupStanding],
    residual_seats: u64,
    previous: &[ApportionmentStep],
) -> Result<AssignedSeat, ApportionmentError> {
    let selected_pgs = political_groups_with_largest_average(standing, residual_seats)?;
    let selected_pg = selected_pgs[0];
    Ok(AssignedSeat::LargestAverage(LargestAverageAssignedSeat {
        selected_pg_number: selected_pg.pg_number,
        pg_assigned: pg_assigned_from_previous_average_step(selected_pg, previous),
        pg_options: selected_pgs.iter().map(|pg| pg.pg_number).collect(),
        votes_per_seat: selected_pg.next_votes_per_seat,
    }))
}

/// Get an iterator that lists all the parties that qualify for getting a seat through
/// the largest remainder process. This checks the previously assigned seats to make sure
/// that only parties that didn't previously get a seat assigned are allowed to still
/// get a seat through the remainder process. Additionally only political parties that
/// met the threshold are considered for this process.
fn political_groups_qualifying_for_largest_remainder<'a>(
    standing: &'a [PoliticalGroupStanding],
    previous: &'a [ApportionmentStep],
) -> impl Iterator<Item = &'a PoliticalGroupStanding> {
    standing.iter().filter(move |p| {
        p.meets_remainder_threshold
            && !previous.iter().any(|prev| {
                prev.change.is_assigned_by_largest_remainder()
                    && prev.change.political_group_number() == p.pg_number
            })
    })
}

/// Get an iterator that lists all the parties that qualify for unique largest average.
/// This checks the previously assigned seats to make sure that every group that already
/// got a residual seat through the largest average procedure does not qualify.
fn political_groups_qualifying_for_unique_largest_average<'a>(
    assigned_seats: &'a [PoliticalGroupStanding],
    previous: &'a [ApportionmentStep],
) -> impl Iterator<Item = &'a PoliticalGroupStanding> {
    assigned_seats.iter().filter(|p| {
        !previous.iter().any(|prev| {
            prev.change.is_assigned_by_largest_average()
                && prev.change.political_group_number() == p.pg_number
        })
    })
}

/// Assign the next residual seat, and return which group that seat was assigned to.
/// This assignment is done according to the rules for elections with less than 19 seats.
fn step_allocate_remainder_using_largest_remainder(
    assigned_seats: &[PoliticalGroupStanding],
    residual_seats: u64,
    previous: &[ApportionmentStep],
) -> Result<AssignedSeat, ApportionmentError> {
    // first we check if there are any political groups that still qualify for a largest remainder allocated seat
    let mut qualifying_for_remainder =
        political_groups_qualifying_for_largest_remainder(assigned_seats, previous).peekable();

    // If there is at least one element in the iterator, we know we can still do a largest remainder allocation
    if qualifying_for_remainder.peek().is_some() {
        let selected_pgs =
            political_groups_with_largest_remainder(qualifying_for_remainder, residual_seats)?;
        let selected_pg = selected_pgs[0];
        Ok(AssignedSeat::LargestRemainder(
            LargestRemainderAssignedSeat {
                selected_pg_number: selected_pg.pg_number,
                pg_assigned: pg_assigned_from_previous_remainder_step(selected_pg, previous),
                pg_options: selected_pgs.iter().map(|pg| pg.pg_number).collect(),
                remainder_votes: selected_pg.remainder_votes,
            },
        ))
    } else {
        // We've now exhausted the largest remainder seats, we now do unique largest average instead:
        // we allow every group to get a seat, not allowing any group to get a second residual seat
        // while there are still parties that did not get a residual seat.
        let mut qualifying_for_unique_largest_average =
            political_groups_qualifying_for_unique_largest_average(assigned_seats, previous)
                .peekable();
        if let Some(&&assigned_seats) = qualifying_for_unique_largest_average.peek() {
            step_allocate_remainder_using_largest_averages(
                &[assigned_seats],
                residual_seats,
                previous,
            )
        } else {
            // We've now even exhausted unique largest average seats: every group that qualified
            // got a largest remainder seat, and every group also had at least a single residual seat
            // assigned to them. We now allow any residual seats to be assigned using the largest
            // averages procedure
            step_allocate_remainder_using_largest_averages(assigned_seats, residual_seats, previous)
        }
    }
}

/// Records the details for a specific residual seat, and how the standing is
/// once that residual seat was assigned
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ApportionmentStep {
    residual_seat_number: u64,
    change: AssignedSeat,
    standing: Vec<PoliticalGroupStanding>,
}

/// Records the political group and specific change for a specific residual seat
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
#[serde(tag = "assigned_by")]
pub enum AssignedSeat {
    LargestAverage(LargestAverageAssignedSeat),
    LargestRemainder(LargestRemainderAssignedSeat),
    AbsoluteMajorityChange(AbsoluteMajorityChange),
}

impl AssignedSeat {
    /// Get the political group number for the group this step has assigned a seat to
    fn political_group_number(&self) -> PGNumber {
        match self {
            AssignedSeat::LargestAverage(largest_average) => largest_average.selected_pg_number,
            AssignedSeat::LargestRemainder(largest_remainder) => {
                largest_remainder.selected_pg_number
            }
            AssignedSeat::AbsoluteMajorityChange(_) => unimplemented!(),
        }
    }

    /// Get the list of political groups with the same average, that have not been assigned a seat
    fn pg_options(&self) -> Vec<PGNumber> {
        match self {
            AssignedSeat::LargestAverage(largest_average) => largest_average.pg_options.clone(),
            AssignedSeat::LargestRemainder(largest_remainder) => {
                largest_remainder.pg_options.clone()
            }
            AssignedSeat::AbsoluteMajorityChange(_) => unimplemented!(),
        }
    }

    /// Get the list of political groups with the same average, that have been assigned a seat
    fn pg_assigned(&self) -> Vec<PGNumber> {
        match self {
            AssignedSeat::LargestAverage(largest_average) => largest_average.pg_assigned.clone(),
            AssignedSeat::LargestRemainder(largest_remainder) => {
                largest_remainder.pg_assigned.clone()
            }
            AssignedSeat::AbsoluteMajorityChange(_) => unimplemented!(),
        }
    }

    /// Returns true if the seat was assigned through the largest remainder
    pub fn is_assigned_by_largest_remainder(&self) -> bool {
        matches!(self, AssignedSeat::LargestRemainder(_))
    }

    /// Returns true if the seat was assigned through the largest average
    pub fn is_assigned_by_largest_average(&self) -> bool {
        matches!(self, AssignedSeat::LargestAverage(_))
    }

    /// Returns true if the seat was reassigned through the absolute majority change
    pub fn is_assigned_by_absolute_majority_change(&self) -> bool {
        matches!(self, AssignedSeat::AbsoluteMajorityChange(_))
    }
}

/// Contains the details for an assigned seat, assigned through the largest average method.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct LargestAverageAssignedSeat {
    /// The political group that was selected for this seat has this political group number
    #[schema(value_type = u32)]
    selected_pg_number: PGNumber,
    /// The list of political groups with the same average, that have not been assigned a seat
    #[schema(value_type = Vec<u32>)]
    pg_options: Vec<PGNumber>,
    /// The list of political groups with the same average, that have been assigned a seat
    #[schema(value_type = Vec<u32>)]
    pg_assigned: Vec<PGNumber>,
    /// This is the votes per seat achieved by the selected political group
    votes_per_seat: Fraction,
}

/// Contains the details for an assigned seat, assigned through the largest remainder method.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct LargestRemainderAssignedSeat {
    /// The political group that was selected for this seat has this political group number
    #[schema(value_type = u32)]
    selected_pg_number: PGNumber,
    /// The list of political groups with the same remainder, that have not been assigned a seat
    #[schema(value_type = Vec<u32>)]
    pg_options: Vec<PGNumber>,
    /// The list of political groups with the same remainder, that have been assigned a seat
    #[schema(value_type = Vec<u32>)]
    pg_assigned: Vec<PGNumber>,
    /// The number of remainder votes achieved by the selected political group
    remainder_votes: Fraction,
}

/// Errors that can occur during apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentError {
    ApportionmentNotAvailableUntilDataEntryFinalised,
    DrawingOfLotsNotImplemented,
}

/// Create a vector containing just the political group numbers from an iterator of the current standing
fn political_group_numbers(standing: &[&PoliticalGroupStanding]) -> Vec<PGNumber> {
    standing.iter().map(|s| s.pg_number).collect()
}

pub fn get_total_seats_from_apportionment_result(result: ApportionmentResult) -> Vec<u64> {
    result
        .final_standing
        .iter()
        .map(|p| p.total_seats)
        .collect::<Vec<_>>()
}

#[cfg(test)]
mod tests {
    use crate::{
        apportionment::{
            ApportionmentError, apportionment, get_total_seats_from_apportionment_result,
        },
        data_entry::{Count, PoliticalGroupVotes, VotersCounts, VotesCounts},
        election::PGNumber,
        summary::{ElectionSummary, SummaryDifferencesCounts},
    };
    use test_log::test;

    fn get_election_summary(
        total_votes: Count,
        political_group_votes: Vec<PoliticalGroupVotes>,
    ) -> ElectionSummary {
        ElectionSummary {
            voters_counts: VotersCounts {
                poll_card_count: total_votes,
                proxy_certificate_count: 0,
                voter_card_count: 0,
                total_admitted_voters_count: total_votes,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: total_votes,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: total_votes,
            },
            differences_counts: SummaryDifferencesCounts::zero(),
            recounted_polling_stations: vec![],
            political_group_votes,
        }
    }

    fn get_election_summary_with_default_50_candidates(pg_votes: Vec<Count>) -> ElectionSummary {
        let total_votes = pg_votes.iter().sum();
        let mut political_group_votes: Vec<PoliticalGroupVotes> = vec![];
        for (index, votes) in pg_votes.iter().enumerate() {
            // Create list with 50 candidates with 0 votes
            let mut candidate_votes: Vec<Count> = vec![0; 50];
            // Set votes to first candidate
            candidate_votes[0] = *votes;
            political_group_votes.push(PoliticalGroupVotes::from_test_data_auto(
                PGNumber::try_from(index + 1).unwrap(),
                *votes,
                &candidate_votes,
            ))
        }
        get_election_summary(total_votes, political_group_votes)
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_without_remaining_seats() {
        let totals =
            get_election_summary_with_default_50_candidates(vec![480, 160, 160, 160, 80, 80, 80]);
        let result = apportionment(15, &totals).unwrap();
        assert_eq!(result.steps.len(), 0);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![6, 2, 2, 2, 1, 1, 1]);
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_residual_seats_assigned_with_remainder_system()
    {
        let totals = get_election_summary_with_default_50_candidates(vec![
            540, 160, 160, 80, 80, 80, 60, 40,
        ]);
        let result = apportionment(15, &totals).unwrap();
        assert_eq!(result.steps.len(), 2);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![7, 2, 2, 1, 1, 1, 1, 0]);
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_residual_seats_assigned_with_remainder_and_averages_system_only_1_remainder_meets_threshold()
     {
        let totals =
            get_election_summary_with_default_50_candidates(vec![808, 59, 58, 57, 56, 55, 54, 53]);
        let result = apportionment(15, &totals).unwrap();
        assert_eq!(result.steps.len(), 5);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![12, 1, 1, 1, 0, 0, 0, 0]);
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_0_votes_assigned_with_remainder_and_averages_system()
     {
        let totals = get_election_summary_with_default_50_candidates(vec![0, 0, 0, 0, 0]);
        let result = apportionment(10, &totals).unwrap();
        assert_eq!(result.steps.len(), 10);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![2, 2, 2, 2, 2]);
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_absolute_majority_of_votes_but_not_seats() {
        // This test triggers Kieswet Article P 9 (Actual case from GR2022)
        let totals =
            get_election_summary_with_default_50_candidates(vec![2571, 977, 567, 536, 453]);
        let result = apportionment(15, &totals).unwrap();
        assert_eq!(result.steps.len(), 4);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![8, 3, 2, 1, 1]);
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_absolute_majority_of_votes_but_not_seats_with_drawing_of_lots_error()
     {
        // This test triggers Kieswet Article P 9
        let totals =
            get_election_summary_with_default_50_candidates(vec![2552, 511, 511, 511, 509, 509]);
        let result = apportionment(15, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_0_votes_assigned_with_remainder_and_averages_system_drawing_of_lots_error_in_2nd_round_averages_system()
     {
        let totals = get_election_summary_with_default_50_candidates(vec![0, 0, 0, 0, 0]);
        let result = apportionment(15, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_drawing_of_lots_error_with_0_remainders() {
        let totals = get_election_summary_with_default_50_candidates(vec![
            540, 160, 160, 80, 80, 80, 55, 45,
        ]);
        let result = apportionment(15, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_drawing_of_lots_error() {
        let totals =
            get_election_summary_with_default_50_candidates(vec![500, 140, 140, 140, 140, 140]);
        let result = apportionment(15, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_without_remaining_seats() {
        let totals =
            get_election_summary_with_default_50_candidates(vec![576, 288, 96, 96, 96, 48]);
        let result = apportionment(25, &totals).unwrap();
        assert_eq!(result.steps.len(), 0);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![12, 6, 2, 2, 2, 1]);
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_remaining_seats() {
        let totals = get_election_summary_with_default_50_candidates(vec![600, 302, 98, 99, 101]);
        let result = apportionment(23, &totals).unwrap();
        assert_eq!(result.steps.len(), 4);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![12, 6, 1, 2, 2]);
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_absolute_majority_of_votes_but_not_seats() {
        // This test triggers Kieswet Article P 9
        let totals = get_election_summary_with_default_50_candidates(vec![
            7501, 1249, 1249, 1249, 1249, 1249, 1248, 7,
        ]);
        let result = apportionment(24, &totals).unwrap();
        assert_eq!(result.steps.len(), 7);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![13, 2, 2, 2, 2, 2, 1, 0]);
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_absolute_majority_of_votes_but_not_seats_with_drawing_of_lots_error()
     {
        // This test triggers Kieswet Article P 9
        let totals = get_election_summary_with_default_50_candidates(vec![
            7501, 1249, 1249, 1249, 1249, 1248, 1248, 8,
        ]);
        let result = apportionment(24, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_0_votes() {
        let totals = get_election_summary_with_default_50_candidates(vec![0]);
        let result = apportionment(19, &totals).unwrap();
        assert_eq!(result.steps.len(), 19);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![19]);
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_0_votes_with_drawing_of_lots_error() {
        let totals = get_election_summary_with_default_50_candidates(vec![0, 0, 0, 0, 0]);
        let result = apportionment(19, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_drawing_of_lots_error() {
        let totals =
            get_election_summary_with_default_50_candidates(vec![500, 140, 140, 140, 140, 140]);
        let result = apportionment(23, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }
}
