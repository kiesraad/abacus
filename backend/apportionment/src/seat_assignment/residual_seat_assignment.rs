use super::{
    super::{
        fraction::Fraction,
        structs::{LARGE_COUNCIL_THRESHOLD, ListNumber, ListVotesTrait},
    },
    ApportionmentError, list_numbers,
    structs::{
        HighestAverageAssignedSeat, LargestRemainderAssignedSeat, ListStanding, SeatChange,
        SeatChangeStep,
    },
};
use std::cmp::Ordering;
use tracing::{debug, info};

/// This function assigns the residual seats that remain after full seat assignment is finished.
/// These residual seats are assigned through two different procedures,
/// depending on how many total seats are available in the election.
pub fn assign_remainder<T: ListVotesTrait>(
    initial_standings: &[ListStanding],
    seats: u32,
    total_residual_seats: u32,
    current_residual_seat_number: u32,
    previous_steps: &[SeatChangeStep],
    exclude_exhausted_lists: Option<&[T]>,
) -> Result<(Vec<SeatChangeStep>, Vec<ListStanding>), ApportionmentError> {
    let mut steps: Vec<SeatChangeStep> = previous_steps.to_vec();
    let mut residual_seat_number = current_residual_seat_number;
    let mut current_standings = initial_standings.to_vec();

    while residual_seat_number != total_residual_seats {
        let residual_seats = total_residual_seats - residual_seat_number;
        residual_seat_number += 1;
        let exhausted_list_numbers: Vec<ListNumber> = exclude_exhausted_lists
            .map_or_else(Vec::new, |list_votes| {
                list_numbers_without_empty_seats(current_standings.iter(), list_votes)
            });

        let change = if seats >= LARGE_COUNCIL_THRESHOLD {
            debug!("Assign residual seat using highest averages method");
            // [Artikel P 7 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP7)
            step_assign_remainder_using_highest_averages(
                current_standings.iter(),
                residual_seats,
                &steps,
                &exhausted_list_numbers,
                false,
            )?
        } else {
            // [Artikel P 8 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP8)
            step_assign_remainder_using_largest_remainder(
                &current_standings,
                residual_seats,
                &steps,
                &exhausted_list_numbers,
            )?
        };

        let standings = current_standings.clone();

        // update the current standing by finding the selected group and
        // adding the residual seat to their tally
        current_standings = current_standings
            .into_iter()
            .map(|s| {
                if s.list_number == change.list_number_assigned() {
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

/// Get a vector with the list number that was assigned the last residual seat.  
/// If the last residual seat was assigned to a list with the same
/// remainder/votes per seat as lists assigned a seat in previous steps,
/// return all list numbers that had the same remainder/votes per seat.
fn list_assigned_from_previous_step(
    selected_list: &ListStanding,
    previous_steps: &[SeatChangeStep],
    matcher: fn(&SeatChange) -> bool,
) -> Vec<ListNumber> {
    let mut list_assigned = Vec::new();
    if let Some(previous_step) = previous_steps.last()
        && matcher(&previous_step.change)
        && previous_step
            .change
            .list_options()
            .contains(&selected_list.list_number)
    {
        list_assigned = previous_step.change.list_assigned()
    }
    list_assigned.push(selected_list.list_number);
    list_assigned
}

fn list_largest_remainder_assigned_seats(
    previous_steps: &[SeatChangeStep],
    list_number: ListNumber,
) -> usize {
    previous_steps
        .iter()
        .filter(|prev| {
            prev.change.is_changed_by_largest_remainder_assignment()
                && prev.change.list_number_assigned() == list_number
        })
        .count()
}

fn list_numbers_without_empty_seats<'a, T: ListVotesTrait>(
    standings: impl Iterator<Item = &'a ListStanding>,
    list_votes: &[T],
) -> Vec<ListNumber> {
    standings.fold(vec![], |mut list_numbers_without_empty_seats, s| {
        let list_votes = list_votes
            .iter()
            .find(|list_votes| list_votes.number() == s.list_number)
            .expect("List votes exists");
        let number_of_candidates = u32::try_from(list_votes.candidate_votes().len())
            .expect("Number of candidates fits in u32");

        if number_of_candidates.cmp(&s.total_seats()) == Ordering::Equal {
            list_numbers_without_empty_seats.push(s.list_number)
        }
        list_numbers_without_empty_seats
    })
}

fn list_qualifies_for_extra_seat(
    number_of_seats_largest_remainders: usize,
    number_of_seats_unique_highest_averages_option: Option<usize>,
    previous_steps: &[SeatChangeStep],
    list_number: ListNumber,
) -> bool {
    let has_retracted_seat: bool = previous_steps.iter().any(|prev| {
        prev.change.is_changed_by_absolute_majority_reassignment()
            && prev.change.list_number_retracted() == list_number
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

/// Get an iterator that lists all the lists that qualify for getting a seat through
/// the largest remainder process.  
/// This checks the previously assigned seats to make sure that only lists that didn't
/// previously get a seat assigned are allowed to still get a seat through the remainder process,
/// except when a seat was retracted.
/// Additionally only lists that met the threshold are considered for this process.
/// This also removes groups that do not have more candidates to be assigned seats.
fn list_standings_qualifying_for_largest_remainder<'a>(
    standings: &'a [ListStanding],
    previous_steps: &'a [SeatChangeStep],
    exhausted_list_numbers: &[ListNumber],
) -> impl Iterator<Item = &'a ListStanding> {
    standings.iter().filter(|&s| {
        s.meets_remainder_threshold
            && !exhausted_list_numbers.contains(&s.list_number)
            && list_qualifies_for_extra_seat(
                list_largest_remainder_assigned_seats(previous_steps, s.list_number),
                None,
                previous_steps,
                s.list_number,
            )
    })
}

/// Get an iterator that lists all the lists that qualify for unique highest average.
/// This checks the previously assigned seats to make sure that every list that already
/// got a residual seat through the highest average procedure does not qualify
/// except when a seat was retracted.
fn list_standings_qualifying_for_unique_highest_average<'a>(
    standings: &'a [ListStanding],
    previous_steps: &'a [SeatChangeStep],
    exhausted_list_numbers: &[ListNumber],
) -> impl Iterator<Item = &'a ListStanding> {
    standings.iter().filter(|&s| {
        !exhausted_list_numbers.contains(&s.list_number)
            && list_qualifies_for_extra_seat(
                list_largest_remainder_assigned_seats(previous_steps, s.list_number),
                Some(list_unique_highest_average_assigned_seats(
                    previous_steps,
                    s.list_number,
                )),
                previous_steps,
                s.list_number,
            )
    })
}

fn list_unique_highest_average_assigned_seats(
    previous_steps: &[SeatChangeStep],
    list_number: ListNumber,
) -> usize {
    previous_steps
        .iter()
        .filter(|prev| {
            prev.change
                .is_changed_by_unique_highest_average_assignment()
                && prev.change.list_number_assigned() == list_number
        })
        .count()
}

/// Compute the lists with the highest average votes per seats.  
/// This is determined based on seeing what would happen to the average votes
/// per seat if one additional seat would be assigned to each list.
///
/// It then returns all the lists for which this fraction is the largest.  
/// If there are more lists than there are residual seats to be assigned,
/// a drawing of lots is required.
///
/// This function will always return at least one group.
fn lists_with_highest_average<'a>(
    standings: impl Iterator<Item = &'a ListStanding>,
    residual_seats: u32,
) -> Result<Vec<&'a ListStanding>, ApportionmentError> {
    // We are now going to find the lists that have the highest average
    // votes per seat if we would were to add one additional seat to them
    let (max_average, lists) = standings.fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), s| {
            // If this average is higher than any previously seen, we reset the list of groups matching
            if s.next_votes_per_seat > current_max {
                (s.next_votes_per_seat, vec![s])
            } else {
                // If the next average seats for this list is the same as the
                // max we add it to the list of groups that have that current maximum
                if s.next_votes_per_seat == current_max {
                    max_groups.push(s);
                }
                (current_max, max_groups)
            }
        },
    );

    // Programming error if lists is empty at this point
    debug_assert!(!lists.is_empty());

    debug!(
        "Found {max_average} votes per seat as the maximum for lists: {:?}",
        list_numbers(&lists)
    );

    // Check if we can actually assign all these lists a seat, otherwise we would need to draw lots
    if lists.len() > residual_seats as usize {
        // TODO: #788 if multiple lists have the same highest average and not enough residual seats are available, use drawing of lots
        info!(
            "Drawing of lots is required for lists: {:?}, only {residual_seats} seat(s) available",
            list_numbers(&lists)
        );
        Err(ApportionmentError::DrawingOfLotsNotImplemented)
    } else {
        Ok(lists)
    }
}

