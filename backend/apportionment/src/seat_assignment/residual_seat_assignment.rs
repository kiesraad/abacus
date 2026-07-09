use std::fmt::Debug;

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
            if let Some((list_votes, deceased_candidates)) = exclude_exhausted_lists {
                exhausted_list_numbers(&current_standings, list_votes, deceased_candidates)
            } else {
                vec![]
            };

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
        let step = SeatChangeStep {
            standings,
            residual_seat_number: Some(residual_seat_number),
            change,
        };
        assert_ne!(
            step.standings, current_standings,
            "standings should be different"
        );
        steps.push(step);
    }

    Ok(RemainderAssignment::Completed(steps, current_standings))
}

/// Gets the list numbers that have been assigned a seat during consecutive
/// assignment steps of the same type.
///
/// If the previous step is of the same [SeatChange] type (checked via `matcher`)
/// and the `selected_list_number` was among the previous options (because it
/// had the same remainder/votes per seat), the previous step `list_assigned` is
/// taken as the starting point. `selected_list_number` is then appended.
fn extend_list_assigned_from_previous_step<LN: Copy + Eq>(
    selected_list_number: LN,
    previous_steps: &[SeatChangeStep<LN>],
    matcher: fn(&SeatChange<LN>) -> bool,
) -> Vec<LN> {
    let mut list_assigned = Vec::new();
    if let Some(previous_step) = previous_steps.last()
        && matcher(&previous_step.change)
        && previous_step
            .change
            .list_options()
            .contains(&selected_list_number)
    {
        list_assigned = previous_step.change.list_assigned()
    }
    list_assigned.push(selected_list_number);
    list_assigned
}

/// Returns an iterator with steps of the given type and given list_number_assigned
fn steps_of_type_assigning_to_list<LN: Copy + Eq>(
    previous_steps: &[SeatChangeStep<LN>],
    matcher: fn(&SeatChange<LN>) -> bool,
    list_number: LN,
) -> impl Iterator<Item = &SeatChangeStep<LN>> {
    previous_steps.iter().filter(move |step| {
        matcher(&step.change) && step.change.list_number_assigned() == list_number
    })
}

