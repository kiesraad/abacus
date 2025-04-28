use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use tracing::{debug, info};
use utoipa::ToSchema;

use super::Fraction;
use crate::{data_entry::PoliticalGroupVotes, election::PGNumber, summary::ElectionSummary};

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
    pub steps: Vec<SeatChangeStep>,
    pub final_standing: Vec<PoliticalGroupSeatAssignment>,
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
        let pg_seats = if votes_cast > Fraction::ZERO {
            u32::try_from((votes_cast / quota).integer_part()).expect("pg_seats fit in u32")
        } else {
            0
        };

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

/// Records the change for a specific seat, and how the standing is once
/// that seat was assigned or removed
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct SeatChangeStep {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    residual_seat_number: Option<u32>,
    change: SeatChange,
    standings: Vec<PoliticalGroupStanding>,
}

/// Records the political group and specific change for a specific residual seat
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
#[serde(tag = "changed_by")]
pub enum SeatChange {
    HighestAverageAssignment(HighestAverageAssignedSeat),
    UniqueHighestAverageAssignment(HighestAverageAssignedSeat),
    LargestRemainderAssignment(LargestRemainderAssignedSeat),
    AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat),
    ListExhaustionRemoval(ListExhaustionRemovedSeat),
}

impl SeatChange {
    /// Get the political group number for the group this step has assigned a seat to
    fn political_group_number_assigned(&self) -> PGNumber {
        match self {
            Self::HighestAverageAssignment(highest_average_assigned_seat) => {
                highest_average_assigned_seat.selected_pg_number
            }
            Self::UniqueHighestAverageAssignment(unique_highest_average_assigned_seat) => {
                unique_highest_average_assigned_seat.selected_pg_number
            }
            Self::LargestRemainderAssignment(largest_remainder_assigned_seat) => {
                largest_remainder_assigned_seat.selected_pg_number
            }
            Self::AbsoluteMajorityReassignment(absolute_majority_reassigned_seat) => {
                absolute_majority_reassigned_seat.pg_assigned_seat
            }
            Self::ListExhaustionRemoval(_) => unimplemented!(),
        }
    }

    /// Get the political group number for the group this step has retracted a seat from
    fn political_group_number_retracted(&self) -> PGNumber {
        match self {
            Self::HighestAverageAssignment(_) => unimplemented!(),
            Self::UniqueHighestAverageAssignment(_) => unimplemented!(),
            Self::LargestRemainderAssignment(_) => unimplemented!(),
            Self::AbsoluteMajorityReassignment(absolute_majority_reassigned_seat) => {
                absolute_majority_reassigned_seat.pg_retracted_seat
            }
            Self::ListExhaustionRemoval(list_exhaustion_removed_seat) => {
                list_exhaustion_removed_seat.pg_retracted_seat
            }
        }
    }

    /// Get the list of political groups with the same average, that have not been assigned a seat
    fn pg_options(&self) -> Vec<PGNumber> {
        match self {
            Self::HighestAverageAssignment(highest_average_assigned_seat) => {
                highest_average_assigned_seat.pg_options.clone()
            }
            Self::UniqueHighestAverageAssignment(unique_highest_average_assigned_seat) => {
                unique_highest_average_assigned_seat.pg_options.clone()
            }
            Self::LargestRemainderAssignment(largest_remainder_assigned_seat) => {
                largest_remainder_assigned_seat.pg_options.clone()
            }
            Self::AbsoluteMajorityReassignment(_) => unimplemented!(),
            Self::ListExhaustionRemoval(_) => unimplemented!(),
        }
    }

