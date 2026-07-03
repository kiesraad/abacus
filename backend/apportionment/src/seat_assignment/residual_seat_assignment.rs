use std::{cmp::Ordering, fmt::Debug};

use tracing::{debug, info};

use super::{
    get_number_of_candidates, list_numbers,
    structs::{
        HighestAverageAssignedSeat, LargestRemainderAssignedSeat, ListStanding,
        RemainderAssignmentResult, SeatChange, SeatChangeStep,
    },
};
use crate::{
    ApportionmentError, ListDrawn,
    fraction::Fraction,
    seat_assignment::structs::RemainderAssignment,
    structs::{
        DeceasedCandidates, HighestAverageResidualSeatDrawingLots, LARGE_COUNCIL_THRESHOLD,
        LargestRemainderResidualSeatDrawingLots, ListDrawingLotsVariant, ListVotes,
    },
};

/// This function assigns the residual seats that remain after full seat assignment is finished.
/// These residual seats are assigned through two different procedures,
/// depending on how many total seats are available in the election.
pub fn assign_remainder<'b, T: ListVotes>(
    initial_standings: &[ListStanding<T::ListNumber>],
    seats: u32,
    total_residual_seats: u32,
    current_residual_seat_number: u32,
    previous_steps: &[SeatChangeStep<T::ListNumber>],
    exclude_exhausted_lists: Option<(&[T], &DeceasedCandidates<T>)>,
    lists_drawn: &mut impl Iterator<Item = &'b (impl ListDrawn<T::ListNumber> + 'b)>,
) -> RemainderAssignmentResult<T::ListNumber> {
    let mut steps: Vec<SeatChangeStep<T::ListNumber>> = previous_steps.to_vec();
    let mut residual_seat_number = current_residual_seat_number;
    let mut current_standings = initial_standings.to_vec();

    while residual_seat_number != total_residual_seats {
        let exhausted_list_numbers =
            exhausted_list_numbers(&current_standings, exclude_exhausted_lists);

        // Stop assigning when no list is eligible, either when every non-exhausted list has zero
        // votes or every list is exhausted. Any remaining seats will be reported as unassigned.
        let any_eligible = current_standings
            .iter()
            .any(|s| s.votes_cast() > 0 && !exhausted_list_numbers.contains(&s.list_number()));
        if !any_eligible {
            info!(
                "No eligible lists remain, {} seat(s) left unassigned",
                total_residual_seats - residual_seat_number
            );
            break;
        }

        let residual_seats = total_residual_seats - residual_seat_number;
        residual_seat_number += 1;

        let change = match step_assign_residual_seat(
            &current_standings,
            seats,
            residual_seats,
            residual_seat_number,
            &steps,
            &exhausted_list_numbers,
            lists_drawn,
        )? {
            ResidualSeat::SeatChange(change) => change,
            ResidualSeat::DrawingLotsRequired(variant) => {
                return Ok(RemainderAssignment::DrawingLotsRequired(
                    variant,
                    steps.clone(),
                    current_standings,
                ));
            }
        };

        let standings = current_standings.clone();

        // update the current standing by finding the selected group and
        // adding the residual seat to their tally
        let list_standing = current_standings
            .iter_mut()
            .find(|s| s.list_number() == change.list_number_assigned())
            .expect("should be able to find list standing");

        list_standing.add_residual_seat();

        // add the update to the remainder assignment steps
        steps.push(SeatChangeStep {
            standings,
            residual_seat_number: Some(residual_seat_number),
            change,
        });
    }

    Ok(RemainderAssignment::Completed(steps, current_standings))
}