/// Compute the lists with the largest votes remainder.
///
/// It returns all the lists for which this remainder fraction is the largest.  
/// If there are more lists than there are residual seats to be assigned,
/// a drawing of lots is required.
///
/// This function will always return at least one group.
fn lists_with_largest_remainder<'a>(
    standings: impl Iterator<Item = &'a ListStanding>,
    residual_seats: u32,
) -> Result<Vec<&'a ListStanding>, ApportionmentError> {
    // We are now going to find the lists that have the largest remainder
    let (max_remainder, lists) = standings.fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), s| {
            // If this remainder is higher than any previously seen, we reset the list of groups matching
            if s.remainder_votes > current_max {
                (s.remainder_votes, vec![s])
            } else {
                // If the remainder for this list is the same as the
                // max we add it to the list of groups that have that current maximum
                if s.remainder_votes == current_max {
                    max_groups.push(s);
                }
                (current_max, max_groups)
            }
        },
    );

    // Programming error if zero lists were selected at this point
    debug_assert!(!lists.is_empty());

    debug!(
        "Found {max_remainder} remainder votes as the maximum for lists: {:?}",
        list_numbers(&lists)
    );

    // Check if we can actually assign all these lists
    if lists.len() > residual_seats as usize {
        // TODO: #788 if multiple lists have the same largest remainder and not enough residual seats are available, use drawing of lots
        info!(
            "Drawing of lots is required for lists: {:?}, only {residual_seats} seat(s) available",
            list_numbers(&lists)
        );
        Err(ApportionmentError::DrawingOfLotsNotImplemented)
    } else {
        Ok(lists)
    }
}