    /// Get the list of political groups with the same average, that have been assigned a seat
    fn pg_assigned(&self) -> Vec<PGNumber> {
        match self {
            Self::HighestAverageAssignment(highest_average_assigned_seat) => {
                highest_average_assigned_seat.pg_assigned.clone()
            }
            Self::UniqueHighestAverageAssignment(unique_highest_average_assigned_seat) => {
                unique_highest_average_assigned_seat.pg_assigned.clone()
            }
            Self::LargestRemainderAssignment(largest_remainder_assigned_seat) => {
                largest_remainder_assigned_seat.pg_assigned.clone()
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

    /// Returns true if the seat was changed through the list exhaustion removal
    pub fn is_changed_by_list_exhaustion_removal(&self) -> bool {
        matches!(self, Self::ListExhaustionRemoval(_))
    }
}

/// Contains the details for an assigned seat, assigned through the highest average method.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct HighestAverageAssignedSeat {
    /// The political group that was selected for this seat has this political group number
    #[schema(value_type = u32)]
    selected_pg_number: PGNumber,
    /// The list of political groups with the same average, that have not been assigned a seat
    #[schema(value_type = Vec<u32>)]
    pg_options: Vec<PGNumber>,
    /// The list of political groups with the same average, that have been assigned a seat
    #[schema(value_type = Vec<u32>)]
    pg_assigned: Vec<PGNumber>,
    /// The list of political groups that are exhausted, and will not be assigned a seat
    #[schema(value_type = Vec<u32>)]
    pg_exhausted: Vec<PGNumber>,
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

/// Contains information about the enactment of article P 9 of the Kieswet.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct AbsoluteMajorityReassignedSeat {
    /// Political group number which the residual seat is retracted from
    #[schema(value_type = u32)]
    pg_retracted_seat: PGNumber,
    /// Political group number which the residual seat is assigned to
    #[schema(value_type = u32)]
    pg_assigned_seat: PGNumber,
}

/// Contains information about the enactment of article P 10 of the Kieswet.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ListExhaustionRemovedSeat {
    /// Political group number which the seat is retracted from
    #[schema(value_type = u32)]
    pg_retracted_seat: PGNumber,
    /// Whether the removed seat was a full seat
    full_seat: bool,
}

/// Errors that can occur during apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentError {
    AllListsExhausted,
    ApportionmentNotAvailableUntilDataEntryFinalised,
    DrawingOfLotsNotImplemented,
    ZeroVotesCast,
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

/// Compute the political groups with the highest average votes per seats.  
/// This is determined based on seeing what would happen to the average votes
/// per seat if one additional seat would be assigned to each political group.
///
/// It then returns all the political groups for which this fraction is the largest.  
/// If there are more political groups than there are residual seats to be assigned,
/// a drawing of lots is required.
///
/// This function will always return at least one group.
fn political_groups_with_highest_average<'a>(
    standings: impl Iterator<Item = &'a PoliticalGroupStanding>,
    residual_seats: u32,
) -> Result<Vec<&'a PoliticalGroupStanding>, ApportionmentError> {
    // We are now going to find the political groups that have the highest average
    // votes per seat if we would were to add one additional seat to them
    let (max_average, political_groups) = standings.fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), s| {
            // If this average is higher than any previously seen, we reset the list of groups matching
            if s.next_votes_per_seat > current_max {
                (s.next_votes_per_seat, vec![s])
            } else {
                // If the next average seats for this political group is the same as the
                // max we add it to the list of groups that have that current maximum
                if s.next_votes_per_seat == current_max {
                    max_groups.push(s);
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
        // TODO: #788 if multiple political groups have the same highest average and not enough residual seats are available, use drawing of lots
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
    standings: impl Iterator<Item = &'a PoliticalGroupStanding>,
    residual_seats: u32,
) -> Result<Vec<&'a PoliticalGroupStanding>, ApportionmentError> {
    // We are now going to find the political groups that have the largest remainder
    let (max_remainder, political_groups) = standings.fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), s| {
            // If this remainder is higher than any previously seen, we reset the list of groups matching
            if s.remainder_votes > current_max {
                (s.remainder_votes, vec![s])
            } else {
                // If the remainder for this political group is the same as the
                // max we add it to the list of groups that have that current maximum
                if s.remainder_votes == current_max {
                    max_groups.push(s);
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
    standings: Vec<PoliticalGroupStanding>,
) -> Result<(Vec<PoliticalGroupStanding>, Option<SeatChange>), ApportionmentError> {
    let half_of_votes_count: Fraction =
        Fraction::from(totals.votes_counts.votes_candidates_count) * Fraction::new(1, 2);

    // Find political group with an absolute majority of votes. Return early if we find none
    let Some(majority_pg_votes) = totals
        .political_group_votes
        .iter()
        .find(|pg| Fraction::from(pg.total) > half_of_votes_count)
    else {
        return Ok((standings, None));
    };

    let half_of_seats_count: Fraction = Fraction::from(seats) * Fraction::new(1, 2);
    let standing_of_pg_with_majority_votes = standings
        .iter()
        .find(|pg_standing| pg_standing.pg_number == majority_pg_votes.number)
        .expect("Standing exists");

    let pg_seats = Fraction::from(standing_of_pg_with_majority_votes.total_seats());

    if pg_seats <= half_of_seats_count {
        if pgs_last_residual_seat.len() > 1 {
            info!(
                "Drawing of lots is required for political groups: {:?} to pick a political group which the residual seat gets retracted from",
                pgs_last_residual_seat
            );
            return Err(ApportionmentError::DrawingOfLotsNotImplemented);
        }

        // Reassign the seat
        let mut standing = standings.clone();
        standing[pgs_last_residual_seat[0] as usize - 1].residual_seats -= 1;
        standing[majority_pg_votes.number as usize - 1].residual_seats += 1;

        info!(
            "Seat first assigned to list {} has been reassigned to list {} in accordance with Article P 9 Kieswet",
            pgs_last_residual_seat[0], majority_pg_votes.number
        );
        Ok((
            standing,
            Some(SeatChange::AbsoluteMajorityReassignment(
                AbsoluteMajorityReassignedSeat {
                    pg_retracted_seat: pgs_last_residual_seat[0],
                    pg_assigned_seat: majority_pg_votes.number,
                },
            )),
        ))
    } else {
        Ok((standings, None))
    }
}

fn pg_numbers_with_exhausted_seats<'a>(
    standings: impl Iterator<Item = &'a PoliticalGroupStanding>,
    totals: &'a ElectionSummary,
) -> Vec<(PGNumber, u32)> {
    standings.fold(vec![], |mut exhausted_pg_numbers_and_seats, s| {
        let number_of_candidates = u32::try_from(
            totals.political_group_votes[s.pg_number as usize - 1]
                .candidate_votes
                .len(),
        )
        .expect("Number of candidates fits in u32");

        if number_of_candidates.cmp(&s.total_seats()) == Ordering::Less {
            exhausted_pg_numbers_and_seats
                .push((s.pg_number, number_of_candidates.abs_diff(s.total_seats())))
        }
        exhausted_pg_numbers_and_seats
    })
}

fn pg_numbers_without_empty_seats<'a>(
    standings: impl Iterator<Item = &'a PoliticalGroupStanding>,
    totals: &'a ElectionSummary,
) -> Vec<PGNumber> {
    standings.fold(vec![], |mut pg_numbers_without_empty_seats, s| {
        let number_of_candidates = u32::try_from(
            totals.political_group_votes[s.pg_number as usize - 1]
                .candidate_votes
                .len(),
        )
        .expect("Number of candidates fits in u32");

        if number_of_candidates.cmp(&s.total_seats()) == Ordering::Equal {
            pg_numbers_without_empty_seats.push(s.pg_number)
        }
        pg_numbers_without_empty_seats
    })
}

/// If political groups got more seats than candidates on their lists,
/// re-assign those excess seats to other political groups without exhausted lists.  
/// This re-assignment is done according to article P 10 of the Kieswet.
fn reassign_residual_seats_for_exhausted_lists(
    previous_standings: Vec<PoliticalGroupStanding>,
    seats: u32,
    assigned_residual_seats: u32,
    previous_steps: Vec<SeatChangeStep>,
    totals: &ElectionSummary,
) -> Result<(Vec<SeatChangeStep>, Vec<PoliticalGroupStanding>), ApportionmentError> {
    let exhausted_lists = pg_numbers_with_exhausted_seats(previous_standings.iter(), totals);
    if !exhausted_lists.is_empty() {
        let mut current_standings = previous_standings.clone();
        let mut seats_to_reassign = 0;
        let mut list_exhaustion_steps: Vec<SeatChangeStep> = vec![];

        // Remove excess seats from exhausted lists
        for (pg_number, seats) in exhausted_lists {
            seats_to_reassign += seats;
            let mut full_seat: bool = false;
            for _ in 1..=seats {
                if current_standings[pg_number as usize - 1].residual_seats > 0 {
                    current_standings[pg_number as usize - 1].residual_seats -= 1;
                } else {
                    current_standings[pg_number as usize - 1].full_seats -= 1;
                    full_seat = true;
                }
                info!(
                    "Seat first assigned to list {} has been removed and will be assigned to another list in accordance with Article P 10 Kieswet",
                    pg_number
                );
                list_exhaustion_steps.push(SeatChangeStep {
                    standings: current_standings.clone(),
                    residual_seat_number: None,
                    change: SeatChange::ListExhaustionRemoval(ListExhaustionRemovedSeat {
                        pg_retracted_seat: pg_number,
                        full_seat,
                    }),
                });
            }
        }
        let mut current_steps = previous_steps.to_owned();
        current_steps.extend(list_exhaustion_steps);

        // Reassign removed seats to non-exhausted lists
        (current_steps, current_standings) = assign_remainder(
            &current_standings,
            seats,
            assigned_residual_seats + seats_to_reassign,
            assigned_residual_seats,
            &current_steps,
            Some(totals),
        )?;
        Ok((current_steps, current_standings))
    } else {
        Ok((previous_steps, previous_standings))
    }
}

/// Seat assignment
pub fn seat_assignment(
    seats: u32,
    totals: &ElectionSummary,
) -> Result<SeatAssignmentResult, ApportionmentError> {
    info!("Seat assignment");
    info!("Seats: {}", seats);

    if totals.votes_counts.votes_candidates_count == 0 {
        info!("No votes on candidates cast");
        return Err(ApportionmentError::ZeroVotesCast);
    }

    // [Artikel P 5 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_5&z=2025-02-12&g=2025-02-12)
    // Calculate electoral quota (kiesdeler) as a proper fraction
    let quota = Fraction::from(totals.votes_counts.votes_candidates_count) / Fraction::from(seats);
    info!("Quota: {}", quota);

    // [Artikel P 6 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_6&z=2025-02-12&g=2025-02-12)
    let initial_standing =
        initial_full_seats_per_political_group(&totals.political_group_votes, quota);
    let full_seats = initial_standing.iter().map(|pg| pg.full_seats).sum::<u32>();
    let residual_seats = seats - full_seats;

    let (mut steps, current_standings) = if residual_seats > 0 {
        assign_remainder(&initial_standing, seats, residual_seats, 0, &[], None)?
    } else {
        info!("All seats have been assigned without any residual seats");
        (vec![], initial_standing)
    };

    // [Artikel P 9 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_9&z=2025-02-12&g=2025-02-12)
    let (cumulative_standings, assigned_seat) = if let Some(last_step) = steps.last() {
        reassign_residual_seat_for_absolute_majority(
            seats,
            totals,
            &last_step.change.pg_assigned(),
            current_standings,
        )?
    } else {
        (current_standings, None)
    };
    if let Some(assigned_seat) = assigned_seat {
        // add the absolute majority change to the remainder assignment steps
        steps.push(SeatChangeStep {
            standings: cumulative_standings.clone(),
            residual_seat_number: None,
            change: assigned_seat,
        });
    }

    // TODO: #797 [Artikel P 19a Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=3&artikel=P_19a&z=2025-02-12&g=2025-02-12)
    //  mark deceased candidates

    // [Artikel P 10 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_10&z=2025-02-12&g=2025-02-12)
    let (final_steps, final_standing) = reassign_residual_seats_for_exhausted_lists(
        cumulative_standings,
        seats,
        residual_seats,
        steps,
        totals,
    )?;

    let final_full_seats = final_standing.iter().map(|pg| pg.full_seats).sum::<u32>();
    let final_residual_seats = seats - final_full_seats;

    Ok(SeatAssignmentResult {
        seats,
        full_seats: final_full_seats,
        residual_seats: final_residual_seats,
        quota,
        steps: final_steps,
        final_standing: final_standing.into_iter().map(Into::into).collect(),
    })
}

/// This function assigns the residual seats that remain after full seat assignment is finished.  
/// These residual seats are assigned through two different procedures,
/// depending on how many total seats are available in the election.
fn assign_remainder(
    initial_standings: &[PoliticalGroupStanding],
    seats: u32,
    total_residual_seats: u32,
    current_residual_seat_number: u32,
    previous_steps: &[SeatChangeStep],
    exclude_exhausted_lists: Option<&ElectionSummary>,
) -> Result<(Vec<SeatChangeStep>, Vec<PoliticalGroupStanding>), ApportionmentError> {
    let mut steps: Vec<SeatChangeStep> = previous_steps.to_vec();
    let mut residual_seat_number = current_residual_seat_number;
    let mut current_standings = initial_standings.to_vec();

    while residual_seat_number != total_residual_seats {
        let residual_seats = total_residual_seats - residual_seat_number;
        residual_seat_number += 1;
        let exhausted_pg_numbers: Vec<PGNumber> = exclude_exhausted_lists
            .map_or_else(Vec::new, |totals| {
                pg_numbers_without_empty_seats(current_standings.iter(), totals)
            });

        let change = if seats >= 19 {
            debug!("Assign residual seat using highest averages method");
            // [Artikel P 7 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_7&z=2025-02-12&g=2025-02-12)
            step_assign_remainder_using_highest_averages(
                current_standings.iter(),
                residual_seats,
                &steps,
                &exhausted_pg_numbers,
                false,
            )?
        } else {
            // [Artikel P 8 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=2&artikel=P_8&z=2025-02-12&g=2025-02-12)
            step_assign_remainder_using_largest_remainder(
                &current_standings,
                residual_seats,
                &steps,
                &exhausted_pg_numbers,
            )?
        };

        let standings = current_standings.clone();

        // update the current standing by finding the selected group and
        // adding the residual seat to their tally
        current_standings = current_standings
            .into_iter()
            .map(|s| {
                if s.pg_number == change.political_group_number_assigned() {
                    s.add_residual_seat()
                } else {
                    s
                }
            })
            .collect();

        // add the update to the remainder assignment steps
        steps.push(SeatChangeStep {
            standings,
            residual_seat_number: Some(residual_seat_number),
            change,
        });
    }

    Ok((steps, current_standings))
}

/// Get a vector with the political group number that was assigned the last residual seat.  
/// If the last residual seat was assigned to a political group with the same
/// remainder/votes per seat as political groups assigned a seat in previous steps,
/// return all political group numbers that had the same remainder/votes per seat.
fn pg_assigned_from_previous_step(
    selected_pg: &PoliticalGroupStanding,
    previous_steps: &[SeatChangeStep],
    matcher: fn(&SeatChange) -> bool,
) -> Vec<PGNumber> {
    let mut pg_assigned = Vec::new();
    if let Some(previous_step) = previous_steps.last() {
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

/// Get an iterator that lists all the political group standings without exhausted lists.  
fn non_exhausted_political_group_standings<'a>(
    standings: impl IntoIterator<Item = &'a PoliticalGroupStanding>,
    exhausted_pg_numbers: &[PGNumber],
) -> impl Iterator<Item = &'a PoliticalGroupStanding> {
    standings
        .into_iter()
        .filter(|&s| !exhausted_pg_numbers.contains(&s.pg_number))
}

/// Assign the next residual seat, and return which group that seat was assigned to.  
/// This assignment is done according to the rules for elections with 19 seats or more.
fn step_assign_remainder_using_highest_averages<'a>(
    standings: impl Iterator<Item = &'a PoliticalGroupStanding>,
    residual_seats: u32,
    previous_steps: &[SeatChangeStep],
    exhausted_pg_numbers: &[PGNumber],
    unique: bool,
) -> Result<SeatChange, ApportionmentError> {
    let mut qualifying_for_highest_average =
        non_exhausted_political_group_standings(standings, exhausted_pg_numbers).peekable();

    if qualifying_for_highest_average.peek().is_some() {
        let selected_pgs =
            political_groups_with_highest_average(qualifying_for_highest_average, residual_seats)?;
        let selected_pg = selected_pgs[0];
        let assigned_seat: HighestAverageAssignedSeat = HighestAverageAssignedSeat {
            selected_pg_number: selected_pg.pg_number,
            pg_assigned: pg_assigned_from_previous_step(
                selected_pg,
                previous_steps,
                if unique {
                    SeatChange::is_changed_by_unique_highest_average_assignment
                } else {
                    SeatChange::is_changed_by_highest_average_assignment
                },
            ),
            pg_options: selected_pgs.iter().map(|pg| pg.pg_number).collect(),
            pg_exhausted: exhausted_pg_numbers.to_vec(),
            votes_per_seat: selected_pg.next_votes_per_seat,
        };
        if unique {
            Ok(SeatChange::UniqueHighestAverageAssignment(assigned_seat))
        } else {
            Ok(SeatChange::HighestAverageAssignment(assigned_seat))
        }
    } else {
        info!("Seat cannot be (re)assigned because all lists are exhausted");
        Err(ApportionmentError::AllListsExhausted)
    }
}

