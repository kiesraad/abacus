use serde::{Deserialize, Serialize};
use tracing::{debug, info};
use utoipa::ToSchema;

use crate::{data_entry::PoliticalGroupVotes, summary::ElectionSummary};

pub use self::api::*;
pub use self::fraction::*;

mod api;
mod fraction;

/// The result of the apportionment procedure. This contains the number of seats and the quota
/// that was used. It then contains the initial standing after whole seats were assigned,
/// and each of the changes and intermediate standings. The final standing contains the
/// number of seats per political group that was assigned after all seats were assigned.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ApportionmentResult {
    pub seats: u64,
    pub quota: Fraction,
    pub steps: Vec<ApportionmentStep>,
    pub final_standing: Vec<PoliticalGroupSeatAssignment>,
}

/// Contains information about the final assignment of seats for a specific political group.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct PoliticalGroupSeatAssignment {
    /// Political group number for which this assigment applies
    pg_number: u32,
    /// The number of votes cast for this group
    votes_cast: u64,
    /// The surplus votes that were not used to get whole seats assigned to this political group
    surplus_votes: Fraction,
    /// Whether this group met the threshold for surplus seat assigment
    meets_surplus_threshold: bool,
    /// The number of whole seats assigned to this group
    whole_seats: u64,
    /// The number of rest seats assigned to this group
    rest_seats: u64,
    /// The total number of seats assigned to this group
    pub total_seats: u64,
}

impl From<PoliticalGroupStanding> for PoliticalGroupSeatAssignment {
    fn from(pg: PoliticalGroupStanding) -> Self {
        PoliticalGroupSeatAssignment {
            pg_number: pg.pg_number,
            votes_cast: pg.votes_cast,
            surplus_votes: pg.surplus_votes,
            meets_surplus_threshold: pg.meets_surplus_threshold,
            whole_seats: pg.whole_seats,
            rest_seats: pg.rest_seats,
            total_seats: pg.total_seats(),
        }
    }
}

/// Contains the standing for a specific political group. This is all the information
/// that is needed to compute the apportionment for that specific political group.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub struct PoliticalGroupStanding {
    /// Political group number for which this standing applies
    pg_number: u32,
    /// The number of votes cast for this group
    votes_cast: u64,
    /// The surplus of votes that was not used to get whole seats (does not have to be a whole number of votes)
    surplus_votes: Fraction,
    /// Whether the surplus votes meet the threshold to be applicable for surplus seat assignment
    meets_surplus_threshold: bool,
    /// The number of votes per seat if a new seat would be added to the current rest seats
    next_votes_per_seat: Fraction,
    /// The number of whole seats this political group got
    whole_seats: u64,
    /// The current number of rest seats this political group got
    rest_seats: u64,
}

impl PoliticalGroupStanding {
    /// Create a new instance computing the whole number of seats that
    /// were assigned to a political group.
    fn new(pg: &PoliticalGroupVotes, quota: Fraction) -> Self {
        let votes_cast = Fraction::from(pg.total);
        let pg_seats = (votes_cast / quota).integer_part();
        let surplus_votes = votes_cast - (Fraction::from(pg_seats) * quota);

        debug!(
            "Political group {} has {pg_seats} whole seats with {} votes",
            pg.number, pg.total
        );
        PoliticalGroupStanding {
            votes_cast: pg.total.into(),
            surplus_votes,
            meets_surplus_threshold: votes_cast >= quota * Fraction::new(3, 4),
            next_votes_per_seat: votes_cast / Fraction::from(pg_seats + 1),
            pg_number: pg.number,
            whole_seats: pg_seats,
            rest_seats: 0,
        }
    }

    /// Add a rest seat to the political group and return the updated instance
    fn add_rest_seat(self) -> Self {
        info!("Adding rest seat to political group {}", self.pg_number);
        PoliticalGroupStanding {
            rest_seats: self.rest_seats + 1,
            next_votes_per_seat: Fraction::from(self.votes_cast)
                / Fraction::from(self.total_seats() + 2),
            ..self
        }
    }