/// Get a vector with the list number that was assigned the last residual seat.  
/// If the last residual seat was assigned to a list with the same
/// remainder/votes per seat as lists assigned a seat in previous steps,
/// return all list numbers that had the same remainder/votes per seat.
fn list_assigned_from_previous_step<LN: Copy + Eq>(
    selected_list: &ListStanding<LN>,
    previous_steps: &[SeatChangeStep<LN>],
    matcher: fn(&SeatChange<LN>) -> bool,
) -> Vec<LN> {
    let mut list_assigned = Vec::new();
    if let Some(previous_step) = previous_steps.last()
        && matcher(&previous_step.change)
        && previous_step
            .change
            .list_options()
            .contains(&selected_list.list_number())
    {
        list_assigned = previous_step.change.list_assigned()
    }
    list_assigned.push(selected_list.list_number());
    list_assigned
}

/// Returns the number of seats assigned with largest remainder method.
fn list_largest_remainder_assigned_seats<LN: Copy + Eq>(
    previous_steps: &[SeatChangeStep<LN>],
    list_number: LN,
) -> usize {
    previous_steps
        .iter()
        .filter(|prev| {
            prev.change.is_changed_by_largest_remainder_assignment()
                && prev.change.list_number_assigned() == list_number
        })
        .count()
}

/// Returns a vector with list numbers of which the same number of seats are assigned
/// compared to the number of candidates.
fn list_numbers_without_empty_seats<'a, T: ListVotes>(
    standings: impl Iterator<Item = &'a ListStanding<T::ListNumber>>,
    input_list_votes: &[T],
    deceased_candidates: &DeceasedCandidates<T>,
) -> Vec<T::ListNumber>
where
    T::ListNumber: 'a,
{
    standings.fold(vec![], |mut list_numbers_without_empty_seats, s| {
        let number_of_candidates =
            get_number_of_candidates(input_list_votes, s.list_number(), deceased_candidates);
        if number_of_candidates.cmp(&s.total_seats()) == Ordering::Equal {
            list_numbers_without_empty_seats.push(s.list_number())
        }
        list_numbers_without_empty_seats
    })
}

/// Determine which lists are exhausted (have no empty seats left) under
/// Artikel P 10 Kieswet.
fn exhausted_list_numbers<T: ListVotes>(
    standings: &[ListStanding<T::ListNumber>],
    exclude_exhausted_lists: Option<(&[T], &DeceasedCandidates<T>)>,
) -> Vec<T::ListNumber> {
    let exhausted = exclude_exhausted_lists.map_or_else(Vec::new, |(list_votes, deceased)| {
        list_numbers_without_empty_seats(standings.iter(), list_votes, deceased)
    });
    if !exhausted.is_empty() {
        debug!("Exhausted lists in accordance with Article P 10 Kieswet: {exhausted:?}");
    }
    exhausted
}