fn political_group_largest_remainder_assigned_seats(
    previous_steps: &[SeatChangeStep],
    pg_number: PGNumber,
) -> usize {
    previous_steps
        .iter()
        .filter(|prev| {
            prev.change.is_changed_by_largest_remainder_assignment()
                && prev.change.political_group_number_assigned() == pg_number
        })
        .count()
}

fn political_group_unique_highest_average_assigned_seats(
    previous_steps: &[SeatChangeStep],
    pg_number: PGNumber,
) -> usize {
    previous_steps
        .iter()
        .filter(|prev| {
            prev.change
                .is_changed_by_unique_highest_average_assignment()
                && prev.change.political_group_number_assigned() == pg_number
        })
        .count()
}

fn political_group_qualifies_for_extra_seat(
    number_of_seats_largest_remainders: usize,
    number_of_seats_unique_highest_averages_option: Option<usize>,
    previous_steps: &[SeatChangeStep],
    pg_number: PGNumber,
) -> bool {
    let has_retracted_seat: bool = previous_steps.iter().any(|prev| {
        prev.change.is_changed_by_absolute_majority_reassignment()
            && prev.change.political_group_number_retracted() == pg_number
    });
    if number_of_seats_unique_highest_averages_option.is_none() {
        number_of_seats_largest_remainders == 0
            || (has_retracted_seat && number_of_seats_largest_remainders == 1)
    } else if let Some(number_of_seats_unique_highest_averages) =
        number_of_seats_unique_highest_averages_option
    {
        number_of_seats_unique_highest_averages == 0
            || (has_retracted_seat
                && number_of_seats_unique_highest_averages == 1
                && number_of_seats_largest_remainders <= 1)
    } else {
        false
    }
}

/// Get an iterator that lists all the political groups that qualify for getting a seat through
/// the largest remainder process.  
/// This checks the previously assigned seats to make sure that only political groups that didn't
/// previously get a seat assigned are allowed to still get a seat through the remainder process,
/// except when a seat was retracted.
/// Additionally only political groups that met the threshold are considered for this process.
/// This also removes groups that do not have more candidates to be assigned seats.
fn political_group_standings_qualifying_for_largest_remainder<'a>(
    standings: &'a [PoliticalGroupStanding],
    previous_steps: &'a [SeatChangeStep],
    exhausted_pg_numbers: &[PGNumber],
) -> impl Iterator<Item = &'a PoliticalGroupStanding> {
    standings.iter().filter(|&s| {
        s.meets_remainder_threshold
            && !exhausted_pg_numbers.contains(&s.pg_number)
            && political_group_qualifies_for_extra_seat(
                political_group_largest_remainder_assigned_seats(previous_steps, s.pg_number),
                None,
                previous_steps,
                s.pg_number,
            )
    })
}