/// Determine which lists are exhausted (have no empty seats left) under
/// Artikel P 10 Kieswet.
fn exhausted_list_numbers<T: ListVotes>(
    standings: &[ListStanding<T::ListNumber>],
    list_votes: &[T],
    deceased_candidates: &DeceasedCandidates<T>,
) -> Vec<T::ListNumber> {
    let exhausted: Vec<T::ListNumber> = standings
        .iter()
        .filter(|s| {
            get_number_of_candidates(list_votes, s.list_number(), deceased_candidates)
                <= s.total_seats()
        })
        .map(|s| s.list_number())
        .collect();

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
    let number_of_seats_largest_remainders = steps_of_type_assigning_to_list(
        previous_steps,
        SeatChange::is_changed_by_largest_remainder_assignment,
        list_number,
    )
    .count();

    // A list qualifies for an extra seat if in a previous step, a seat has been removed
    // due to absolute majority reassignment, and that that seat has then been removed due
    // to list exhaustion. In that case, the seat can be returned to the original list.
    let has_absolute_majority_retracted_seat = previous_steps.iter().any(|prev| {
        prev.change.is_changed_by_absolute_majority_reassignment()
            && prev.change.list_number_retracted() == list_number
    });

    // In case of unique highest average assignment
    if check_for_unique_highest_average_seats {
        let number_of_seats_unique_highest_averages = steps_of_type_assigning_to_list(
            previous_steps,
            SeatChange::is_changed_by_unique_highest_average_assignment,
            list_number,
        )
        .count();
        // If no unique highest average seat has been assigned to this list
        // or (the unique highest average assigned seat has been retracted,
        // and no largest remainder seat has been retracted and reassigned)
        number_of_seats_unique_highest_averages == 0
            || (has_absolute_majority_retracted_seat
                && number_of_seats_unique_highest_averages == 1
                // It is possible to receive one LR seat, then get it retracted
                // and then received back again based on LR, which would mean 2.
                && number_of_seats_largest_remainders <= 1)
    }
    // In case of largest remainder assignment
    else {
        // If no largest remainder seat has been assigned to this list
        // or the largest remainder assigned seat has been retracted
        number_of_seats_largest_remainders == 0
            || (has_absolute_majority_retracted_seat && number_of_seats_largest_remainders == 1)
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
        list_assigned: extend_list_assigned_from_previous_step(
            selected_list.list_number(),
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
                list_assigned: extend_list_assigned_from_previous_step(
                    selected_list.list_number(),
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
    use crate::{
        seat_assignment::AbsoluteMajorityReassignedSeat,
        test_helpers::{CandidateVotesMock, ListVotesMock},
    };

    fn standing(list_number: u32, votes_cast: u32) -> ListStanding<u32> {
        ListStanding::new(
            &ListVotesMock {
                number: list_number,
                candidate_votes: vec![CandidateVotesMock(1, votes_cast)],
            },
            Fraction::new(100, 1),
        )
    }

    fn highest_average_step(
        selected_list_number: u32,
        list_options: Vec<u32>,
        list_assigned: Vec<u32>,
    ) -> SeatChangeStep<u32> {
        SeatChangeStep {
            residual_seat_number: None,
            standings: vec![],
            change: SeatChange::HighestAverageAssignment(HighestAverageAssignedSeat {
                selected_list_number,
                list_options,
                list_assigned,
                list_exhausted: vec![],
                votes_per_seat: Fraction::ZERO,
                drawing_lots: None,
            }),
        }
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

    fn largest_remainder_step(list_number: u32) -> SeatChangeStep<u32> {
        SeatChangeStep {
            residual_seat_number: None,
            standings: vec![],
            change: SeatChange::LargestRemainderAssignment(LargestRemainderAssignedSeat {
                selected_list_number: list_number,
                list_options: vec![list_number],
                list_assigned: vec![list_number],
                remainder_votes: Fraction::ZERO,
                drawing_lots: None,
            }),
        }
    }

    fn absolute_majority_reassignment_step(
        list_retracted_seat: u32,
        list_assigned_seat: u32,
    ) -> SeatChangeStep<u32> {
        SeatChangeStep {
            residual_seat_number: None,
            standings: vec![],
            change: SeatChange::AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat {
                list_retracted_seat,
                list_assigned_seat,
                drawing_lots: None,
            }),
        }
    }

    mod extend_list_assigned_from_previous_step {
        use super::*;

        #[test]
        fn test_returns_only_given_list_number_when_no_previous_steps() {
            assert_eq!(
                extend_list_assigned_from_previous_step(
                    1,
                    &[],
                    SeatChange::is_changed_by_highest_average_assignment,
                ),
                vec![1]
            );
        }

        #[test]
        fn test_returns_only_given_list_number_when_last_step_does_not_match_type() {
            let previous_steps = vec![unique_highest_average_step(1)];

            assert_eq!(
                extend_list_assigned_from_previous_step(
                    1,
                    &previous_steps,
                    SeatChange::is_changed_by_highest_average_assignment,
                ),
                vec![1]
            );
        }

        #[test]
        fn test_returns_only_given_list_number_when_not_in_previous_step_options() {
            let previous_steps = vec![highest_average_step(1, vec![1, 2], vec![1])];

            assert_eq!(
                extend_list_assigned_from_previous_step(
                    3,
                    &previous_steps,
                    SeatChange::is_changed_by_highest_average_assignment,
                ),
                vec![3]
            );
        }

        #[test]
        fn test_returns_all_lists_when_selected_list_in_previous_step_options() {
            let previous_steps = vec![
                highest_average_step(1, vec![1, 2, 3], vec![1]),
                highest_average_step(2, vec![2, 3], vec![1, 2]),
            ];

            assert_eq!(
                extend_list_assigned_from_previous_step(
                    3,
                    &previous_steps,
                    SeatChange::is_changed_by_highest_average_assignment,
                ),
                vec![1, 2, 3]
            );
        }

        #[test]
        fn test_only_considers_the_last_step() {
            let previous_steps = vec![
                highest_average_step(1, vec![1, 2], vec![1]),
                largest_remainder_step(3),
            ];

            assert_eq!(
                extend_list_assigned_from_previous_step(
                    2,
                    &previous_steps,
                    SeatChange::is_changed_by_highest_average_assignment,
                ),
                vec![2]
            );
        }
    }

    #[test]
    fn test_steps_of_type_assigning_to_list() {
        let previous_steps = vec![
            highest_average_step(1, vec![1, 2], vec![1]),
            largest_remainder_step(2),
            highest_average_step(2, vec![2, 3], vec![1, 2]),
        ];

        let steps_for_list_1: Vec<_> = steps_of_type_assigning_to_list(
            &previous_steps,
            SeatChange::is_changed_by_highest_average_assignment,
            1,
        )
        .collect();
        assert_eq!(steps_for_list_1.len(), 1);
        assert_eq!(steps_for_list_1[0].change.list_number_assigned(), 1);
    }

    mod exhausted_list_numbers {
        use std::collections::{HashMap, HashSet};

        use super::*;

        #[test]
        fn test_returns_empty_when_there_are_no_standings() {
            assert_eq!(
                exhausted_list_numbers::<ListVotesMock>(&[], &[], &HashMap::new()),
                vec![]
            );
        }

        #[test]
        fn test_returns_lists_with_as_many_seats_as_candidates() {
            let lists = [
                // 1 full seat, 2 candidates: not exhausted
                ListVotesMock::from_test_data_auto(1, vec![100, 0]),
                // 1 full seat, 1 candidate: exhausted
                ListVotesMock::from_test_data_auto(2, vec![100]),
                // 0 full seats, 1 candidate: not exhausted
                ListVotesMock::from_test_data_auto(3, vec![50]),
            ];
            let standings = [standing(1, 100), standing(2, 100), standing(3, 50)];

            assert_eq!(
                exhausted_list_numbers(&standings, &lists, &HashMap::new()),
                vec![2]
            );
        }

        #[test]
        fn test_counts_residual_seats_towards_exhaustion() {
            let lists = [ListVotesMock::from_test_data_auto(1, vec![100, 0])];
            let mut standings = [standing(1, 100)];
            // 1 full seat and 1 residual seat, total of 2 candidates
            standings[0].add_residual_seat();

            assert_eq!(
                exhausted_list_numbers(&standings, &lists, &HashMap::new()),
                vec![1]
            );
        }

        #[test]
        fn test_deceased_candidates_reduce_the_number_of_candidates() {
            // 1 full seat and 2 candidates, but candidate 2 is deceased
            let lists = [ListVotesMock::from_test_data_auto(1, vec![100, 0])];
            let standings = [standing(1, 100)];
            let deceased = HashMap::from([(1, HashSet::from([2]))]);

            assert_eq!(
                exhausted_list_numbers(&standings, &lists, &deceased),
                vec![1]
            );
        }

        #[test]
        fn test_returns_lists_with_more_seats_than_candidates() {
            // 2 full seats, 1 candidate
            let lists = [ListVotesMock::from_test_data_auto(1, vec![200])];
            let standings = [standing(1, 200)];

            assert_eq!(
                exhausted_list_numbers(&standings, &lists, &HashMap::new()),
                vec![1]
            );
        }
    }

    mod list_standings_qualifying_for_largest_remainder {
        use super::*;

        #[test]
        fn test_excludes_lists_without_votes() {
            let standings = [standing(1, 100), standing(2, 0)];

            let qualifying: Vec<_> =
                list_standings_qualifying_for_largest_remainder(&standings, &[], &[]).collect();
            assert_eq!(list_numbers(&qualifying), vec![1]);
        }

        #[test]
        fn test_excludes_lists_below_the_remainder_threshold() {
            // remainder_threshold = 75 (75% of quota)
            let standings = [standing(1, 76), standing(2, 75), standing(3, 74)];

            let qualifying: Vec<_> =
                list_standings_qualifying_for_largest_remainder(&standings, &[], &[]).collect();
            assert_eq!(list_numbers(&qualifying), vec![1, 2]);
        }

        #[test]
        fn test_excludes_exhausted_lists() {
            let standings = [standing(1, 100), standing(2, 100)];

            let qualifying: Vec<_> =
                list_standings_qualifying_for_largest_remainder(&standings, &[], &[2]).collect();
            assert_eq!(list_numbers(&qualifying), vec![1]);
        }

        #[test]
        fn test_excludes_lists_already_assigned_a_largest_remainder_seat() {
            let standings = [standing(1, 100), standing(2, 100)];
            let previous_steps = vec![largest_remainder_step(1)];

            let qualifying: Vec<_> =
                list_standings_qualifying_for_largest_remainder(&standings, &previous_steps, &[])
                    .collect();
            assert_eq!(list_numbers(&qualifying), vec![2]);
        }
    }

    mod list_standings_qualifying_for_unique_highest_average {
        use super::*;

        #[test]
        fn test_excludes_lists_without_votes() {
            let standings = [standing(1, 100), standing(2, 0)];

            let qualifying: Vec<_> =
                list_standings_qualifying_for_unique_highest_average(&standings, &[], &[])
                    .collect();
            assert_eq!(list_numbers(&qualifying), vec![1]);
        }

        #[test]
        fn test_does_not_apply_the_remainder_threshold() {
            // remainder_threshold = 75 (75% of quota)
            let standings = [standing(1, 74)];

            let qualifying: Vec<_> =
                list_standings_qualifying_for_unique_highest_average(&standings, &[], &[])
                    .collect();
            assert_eq!(list_numbers(&qualifying), vec![1]);
        }

        #[test]
        fn test_excludes_exhausted_lists() {
            let standings = [standing(1, 100), standing(2, 100)];

            let qualifying: Vec<_> =
                list_standings_qualifying_for_unique_highest_average(&standings, &[], &[2])
                    .collect();
            assert_eq!(list_numbers(&qualifying), vec![1]);
        }

        #[test]
        fn test_excludes_lists_already_assigned_a_unique_highest_average_seat() {
            let standings = [standing(1, 100), standing(2, 100)];
            let previous_steps = vec![unique_highest_average_step(1)];

            let qualifying: Vec<_> = list_standings_qualifying_for_unique_highest_average(
                &standings,
                &previous_steps,
                &[],
            )
            .collect();
            assert_eq!(list_numbers(&qualifying), vec![2]);
        }
    }

    mod lists_with_highest_average {
        use super::*;
        use crate::test_helpers::ListDrawnMock;

        /// Get the list averages of all standings
        fn list_averages(standings: &[ListStanding<u32>]) -> Vec<(u32, Fraction)> {
            standings
                .iter()
                .map(|s| (s.list_number(), s.next_votes_per_seat()))
                .collect()
        }

        #[test]
        fn test_returns_the_single_list_with_the_highest_average() {
            // next votes per seat: list 1: 100/2 = 50, list 2: 80, list 3: 60
            // list 2 has the highest average, so it should be returned
            let standings = [standing(1, 100), standing(2, 80), standing(3, 60)];
            let lists_drawn: Vec<ListDrawnMock> = vec![];

            let result = lists_with_highest_average(
                standings.iter(),
                list_averages(&standings),
                1,
                1,
                &mut lists_drawn.iter(),
            );

            let Ok(ListStandings::Completed(lists)) = result else {
                panic!("expected Completed");
            };
            assert_eq!(list_numbers(&lists), vec![2]);
        }

        #[test]
        fn test_returns_all_tied_lists_when_enough_seats_are_available() {
            // next votes per seat: list 1: 100/2 = 50, lists 2 and 3: 80
            // 2 seats are available, so both lists 2 and 3 can be assigned a seat
            let standings = [standing(1, 100), standing(2, 80), standing(3, 80)];
            let lists_drawn: Vec<ListDrawnMock> = vec![];

            let result = lists_with_highest_average(
                standings.iter(),
                list_averages(&standings),
                2,
                1,
                &mut lists_drawn.iter(),
            );

            let Ok(ListStandings::Completed(lists)) = result else {
                panic!("expected Completed");
            };
            assert_eq!(list_numbers(&lists), vec![2, 3]);
        }

        #[test]
        fn test_requires_drawing_lots_when_tied_lists_exceed_available_seats() {
            // next votes per seat: list 1: 100/2 = 50, lists 2 and 3: 80
            // only 1 seat available, but 2 lists have the same highest average
            let standings = [standing(1, 100), standing(2, 80), standing(3, 80)];
            let lists_drawn: Vec<ListDrawnMock> = vec![];

            let result = lists_with_highest_average(
                standings.iter(),
                list_averages(&standings),
                1,
                3,
                &mut lists_drawn.iter(),
            );

            let Ok(ListStandings::DrawingLotsRequired(variant)) = result else {
                panic!("expected DrawingLotsRequired");
            };
            assert_eq!(
                variant,
                ListDrawingLotsVariant::HighestAverageResidualSeat(
                    HighestAverageResidualSeatDrawingLots {
                        max_average: Fraction::new(80, 1),
                        residual_seat_numbers: vec![3],
                        options: vec![2, 3],
                        list_averages: list_averages(&standings),
                    }
                )
            );
        }

        #[test]
        fn test_assigns_the_seat_to_the_drawn_list() {
            let standings = [standing(1, 100), standing(2, 80), standing(3, 80)];
            let expected_variant = ListDrawingLotsVariant::HighestAverageResidualSeat(
                HighestAverageResidualSeatDrawingLots {
                    max_average: Fraction::new(80, 1),
                    residual_seat_numbers: vec![1],
                    options: vec![2, 3],
                    list_averages: list_averages(&standings),
                },
            );
            let lists_drawn = [ListDrawnMock::new(&expected_variant, 3)];

            let result = lists_with_highest_average(
                standings.iter(),
                list_averages(&standings),
                1,
                1,
                &mut lists_drawn.iter(),
            );

            let Ok(ListStandings::CompletedWithDrawingLots(lists, variant)) = result else {
                panic!("expected CompletedWithDrawingLots");
            };
            assert_eq!(list_numbers(&lists), vec![3]);
            assert_eq!(variant, expected_variant);
        }

        #[test]
        fn test_returns_error_when_drawn_list_has_a_different_variant() {
            let standings = [standing(1, 100), standing(2, 80), standing(3, 80)];
            let other_variant = ListDrawingLotsVariant::HighestAverageResidualSeat(
                HighestAverageResidualSeatDrawingLots {
                    max_average: Fraction::ZERO,
                    residual_seat_numbers: vec![1],
                    options: vec![2, 3],
                    list_averages: vec![],
                },
            );
            let lists_drawn = [ListDrawnMock::new(&other_variant, 3)];

            let result = lists_with_highest_average(
                standings.iter(),
                list_averages(&standings),
                1,
                1,
                &mut lists_drawn.iter(),
            );

            let Err(error) = result else {
                panic!("expected an error");
            };
            assert_eq!(
                error,
                ApportionmentError::InvalidLotDrawing("Variant mismatch".to_string())
            );
        }

        #[test]
        fn test_returns_error_when_drawn_list_is_not_one_of_the_options() {
            let standings = [standing(1, 100), standing(2, 80), standing(3, 80)];
            let variant = ListDrawingLotsVariant::HighestAverageResidualSeat(
                HighestAverageResidualSeatDrawingLots {
                    max_average: Fraction::new(80, 1),
                    residual_seat_numbers: vec![1],
                    options: vec![2, 3],
                    list_averages: list_averages(&standings),
                },
            );
            // List 1 does not have the highest average and is not an option
            let lists_drawn = [ListDrawnMock::new(&variant, 1)];

            let result = lists_with_highest_average(
                standings.iter(),
                list_averages(&standings),
                1,
                1,
                &mut lists_drawn.iter(),
            );

            let Err(error) = result else {
                panic!("expected an error");
            };
            assert_eq!(
                error,
                ApportionmentError::InvalidLotDrawing("Invalid number drawn".to_string())
            );
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

    mod list_qualifies_for_extra_seat {
        use super::*;

        const LIST: u32 = 1;
        const OTHER_LIST: u32 = 2;

        #[test]
        fn test_largest_remainder_qualify_when_no_seat_assigned() {
            let previous_steps = vec![];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, false));
        }

        #[test]
        fn test_largest_remainder_qualify_when_seat_assigned_to_other_list() {
            let previous_steps = vec![largest_remainder_step(OTHER_LIST)];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, false));
        }

        #[test]
        fn test_largest_remainder_qualify_when_unique_highest_average_step() {
            let previous_steps = vec![unique_highest_average_step(LIST)];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, false));
        }

        #[test]
        fn test_largest_remainder_not_qualify_when_seat_assigned() {
            let previous_steps = vec![largest_remainder_step(LIST)];
            assert!(!list_qualifies_for_extra_seat(&previous_steps, LIST, false));
        }

        #[test]
        fn test_largest_remainder_qualify_when_seat_retracted_by_absolute_majority() {
            let previous_steps = vec![
                largest_remainder_step(LIST),
                absolute_majority_reassignment_step(LIST, OTHER_LIST),
            ];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, false));
        }

        #[test]
        fn test_largest_remainder_not_qualify_when_seat_retracted_from_other_list() {
            let previous_steps = vec![
                largest_remainder_step(LIST),
                absolute_majority_reassignment_step(OTHER_LIST, LIST),
            ];
            assert!(!list_qualifies_for_extra_seat(&previous_steps, LIST, false));
        }

        #[test]
        fn test_largest_remainder_not_qualify_with_two_assigned_seats_even_after_retraction() {
            let previous_steps = vec![
                largest_remainder_step(LIST),
                largest_remainder_step(LIST),
                absolute_majority_reassignment_step(LIST, OTHER_LIST),
            ];
            assert!(!list_qualifies_for_extra_seat(&previous_steps, LIST, false));
        }

        #[test]
        fn test_unique_highest_average_qualify_when_no_seat_assigned() {
            let previous_steps = vec![];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, true));
        }

        #[test]
        fn test_unique_highest_average_qualify_when_seat_assigned_to_other_list() {
            let previous_steps = vec![unique_highest_average_step(OTHER_LIST)];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, true));
        }

        #[test]
        fn test_unique_highest_average_qualify_when_largest_remainder_step() {
            let previous_steps = vec![largest_remainder_step(LIST)];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, true));
        }

        #[test]
        fn test_unique_highest_average_not_qualify_when_seat_assigned() {
            let previous_steps = vec![unique_highest_average_step(LIST)];
            assert!(!list_qualifies_for_extra_seat(&previous_steps, LIST, true));
        }

        #[test]
        fn test_unique_highest_average_qualify_when_seat_retracted_by_absolute_majority() {
            let previous_steps = vec![
                unique_highest_average_step(LIST),
                absolute_majority_reassignment_step(LIST, OTHER_LIST),
            ];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, true));
        }

        #[test]
        fn test_unioque_highest_average_qualify_when_retracted_with_one_largest_remainder() {
            let previous_steps = vec![
                largest_remainder_step(LIST),
                unique_highest_average_step(LIST),
                absolute_majority_reassignment_step(LIST, OTHER_LIST),
            ];
            assert!(list_qualifies_for_extra_seat(&previous_steps, LIST, true));
        }

        #[test]
        fn test_unique_highest_average_not_qualify_when_retracted_with_two_largest_remainders() {
            let previous_steps = vec![
                largest_remainder_step(LIST),
                largest_remainder_step(LIST),
                unique_highest_average_step(LIST),
                absolute_majority_reassignment_step(LIST, OTHER_LIST),
            ];
            assert!(!list_qualifies_for_extra_seat(&previous_steps, LIST, true));
        }

        #[test]
        fn test_unique_highest_average_not_qualify_with_two_assigned_seats_even_after_retraction() {
            let previous_steps = vec![
                unique_highest_average_step(LIST),
                unique_highest_average_step(LIST),
                absolute_majority_reassignment_step(LIST, OTHER_LIST),
            ];
            assert!(!list_qualifies_for_extra_seat(&previous_steps, LIST, true));
        }
    }
}