    /// Returns the total number of seats assigned to this political group
    fn total_seats(&self) -> u64 {
        self.whole_seats + self.rest_seats
    }
}

/// Initial construction of the data required per political group
fn initial_whole_seats_per_political_group(
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
/// It then returns all the political groups for which this fraction is the highest.
/// If there are more political groups than there are remaining seats to be assigned,
/// a drawing of lots is required.
///
/// This function will always return at least one group.
fn political_groups_with_largest_average<'a>(
    assigned_seats: impl IntoIterator<Item = &'a PoliticalGroupStanding>,
    remaining_seats: u64,
) -> Result<Vec<&'a PoliticalGroupStanding>, ApportionmentError> {
    // We are now going to find the political groups that have the highest average
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
    if political_groups.len() as u64 > remaining_seats {
        // TODO: #788 if multiple political groups have the same highest average and not enough remaining seats are available, use drawing of lots
        debug!(
            "Drawing of lots is required for political groups: {:?}, only {remaining_seats} seats available",
            political_group_numbers(&political_groups)
        );
        Err(ApportionmentError::DrawingOfLotsNotImplemented)
    } else {
        Ok(political_groups)
    }
}

fn political_groups_with_highest_surplus<'a>(
    assigned_seats: impl IntoIterator<Item = &'a PoliticalGroupStanding>,
    remaining_seats: u64,
) -> Result<Vec<&'a PoliticalGroupStanding>, ApportionmentError> {
    // We are now going to find the political groups that have the highest surplus
    let (max_surplus, political_groups) = assigned_seats.into_iter().fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), pg| {
            // If this surplus is higher than any previously seen, we reset the list of groups matching
            if pg.surplus_votes > current_max {
                (pg.surplus_votes, vec![pg])
            } else {
                // If the surplus for this political group is the same as the
                // max we add it to the list of groups that have that current maximum
                if pg.surplus_votes == current_max {
                    max_groups.push(pg);
                }
                (current_max, max_groups)
            }
        },
    );

    // Programming error if zero political groups were selected at this point
    debug_assert!(!political_groups.is_empty());

    debug!(
        "Found {max_surplus} surplus votes as the maximum for political groups: {:?}",
        political_group_numbers(&political_groups)
    );

    // Check if we can actually assign all these political groups
    if political_groups.len() as u64 > remaining_seats {
        // TODO: #788 if multiple political groups have the same highest surplus and not enough remaining seats are available, use drawing of lots
        debug!(
            "Drawing of lots is required for political groups: {:?}, only {remaining_seats} seats available",
            political_group_numbers(&political_groups)
        );
        Err(ApportionmentError::DrawingOfLotsNotImplemented)
    } else {
        Ok(political_groups)
    }
}

/// Apportionment
pub fn seat_allocation(
    seats: u64,
    totals: &ElectionSummary,
) -> Result<ApportionmentResult, ApportionmentError> {
    info!("Seat allocation");
    debug!("Totals {:#?}", totals);
    info!("Seats: {}", seats);

    // calculate quota (kiesdeler) as a proper fraction
    let quota = Fraction::from(totals.votes_counts.votes_candidates_count) / Fraction::from(seats);
    info!("Quota: {}", quota);

    // TODO: #787 check for lijstuitputting (allocated seats cannot be more than total candidates)

    let initial_standing =
        initial_whole_seats_per_political_group(&totals.political_group_votes, quota);
    let whole_seats_count = initial_standing
        .iter()
        .map(|pg| pg.whole_seats)
        .sum::<u64>();
    let remaining_seats = seats - whole_seats_count;

    let (steps, final_standing) = if remaining_seats > 0 {
        allocate_remainder(&initial_standing, seats, remaining_seats)?
    } else {
        info!("All seats have been allocated without any remainder seats");
        (vec![], initial_standing.clone())
    };

    Ok(ApportionmentResult {
        seats,
        quota,
        steps,
        final_standing: final_standing.into_iter().map(Into::into).collect(),
    })
}