/// Get an iterator that lists all the political groups that qualify for unique highest average.
/// This checks the previously assigned seats to make sure that every group that already
/// got a residual seat through the highest average procedure does not qualify
/// except when a seat was retracted.
fn political_group_standings_qualifying_for_unique_highest_average<'a>(
    standings: &'a [PoliticalGroupStanding],
    previous_steps: &'a [SeatChangeStep],
    exhausted_pg_numbers: &[PGNumber],
) -> impl Iterator<Item = &'a PoliticalGroupStanding> {
    standings.iter().filter(|&s| {
        !exhausted_pg_numbers.contains(&s.pg_number)
            && political_group_qualifies_for_extra_seat(
                political_group_largest_remainder_assigned_seats(previous_steps, s.pg_number),
                Some(political_group_unique_highest_average_assigned_seats(
                    previous_steps,
                    s.pg_number,
                )),
                previous_steps,
                s.pg_number,
            )
    })
}

/// Assign the next residual seat, and return which group that seat was assigned to.  
/// This assignment is done according to the rules for elections with less than 19 seats.
fn step_assign_remainder_using_largest_remainder(
    standings: &[PoliticalGroupStanding],
    residual_seats: u32,
    previous_steps: &[SeatChangeStep],
    exhausted_pg_numbers: &[PGNumber],
) -> Result<SeatChange, ApportionmentError> {
    // first we check if there are any political groups that still qualify for a largest remainder assigned seat
    let mut qualifying_for_remainder = political_group_standings_qualifying_for_largest_remainder(
        standings,
        previous_steps,
        exhausted_pg_numbers,
    )
    .peekable();

    // If there is at least one element in the iterator, we know we can still do a largest remainder assignment
    if qualifying_for_remainder.peek().is_some() {
        debug!("Assign residual seat using largest remainders method");
        let selected_pgs =
            political_groups_with_largest_remainder(qualifying_for_remainder, residual_seats)?;
        let selected_pg = selected_pgs[0];
        Ok(SeatChange::LargestRemainderAssignment(
            LargestRemainderAssignedSeat {
                selected_pg_number: selected_pg.pg_number,
                pg_assigned: pg_assigned_from_previous_step(
                    selected_pg,
                    previous_steps,
                    SeatChange::is_changed_by_largest_remainder_assignment,
                ),
                pg_options: selected_pgs.iter().map(|pg| pg.pg_number).collect(),
                remainder_votes: selected_pg.remainder_votes,
            },
        ))
    } else {
        // We've now exhausted the largest remainder seats, we now do unique highest average instead:
        // we allow every group to get a seat, not allowing any group to get a second residual seat
        // while there are still political groups that did not get a residual seat.
        let mut qualifying_for_unique_highest_average =
            political_group_standings_qualifying_for_unique_highest_average(
                standings,
                previous_steps,
                exhausted_pg_numbers,
            )
            .peekable();
        if qualifying_for_unique_highest_average.peek().is_some() {
            debug!("Assign residual seat using unique highest averages method");
            step_assign_remainder_using_highest_averages(
                qualifying_for_unique_highest_average,
                residual_seats,
                previous_steps,
                exhausted_pg_numbers,
                true,
            )
        } else {
            // We've now even exhausted unique highest average seats: every group that qualified
            // got a largest remainder seat, and every group also had at least a single residual seat
            // assigned to them. We now allow any residual seats to be assigned using the largest
            // averages procedure
            debug!("Assign residual seat using highest averages method");
            step_assign_remainder_using_highest_averages(
                standings.iter(),
                residual_seats,
                previous_steps,
                exhausted_pg_numbers,
                false,
            )
        }
    }
}

/// Create a vector containing just the political group numbers from an iterator of the current standing
fn political_group_numbers(standing: &[&PoliticalGroupStanding]) -> Vec<PGNumber> {
    standing.iter().map(|s| s.pg_number).collect()
}

pub fn get_total_seats_from_apportionment_result(result: &SeatAssignmentResult) -> Vec<u32> {
    result
        .final_standing
        .iter()
        .map(|p| p.total_seats)
        .collect::<Vec<_>>()
}

#[cfg(test)]
mod tests {
    use crate::apportionment::{
        Fraction, PoliticalGroupStanding, seat_assignment::political_group_numbers,
    };