/// Returns if a list qualifies for an extra seat.
fn list_qualifies_for_extra_seat<LN: Copy + Eq>(
    previous_steps: &[SeatChangeStep<LN>],
    list_number: LN,
    check_for_unique_highest_average_seats: bool,
) -> bool {
    let number_of_seats_largest_remainders =
        list_largest_remainder_assigned_seats(previous_steps, list_number);

    let number_of_seats_unique_highest_averages_option = if check_for_unique_highest_average_seats {
        Some(list_unique_highest_average_assigned_seats(
            previous_steps,
            list_number,
        ))
    } else {
        None
    };

    // A list qualifies for an extra seat if in a previous step, a seat has been removed
    // due to absolute majority reassignment, and that that seat has then been removed due
    // to list exhaustion. In that case, the seat can be returned to the original list.
    let has_absolute_majority_retracted_seat: bool = previous_steps.iter().any(|prev| {
        prev.change.is_changed_by_absolute_majority_reassignment()
            && prev.change.list_number_retracted() == list_number
    });

    // In case of largest remainder assignment
    if number_of_seats_unique_highest_averages_option.is_none() {
        // If no largest remainder seat has been assigned to this list
        // or the largest remainder assigned seat has been retracted
        number_of_seats_largest_remainders == 0
            || (has_absolute_majority_retracted_seat && number_of_seats_largest_remainders == 1)
    }
    // In case of unique highest average assignment
    else if let Some(number_of_seats_unique_highest_averages) =
        number_of_seats_unique_highest_averages_option
    {
        // If no unique highest average seat has been assigned to this list
        // or (the unique highest average assigned seat has been retracted,
        // and no largest remainder seat has been retracted and reassigned)
        number_of_seats_unique_highest_averages == 0
            || (has_absolute_majority_retracted_seat
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
/// This also removes lists that do not have more candidates to be assigned seats,
/// and lists with zero votes cast.
fn list_standings_qualifying_for_largest_remainder<'a, LN: Copy + Eq>(
    standings: &'a [ListStanding<LN>],
    previous_steps: &'a [SeatChangeStep<LN>],
    exhausted_list_numbers: &[LN],
) -> impl Iterator<Item = &'a ListStanding<LN>> {
    standings.iter().filter(|&s| {
        s.votes_cast() > 0
            && s.meets_remainder_threshold()
            && !exhausted_list_numbers.contains(&s.list_number())
            && list_qualifies_for_extra_seat(previous_steps, s.list_number(), false)
    })
}

/// Get an iterator that lists all the lists that qualify for unique highest average.
/// This checks the previously assigned seats to make sure that every list that already
/// got a residual seat through the highest average procedure does not qualify
/// except when a seat was retracted. Lists with zero votes cast are excluded.
fn list_standings_qualifying_for_unique_highest_average<'a, LN: Copy + Eq>(
    standings: &'a [ListStanding<LN>],
    previous_steps: &'a [SeatChangeStep<LN>],
    exhausted_list_numbers: &[LN],
) -> impl Iterator<Item = &'a ListStanding<LN>> {
    standings.iter().filter(|&s| {
        s.votes_cast() > 0
            && !exhausted_list_numbers.contains(&s.list_number())
            && list_qualifies_for_extra_seat(previous_steps, s.list_number(), true)
    })
}

