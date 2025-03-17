use serde::{Deserialize, Serialize};
use tracing::{debug, info};
use utoipa::ToSchema;

use crate::{
    apportionment::Fraction, data_entry::PoliticalGroupVotes, election::PGNumber,
    summary::ElectionSummary,
};

/// The result of the seat assignment procedure. This contains the number of seats and the quota
/// that was used. It then contains the initial standing after full seats were assigned,
/// and each of the changes and intermediate standings. The final standing contains the
/// number of seats per political group that was assigned after all seats were assigned.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct SeatAssignmentResult {
    pub seats: u32,
    pub full_seats: u32,
    pub residual_seats: u32,
    pub quota: Fraction,
    pub steps: Vec<SeatAssignmentStep>,
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
    full_seats: u32,
    /// The number of residual seats assigned to this group
    residual_seats: u32,
    /// The total number of seats assigned to this group
    pub total_seats: u32,
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
    full_seats: u32,
    /// The current number of residual seats this political group got assigned
    residual_seats: u32,
}

impl PoliticalGroupStanding {
    /// Create a new instance computing the whole number of seats that
    /// were assigned to a political group.
    fn new(pg: &PoliticalGroupVotes, quota: Fraction) -> Self {
        let votes_cast = Fraction::from(pg.total);
        let mut pg_seats = 0;
        if votes_cast > Fraction::ZERO {
            pg_seats =
                u32::try_from((votes_cast / quota).integer_part()).expect("pg_seats fit in u32");
        }

        let remainder_votes = votes_cast - (Fraction::from(pg_seats) * quota);

        debug!(
            "Political group {} has {pg_seats} full seats with {} votes",
            pg.number, pg.total
        );
        PoliticalGroupStanding {
            pg_number: pg.number,
            votes_cast: pg.total.into(),
            remainder_votes,
            meets_remainder_threshold: votes_cast >= quota * Fraction::new(3, 4),
            next_votes_per_seat: votes_cast / Fraction::from(pg_seats + 1),
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
    fn total_seats(&self) -> u32 {
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
    residual_seats: u32,
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
    if political_groups.len() > residual_seats as usize {
        // TODO: #788 if multiple political groups have the same largest average and not enough residual seats are available, use drawing of lots
        info!(
            "Drawing of lots is required for political groups: {:?}, only {residual_seats} seat(s) available",
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
    residual_seats: u32,
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
    if political_groups.len() > residual_seats as usize {
        // TODO: #788 if multiple political groups have the same largest remainder and not enough residual seats are available, use drawing of lots
        info!(
            "Drawing of lots is required for political groups: {:?}, only {residual_seats} seat(s) available",
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
fn reassign_residual_seat_for_absolute_majority(
    seats: u32,
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
            info!(
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
            "Residual seat first assigned to list {} has been re-assigned to list {} in accordance with Article P 9 Kieswet",
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

/// Seat assignment
pub fn seat_assignment(
    seats: u32,
    totals: &ElectionSummary,
) -> Result<SeatAssignmentResult, ApportionmentError> {
    info!("Seat assignment");
    info!("Seats: {}", seats);

    // [Artikel P 5 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_5&z=2025-02-12&g=2025-02-12)
    // Calculate electoral quota (kiesdeler) as a proper fraction
    let quota = Fraction::from(totals.votes_counts.votes_candidates_count) / Fraction::from(seats);
    info!("Quota: {}", quota);

    // [Artikel P 6 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_6&z=2025-02-12&g=2025-02-12)
    let initial_standing =
        initial_full_seats_per_political_group(&totals.political_group_votes, quota);
    let full_seats = initial_standing.iter().map(|pg| pg.full_seats).sum::<u32>();
    let residual_seats = seats - full_seats;

    let (steps, final_standing) = if residual_seats > 0 {
        assign_remainder(&initial_standing, totals, seats, residual_seats)?
    } else {
        info!("All seats have been assigned without any residual seats");
        (vec![], initial_standing)
    };

    // TODO: #797 [Artikel P 19a Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=3&artikel=P_19a&z=2025-02-12&g=2025-02-12)
    //  mark deceased candidates

    // TODO: #1044 [Artikel P 10 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_10&z=2025-02-12&g=2025-02-12)
    //  check for list exhaustion (assigned seats cannot be more than total candidates)

    Ok(SeatAssignmentResult {
        seats,
        full_seats,
        residual_seats,
        quota,
        steps,
        final_standing: final_standing.into_iter().map(Into::into).collect(),
    })
}

/// This function assigns the residual seats that remain after full seat assignment is finished.  
/// These residual seats are assigned through two different procedures,
/// depending on how many total seats are available in the election.
fn assign_remainder(
    initial_standing: &[PoliticalGroupStanding],
    totals: &ElectionSummary,
    seats: u32,
    total_residual_seats: u32,
) -> Result<(Vec<SeatAssignmentStep>, Vec<PoliticalGroupStanding>), ApportionmentError> {
    let mut steps = vec![];
    let mut residual_seat_number = 0;

    let mut current_standing = initial_standing.to_vec();

    while residual_seat_number != total_residual_seats {
        let residual_seats = total_residual_seats - residual_seat_number;
        residual_seat_number += 1;
        let step = if seats >= 19 {
            // [Artikel P 7 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_7&z=2025-02-12&g=2025-02-12)
            step_assign_remainder_using_largest_averages(&current_standing, residual_seats, &steps)?
        } else {
            // [Artikel P 8 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_8&z=2025-02-12&g=2025-02-12)
            step_assign_remainder_using_largest_remainder(
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
        steps.push(SeatAssignmentStep {
            standing,
            residual_seat_number,
            change: step,
        });
    }

    // [Artikel P 9 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_9&z=2025-02-12&g=2025-02-12)
    let (current_standing, assigned_seat) = if let Some(last_step) = steps.last() {
        reassign_residual_seat_for_absolute_majority(
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
        steps.push(SeatAssignmentStep {
            standing: current_standing.clone(),
            residual_seat_number,
            change: assigned_seat,
        });
    }

    Ok((steps, current_standing))
}

/// Get a vector with the political group number that was assigned the last residual seat.  
/// If the last residual seat was assigned to a political group with the same
/// remainder/votes per seat as political groups assigned a seat in previous steps,
/// return all political group numbers that had the same remainder/votes per seat.
fn pg_assigned_from_previous_step(
    selected_pg: &PoliticalGroupStanding,
    previous: &[SeatAssignmentStep],
    matcher: fn(&AssignedSeat) -> bool,
) -> Vec<PGNumber> {
    let mut pg_assigned = Vec::new();
    if let Some(previous_step) = previous.last() {
        if matcher(&previous_step.change)
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
fn step_assign_remainder_using_largest_averages<'a>(
    standing: impl IntoIterator<Item = &'a PoliticalGroupStanding>,
    residual_seats: u32,
    previous: &[SeatAssignmentStep],
) -> Result<AssignedSeat, ApportionmentError> {
    let selected_pgs = political_groups_with_largest_average(standing, residual_seats)?;
    let selected_pg = selected_pgs[0];
    Ok(AssignedSeat::LargestAverage(LargestAverageAssignedSeat {
        selected_pg_number: selected_pg.pg_number,
        pg_assigned: pg_assigned_from_previous_step(
            selected_pg,
            previous,
            AssignedSeat::is_assigned_by_largest_average,
        ),
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
    previous: &'a [SeatAssignmentStep],
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
    previous: &'a [SeatAssignmentStep],
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
fn step_assign_remainder_using_largest_remainder(
    assigned_seats: &[PoliticalGroupStanding],
    residual_seats: u32,
    previous: &[SeatAssignmentStep],
) -> Result<AssignedSeat, ApportionmentError> {
    // first we check if there are any political groups that still qualify for a largest remainder assigned seat
    let mut qualifying_for_remainder =
        political_groups_qualifying_for_largest_remainder(assigned_seats, previous).peekable();

    // If there is at least one element in the iterator, we know we can still do a largest remainder assignment
    if qualifying_for_remainder.peek().is_some() {
        let selected_pgs =
            political_groups_with_largest_remainder(qualifying_for_remainder, residual_seats)?;
        let selected_pg = selected_pgs[0];
        Ok(AssignedSeat::LargestRemainder(
            LargestRemainderAssignedSeat {
                selected_pg_number: selected_pg.pg_number,
                pg_assigned: pg_assigned_from_previous_step(
                    selected_pg,
                    previous,
                    AssignedSeat::is_assigned_by_largest_remainder,
                ),
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
        if qualifying_for_unique_largest_average.peek().is_some() {
            step_assign_remainder_using_largest_averages(
                qualifying_for_unique_largest_average,
                residual_seats,
                previous,
            )
        } else {
            // We've now even exhausted unique largest average seats: every group that qualified
            // got a largest remainder seat, and every group also had at least a single residual seat
            // assigned to them. We now allow any residual seats to be assigned using the largest
            // averages procedure
            step_assign_remainder_using_largest_averages(assigned_seats, residual_seats, previous)
        }
    }
}

/// Records the details for a specific residual seat, and how the standing is
/// once that residual seat was assigned
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct SeatAssignmentStep {
    residual_seat_number: u32,
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

pub fn get_total_seats_from_apportionment_result(result: SeatAssignmentResult) -> Vec<u32> {
    result
        .final_standing
        .iter()
        .map(|p| p.total_seats)
        .collect::<Vec<_>>()
}

#[cfg(test)]
mod tests {
    /// Tests apportionment for councils with less than 19 seats
    mod lt_19_seats {
        use crate::apportionment::{
            ApportionmentError, get_total_seats_from_apportionment_result, seat_assignment,
            test_helpers::election_summary_fixture_with_default_50_candidates,
        };
        use test_log::test;

        /// Apportionment without remainder seats
        ///
        /// Full seats: [6, 2, 2, 2, 1, 1, 1] - Remainder seats: 0
        #[test]
        fn test_without_remainder_seats() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                480, 160, 160, 160, 80, 80, 80,
            ]);
            let result = seat_assignment(15, &totals).unwrap();
            assert_eq!(result.steps.len(), 0);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![6, 2, 2, 2, 1, 1, 1]);
        }

        /// Apportionment with residual seats assigned with remainder system
        ///
        /// Full seats: [6, 2, 2, 1, 1, 1, 0, 0] - Remainder seats: 2
        /// Remainders: [60, 0/15, 0/15, 0/15, 0/15, 0/15, 60, 40]
        /// 1 - largest remainder: seat assigned to list 1
        /// 2 - largest remainder: seat assigned to list 7
        #[test]
        fn test_with_residual_seats_assigned_with_remainder_system() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                540, 160, 160, 80, 80, 80, 60, 40,
            ]);
            let result = seat_assignment(15, &totals).unwrap();
            assert_eq!(result.steps.len(), 2);
            assert_eq!(result.steps[0].change.political_group_number(), 1);
            assert_eq!(result.steps[1].change.political_group_number(), 7);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![7, 2, 2, 1, 1, 1, 1, 0]);
        }

        /// Apportionment with residual seats assigned with remainder and averages system
        ///
        /// Full seats: [10, 0, 0, 0, 0, 0, 0, 0] - Remainder seats: 5
        /// Remainders: [8, 59, 58, 57, 56, 55, 54, 53], only votes of list 1 meet the threshold of 75% of the quota
        /// 1 - largest remainder: seat assigned to list 1
        /// 1st round of largest averages system (assignment to unique political groups):
        /// 2 - largest average: [67 4/12, 59, 58, 57, 56, 55, 54, 53] seat assigned to list 1
        /// 3 - largest average: [62 2/13, 59, 58, 57, 56, 55, 54, 53] seat assigned to list 2,
        /// 4 - largest average: [62 2/13, 29 1/2, 58, 57, 56, 55, 54, 53] seat assigned to list 3
        /// 5 - largest average: [62 2/13, 29 1/2, 29, 57, 56, 55, 54, 53] seat assigned to list 4
        #[test]
        fn test_with_1_list_that_meets_threshold() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                808, 59, 58, 57, 56, 55, 54, 53,
            ]);
            let result = seat_assignment(15, &totals).unwrap();
            assert_eq!(result.steps.len(), 5);
            assert_eq!(result.steps[0].change.political_group_number(), 1);
            assert_eq!(result.steps[1].change.political_group_number(), 1);
            assert_eq!(result.steps[2].change.political_group_number(), 2);
            assert_eq!(result.steps[3].change.political_group_number(), 3);
            assert_eq!(result.steps[4].change.political_group_number(), 4);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![12, 1, 1, 1, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with remainder system
        ///
        /// Full seats: [6, 3, 3, 0, 0, 0, 0] - Remainder seats: 3
        /// Remainders: [0/15, 0/15, 0/15, 55, 50, 45, 45, 45], only votes of lists [1, 2, 3] meet the threshold of 75% of the quota
        /// 1 - largest remainder: seat assigned to list 1
        /// 2 - largest remainder: seat assigned to list 2
        /// 3 - largest remainder: seat assigned to list 3
        #[test]
        fn test_with_3_lists_that_meet_threshold_0_remainders() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                480, 240, 240, 55, 50, 45, 45, 45,
            ]);
            let result = seat_assignment(15, &totals).unwrap();
            assert_eq!(result.steps.len(), 3);
            assert_eq!(result.steps[0].change.political_group_number(), 1);
            assert_eq!(result.steps[1].change.political_group_number(), 2);
            assert_eq!(result.steps[2].change.political_group_number(), 3);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![7, 4, 4, 0, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with averages system
        ///
        /// Full seats: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] - Remainder seats: 3
        /// Remainders: [8, 7, 6, 5, 4, 3, 2, 1, 1, 1], no lists meet the threshold of 75% of the quota
        /// 1st round of largest averages system (assignment to unique political groups):
        /// 1 - largest average: [8, 7, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 1
        /// 2 - largest average: [4, 7, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 2
        /// 3 - largest average: [4, 3 1/2, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 3
        #[test]
        fn test_with_0_lists_that_meet_threshold() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                8, 7, 6, 5, 4, 3, 2, 1, 1, 1,
            ]);
            let result = seat_assignment(3, &totals).unwrap();
            assert_eq!(result.steps.len(), 3);
            assert_eq!(result.steps[0].change.political_group_number(), 1);
            assert_eq!(result.steps[1].change.political_group_number(), 2);
            assert_eq!(result.steps[2].change.political_group_number(), 3);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with remainder and averages system
        ///
        /// Full seats: [0, 0, 0, 0, 0, 7] - Remainder seats: 3
        /// Remainders: [0/10, 3, 5, 6, 7, 9], only votes of list [6] meets the threshold of 75% of the quota
        ///  1 - largest remainder: seat assigned to list 6
        /// 1st round of largest averages system (assignment to unique political groups):
        ///  2 - largest average: [0/1, 3, 5, 6, 7, 8 7/8] seat assigned to list 6
        ///  3 - largest average: [0/1, 3, 5, 6, 7, 7 9/10] seat assigned to list 5
        #[test]
        fn test_1st_round_unique_largest_averages_system_regression() {
            let votes = vec![0, 3, 5, 6, 7, 79];
            let totals = election_summary_fixture_with_default_50_candidates(votes);
            let result = seat_assignment(10, &totals).unwrap();
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, [0, 0, 0, 0, 1, 9]);
        }

        /// Apportionment with residual seats assigned with remainder and averages system
        ///
        /// Full seats: [0, 0, 0, 0, 0] - Remainder seats: 10
        /// Remainders: [0/10, 0/10, 0/10, 0/10, 0/10]
        ///  1 - largest remainder: seat assigned to list 1
        ///  2 - largest remainder: seat assigned to list 2
        ///  3 - largest remainder: seat assigned to list 3
        ///  4 - largest remainder: seat assigned to list 4
        ///  5 - largest remainder: seat assigned to list 5
        /// 1st round of largest averages system (assignment to unique political groups):
        ///  6 - largest average: [0/2, 0/2, 0/2, 0/2, 0/2] seat assigned to list 1
        ///  7 - largest average: [0/2, 0/2, 0/2, 0/2, 0/2] seat assigned to list 2
        ///  8 - largest average: [0/2, 0/2, 0/2, 0/2, 0/2] seat assigned to list 3
        ///  9 - largest average: [0/2, 0/2, 0/2, 0/2, 0/2] seat assigned to list 4
        /// 10 - largest average: [0/2, 0/2, 0/2, 0/2, 0/2] seat assigned to list 5
        #[test]
        fn test_with_0_votes() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![0, 0, 0, 0, 0]);
            let result = seat_assignment(10, &totals).unwrap();
            assert_eq!(result.steps.len(), 10);
            assert_eq!(result.steps[0].change.political_group_number(), 1);
            assert_eq!(result.steps[1].change.political_group_number(), 2);
            assert_eq!(result.steps[2].change.political_group_number(), 3);
            assert_eq!(result.steps[3].change.political_group_number(), 4);
            assert_eq!(result.steps[4].change.political_group_number(), 5);
            assert_eq!(result.steps[5].change.political_group_number(), 1);
            assert_eq!(result.steps[6].change.political_group_number(), 2);
            assert_eq!(result.steps[7].change.political_group_number(), 3);
            assert_eq!(result.steps[8].change.political_group_number(), 4);
            assert_eq!(result.steps[9].change.political_group_number(), 5);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![2, 2, 2, 2, 2]);
        }

        /// Apportionment with residual seats assigned with remainder system
        ///
        /// This test triggers Kieswet Article P 9 (Actual case from GR2022)
        /// Full seats: [7, 2, 1, 1, 1] - Remainder seats: 3
        /// Remainders: [189 2/15, 296 7/15, 226 11/15, 195 11/15, 112 11/15]
        /// 1 - largest remainder: seat assigned to list 2
        /// 2 - largest remainder: seat assigned to list 3
        /// 3 - largest remainder: seat assigned to list 4
        /// 4 - Residual seat first assigned to list 4 has been re-assigned to list 1 in accordance with Article P 9 Kieswet
        #[test]
        fn test_with_absolute_majority_of_votes_but_not_seats() {
            let totals =
                election_summary_fixture_with_default_50_candidates(vec![2571, 977, 567, 536, 453]);
            let result = seat_assignment(15, &totals).unwrap();
            assert_eq!(result.steps.len(), 4);
            assert_eq!(result.steps[0].change.political_group_number(), 2);
            assert_eq!(result.steps[1].change.political_group_number(), 3);
            assert_eq!(result.steps[2].change.political_group_number(), 4);
            assert!(
                result.steps[3]
                    .change
                    .is_assigned_by_absolute_majority_change()
            );
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![8, 3, 2, 1, 1]);
        }

        /// Apportionment with residual seats assigned with remainder system
        /// This test triggers Kieswet Article P 9
        ///
        /// Full seats: [7, 1, 1, 1, 1, 1] - Remainder seats: 3
        /// Remainders: [170 9/15, 170 12/15, 170 12/15, 170 12/15, 168 12/15, 168 12/15]
        /// 1 - largest remainder: seat assigned to list 2
        /// 2 - largest remainder: seat assigned to list 3
        /// 3 - largest remainder: seat assigned to list 4
        /// 4 - Drawing of lots is required for political groups: [2, 3, 4] to pick a political group which the residual seat gets retracted from
        #[test]
        fn test_with_absolute_majority_of_votes_but_not_seats_with_drawing_of_lots_error() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                2552, 511, 511, 511, 509, 509,
            ]);
            let result = seat_assignment(15, &totals);
            assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
        }

        /// Apportionment with residual seats assigned with remainder and 2 rounds of averages system
        ///
        /// Full seats: [0, 0, 0, 0, 0] - Remainder seats: 15
        /// Remainders: [0/10, 0/10, 0/10, 0/10, 0/10]
        ///  1 - largest remainder: seat assigned to list 1
        ///  2 - largest remainder: seat assigned to list 2
        ///  3 - largest remainder: seat assigned to list 3
        ///  4 - largest remainder: seat assigned to list 4
        ///  5 - largest remainder: seat assigned to list 5
        /// 1st round of largest averages system (assignment to unique political groups):
        ///  6 - largest average: [0/1, 0/1, 0/1, 0/1, 0/1] seat assigned to list 1
        ///  7 - largest average: [0/1, 0/1, 0/1, 0/1, 0/1] seat assigned to list 2
        ///  8 - largest average: [0/1, 0/1, 0/1, 0/1, 0/1] seat assigned to list 3
        ///  9 - largest average: [0/1, 0/1, 0/1, 0/1, 0/1] seat assigned to list 4
        /// 10 - largest average: [0/1, 0/1, 0/1, 0/1, 0/1] seat assigned to list 5
        /// 2nd round of largest averages system (assignment to any political group):
        /// 11 - largest average: [0/1, 0/1, 0/1, 0/1, 0/1] seat assigned to list 1
        /// 12 - Drawing of lots is required for political groups: [1, 2, 3, 4, 5], only 4 seats available
        #[test]
        fn test_with_0_votes_with_drawing_of_lots_error_in_2nd_round_averages_system() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![0, 0, 0, 0, 0]);
            let result = seat_assignment(15, &totals);
            assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
        }

        /// Apportionment with residual seats assigned with remainder system
        ///
        /// Full seats: [6, 2, 2, 1, 1, 1, 0, 0] - Remainder seats: 2
        /// Remainders: [60, 0/15, 0/15, 0/15, 0/15, 0/15, 55, 45]
        /// 1 - largest remainder: seat assigned to list 1
        /// 2 - Drawing of lots is required for political groups: [2, 3, 4, 5, 6], only 1 seat available
        #[test]
        fn test_with_0_remainders_drawing_of_lots_error() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                540, 160, 160, 80, 80, 80, 55, 45,
            ]);
            let result = seat_assignment(15, &totals);
            assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
        }

        /// Apportionment with residual seats assigned with remainder system
        ///
        /// Full seats: [6, 1, 1, 1, 1, 1] - Remainder seats: 4
        /// Remainders: [20, 60, 60, 60, 60, 60]
        /// 1 - Drawing of lots is required for political groups: [2, 3, 4, 5, 6], only 4 seats available
        #[test]
        fn test_with_drawing_of_lots_error() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                500, 140, 140, 140, 140, 140,
            ]);
            let result = seat_assignment(15, &totals);
            assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
        }
    }

    /// Tests apportionment for councils with 19 or more seats
    mod gte_19_seats {
        use crate::apportionment::{
            ApportionmentError, get_total_seats_from_apportionment_result, seat_assignment,
            test_helpers::election_summary_fixture_with_default_50_candidates,
        };
        use test_log::test;

        /// Apportionment without remainder seats
        ///
        /// Full seats: [12, 6, 2, 2, 2, 1] - Remainder seats: 0
        #[test]
        fn test_without_remainder_seats() {
            let totals =
                election_summary_fixture_with_default_50_candidates(vec![576, 288, 96, 96, 96, 48]);
            let result = seat_assignment(25, &totals).unwrap();
            assert_eq!(result.steps.len(), 0);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![12, 6, 2, 2, 2, 1]);
        }

        /// Apportionment with residual seats assigned with averages system
        ///
        /// Full seats: [11, 5, 1, 1, 1] - Remainder seats: 4
        /// 1 - largest average: [50, 50 2/6, 49, 49 1/2, 50 1/2] seat assigned to list 5
        /// 2 - largest average: [50, 50 2/6, 49, 49 1/2, 33 2/3] seat assigned to list 2
        /// 3 - largest average: [50, 43 1/7, 49, 49 1/2, 33 2/3] seat assigned to list 1
        /// 4 - largest average: [46 2/13, 43 1/7, 49, 49 1/2, 33 2/3] seat assigned to list 4
        #[test]
        fn test_with_remainder_seats() {
            let totals =
                election_summary_fixture_with_default_50_candidates(vec![600, 302, 98, 99, 101]);
            let result = seat_assignment(23, &totals).unwrap();
            assert_eq!(result.steps.len(), 4);
            assert_eq!(result.steps[0].change.political_group_number(), 5);
            assert_eq!(result.steps[1].change.political_group_number(), 2);
            assert_eq!(result.steps[2].change.political_group_number(), 1);
            assert_eq!(result.steps[3].change.political_group_number(), 4);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![12, 6, 1, 2, 2]);
        }

        /// Apportionment with residual seats assigned with averages system
        ///
        /// Full seats: [15, 0, 0, 0, 0, 0, 0, 0, 0] - Remainder seats: 7
        /// 1 - largest average: [62 2/13, 57, 56, 55, 54, 53, 52, 51, 14] seat assigned to list 1
        /// 2 - largest average: [57 10/14, 57, 56, 55, 54, 53, 52, 51, 14] seat assigned to list 1
        /// 3 - largest average: [53 13/15, 57, 56, 55, 54, 53, 52, 51, 14] seat assigned to list 2
        /// 4 - largest average: [53 13/15, 28 1/2, 56, 55, 54, 53, 52, 51, 14] seat assigned to list 3
        /// 5 - largest average: [53 13/15, 28 1/2, 28, 55, 54, 53, 52, 51, 14] seat assigned to list 4
        /// 6 - largest average: [53 13/15, 28 1/2, 28, 27 1/2, 54, 53, 52, 51, 14] seat assigned to list 5
        /// 7 - largest average: [53 13/15, 28 1/2, 28, 27 1/2, 27, 53, 52, 51, 14] seat assigned to list 1
        #[test]
        fn test_with_multiple_remainder_seats_assigned_to_one_list() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                808, 57, 56, 55, 54, 53, 52, 51, 14,
            ]);
            let result = seat_assignment(19, &totals).unwrap();
            assert_eq!(result.steps.len(), 7);
            assert_eq!(result.steps[0].change.political_group_number(), 1);
            assert_eq!(result.steps[1].change.political_group_number(), 1);
            assert_eq!(result.steps[2].change.political_group_number(), 2);
            assert_eq!(result.steps[3].change.political_group_number(), 3);
            assert_eq!(result.steps[4].change.political_group_number(), 4);
            assert_eq!(result.steps[5].change.political_group_number(), 5);
            assert_eq!(result.steps[6].change.political_group_number(), 1);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![15, 1, 1, 1, 1, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with averages system
        ///
        /// Full seats: [0] - Remainder seats: 19
        /// 1-19 - largest average: [0/1] seat assigned to list 1
        #[test]
        fn test_with_0_votes() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![0]);
            let result = seat_assignment(19, &totals).unwrap();
            assert_eq!(result.steps.len(), 19);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![19]);
        }

        /// Apportionment with residual seats assigned with averages system
        /// This test triggers Kieswet Article P 9
        ///
        /// Full seats: [12, 1, 1, 1, 1, 1, 1, 0] - Remainder seats: 6
        /// 1 - largest average: [577, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 2
        /// 2 - largest average: [577, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 3
        /// 3 - largest average: [577, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 4
        /// 4 - largest average: [577, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624, 7] seat assigned to list 5
        /// 5 - largest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624, 7] seat assigned to list 6
        /// 6 - largest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624, 7] seat assigned to list 7
        /// 7 - Residual seat first assigned to list 7 has been re-assigned to list 1 in accordance with Article P 9 Kieswet
        #[test]
        fn test_with_absolute_majority_of_votes_but_not_seats() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                7501, 1249, 1249, 1249, 1249, 1249, 1248, 7,
            ]);
            let result = seat_assignment(24, &totals).unwrap();
            assert_eq!(result.steps.len(), 7);
            assert_eq!(result.steps[0].change.political_group_number(), 2);
            assert_eq!(result.steps[1].change.political_group_number(), 3);
            assert_eq!(result.steps[2].change.political_group_number(), 4);
            assert_eq!(result.steps[3].change.political_group_number(), 5);
            assert_eq!(result.steps[4].change.political_group_number(), 6);
            assert_eq!(result.steps[5].change.political_group_number(), 7);
            let total_seats = get_total_seats_from_apportionment_result(result);
            assert_eq!(total_seats, vec![13, 2, 2, 2, 2, 2, 1, 0]);
        }

        /// Apportionment with residual seats assigned with averages system
        /// This test triggers Kieswet Article P 9
        ///
        /// Full seats: [12, 1, 1, 1, 1, 1, 1, 0] - Remainder seats: 6
        /// 1 - largest average: [577, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 2
        /// 2 - largest average: [577, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 3
        /// 3 - largest average: [577, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 4
        /// 4 - largest average: [577, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624, 624, 8] seat assigned to list 5
        /// 5 - largest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624, 624, 8] seat assigned to list 6
        /// 6 - largest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 416, 624, 8] seat assigned to list 7
        /// 7 - Drawing of lots is required for political groups: [6, 7] to pick a political group which the residual seat gets retracted from
        #[test]
        fn test_with_absolute_majority_of_votes_but_not_seats_with_drawing_of_lots_error() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                7501, 1249, 1249, 1249, 1249, 1248, 1248, 8,
            ]);
            let result = seat_assignment(24, &totals);
            assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
        }

        /// Apportionment with residual seats assigned with averages system
        ///
        /// Full seats: [0, 0, 0, 0, 0] - Remainder seats: 19
        /// 1-15 - largest average: [0/1, 0/1, 0/1, 0/1, 0/1] seat assigned to list 1
        /// 16 - Drawing of lots is required for political groups: [1, 2, 3, 4, 5], only 4 seats available
        #[test]
        fn test_with_0_votes_with_drawing_of_lots_error() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![0, 0, 0, 0, 0]);
            let result = seat_assignment(19, &totals);
            assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
        }

        /// Apportionment with residual seats assigned with averages system
        ///
        /// Full seats: [9, 2, 2, 2, 2, 2] - Remainder seats: 4
        /// 1 - largest average: [50, 46 2/3, 46 2/3, 46 2/3, 46 2/3, 46 2/3] seat assigned to list 1
        /// 2 - Drawing of lots is required for political groups: [2, 3, 4, 5, 6], only 3 seats available
        #[test]
        fn test_with_drawing_of_lots_error() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                500, 140, 140, 140, 140, 140,
            ]);
            let result = seat_assignment(23, &totals);
            assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
        }
    }
}