/// This function allocates the rest seats that remain after whole seat allocation is finished.
/// These remainder seats are assigned through two different procedures,
/// depending on how many total seats are available in the election.
fn allocate_remainder(
    initial_standing: &[PoliticalGroupStanding],
    seats: u64,
    total_remaining_seats: u64,
) -> Result<(Vec<ApportionmentStep>, Vec<PoliticalGroupStanding>), ApportionmentError> {
    let mut steps = vec![];
    let mut rest_seat_number = 0;

    let mut current_standing = initial_standing.to_vec();

    while rest_seat_number != total_remaining_seats {
        let remaining_seats = total_remaining_seats - rest_seat_number;
        rest_seat_number += 1;
        let step = if seats >= 19 {
            step_allocate_remainder_using_highest_averages(&current_standing, remaining_seats)?
        } else {
            step_allocate_remainder_using_highest_surplus(
                &current_standing,
                remaining_seats,
                &steps,
            )?
        };

        let standing = current_standing.clone();

        // update the current standing by finding the selected group and adding
        // the remainder seat to their tally
        current_standing = current_standing
            .into_iter()
            .map(|p| {
                if p.pg_number == step.political_group_number() {
                    p.add_rest_seat()
                } else {
                    p
                }
            })
            .collect();

        // add the update to the remainder assignment steps
        steps.push(ApportionmentStep {
            standing,
            rest_seat_number,
            change: step,
        });
    }

    Ok((steps, current_standing))
}

/// Assign the next remainder seat, and return which group that seat was assigned to.
/// This assigment is done according to the rules for elections with 19 seats or more.
fn step_allocate_remainder_using_highest_averages(
    standing: &[PoliticalGroupStanding],
    remaining_seats: u64,
) -> Result<AssignedSeat, ApportionmentError> {
    let selected_pgs = political_groups_with_largest_average(standing, remaining_seats)?;
    let selected_pg = selected_pgs[0];
    Ok(AssignedSeat::HighestAverage(HighestAverageAssignedSeat {
        selected_pg_number: selected_pg.pg_number,
        pg_options: selected_pgs.iter().map(|pg| pg.pg_number).collect(),
        votes_per_seat: selected_pg.next_votes_per_seat,
    }))
}

/// Get an iterator that lists all the parties that qualify for getting a seat through
/// the highest surplus process. This checks the previously assigned seats to make sure
/// that only parties that didn't previously get a seat assigned are allowed to still
/// get a seat through the surplus process. Additionally only political parties that
/// met the threshold are considered for this process.
fn political_groups_qualifying_for_highest_surplus<'a>(
    standing: &'a [PoliticalGroupStanding],
    previous: &'a [ApportionmentStep],
) -> impl Iterator<Item = &'a PoliticalGroupStanding> {
    standing.iter().filter(move |p| {
        p.meets_surplus_threshold
            && !previous.iter().any(|prev| {
                prev.change.is_assigned_by_surplus()
                    && prev.change.political_group_number() == p.pg_number
            })
    })
}

/// Get an iterator that lists all the parties that qualify for unique highest average.
/// This checks the previously assigned seats to make sure that every group that already
/// got a remainder seat through the highest average procedure does not qualify.
fn political_groups_qualifying_for_unique_highest_average<'a>(
    assigned_seats: &'a [PoliticalGroupStanding],
    previous: &'a [ApportionmentStep],
) -> impl Iterator<Item = &'a PoliticalGroupStanding> {
    assigned_seats.iter().filter(|p| {
        !previous.iter().any(|prev| {
            prev.change.is_assigned_by_highest_average()
                && prev.change.political_group_number() == p.pg_number
        })
    })
}