/// Returns the number of seats assigned with unique highest averages method.
fn list_unique_highest_average_assigned_seats<LN: Copy + Eq>(
    previous_steps: &[SeatChangeStep<LN>],
    list_number: LN,
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

enum ListStandings<'a, LN> {
    Completed(Vec<&'a ListStanding<LN>>),
    CompletedWithDrawingLots(Vec<&'a ListStanding<LN>>, ListDrawingLotsVariant<LN>),
    DrawingLotsRequired(ListDrawingLotsVariant<LN>),
}

/// Compute the lists with the highest average votes per seats.
///
/// This is determined based on seeing what would happen to the average votes
/// per seat if one additional seat would be assigned to each list.
///
/// It then returns all the lists for which this fraction is the largest.  
/// If there are more lists than there are residual seats to be assigned,
/// a drawing of lots is required.
///
/// This function will always return at least one group.
#[expect(clippy::cognitive_complexity)]
fn lists_with_highest_average<'a, 'b, LN: Copy + Debug + Eq>(
    standings: impl Iterator<Item = &'a ListStanding<LN>>,
    list_averages: Vec<(LN, Fraction)>,
    available_residual_seats: u32,
    residual_seat_number: u32,
    lists_drawn: &mut impl Iterator<Item = &'b (impl ListDrawn<LN> + 'b)>,
) -> Result<ListStandings<'a, LN>, ApportionmentError> {
    // We are now going to find the lists that have the highest average
    // votes per seat if we would were to add one additional seat to them
    let (max_average, lists) = standings.fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), s| {
            // If this average is higher than any previously seen, we reset the list of groups matching
            if s.next_votes_per_seat() > current_max {
                (s.next_votes_per_seat(), vec![s])
            } else {
                // If the next average seats for this list is the same as the
                // max we add it to the list of groups that have that current maximum
                if s.next_votes_per_seat() == current_max {
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
    if lists.len() > available_residual_seats as usize {
        info!(
            "Drawing of lots is required for lists: {:?}, only {available_residual_seats} seat(s) available",
            list_numbers(&lists)
        );

        let variant = ListDrawingLotsVariant::HighestAverageResidualSeat(
            HighestAverageResidualSeatDrawingLots {
                max_average,
                residual_seat_numbers: (residual_seat_number
                    ..residual_seat_number + available_residual_seats)
                    .collect(),
                options: list_numbers(&lists),
                list_averages,
            },
        );

        // Get a list from the lists_drawn
        let Some(list_drawn) = lists_drawn.next() else {
            return Ok(ListStandings::DrawingLotsRequired(variant));
        };

        variant.validate(list_drawn)?;

        let list = lists
            .iter()
            .find(|list| list.list_number() == *list_drawn.drawn())
            .ok_or(ApportionmentError::InvalidLotDrawing(
                "Unknown list number".to_string(),
            ))?;

        debug!(
            "Assigned seat to list {:?} after drawing of lots",
            list.list_number()
        );

        Ok(ListStandings::CompletedWithDrawingLots(vec![list], variant))
    } else {
        Ok(ListStandings::Completed(lists))
    }
}

/// Compute the lists with the largest votes remainder.
///
/// It returns all the lists for which this remainder fraction is the largest.  
/// If there are more lists than there are residual seats to be assigned,
/// a drawing of lots is required.
///
/// This function will always return at least one group.
#[expect(clippy::cognitive_complexity)]
fn lists_with_largest_remainder<'a, 'b, LN: Copy + Debug + Eq>(
    standings: impl Iterator<Item = &'a ListStanding<LN>>,
    list_remainders: Vec<(LN, Fraction)>,
    available_residual_seats: u32,
    residual_seat_number: u32,
    lists_drawn: &mut impl Iterator<Item = &'b (impl ListDrawn<LN> + 'b)>,
) -> Result<ListStandings<'a, LN>, ApportionmentError> {
    // We are now going to find the lists that have the largest remainder
    let (max_remainder, lists) = standings.fold(
        (Fraction::ZERO, vec![]),
        |(current_max, mut max_groups), s| {
            // If this remainder is higher than any previously seen, we reset the list of groups matching
            if s.remainder_votes() > current_max {
                (s.remainder_votes(), vec![s])
            } else {
                // If the remainder for this list is the same as the
                // max we add it to the list of groups that have that current maximum
                if s.remainder_votes() == current_max {
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
    if lists.len() > available_residual_seats as usize {
        info!(
            "Drawing of lots is required for lists: {:?}, only {available_residual_seats} seat(s) available",
            list_numbers(&lists)
        );

        let variant = ListDrawingLotsVariant::LargestRemainderResidualSeat(
            LargestRemainderResidualSeatDrawingLots {
                max_remainder,
                residual_seat_numbers: (residual_seat_number
                    ..residual_seat_number + available_residual_seats)
                    .collect(),
                options: list_numbers(&lists),
                list_remainders,
            },
        );

        // Get a list from the lists_drawn
        let Some(list_drawn) = lists_drawn.next() else {
            return Ok(ListStandings::DrawingLotsRequired(variant));
        };

        variant.validate(list_drawn)?;

        let list = lists
            .iter()
            .find(|list| list.list_number() == *list_drawn.drawn())
            .ok_or(ApportionmentError::InvalidLotDrawing(
                "Unknown list number".to_string(),
            ))?;

        debug!(
            "Assigned seat to list {:?} after drawing of lots",
            list.list_number()
        );

        Ok(ListStandings::CompletedWithDrawingLots(vec![list], variant))
    } else {
        Ok(ListStandings::Completed(lists))
    }
}

enum ResidualSeat<LN> {
    SeatChange(SeatChange<LN>),
    DrawingLotsRequired(ListDrawingLotsVariant<LN>),
}

/// Assign the next residual seat using the procedure for the council size:
/// highest averages for large councils (Artikel P 7 Kieswet), largest
/// remainder otherwise (Artikel P 8 Kieswet).
fn step_assign_residual_seat<'a, 'b, LN: Copy + Debug + Eq>(
    standings: &[ListStanding<LN>],
    seats: u32,
    residual_seats: u32,
    residual_seat_number: u32,
    previous_steps: &[SeatChangeStep<LN>],
    exhausted_list_numbers: &[LN],
    lists_drawn: &mut impl Iterator<Item = &'b (impl ListDrawn<LN> + 'b)>,
) -> Result<ResidualSeat<LN>, ApportionmentError> {
    if seats >= LARGE_COUNCIL_THRESHOLD {
        debug!("Assigning residual seat {residual_seat_number} using highest averages method");
        // [Artikel P 7 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP7)
        step_assign_remainder_using_highest_averages(
            standings,
            residual_seats,
            previous_steps,
            exhausted_list_numbers,
            false,
            residual_seat_number,
            lists_drawn,
        )
    } else {
        // [Artikel P 8 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP8)
        step_assign_remainder_using_largest_remainder(
            standings,
            residual_seats,
            previous_steps,
            exhausted_list_numbers,
            residual_seat_number,
            lists_drawn,
        )
    }
}

/// Select the lists that qualify for the next highest averages residual seat.
///
/// When check_for_unique is true, every list that did not yet get a residual seat qualifies.
/// If none qualify (or check_for_unique is false), falls back to every non-exhausted list with votes.
/// The returned boolean indicates whether unique highest average assignment is used
fn lists_qualifying_for_highest_average<'a, LN: Copy + Debug + Eq>(
    standings: &'a [ListStanding<LN>],
    previous_steps: &'a [SeatChangeStep<LN>],
    exhausted_list_numbers: &[LN],
    check_for_unique: bool,
) -> (bool, Vec<&'a ListStanding<LN>>) {
    let unique_qualifying_standings = if check_for_unique {
        list_standings_qualifying_for_unique_highest_average(
            standings,
            previous_steps,
            exhausted_list_numbers,
        )
        .collect()
    } else {
        vec![]
    };

    if !unique_qualifying_standings.is_empty() {
        debug!("Assign residual seat using unique highest averages method");
        (true, unique_qualifying_standings)
    } else {
        debug!("Assign residual seat using highest averages method");
        let qualifying_standings = standings
            .iter()
            .filter(|&s| s.votes_cast() > 0 && !exhausted_list_numbers.contains(&s.list_number()))
            .collect();
        (false, qualifying_standings)
    }
}

/// Assign the next residual seat, and return which group that seat was assigned to.
///
/// This assignment is done according to the rules for elections with 19 seats or more.
fn step_assign_remainder_using_highest_averages<'a, 'b, LN: Copy + Debug + Eq + 'a>(
    standings: &'a [ListStanding<LN>],
    residual_seats: u32,
    previous_steps: &[SeatChangeStep<LN>],
    exhausted_list_numbers: &[LN],
    check_for_unique: bool,
    residual_seat_number: u32,
    lists_drawn: &mut impl Iterator<Item = &'b (impl ListDrawn<LN> + 'b)>,
) -> Result<ResidualSeat<LN>, ApportionmentError> {
    let (unique, qualifying) = lists_qualifying_for_highest_average(
        standings,
        previous_steps,
        exhausted_list_numbers,
        check_for_unique,
    );

    let mut qualifying_for_highest_average = qualifying.into_iter().peekable();
    if qualifying_for_highest_average.peek().is_none() {
        // Unreachable: `assign_remainder` breaks the loop before this can be reached
        unreachable!("step_assign_remainder_using_highest_averages called with no eligible lists")
    }

    // List averages of all standings
    let list_averages = standings
        .iter()
        .map(|s| (s.list_number(), s.next_votes_per_seat()))
        .collect();
    let (selected_list, list_options, drawing_lots) = match lists_with_highest_average(
        qualifying_for_highest_average,
        list_averages,
        residual_seats,
        residual_seat_number,
        lists_drawn,
    )? {
        ListStandings::Completed(lists) => (lists[0], list_numbers(&lists), None),
        ListStandings::CompletedWithDrawingLots(lists, variant) => {
            (lists[0], variant.options().to_vec(), Some(variant))
        }
        ListStandings::DrawingLotsRequired(variant) => {
            return Ok(ResidualSeat::DrawingLotsRequired(variant));
        }
    };

    let assigned_seat = HighestAverageAssignedSeat {
        selected_list_number: selected_list.list_number(),
        list_assigned: list_assigned_from_previous_step(
            selected_list,
            previous_steps,
            if unique {
                SeatChange::is_changed_by_unique_highest_average_assignment
            } else {
                SeatChange::is_changed_by_highest_average_assignment
            },
        ),
        list_options,
        list_exhausted: exhausted_list_numbers.to_vec(),
        votes_per_seat: selected_list.next_votes_per_seat(),
        drawing_lots,
    };

    let change = if unique {
        SeatChange::UniqueHighestAverageAssignment(assigned_seat)
    } else {
        SeatChange::HighestAverageAssignment(assigned_seat)
    };
    Ok(ResidualSeat::SeatChange(change))
}