    #[test]
    fn test_political_group_numbers() {
        let standing = [
            &PoliticalGroupStanding {
                pg_number: 2,
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
            &PoliticalGroupStanding {
                pg_number: 3,
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
            &PoliticalGroupStanding {
                pg_number: 4,
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
            &PoliticalGroupStanding {
                pg_number: 5,
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
            &PoliticalGroupStanding {
                pg_number: 6,
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
        ];
        assert_eq!(political_group_numbers(&standing), vec![2, 3, 4, 5, 6]);
    }

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
            assert_eq!(result.full_seats, 15);
            assert_eq!(result.residual_seats, 0);
            assert_eq!(result.steps.len(), 0);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![6, 2, 2, 2, 1, 1, 1]);
        }

        /// Apportionment with residual seats assigned with largest remainders method
        ///
        /// Full seats: [6, 2, 2, 1, 1, 1, 0, 0] - Remainder seats: 2  
        /// Remainders: [60, 0/15, 0/15, 0/15, 0/15, 0/15, 60, 40]  
        /// 1 - largest remainder: seat assigned to list 1  
        /// 2 - largest remainder: seat assigned to list 7
        #[test]
        fn test_with_residual_seats_assigned_with_largest_remainders_method() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                540, 160, 160, 80, 80, 80, 60, 40,
            ]);
            let result = seat_assignment(15, &totals).unwrap();
            assert_eq!(result.full_seats, 13);
            assert_eq!(result.residual_seats, 2);
            assert_eq!(result.steps.len(), 2);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 1);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 7);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![7, 2, 2, 1, 1, 1, 1, 0]);
        }

        /// Apportionment with residual seats assigned with largest remainders and highest averages methods
        ///
        /// Full seats: [10, 0, 0, 0, 0, 0, 0, 0] - Remainder seats: 5  
        /// Remainders: [8, 59, 58, 57, 56, 55, 54, 53], only votes of list 1 meet the threshold of 75% of the quota  
        /// 1 - largest remainder: seat assigned to list 1  
        /// 1st round of highest averages method (assignment to unique political groups):  
        /// 2 - highest average: [67 4/12, 59, 58, 57, 56, 55, 54, 53] seat assigned to list 1  
        /// 3 - highest average: [62 2/13, 59, 58, 57, 56, 55, 54, 53] seat assigned to list 2  
        /// 4 - highest average: [62 2/13, 29 1/2, 58, 57, 56, 55, 54, 53] seat assigned to list 3  
        /// 5 - highest average: [62 2/13, 29 1/2, 29, 57, 56, 55, 54, 53] seat assigned to list 4
        #[test]
        fn test_with_1_list_that_meets_threshold() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                808, 59, 58, 57, 56, 55, 54, 53,
            ]);
            let result = seat_assignment(15, &totals).unwrap();
            assert_eq!(result.full_seats, 10);
            assert_eq!(result.residual_seats, 5);
            assert_eq!(result.steps.len(), 5);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 1);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 1);
            assert_eq!(result.steps[2].change.political_group_number_assigned(), 2);
            assert_eq!(result.steps[3].change.political_group_number_assigned(), 3);
            assert_eq!(result.steps[4].change.political_group_number_assigned(), 4);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![12, 1, 1, 1, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with largest remainders method
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
            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 1);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 2);
            assert_eq!(result.steps[2].change.political_group_number_assigned(), 3);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![7, 4, 4, 0, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with highest averages method
        ///
        /// Full seats: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] - Remainder seats: 3  
        /// Remainders: [8, 7, 6, 5, 4, 3, 2, 1, 1, 1], no lists meet the threshold of 75% of the quota  
        /// 1st round of highest averages method (assignment to unique political groups):  
        /// 1 - highest average: [8, 7, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 1  
        /// 2 - highest average: [4, 7, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 2  
        /// 3 - highest average: [4, 3 1/2, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 3
        #[test]
        fn test_with_0_lists_that_meet_threshold() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                8, 7, 6, 5, 4, 3, 2, 1, 1, 1,
            ]);
            let result = seat_assignment(3, &totals).unwrap();
            assert_eq!(result.full_seats, 0);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 1);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 2);
            assert_eq!(result.steps[2].change.political_group_number_assigned(), 3);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with largest remainders and highest averages methods
        ///
        /// Full seats: [0, 0, 0, 0, 0, 7] - Remainder seats: 3  
        /// Remainders: [0/10, 3, 5, 6, 7, 9], only votes of list 6 meet the threshold of 75% of the quota  
        ///  1 - largest remainder: seat assigned to list 6  
        /// 1st round of highest averages method (assignment to unique political groups):  
        ///  2 - highest average: [0/1, 3, 5, 6, 7, 8 7/8] seat assigned to list 6  
        ///  3 - highest average: [0/1, 3, 5, 6, 7, 7 9/10] seat assigned to list 5
        #[test]
        fn test_1st_round_unique_highest_averages_method_regression() {
            let totals =
                election_summary_fixture_with_default_50_candidates(vec![0, 3, 5, 6, 7, 79]);
            let result = seat_assignment(10, &totals).unwrap();
            assert_eq!(result.full_seats, 7);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 6);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 6);
            assert_eq!(result.steps[2].change.political_group_number_assigned(), 5);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, [0, 0, 0, 0, 1, 9]);
        }

        /// Apportionment with 0 votes on candidates
        ///
        /// No votes on candidates cast
        #[test]
        fn test_with_0_votes() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![0, 0, 0, 0, 0]);
            let result = seat_assignment(10, &totals);
            assert_eq!(result, Err(ApportionmentError::ZeroVotesCast));
        }

        /// Apportionment with residual seats assigned with largest remainders method  
        /// This test triggers Kieswet Article P 9 (Actual case from GR2022)
        ///
        /// Full seats: [7, 2, 1, 1, 1] - Remainder seats: 3  
        /// Remainders: [189 2/15, 296 7/15, 226 11/15, 195 11/15, 112 11/15]  
        /// 1 - largest remainder: seat assigned to list 2  
        /// 2 - largest remainder: seat assigned to list 3  
        /// 3 - largest remainder: seat assigned to list 4  
        /// 4 - Seat first assigned to list 4 has been re-assigned to list 1 in accordance with Article P 9 Kieswet
        #[test]
        fn test_with_absolute_majority_of_votes_but_not_seats() {
            let totals =
                election_summary_fixture_with_default_50_candidates(vec![2571, 977, 567, 536, 453]);
            let result = seat_assignment(15, &totals).unwrap();
            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 4);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 2);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 3);
            assert_eq!(result.steps[2].change.political_group_number_assigned(), 4);
            assert!(
                result.steps[3]
                    .change
                    .is_changed_by_absolute_majority_reassignment()
            );
            assert_eq!(result.steps[3].change.political_group_number_retracted(), 4);
            assert_eq!(result.steps[3].change.political_group_number_assigned(), 1);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![8, 3, 2, 1, 1]);
        }

        mod drawing_of_lots {
            use crate::apportionment::{
                ApportionmentError, seat_assignment,
                test_helpers::election_summary_fixture_with_default_50_candidates,
            };
            use test_log::test;

            /// Apportionment with residual seats assigned with largest remainders method  
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

            /// Apportionment with residual seats assigned with largest remainders method
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

            /// Apportionment with residual seats assigned with largest remainders method
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

        mod list_exhaustion {
            use crate::apportionment::{
                ApportionmentError, get_total_seats_from_apportionment_result, seat_assignment,
                test_helpers::election_summary_fixture_with_given_candidate_votes,
            };
            use test_log::test;

            /// Apportionment with no residual seats  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 4, 3, 2, 1] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// Remainders: [0/15, 0/15, 0/15, 0/15, 0/15]  
            /// 2 - largest remainder: seat assigned to list 5
            #[test]
            fn test_with_list_exhaustion_during_full_seats_assignment() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![500, 500, 500, 500],
                    vec![400, 400, 400, 400],
                    vec![400, 400, 400],
                    vec![400, 400],
                    vec![200, 200],
                ]);
                let result = seat_assignment(15, &totals).unwrap();
                assert_eq!(result.full_seats, 14);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 2);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[0].change.political_group_number_retracted(), 1);
                assert_eq!(result.steps[1].change.political_group_number_assigned(), 5);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![4, 4, 3, 2, 2]);
            }

            /// Apportionment with residual seats assigned with largest remainders method  
            /// This test triggers Kieswet Article P 10 (Actual case from GR2022)
            ///
            /// Full seats: [2, 1, 1, 1, 1, 1, 1, 0, 2, 1, 0] - Remainder seats: 6  
            /// Remainders: [227 7/17, 40 12/17, 387 12/17, 213 12/17, 156 12/17, 204 12/17, 161 12/17, 326, 295 7/17, 271 12/17, 380]  
            /// 1 - largest remainder: seat assigned to list 3  
            /// 2 - largest remainder: seat assigned to list 11  
            /// 3 - largest remainder: seat assigned to list 9  
            /// 4 - largest remainder: seat assigned to list 10  
            /// 5 - largest remainder: seat assigned to list 1  
            /// 6 - largest remainder: seat assigned to list 4  
            /// 7 - Seat first assigned to list 10 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet    
            /// 8 - largest remainder: seat assigned to list 6
            #[test]
            fn test_with_list_exhaustion_during_residual_seats_assignment_with_largest_remainders_method()
             {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![754, 85, 84, 40, 31, 15, 2, 38, 3, 4, 8, 8, 4, 17, 5, 3, 15],
                    vec![274, 48, 11, 76, 10, 66],
                    vec![470, 47, 53, 131, 31, 62, 10, 4, 1, 10, 13],
                    vec![382, 109, 55, 12, 29, 29, 9, 2, 6, 13, 12],
                    vec![323, 46, 106, 16, 6, 31, 20, 34, 6, 13],
                    vec![253, 221, 93, 9, 18, 7, 12, 36],
                    vec![169, 123, 26, 209, 3, 11, 11, 3, 22, 6, 7, 1, 15],
                    vec![189, 17, 7, 40, 4, 7, 3, 9, 2, 23, 9, 9, 4, 3],
                    vec![439, 64, 78, 22, 71, 21, 37, 9, 20, 7, 38, 378],
                    vec![716],
                    vec![221, 53, 15, 7, 27, 57],
                ]);
                let result = seat_assignment(17, &totals).unwrap();
                assert_eq!(result.full_seats, 11);
                assert_eq!(result.residual_seats, 6);
                assert_eq!(result.steps.len(), 8);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 3);
                assert_eq!(result.steps[1].change.political_group_number_assigned(), 11);
                assert_eq!(result.steps[2].change.political_group_number_assigned(), 9);
                assert_eq!(result.steps[3].change.political_group_number_assigned(), 10);
                assert_eq!(result.steps[4].change.political_group_number_assigned(), 1);
                assert_eq!(result.steps[5].change.political_group_number_assigned(), 4);
                assert!(
                    result.steps[6]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[6].change.political_group_number_retracted(),
                    10
                );
                assert_eq!(result.steps[7].change.political_group_number_assigned(), 6);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![3, 1, 2, 2, 1, 2, 1, 0, 3, 1, 1]);
            }

            /// Apportionment with residual seats assigned with largest remainders and highest averages methods
            ///
            /// Full seats: [0, 0, 0, 0, 0, 7] - Remainder seats: 3  
            /// Remainders: [0/10, 3, 5, 6, 7, 9], only votes of list 6 meet the threshold of 75% of the quota  
            ///  1 - largest remainder: seat assigned to list 6  
            /// 1st round of highest averages method (assignment to unique political groups):  
            ///  2 - highest average: [0/1, 3, 5, 6, 7, 8 7/8] seat assigned to list 6  
            ///  3 - highest average: [0/1, 3, 5, 6, 7, 7 9/10] seat assigned to list 5  
            ///  4 - Seat first assigned to list 6 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            ///  5 - highest average: [0/1, 3, 5, 6, 3 1/2, 7 9/10] seat assigned to list 4
            #[test]
            fn test_with_list_exhaustion_during_residual_seats_assignment_with_unique_highest_averages_method()
             {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![0],
                    vec![3],
                    vec![5],
                    vec![6],
                    vec![7],
                    vec![10, 10, 10, 10, 10, 10, 10, 9],
                ]);
                let result = seat_assignment(10, &totals).unwrap();
                assert_eq!(result.full_seats, 7);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 5);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 6);
                assert_eq!(result.steps[1].change.political_group_number_assigned(), 6);
                assert_eq!(result.steps[2].change.political_group_number_assigned(), 5);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.political_group_number_retracted(), 6);
                assert_eq!(result.steps[4].change.political_group_number_assigned(), 4);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, [0, 0, 0, 1, 1, 8]);
            }

            /// Apportionment with residual seats assigned with largest remainders and highest averages methods
            ///
            /// Full seats: [0, 0, 5] - Remainder seats: 1  
            /// Remainders: [5, 5, 0/6], only votes of list 3 meet the threshold of 75% of the quota  
            ///  1 - largest remainder: seat assigned to list 3  
            ///  2 - Seat first assigned to list 3 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            ///  3 - Seat first assigned to list 3 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            ///  4 - Seat first assigned to list 3 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            ///  5 - Seat first assigned to list 3 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 1st round of highest averages method (assignment to unique political groups):  
            ///  6 - highest average: [5, 5, 7 1/7] seat assigned to list 1  
            ///  7 - highest average: [2 1/2, 5, 7 1/7] seat assigned to list 2  
            /// 2nd round of highest averages method (assignment to any political group):  
            ///  8 - highest average: [2 1/2, 2 1/2, 7 1/7] seat assigned to list 1  
            ///  9 - highest average: [1 2/3, 2 1/2, 7 1/7] seat assigned to list 2
            #[test]
            fn test_with_list_exhaustion_triggering_2nd_round_highest_average_assignment_with_same_averages()
             {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![3, 2],
                    vec![3, 2],
                    vec![25, 25],
                ]);
                let result = seat_assignment(6, &totals).unwrap();
                assert_eq!(result.full_seats, 2);
                assert_eq!(result.residual_seats, 4);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 3);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.political_group_number_retracted(), 3);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[2].change.political_group_number_retracted(), 3);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.political_group_number_retracted(), 3);
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[4].change.political_group_number_retracted(), 3);
                assert_eq!(result.steps[5].change.political_group_number_assigned(), 1);
                assert_eq!(result.steps[6].change.political_group_number_assigned(), 2);
                assert_eq!(result.steps[7].change.political_group_number_assigned(), 1);
                assert_eq!(result.steps[8].change.political_group_number_assigned(), 2);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, [2, 2, 2]);
            }

            /// Apportionment with residual seats assigned with largest remainders and highest averages methods
            ///
            /// Full seats: [0, 0, 5] - Remainder seats: 1  
            /// Remainders: [6, 4, 0/6], only votes of list 3 meet the threshold of 75% of the quota  
            ///  1 - largest remainder: seat assigned to list 3  
            ///  2 - Seat first assigned to list 3 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            ///  3 - Seat first assigned to list 3 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            ///  4 - Seat first assigned to list 3 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            ///  5 - Seat first assigned to list 3 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 1st round of highest averages method (assignment to unique political groups):  
            ///  6 - highest average: [6, 4, 7 1/7] seat assigned to list 1  
            ///  7 - highest average: [3, 4, 7 1/7] seat assigned to list 2  
            /// 2nd round of highest averages method (assignment to any political group):  
            ///  8 - highest average: [3, 2, 7 1/7] seat assigned to list 1  
            ///  9 - highest average: [2, 2, 7 1/7] seat assigned to list 2
            #[test]
            fn test_with_list_exhaustion_triggering_2nd_round_highest_average_assignment_with_different_averages()
             {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![3, 3],
                    vec![2, 2],
                    vec![25, 25],
                ]);
                let result = seat_assignment(6, &totals).unwrap();
                assert_eq!(result.full_seats, 2);
                assert_eq!(result.residual_seats, 4);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 3);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.political_group_number_retracted(), 3);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[2].change.political_group_number_retracted(), 3);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.political_group_number_retracted(), 3);
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[4].change.political_group_number_retracted(), 3);
                assert_eq!(result.steps[5].change.political_group_number_assigned(), 1);
                assert_eq!(result.steps[6].change.political_group_number_assigned(), 2);
                assert_eq!(result.steps[7].change.political_group_number_assigned(), 1);
                assert_eq!(result.steps[8].change.political_group_number_assigned(), 2);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, [2, 2, 2]);
            }

            /// Apportionment with residual seats assigned with largest remainders method  
            /// This test triggers Kieswet Article P 9 and P 10
            ///
            /// Full seats: [7, 2, 1, 1, 1] - Remainder seats: 3  
            /// Remainders: [189 2/15, 296 7/15, 226 11/15, 195 11/15, 112 11/15]  
            /// 1 - largest remainder: seat assigned to list 2  
            /// 2 - largest remainder: seat assigned to list 3  
            /// 3 - largest remainder: seat assigned to list 4  
            /// 4 - Seat first assigned to list 4 has been re-assigned to list 1 in accordance with Article P 9 Kieswet  
            /// 5 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 6 - largest remainder: seat assigned to list 4
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_and_list_exhaustion() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![2571, 0, 0, 0, 0, 0, 0],
                    vec![977, 0, 0, 0],
                    vec![567, 0],
                    vec![536, 0],
                    vec![453, 0],
                ]);
                let result = seat_assignment(15, &totals).unwrap();
                assert_eq!(result.full_seats, 12);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 6);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 2);
                assert_eq!(result.steps[1].change.political_group_number_assigned(), 3);
                assert_eq!(result.steps[2].change.political_group_number_assigned(), 4);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(result.steps[3].change.political_group_number_retracted(), 4);
                assert_eq!(result.steps[3].change.political_group_number_assigned(), 1);
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[4].change.political_group_number_retracted(), 1);
                assert_eq!(result.steps[5].change.political_group_number_assigned(), 4);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![7, 3, 2, 2, 1]);
            }

            /// Apportionment with residual seats assigned with largest remainders and highest averages methods  
            /// This test triggers Kieswet Article P 9 and P 10
            ///
            /// Full seats: [3, 4, 0] - Remainder seats: 1  
            /// Remainders: [2, 1, 7], only votes of lists [1, 2] meet the threshold of 75% of the quota  
            /// 1 - largest remainder: seat assigned to list 1  
            /// 2 - Seat first assigned to list 1 has been re-assigned to list 2 in accordance with Article P 9 Kieswet    
            /// 3 - Seat first assigned to list 2 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 4 - Seat first assigned to list 2 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 5 - largest remainder: seat assigned to list 1  
            /// 1st round of highest averages method (assignment to unique political groups):  
            /// 6 - highest average: [6 2/5, 8 1/5, 7] seat assigned to list 3
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_and_list_exhaustion_triggering_unique_highest_averages_assignment()
             {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![32, 0, 0, 0, 0],
                    vec![41, 0, 0],
                    vec![7],
                ]);
                let result = seat_assignment(8, &totals).unwrap();
                assert_eq!(result.full_seats, 6);
                assert_eq!(result.residual_seats, 2);
                assert_eq!(result.steps.len(), 6);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 1);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(result.steps[1].change.political_group_number_retracted(), 1);
                assert_eq!(result.steps[1].change.political_group_number_assigned(), 2);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[2].change.political_group_number_retracted(), 2);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.political_group_number_retracted(), 2);
                assert_eq!(result.steps[4].change.political_group_number_assigned(), 1);
                assert_eq!(result.steps[5].change.political_group_number_assigned(), 3);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, [4, 3, 1]);
            }

            /// Apportionment with residual seats assigned with largest remainders and highest averages methods  
            /// This test triggers Kieswet Article P 9 and P 10
            ///
            /// Full seats: [2, 1, 5] - Remainder seats: 1  
            /// Remainders: [50 4/8, 10, 61 1/8], only votes of lists [1, 3] meet the threshold of 75% of the quota  
            /// 1 - largest remainder: seat assigned to list 3  
            /// 2 - Seat first assigned to list 3 has been re-assigned to list 1 in accordance with Article P 9 Kieswet    
            /// 3 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 4 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 5 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 6 - largest remainder: seat assigned to list 3  
            /// 1st round of highest averages method (assignment to unique political groups):  
            /// 7 - highest average: [107 2/5, 10, 85 1/5] seat assigned to list 3  
            /// 8 - highest average: [107 2/5, 10, 71] seat assigned to list 2
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_and_list_exhaustion_triggering_multiple_unique_highest_averages_assignment()
             {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![537, 0],
                    vec![10],
                    vec![426, 0, 0, 0, 0, 0],
                ]);
                let result = seat_assignment(8, &totals).unwrap();
                assert_eq!(result.full_seats, 5);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 8);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 3);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(result.steps[1].change.political_group_number_retracted(), 3);
                assert_eq!(result.steps[1].change.political_group_number_assigned(), 1);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[2].change.political_group_number_retracted(), 1);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.political_group_number_retracted(), 1);
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[4].change.political_group_number_retracted(), 1);
                assert_eq!(result.steps[5].change.political_group_number_assigned(), 3);
                assert_eq!(result.steps[6].change.political_group_number_assigned(), 3);
                assert_eq!(result.steps[7].change.political_group_number_assigned(), 2);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, [2, 1, 5]);
            }

            /// Apportionment with no residual seats  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 4, 3, 2, 1] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// Remainders: [0/15, 0/15, 0/15, 0/15, 0/15]  
            /// 2 - Seat cannot be (re)assigned because all lists are exhausted
            #[test]
            fn test_with_all_lists_exhausted_error() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![500, 500, 500, 500],
                    vec![400, 400, 400, 400],
                    vec![400, 400, 400],
                    vec![400, 400],
                    vec![400],
                ]);
                let result = seat_assignment(15, &totals);
                assert_eq!(result, Err(ApportionmentError::AllListsExhausted));
            }

            /// Apportionment with no residual seats  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 5, 3, 1, 1] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 2 - Seat first assigned to list 2 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// Remainders: [0/15, 0/15, 0/15, 0/15, 0/15]  
            /// 3 - largest remainder: seat assigned to list 4  
            /// 4 - Seat cannot be (re)assigned because all lists are exhausted
            #[test]
            fn test_with_2_exhausted_lists_and_all_lists_exhausted_error() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![500, 500, 500, 500],
                    vec![500, 500, 500, 500],
                    vec![400, 400, 400],
                    vec![400, 0],
                    vec![400],
                ]);
                let result = seat_assignment(15, &totals);
                assert_eq!(result, Err(ApportionmentError::AllListsExhausted));
            }
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
            assert_eq!(result.full_seats, 25);
            assert_eq!(result.residual_seats, 0);
            assert_eq!(result.steps.len(), 0);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![12, 6, 2, 2, 2, 1]);
        }

        /// Apportionment with residual seats assigned with highest averages method
        ///
        /// Full seats: [11, 5, 1, 1, 1] - Remainder seats: 4  
        /// 1 - highest average: [50, 50 2/6, 49, 49 1/2, 50 1/2] seat assigned to list 5  
        /// 2 - highest average: [50, 50 2/6, 49, 49 1/2, 33 2/3] seat assigned to list 2  
        /// 3 - highest average: [50, 43 1/7, 49, 49 1/2, 33 2/3] seat assigned to list 1  
        /// 4 - highest average: [46 2/13, 43 1/7, 49, 49 1/2, 33 2/3] seat assigned to list 4
        #[test]
        fn test_with_remainder_seats() {
            let totals =
                election_summary_fixture_with_default_50_candidates(vec![600, 302, 98, 99, 101]);
            let result = seat_assignment(23, &totals).unwrap();
            assert_eq!(result.full_seats, 19);
            assert_eq!(result.residual_seats, 4);
            assert_eq!(result.steps.len(), 4);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 5);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 2);
            assert_eq!(result.steps[2].change.political_group_number_assigned(), 1);
            assert_eq!(result.steps[3].change.political_group_number_assigned(), 4);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![12, 6, 1, 2, 2]);
        }

        /// Apportionment with residual seats assigned with highest averages method
        ///
        /// Full seats: [15, 0, 0, 0, 0, 0, 0, 0, 0] - Remainder seats: 7  
        /// 1 - highest average: [62 2/13, 57, 56, 55, 54, 53, 52, 51, 14] seat assigned to list 1  
        /// 2 - highest average: [57 10/14, 57, 56, 55, 54, 53, 52, 51, 14] seat assigned to list 1  
        /// 3 - highest average: [53 13/15, 57, 56, 55, 54, 53, 52, 51, 14] seat assigned to list 2  
        /// 4 - highest average: [53 13/15, 28 1/2, 56, 55, 54, 53, 52, 51, 14] seat assigned to list 3  
        /// 5 - highest average: [53 13/15, 28 1/2, 28, 55, 54, 53, 52, 51, 14] seat assigned to list 4  
        /// 6 - highest average: [53 13/15, 28 1/2, 28, 27 1/2, 54, 53, 52, 51, 14] seat assigned to list 5  
        /// 7 - highest average: [53 13/15, 28 1/2, 28, 27 1/2, 27, 53, 52, 51, 14] seat assigned to list 1
        #[test]
        fn test_with_multiple_remainder_seats_assigned_to_one_list() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                808, 57, 56, 55, 54, 53, 52, 51, 14,
            ]);
            let result = seat_assignment(19, &totals).unwrap();
            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 7);
            assert_eq!(result.steps.len(), 7);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 1);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 1);
            assert_eq!(result.steps[2].change.political_group_number_assigned(), 2);
            assert_eq!(result.steps[3].change.political_group_number_assigned(), 3);
            assert_eq!(result.steps[4].change.political_group_number_assigned(), 4);
            assert_eq!(result.steps[5].change.political_group_number_assigned(), 5);
            assert_eq!(result.steps[6].change.political_group_number_assigned(), 1);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![15, 1, 1, 1, 1, 0, 0, 0, 0]);
        }

        /// Apportionment with 0 votes on candidates
        ///
        /// No votes on candidates cast
        #[test]
        fn test_with_0_votes() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![0]);
            let result = seat_assignment(19, &totals);
            assert_eq!(result, Err(ApportionmentError::ZeroVotesCast));
        }

        /// Apportionment with residual seats assigned with highest averages method  
        /// This test triggers Kieswet Article P 9
        ///
        /// Full seats: [12, 1, 1, 1, 1, 1, 1, 0] - Remainder seats: 6  
        /// 1 - highest average: [577, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 2  
        /// 2 - highest average: [577, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 3  
        /// 3 - highest average: [577, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 4  
        /// 4 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624, 7] seat assigned to list 5  
        /// 5 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624, 7] seat assigned to list 6  
        /// 6 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624, 7] seat assigned to list 7  
        /// 7 - Seat first assigned to list 7 has been re-assigned to list 1 in accordance with Article P 9 Kieswet
        #[test]
        fn test_with_absolute_majority_of_votes_but_not_seats() {
            let totals = election_summary_fixture_with_default_50_candidates(vec![
                7501, 1249, 1249, 1249, 1249, 1249, 1248, 7,
            ]);
            let result = seat_assignment(24, &totals).unwrap();
            assert_eq!(result.full_seats, 18);
            assert_eq!(result.residual_seats, 6);
            assert_eq!(result.steps.len(), 7);
            assert_eq!(result.steps[0].change.political_group_number_assigned(), 2);
            assert_eq!(result.steps[1].change.political_group_number_assigned(), 3);
            assert_eq!(result.steps[2].change.political_group_number_assigned(), 4);
            assert_eq!(result.steps[3].change.political_group_number_assigned(), 5);
            assert_eq!(result.steps[4].change.political_group_number_assigned(), 6);
            assert_eq!(result.steps[5].change.political_group_number_assigned(), 7);
            assert!(
                result.steps[6]
                    .change
                    .is_changed_by_absolute_majority_reassignment()
            );
            assert_eq!(result.steps[6].change.political_group_number_retracted(), 7);
            assert_eq!(result.steps[6].change.political_group_number_assigned(), 1);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![13, 2, 2, 2, 2, 2, 1, 0]);
        }

        mod drawing_of_lots {
            use crate::apportionment::{
                ApportionmentError, seat_assignment,
                test_helpers::election_summary_fixture_with_default_50_candidates,
            };
            use test_log::test;

            /// Apportionment with residual seats assigned with highest averages method  
            /// This test triggers Kieswet Article P 9
            ///
            /// Full seats: [12, 1, 1, 1, 1, 1, 1, 0] - Remainder seats: 6  
            /// 1 - highest average: [577, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 2  
            /// 2 - highest average: [577, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 3  
            /// 3 - highest average: [577, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 4  
            /// 4 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624, 624, 8] seat assigned to list 5  
            /// 5 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624, 624, 8] seat assigned to list 6  
            /// 6 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 416, 624, 8] seat assigned to list 7  
            /// 7 - Drawing of lots is required for political groups: [6, 7] to pick a political group which the residual seat gets retracted from
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_with_drawing_of_lots_error() {
                let totals = election_summary_fixture_with_default_50_candidates(vec![
                    7501, 1249, 1249, 1249, 1249, 1248, 1248, 8,
                ]);
                let result = seat_assignment(24, &totals);
                assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
            }

            /// Apportionment with residual seats assigned with highest averages method
            ///
            /// Full seats: [9, 2, 2, 2, 2, 2] - Remainder seats: 4  
            /// 1 - highest average: [50, 46 2/3, 46 2/3, 46 2/3, 46 2/3, 46 2/3] seat assigned to list 1  
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

        mod list_exhaustion {
            use crate::apportionment::{
                ApportionmentError, get_total_seats_from_apportionment_result, seat_assignment,
                test_helpers::election_summary_fixture_with_given_candidate_votes,
            };
            use test_log::test;

            /// Apportionment with no residual seats  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 5, 4, 4, 2] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 2 - highest average: [333 2/6, 333 2/6, 320, 320, 266 2/3] seat assigned to list 5
            #[test]
            fn test_with_list_exhaustion_during_full_seats_assignment() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![500, 500, 500, 500],
                    vec![400, 400, 400, 400, 400],
                    vec![400, 400, 400, 400],
                    vec![400, 400, 400, 400],
                    vec![400, 400, 0],
                ]);
                let result = seat_assignment(20, &totals).unwrap();
                assert_eq!(result.full_seats, 19);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 2);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[0].change.political_group_number_retracted(), 1);
                assert_eq!(result.steps[1].change.political_group_number_assigned(), 5);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![4, 5, 4, 4, 3]);
            }

            /// Apportionment with residual seats assigned with highest averages method  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [4, 4, 4, 4, 2] - Remainder seats: 1  
            /// 1 - highest average: [319 4/5, 319 3/5, 319 3/5, 319 3/5, 334 2/3] seat assigned to list 5  
            /// 2 - Seat first assigned to list 5 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 3 - highest average: [319 4/5, 319 3/5, 319 3/5, 319 3/5, 251] seat assigned to list 1
            #[test]
            fn test_with_list_exhaustion_during_residual_seats_assignment() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![400, 400, 400, 399, 0],
                    vec![400, 400, 400, 398, 0],
                    vec![400, 400, 400, 398, 0],
                    vec![400, 400, 400, 398, 0],
                    vec![502, 502],
                ]);
                let result = seat_assignment(19, &totals).unwrap();
                assert_eq!(result.full_seats, 18);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 3);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 5);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.political_group_number_retracted(), 5);
                assert_eq!(result.steps[2].change.political_group_number_assigned(), 1);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![5, 4, 4, 4, 2]);
            }

            /// Apportionment with residual seats assigned with highest averages method  
            /// This test triggers Kieswet Article P 9 and P 10
            ///
            /// Full seats: [12, 1, 1, 1, 1, 1, 1, 0] - Remainder seats: 6  
            /// 1 - highest average: [577, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 2  
            /// 2 - highest average: [577, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 3  
            /// 3 - highest average: [577, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624, 7] seat assigned to list 4  
            /// 4 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624, 7] seat assigned to list 5  
            /// 5 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624, 7] seat assigned to list 6  
            /// 6 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624, 7] seat assigned to list 7  
            /// 7 - Seat first assigned to list 7 has been re-assigned to list 1 in accordance with Article P 9 Kieswet  
            /// 8 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 9 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624, 7] seat assigned to list 7
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_and_list_exhaustion() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![7501, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                    vec![1249, 0],
                    vec![1249, 0],
                    vec![1249, 0],
                    vec![1249, 0],
                    vec![1249, 0],
                    vec![1248, 0],
                    vec![7],
                ]);
                let result = seat_assignment(24, &totals).unwrap();
                assert_eq!(result.full_seats, 18);
                assert_eq!(result.residual_seats, 6);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(result.steps[0].change.political_group_number_assigned(), 2);
                assert_eq!(result.steps[1].change.political_group_number_assigned(), 3);
                assert_eq!(result.steps[2].change.political_group_number_assigned(), 4);
                assert_eq!(result.steps[3].change.political_group_number_assigned(), 5);
                assert_eq!(result.steps[4].change.political_group_number_assigned(), 6);
                assert_eq!(result.steps[5].change.political_group_number_assigned(), 7);
                assert!(
                    result.steps[6]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(result.steps[6].change.political_group_number_retracted(), 7);
                assert_eq!(result.steps[6].change.political_group_number_assigned(), 1);
                assert!(
                    result.steps[7]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[7].change.political_group_number_retracted(), 1);
                assert_eq!(result.steps[8].change.political_group_number_assigned(), 7);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![12, 2, 2, 2, 2, 2, 2, 0]);
            }

            /// Apportionment with no residual seats  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 5, 4, 4, 2] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 2 - Seat cannot be (re)assigned because all lists are exhausted
            #[test]
            fn test_with_all_lists_exhausted_error() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![500, 500, 500, 500],
                    vec![400, 400, 400, 400, 400],
                    vec![400, 400, 400, 400],
                    vec![400, 400, 400, 400],
                    vec![400, 400],
                ]);
                let result = seat_assignment(20, &totals);
                assert_eq!(result, Err(ApportionmentError::AllListsExhausted));
            }

            /// Apportionment with no residual seats  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 5, 4, 4, 2] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 2 - Seat first assigned to list 2 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 3 - highest average: [333 2/6, 333 2/6, 320, 320, 266 2/3] seat assigned to list 5  
            /// 4 - Seat cannot be (re)assigned because all lists are exhausted
            #[test]
            fn test_with_2_exhausted_lists_and_all_lists_exhausted_error() {
                let totals = election_summary_fixture_with_given_candidate_votes(vec![
                    vec![500, 500, 500, 500],
                    vec![500, 500, 500, 500],
                    vec![400, 400, 400, 400],
                    vec![400, 400, 400, 400],
                    vec![400, 400, 0],
                ]);
                let result = seat_assignment(20, &totals);
                assert_eq!(result, Err(ApportionmentError::AllListsExhausted));
            }
        }
    }
}