/// Assign the next remainder seat, and return which group that seat was assigned to.
/// This assigment is done according to the rules for elections with less than 19 seats.
fn step_allocate_remainder_using_highest_surplus(
    assigned_seats: &[PoliticalGroupStanding],
    remaining_seats: u64,
    previous: &[ApportionmentStep],
) -> Result<AssignedSeat, ApportionmentError> {
    // first we check if there are any political groups that still qualify for a highest surplus allocated seat
    let mut qualifying_for_surplus =
        political_groups_qualifying_for_highest_surplus(assigned_seats, previous).peekable();

    // If there is at least one element in the iterator, we know we can still do a highest surplus allocation
    if qualifying_for_surplus.peek().is_some() {
        let selected_pgs =
            political_groups_with_highest_surplus(qualifying_for_surplus, remaining_seats)?;
        let selected_pg = selected_pgs[0];
        Ok(AssignedSeat::HighestSurplus(HighestSurplusAssignedSeat {
            selected_pg_number: selected_pg.pg_number,
            pg_options: selected_pgs.iter().map(|pg| pg.pg_number).collect(),
            surplus_votes: selected_pg.surplus_votes,
        }))
    } else {
        // We've now exhausted the highest surplus seats, we now do unique highest average instead:
        // we allow every group to get a seat, not allowing any group to get a second remainder seat
        // while there are still parties that did not get a remainder seat.
        let mut qualifying_for_unique_highest_average =
            political_groups_qualifying_for_unique_highest_average(assigned_seats, previous)
                .peekable();
        if qualifying_for_unique_highest_average.peek().is_some() {
            let selected_pgs = political_groups_with_largest_average(
                qualifying_for_unique_highest_average,
                remaining_seats,
            )?;
            let selected_pg = selected_pgs[0];
            Ok(AssignedSeat::HighestAverage(HighestAverageAssignedSeat {
                selected_pg_number: selected_pg.pg_number,
                pg_options: selected_pgs.iter().map(|pg| pg.pg_number).collect(),
                votes_per_seat: selected_pg.next_votes_per_seat,
            }))
        } else {
            // We've now even exhausted unique highest average seats: every group that qualified
            // got a highest surplus seat, and every group also had at least a single remainder seat
            // assigned to them. We now allow any remaining seats to be assigned using the highest
            // averages procedure
            step_allocate_remainder_using_highest_averages(assigned_seats, remaining_seats)
        }
    }
}

/// Records the details for a specific remainder seat, and how the standing is
/// once that remainder seat was assigned
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct ApportionmentStep {
    rest_seat_number: u64,
    change: AssignedSeat,
    standing: Vec<PoliticalGroupStanding>,
}

/// Records the political group and specific change for a specific remainder seat
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
#[serde(tag = "assigned_by")]
pub enum AssignedSeat {
    HighestAverage(HighestAverageAssignedSeat),
    HighestSurplus(HighestSurplusAssignedSeat),
}

impl AssignedSeat {
    /// Get the political group number for the group this step has assigned a seat
    fn political_group_number(&self) -> u32 {
        match self {
            AssignedSeat::HighestAverage(highest_average) => highest_average.selected_pg_number,
            AssignedSeat::HighestSurplus(highest_surplus) => highest_surplus.selected_pg_number,
        }
    }

    /// Returns true if the seat was assigned through a surplus
    pub fn is_assigned_by_surplus(&self) -> bool {
        matches!(self, AssignedSeat::HighestSurplus(_))
    }

    /// Returns true if the seat was assigned through the highest average
    pub fn is_assigned_by_highest_average(&self) -> bool {
        matches!(self, AssignedSeat::HighestAverage(_))
    }
}

/// Contains the details for an assigned seat, assigned through the highest average method.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct HighestAverageAssignedSeat {
    /// The political group that was selected for this seat has this political group number
    selected_pg_number: u32,
    /// The list from which the political group was selected, all of them having the same votes per seat
    pg_options: Vec<u32>,
    /// This is the votes per seat achieved by the selected political group
    votes_per_seat: Fraction,
}