/// Assign the next residual seat, and return which group that seat was assigned to.  
/// This assignment is done according to the rules for elections with 19 seats or more.
fn step_assign_remainder_using_highest_averages<'a>(
    standings: impl Iterator<Item = &'a ListStanding>,
    residual_seats: u32,
    previous_steps: &[SeatChangeStep],
    exhausted_list_numbers: &[ListNumber],
    unique: bool,
) -> Result<SeatChange, ApportionmentError> {
    // Get an iterator that lists all the list standings without exhausted lists.
    let mut qualifying_for_highest_average = standings
        .into_iter()
        .filter(|&s| !exhausted_list_numbers.contains(&s.list_number))
        .peekable();

    if qualifying_for_highest_average.peek().is_some() {
        let selected_lists =
            lists_with_highest_average(qualifying_for_highest_average, residual_seats)?;
        let selected_list = selected_lists[0];
        let assigned_seat: HighestAverageAssignedSeat = HighestAverageAssignedSeat {
            selected_list_number: selected_list.list_number,
            list_assigned: list_assigned_from_previous_step(
                selected_list,
                previous_steps,
                if unique {
                    SeatChange::is_changed_by_unique_highest_average_assignment
                } else {
                    SeatChange::is_changed_by_highest_average_assignment
                },
            ),
            list_options: selected_lists.iter().map(|list| list.list_number).collect(),
            list_exhausted: exhausted_list_numbers.to_vec(),
            votes_per_seat: selected_list.next_votes_per_seat,
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

/// Assign the next residual seat, and return which group that seat was assigned to.  
/// This assignment is done according to the rules for elections with less than 19 seats.
fn step_assign_remainder_using_largest_remainder(
    standings: &[ListStanding],
    residual_seats: u32,
    previous_steps: &[SeatChangeStep],
    exhausted_list_numbers: &[ListNumber],
) -> Result<SeatChange, ApportionmentError> {
    // first we check if there are any lists that still qualify for a largest remainder assigned seat
    let mut qualifying_for_remainder = list_standings_qualifying_for_largest_remainder(
        standings,
        previous_steps,
        exhausted_list_numbers,
    )
    .peekable();

    // If there is at least one element in the iterator, we know we can still do a largest remainder assignment
    if qualifying_for_remainder.peek().is_some() {
        debug!("Assign residual seat using largest remainders method");
        let selected_lists =
            lists_with_largest_remainder(qualifying_for_remainder, residual_seats)?;
        let selected_list = selected_lists[0];
        Ok(SeatChange::LargestRemainderAssignment(
            LargestRemainderAssignedSeat {
                selected_list_number: selected_list.list_number,
                list_assigned: list_assigned_from_previous_step(
                    selected_list,
                    previous_steps,
                    SeatChange::is_changed_by_largest_remainder_assignment,
                ),
                list_options: selected_lists.iter().map(|list| list.list_number).collect(),
                remainder_votes: selected_list.remainder_votes,
            },
        ))
    } else {
        // We've now exhausted the largest remainder seats, we now do unique highest average instead:
        // we allow every group to get a seat, not allowing any group to get a second residual seat
        // while there are still lists that did not get a residual seat.
        let mut qualifying_for_unique_highest_average =
            list_standings_qualifying_for_unique_highest_average(
                standings,
                previous_steps,
                exhausted_list_numbers,
            )
            .peekable();
        if qualifying_for_unique_highest_average.peek().is_some() {
            debug!("Assign residual seat using unique highest averages method");
            step_assign_remainder_using_highest_averages(
                qualifying_for_unique_highest_average,
                residual_seats,
                previous_steps,
                exhausted_list_numbers,
                true,
            )
        } else {
            // We've now even exhausted unique highest average seats: every group that qualified
            // got a largest remainder seat, and every group also had at least a single residual seat
            // assigned to them. We now allow any residual seats to be assigned using the highest
            // averages procedure
            debug!("Assign residual seat using highest averages method");
            step_assign_remainder_using_highest_averages(
                standings.iter(),
                residual_seats,
                previous_steps,
                exhausted_list_numbers,
                false,
            )
        }
    }
}