/// Assign the next residual seat, and return which group that seat was assigned to.  
/// This assignment is done according to the rules for elections with less than 19 seats.
fn step_assign_remainder_using_largest_remainder<'a, 'b, LN: Copy + Debug + Eq>(
    standings: &'a [ListStanding<LN>],
    residual_seats: u32,
    previous_steps: &[SeatChangeStep<LN>],
    exhausted_list_numbers: &[LN],
    residual_seat_number: u32,
    lists_drawn: &mut impl Iterator<Item = &'b (impl ListDrawn<LN> + 'b)>,
) -> Result<ResidualSeat<LN>, ApportionmentError> {
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
        // List remainders of all standings
        let list_remainders = standings
            .iter()
            .map(|s| (s.list_number(), s.remainder_votes()))
            .collect();
        let (selected_list, list_options, drawing_lots) = match lists_with_largest_remainder(
            qualifying_for_remainder,
            list_remainders,
            residual_seats,
            residual_seat_number,
            lists_drawn,
        )? {
            ListStandings::Completed(lists) => (lists[0], list_numbers(&lists), None),
            ListStandings::CompletedWithDrawingLots(lists, variant) => {
                (lists[0], variant.options().to_vec(), Some(variant))
            }
            ListStandings::DrawingLotsRequired(variant) => {
                return Ok(ResidualSeat::DrawingLotsRequired(variant));
            }
        };

        Ok(ResidualSeat::SeatChange(
            SeatChange::LargestRemainderAssignment(LargestRemainderAssignedSeat {
                selected_list_number: selected_list.list_number(),
                list_assigned: list_assigned_from_previous_step(
                    selected_list,
                    previous_steps,
                    SeatChange::is_changed_by_largest_remainder_assignment,
                ),
                list_options,
                remainder_votes: selected_list.remainder_votes(),
                drawing_lots,
            }),
        ))
    } else {
        // We've now exhausted the largest remainder seats, we now do unique highest average instead
        // Param check_for_unique is enabled, so we first assign seats to lists that did not yet
        // get a residual seat assigned, and only if there are no such lists left, we assign seats
        // to lists that already got a residual seat assigned.
        debug!("Assign residual seat using unique highest averages method");
        step_assign_remainder_using_highest_averages(
            standings,
            residual_seats,
            previous_steps,
            exhausted_list_numbers,
            true,
            residual_seat_number,
            lists_drawn,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::{CandidateVotesMock, ListVotesMock};
    fn standing(list_number: u32, votes_cast: u32) -> ListStanding<u32> {
        ListStanding::new(
            &ListVotesMock {
                number: list_number,
                candidate_votes: vec![CandidateVotesMock(1, votes_cast)],
            },
            Fraction::new(100, 1),
        )
    }

    fn unique_highest_average_step(list_number: u32) -> SeatChangeStep<u32> {
        SeatChangeStep {
            residual_seat_number: None,
            standings: vec![],
            change: SeatChange::UniqueHighestAverageAssignment(HighestAverageAssignedSeat {
                selected_list_number: list_number,
                list_options: vec![list_number],
                list_assigned: vec![list_number],
                list_exhausted: vec![],
                votes_per_seat: Fraction::ZERO,
                drawing_lots: None,
            }),
        }
    }

    #[test]
    #[expect(clippy::too_many_lines)]
    fn test_lists_qualifying_for_highest_average() {
        // Lists 1-3 have votes, list 4 has none (and should never qualify).
        let standings = [
            standing(1, 100),
            standing(2, 80),
            standing(3, 80),
            standing(4, 0),
        ];

        struct Case {
            description: &'static str,
            check_for_unique: bool,
            exhausted: Vec<u32>,
            previous_steps: Vec<SeatChangeStep<u32>>,
            expected_unique: bool,
            expected_lists: Vec<u32>,
        }

        let cases = vec![
            Case {
                description: "regular method qualifies every list with votes",
                check_for_unique: false,
                exhausted: vec![],
                previous_steps: vec![],
                expected_unique: false,
                expected_lists: vec![1, 2, 3],
            },
            Case {
                description: "regular method excludes exhausted lists",
                check_for_unique: false,
                exhausted: vec![2],
                previous_steps: vec![],
                expected_unique: false,
                expected_lists: vec![1, 3],
            },
            Case {
                description: "unique method qualifies every list with votes when none got a seat",
                check_for_unique: true,
                exhausted: vec![],
                previous_steps: vec![],
                expected_unique: true,
                expected_lists: vec![1, 2, 3],
            },
            Case {
                description: "unique method excludes lists that already got a unique seat",
                check_for_unique: true,
                exhausted: vec![],
                previous_steps: vec![unique_highest_average_step(1)],
                expected_unique: true,
                expected_lists: vec![2, 3],
            },
            Case {
                description: "unique method also excludes exhausted lists",
                check_for_unique: true,
                exhausted: vec![3],
                previous_steps: vec![unique_highest_average_step(1)],
                expected_unique: true,
                expected_lists: vec![2],
            },
            Case {
                description: "falls back to regular method when every list got a unique seat",
                check_for_unique: true,
                exhausted: vec![],
                previous_steps: vec![
                    unique_highest_average_step(1),
                    unique_highest_average_step(2),
                    unique_highest_average_step(3),
                ],
                expected_unique: false,
                expected_lists: vec![1, 2, 3],
            },
        ];

        for case in cases {
            let (unique, qualifying) = lists_qualifying_for_highest_average(
                &standings,
                &case.previous_steps,
                &case.exhausted,
                case.check_for_unique,
            );

            assert_eq!(
                unique, case.expected_unique,
                "unique flag: {}",
                case.description
            );
            assert_eq!(
                list_numbers(&qualifying),
                case.expected_lists,
                "qualifying lists: {}",
                case.description
            );
        }
    }
    use crate::seat_assignment::AbsoluteMajorityReassignedSeat;

    /// A list whose seat was retracted via absolute majority reassignment should still qualify for reassignment.
    #[test]
    fn test_reassignment_allowed_after_seat_was_retracted() {
        const RETRACTED_LIST: u32 = 1;
        const ASSIGNED_LIST: u32 = 2;

        let previous_steps = SeatChangeStep {
            residual_seat_number: None,
            change: SeatChange::AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat {
                list_retracted_seat: RETRACTED_LIST,
                list_assigned_seat: ASSIGNED_LIST,
                drawing_lots: None,
            }),
            standings: vec![],
        };

        assert!(list_qualifies_for_extra_seat(
            &[previous_steps],
            RETRACTED_LIST,
            true,
        ))
    }
}