/// Contains the details for an assigned seat, assigned through the highest surplus method.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct HighestSurplusAssignedSeat {
    /// The political group that was selected for this seat has this political group number
    selected_pg_number: u32,
    /// The list from which the political group was selected, all of them having the same number of surplus votes
    pg_options: Vec<u32>,
    /// The number of surplus votes achieved by the selected political group
    surplus_votes: Fraction,
}

/// Errors that can occur during apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentError {
    DrawingOfLotsNotImplemented,
}

/// Create a vector containing just the political group numbers from an iterator of the current standing
fn political_group_numbers(standing: &[&PoliticalGroupStanding]) -> Vec<u32> {
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
            get_total_seats_from_apportionment_result, seat_allocation, ApportionmentError,
        },
        data_entry::{Count, PoliticalGroupVotes, VotersCounts, VotesCounts},
        summary::{ElectionSummary, SummaryDifferencesCounts},
    };
    use test_log::test;

    fn get_election_summary(pg_votes: Vec<Count>) -> ElectionSummary {
        let total_votes = pg_votes.iter().sum();
        let mut political_group_votes: Vec<PoliticalGroupVotes> = vec![];
        for (index, votes) in pg_votes.iter().enumerate() {
            political_group_votes.push(PoliticalGroupVotes::from_test_data_auto(
                u32::try_from(index + 1).unwrap(),
                *votes,
                &[],
            ))
        }
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

    #[test]
    fn test_seat_allocation_less_than_19_seats_without_remaining_seats() {
        let totals = get_election_summary(vec![480, 160, 160, 160, 80, 80, 80]);
        let result = seat_allocation(15, &totals).unwrap();
        assert_eq!(result.steps.len(), 0);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![6, 2, 2, 2, 1, 1, 1]);
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_remaining_seats_assigned_with_surplus_system() {
        let totals = get_election_summary(vec![540, 160, 160, 80, 80, 80, 60, 40]);
        let result = seat_allocation(15, &totals).unwrap();
        assert_eq!(result.steps.len(), 2);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![7, 2, 2, 1, 1, 1, 1, 0]);
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_remaining_seats_assigned_with_surplus_and_averages_system_only_1_surplus_meets_threshold(
    ) {
        let totals = get_election_summary(vec![808, 59, 58, 57, 56, 55, 54, 53]);
        let result = seat_allocation(15, &totals).unwrap();
        assert_eq!(result.steps.len(), 5);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![12, 1, 1, 1, 0, 0, 0, 0]);
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_drawing_of_lots_error_with_0_surpluses() {
        let totals = get_election_summary(vec![540, 160, 160, 80, 80, 80, 55, 45]);
        let result = seat_allocation(15, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_less_than_19_seats_with_drawing_of_lots_error() {
        let totals = get_election_summary(vec![500, 140, 140, 140, 140, 140]);
        let result = seat_allocation(15, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_without_remaining_seats() {
        let totals = get_election_summary(vec![576, 288, 96, 96, 96, 48]);
        let result = seat_allocation(25, &totals).unwrap();
        assert_eq!(result.steps.len(), 0);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![12, 6, 2, 2, 2, 1]);
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_remaining_seats() {
        let totals = get_election_summary(vec![600, 302, 98, 99, 101]);
        let result = seat_allocation(23, &totals).unwrap();
        assert_eq!(result.steps.len(), 4);
        let total_seats = get_total_seats_from_apportionment_result(result);
        assert_eq!(total_seats, vec![12, 6, 1, 2, 2]);
    }

    #[test]
    fn test_seat_allocation_19_or_more_seats_with_drawing_of_lots_error() {
        let totals = get_election_summary(vec![500, 140, 140, 140, 140, 140]);
        let result = seat_allocation(23, &totals);
        assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
    }
}
