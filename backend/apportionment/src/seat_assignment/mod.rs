use std::cmp::Ordering;

mod residual_seat_assignment;
mod structs;
#[cfg(test)]
pub use structs::LargestRemainderAssignedSeat;
pub use structs::{
    AbsoluteMajorityReassignedSeat, ApportionmentWarning, HighestAverageAssignedSeat,
    ListExhaustionRemovedSeat, ListStanding, SeatAssignmentDetails, SeatChange, SeatChangeStep,
};
use tracing::info;

use self::{residual_seat_assignment::assign_remainder, structs::RemainderAssignmentResult};
use crate::{
    ApportionmentError, ApportionmentInput, ListDrawn, ListVotes,
    fraction::Fraction,
    seat_assignment::structs::{
        AbsoluteMajority, AbsoluteMajorityResult, GetListStandingByNumber, RemainderAssignment,
    },
    structs::{
        AbsoluteMajorityDrawingLots, CandidateNominationInput, CandidateNominationInputType,
        DeceasedCandidates, ListDrawingLotsVariant, ListNumber,
    },
};

pub enum SeatAssignment<LN> {
    Completed(SeatAssignmentDetails<LN>),
    DrawingLotsRequired(ListDrawingLotsVariant<LN>, SeatAssignmentDetails<LN>),
}

type SeatAssignmentResult<T> =
    Result<SeatAssignment<ListNumber<<T as ApportionmentInput>::List>>, ApportionmentError>;

/// Seat assignment
#[allow(
    clippy::too_many_lines,
    clippy::cognitive_complexity,
    clippy::result_large_err
)]
pub(crate) fn seat_assignment<T: ApportionmentInput>(input: &T) -> SeatAssignmentResult<T> {
    info!("Seat assignment");
    info!("Seats: {}", input.number_of_seats());

    // [Artikel P 5 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP5)
    // Sum the votes cast on candidates for each list
    let total_votes_cast: u32 = input
        .list_votes()
        .iter()
        .map(|list_votes| list_votes.total_votes())
        .sum();
    if total_votes_cast == 0 {
        info!("No votes on candidates cast; all seats will be left unassigned");
    }

    // Calculate electoral quota (kiesdeler) as a proper fraction
    let quota = Fraction::from(total_votes_cast) / Fraction::from(input.number_of_seats());
    info!("Quota: {}", quota);

    // [Artikel P 6 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP6)
    let initial_standing: Vec<ListStanding<_>> = input
        .list_votes()
        .iter()
        .map(|list| ListStanding::new(list, quota))
        .collect();

    let full_seats = initial_standing
        .iter()
        .map(|list| list.full_seats())
        .sum::<u32>();
    let residual_seats = input.number_of_seats() - full_seats;

    let mut lists_drawn = input.lists_drawn();

    let (mut steps, current_standings) = if residual_seats > 0 {
        match assign_remainder::<T::List>(
            &initial_standing,
            input.number_of_seats(),
            residual_seats,
            0,
            &[],
            None,
            &mut lists_drawn,
        )? {
            RemainderAssignment::Completed(steps, current_standings) => (steps, current_standings),
            RemainderAssignment::DrawingLotsRequired(variant, steps, standings) => {
                return Ok(SeatAssignment::DrawingLotsRequired(
                    variant,
                    SeatAssignmentDetails {
                        seats: input.number_of_seats(),
                        full_seats,
                        residual_seats,
                        quota,
                        steps,
                        standings: standings.into_iter().map(Into::into).collect(),
                    },
                ));
            }
        }
    } else {
        info!("All seats have been assigned without any residual seats");
        (vec![], initial_standing)
    };

    // [Artikel P 9 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP9)
    let (cumulative_standings, assigned_seat) = if let Some(last_step) = steps.last() {
        match reassign_residual_seat_for_absolute_majority(
            input.number_of_seats(),
            total_votes_cast,
            input.list_votes(),
            &last_step.change,
            current_standings.clone(),
            &mut lists_drawn,
        )? {
            AbsoluteMajority::Completed(cumulative_standings, assigned_seat) => {
                (cumulative_standings, assigned_seat)
            }
            AbsoluteMajority::DrawingLotsRequired(variant) => {
                return Ok(SeatAssignment::DrawingLotsRequired(
                    variant,
                    SeatAssignmentDetails {
                        seats: input.number_of_seats(),
                        full_seats,
                        residual_seats,
                        quota,
                        steps: steps.clone(),
                        standings: current_standings.into_iter().map(Into::into).collect(),
                    },
                ));
            }
        }
    } else {
        (current_standings.clone(), None)
    };
    if let Some(assigned_seat) = assigned_seat {
        // add the absolute majority change to the remainder assignment steps
        steps.push(SeatChangeStep {
            standings: current_standings,
            residual_seat_number: None,
            change: assigned_seat,
        });
    }

    // [Artikel P 19a Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf3_ArtikelP19a)
    for (list_number, list_deceased) in input.deceased_candidates() {
        info!(
            "Following deceased candidates will be taken into account for list {:?}: {}",
            list_number,
            list_deceased
                .iter()
                .map(|c| format!("{:?}", c))
                .collect::<Vec<_>>()
                .join(", ")
        );
    }

    // [Artikel P 10 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP10)
    let (final_steps, final_standing) = match reassign_residual_seats_for_exhausted_lists(
        cumulative_standings,
        input.number_of_seats(),
        input.list_votes(),
        input.deceased_candidates(),
        residual_seats,
        steps.clone(),
        &mut lists_drawn,
    )? {
        RemainderAssignment::Completed(final_steps, final_standing) => {
            (final_steps, final_standing)
        }
        RemainderAssignment::DrawingLotsRequired(variant, steps, standings) => {
            return Ok(SeatAssignment::DrawingLotsRequired(
                variant,
                SeatAssignmentDetails {
                    seats: input.number_of_seats(),
                    full_seats,
                    residual_seats,
                    quota,
                    steps: steps.clone(),
                    standings: standings.into_iter().map(Into::into).collect(),
                },
            ));
        }
    };

    let final_full_seats = final_standing
        .iter()
        .map(|list| list.full_seats())
        .sum::<u32>();
    let final_residual_seats = final_standing
        .iter()
        .map(|list| list.residual_seats())
        .sum::<u32>();

    Ok(SeatAssignment::Completed(SeatAssignmentDetails {
        seats: input.number_of_seats(),
        full_seats: final_full_seats,
        residual_seats: final_residual_seats,
        quota,
        steps: final_steps,
        standings: final_standing.into_iter().map(Into::into).collect(),
    }))
}

/// Returns the total number of seats each list number received in the apportionment result.
pub fn get_total_seats_per_list_number_from_apportionment_result<LN: Copy>(
    result: &SeatAssignmentDetails<LN>,
) -> Vec<(LN, u32)> {
    result
        .standings
        .iter()
        .map(|p| (p.list_number, p.total_seats))
        .collect::<Vec<_>>()
}

/// Returns candidate nomination input created from the initial apportionment input
/// and the seat assignment result.
pub fn as_candidate_nomination_input<'a, T: ApportionmentInput>(
    input: &'a T,
    seat_assignment: &SeatAssignmentDetails<ListNumber<T::List>>,
) -> CandidateNominationInputType<'a, T> {
    CandidateNominationInput {
        number_of_seats: input.number_of_seats(),
        list_votes: input.list_votes(),
        deceased_candidates: input.deceased_candidates(),
        quota: seat_assignment.quota,
        total_seats_per_list: get_total_seats_per_list_number_from_apportionment_result(
            seat_assignment,
        ),
    }
}

/// Returns a vector containing just the list numbers from an iterator of the current standing
fn list_numbers<LN: Copy>(standing: &[&ListStanding<LN>]) -> Vec<LN> {
    standing.iter().map(|s| s.list_number()).collect()
}

/// Returns the number of candidates of a list.
fn get_number_of_candidates<T: ListVotes>(
    input_list_votes: &[T],
    list_number: T::ListNumber,
    deceased_candidates: &DeceasedCandidates<T>,
) -> u32 {
    let list_votes = input_list_votes
        .iter()
        .find(|list_votes| list_votes.number() == list_number)
        .expect("List votes exists");

    let deceased_count = deceased_candidates.get(&list_number).map_or(0, |v| v.len());
    u32::try_from(list_votes.candidate_votes().len() - deceased_count)
        .expect("Number of candidates fits in u32")
}

/// Returns a vector with tuples of list numbers and how many more seats it was assigned
/// compared to the number of candidates.
fn list_numbers_with_exhausted_seats<T: ListVotes>(
    standings: &[ListStanding<T::ListNumber>],
    input_list_votes: &[T],
    deceased_candidates: &DeceasedCandidates<T>,
) -> Vec<(T::ListNumber, u32)> {
    standings
        .iter()
        .fold(vec![], |mut exhausted_list_numbers_and_seats, s| {
            let number_of_candidates =
                get_number_of_candidates(input_list_votes, s.list_number(), deceased_candidates);
            if number_of_candidates.cmp(&s.total_seats()) == Ordering::Less {
                exhausted_list_numbers_and_seats.push((
                    s.list_number(),
                    number_of_candidates.abs_diff(s.total_seats()),
                ))
            }
            exhausted_list_numbers_and_seats
        })
}

/// If a list got the absolute majority of votes but not the absolute majority of seats,
/// re-assign the last residual seat to the list with the absolute majority.  
/// This re-assignment is done according to article P 9 of the Kieswet.
fn reassign_residual_seat_for_absolute_majority<'a, T: ListVotes>(
    seats: u32,
    total_votes_cast: u32,
    list_votes: &[T],
    last_seat_change: &SeatChange<T::ListNumber>,
    previous_standings: Vec<ListStanding<T::ListNumber>>,
    lists_drawn: &mut impl Iterator<Item = &'a (impl ListDrawn<T::ListNumber> + 'a)>,
) -> AbsoluteMajorityResult<T::ListNumber> {
    let half_of_votes_count = Fraction::from(total_votes_cast) * Fraction::new(1, 2);

    // Find list with an absolute majority of votes. Return early if we find none
    let Some(majority_list_votes) = list_votes
        .iter()
        .find(|list| Fraction::from(list.total_votes()) > half_of_votes_count)
    else {
        return Ok(AbsoluteMajority::Completed(previous_standings, None));
    };

    let half_of_seats_count = Fraction::from(seats) * Fraction::new(1, 2);

    let list_seats: Fraction = previous_standings
        .get_by_number(majority_list_votes.number())
        .total_seats()
        .into();

    if list_seats <= half_of_seats_count {
        let lists_last_residual_seat = last_seat_change.list_assigned();
        let (list_retracted_seat, drawing_lots) = if lists_last_residual_seat.len() == 1 {
            (lists_last_residual_seat[0], None)
        } else {
            info!(
                "Drawing of lots is required for lists: {:?} to pick a list which the residual seat gets retracted from",
                lists_last_residual_seat
            );

            let variant = ListDrawingLotsVariant::absolute_majority_for_seat_change(
                last_seat_change,
                AbsoluteMajorityDrawingLots {
                    assign_to: majority_list_votes.number(),
                    options: lists_last_residual_seat,
                },
            )?;

            // Get a list from the lists_drawn
            let Some(list_drawn) = lists_drawn.next() else {
                return Ok(AbsoluteMajority::DrawingLotsRequired(variant));
            };

            // Assert the required variant including all data
            list_drawn.variant().ensure_eq(&variant)?;

            (*list_drawn.drawn(), Some(variant))
        };

        // Reassign the seat
        let mut current_standings = previous_standings.clone();

        current_standings
            .get_by_number_mut(list_retracted_seat)
            .remove_residual_seat();

        current_standings
            .get_by_number_mut(majority_list_votes.number())
            .add_residual_seat();

        info!(
            "Seat first assigned to list {:?} has been reassigned to list {:?} in accordance with Article P 9 Kieswet",
            list_retracted_seat,
            majority_list_votes.number()
        );
        Ok(AbsoluteMajority::Completed(
            current_standings,
            Some(SeatChange::AbsoluteMajorityReassignment(
                AbsoluteMajorityReassignedSeat {
                    list_retracted_seat,
                    list_assigned_seat: majority_list_votes.number(),
                    drawing_lots,
                },
            )),
        ))
    } else {
        Ok(AbsoluteMajority::Completed(previous_standings, None))
    }
}

/// If lists got more seats than candidates on their lists,
/// re-assign those excess seats to other lists without exhausted lists.  
/// This re-assignment is done according to article P 10 of the Kieswet.
fn reassign_residual_seats_for_exhausted_lists<'a, T: ListVotes>(
    previous_standings: Vec<ListStanding<T::ListNumber>>,
    seats: u32,
    list_votes: &[T],
    deceased_candidates: &DeceasedCandidates<T>,
    assigned_residual_seats: u32,
    previous_steps: Vec<SeatChangeStep<T::ListNumber>>,
    lists_drawn: &mut impl Iterator<Item = &'a (impl ListDrawn<T::ListNumber> + 'a)>,
) -> RemainderAssignmentResult<T::ListNumber> {
    let exhausted_lists =
        list_numbers_with_exhausted_seats(&previous_standings, list_votes, deceased_candidates);
    if !exhausted_lists.is_empty() {
        let mut current_standings = previous_standings.clone();
        let mut seats_to_reassign = 0;
        let mut list_exhaustion_steps: Vec<SeatChangeStep<T::ListNumber>> = vec![];

        // Remove excess seats from exhausted lists
        for (list_number, seats) in exhausted_lists {
            seats_to_reassign += seats;
            let mut full_seat: bool = false;
            for _ in 1..=seats {
                let list_standing = current_standings
                    .iter_mut()
                    .find(|list_standing| list_standing.list_number() == list_number)
                    .expect("list standing should exist");

                if list_standing.residual_seats() > 0 {
                    list_standing.remove_residual_seat();
                } else {
                    list_standing.remove_full_seat();
                    full_seat = true;
                }

                info!(
                    "Seat first assigned to list {:?} has been removed and will be assigned to another list in accordance with Article P 10 Kieswet",
                    list_number
                );
                list_exhaustion_steps.push(SeatChangeStep {
                    standings: current_standings.clone(),
                    residual_seat_number: None,
                    change: SeatChange::ListExhaustionRemoval(ListExhaustionRemovedSeat {
                        list_retracted_seat: list_number,
                        full_seat,
                    }),
                });
            }
        }
        let mut current_steps = previous_steps.to_owned();
        current_steps.extend(list_exhaustion_steps);

        // Reassign removed seats to non-exhausted lists
        Ok(assign_remainder(
            &current_standings,
            seats,
            assigned_residual_seats + seats_to_reassign,
            assigned_residual_seats,
            &current_steps,
            Some((list_votes, deceased_candidates)),
            lists_drawn,
        )?)
    } else {
        Ok(RemainderAssignment::Completed(
            previous_steps,
            previous_standings,
        ))
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use std::fmt::Debug;

    use test_log::test;

    use crate::{
        SeatAssignmentDetails,
        fraction::Fraction,
        seat_assignment::{
            ListStanding, get_total_seats_per_list_number_from_apportionment_result, list_numbers,
        },
        test_helpers::{CandidateVotesMock, ListVotesMock},
    };

    fn check_total_seats_per_list<LN: Copy + Debug + PartialEq>(
        result: &SeatAssignmentDetails<LN>,
        expected_total_seats_per_list: &[(LN, u32)],
    ) {
        let total_seats_per_list_number =
            get_total_seats_per_list_number_from_apportionment_result(result);
        assert_eq!(expected_total_seats_per_list, total_seats_per_list_number);
    }

    #[test]
    fn test_list_numbers() {
        let standings: Vec<ListStanding<u32>> = (2..=6)
            .map(|n| {
                ListStanding::new(
                    &ListVotesMock {
                        number: n,
                        candidate_votes: vec![CandidateVotesMock {
                            number: 1,
                            votes: 1249,
                        }],
                    },
                    Fraction::new(100, 1),
                )
            })
            .collect();
        let standing: Vec<_> = standings.iter().collect();
        assert_eq!(list_numbers(&standing), vec![2, 3, 4, 5, 6]);
    }

    /// Tests apportionment for councils with less than 19 seats
    mod lt_19_seats {
        use test_log::test;

        use crate::{
            seat_assignment::{SeatAssignment, seat_assignment},
            test_helpers::{
                get_total_seats_from_apportionment_result,
                seat_assignment_fixture_with_default_50_candidates,
            },
        };

        /// Apportionment without remainder seats
        ///
        /// Full seats: [6, 2, 2, 2, 1, 1, 1] - Remainder seats: 0
        #[test]
        fn test_without_remainder_seats() {
            let input = seat_assignment_fixture_with_default_50_candidates(
                15,
                vec![480, 160, 160, 160, 80, 80, 80],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

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
            let input = seat_assignment_fixture_with_default_50_candidates(
                15,
                vec![540, 160, 160, 80, 80, 80, 60, 40],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 13);
            assert_eq!(result.residual_seats, 2);
            assert_eq!(result.steps.len(), 2);
            assert_eq!(result.steps[0].change.list_number_assigned(), 1);
            assert_eq!(result.steps[1].change.list_number_assigned(), 7);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![7, 2, 2, 1, 1, 1, 1, 0]);
        }

        /// Apportionment with residual seats assigned with largest remainders and highest averages methods
        ///
        /// Full seats: [10, 0, 0, 0, 0, 0, 0, 0] - Remainder seats: 5  
        /// Remainders: [8, 59, 58, 57, 56, 55, 54, 53], only votes of list 1 meet the threshold of 75% of the quota  
        /// 1 - largest remainder: seat assigned to list 1  
        /// 1st round of highest averages method (assignment to unique lists):  
        /// 2 - highest average: [67 4/12, 59, 58, 57, 56, 55, 54, 53] seat assigned to list 1  
        /// 3 - highest average: [62 2/13, 59, 58, 57, 56, 55, 54, 53] seat assigned to list 2  
        /// 4 - highest average: [62 2/13, 29 1/2, 58, 57, 56, 55, 54, 53] seat assigned to list 3  
        /// 5 - highest average: [62 2/13, 29 1/2, 29, 57, 56, 55, 54, 53] seat assigned to list 4
        #[test]
        fn test_with_1_list_that_meets_threshold() {
            let input = seat_assignment_fixture_with_default_50_candidates(
                15,
                vec![808, 59, 58, 57, 56, 55, 54, 53],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };
            assert_eq!(result.full_seats, 10);
            assert_eq!(result.residual_seats, 5);
            assert_eq!(result.steps.len(), 5);
            assert_eq!(result.steps[0].change.list_number_assigned(), 1);
            assert_eq!(result.steps[1].change.list_number_assigned(), 1);
            assert_eq!(result.steps[2].change.list_number_assigned(), 2);
            assert_eq!(result.steps[3].change.list_number_assigned(), 3);
            assert_eq!(result.steps[4].change.list_number_assigned(), 4);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![12, 1, 1, 1, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with largest remainders method
        ///
        /// Full seats: [6, 3, 3, 0, 0, 0, 0, 0] - Remainder seats: 3  
        /// Remainders: [0/15, 0/15, 0/15, 55, 50, 45, 45, 45], only votes of lists [1, 2, 3] meet the threshold of 75% of the quota  
        /// 1 - largest remainder: seat assigned to list 1  
        /// 2 - largest remainder: seat assigned to list 2  
        /// 3 - largest remainder: seat assigned to list 3
        #[test]
        fn test_with_3_lists_that_meet_threshold_0_remainders() {
            let input = seat_assignment_fixture_with_default_50_candidates(
                15,
                vec![480, 240, 240, 55, 50, 45, 45, 45],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(result.steps[0].change.list_number_assigned(), 1);
            assert_eq!(result.steps[1].change.list_number_assigned(), 2);
            assert_eq!(result.steps[2].change.list_number_assigned(), 3);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![7, 4, 4, 0, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with highest averages method
        ///
        /// Full seats: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] - Remainder seats: 3  
        /// Remainders: [8, 7, 6, 5, 4, 3, 2, 1, 1, 1], no lists meet the threshold of 75% of the quota  
        /// 1st round of highest averages method (assignment to unique lists):  
        /// 1 - highest average: [8, 7, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 1  
        /// 2 - highest average: [4, 7, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 2  
        /// 3 - highest average: [4, 3 1/2, 6, 5, 4, 3, 2, 1, 1, 1] seat assigned to list 3
        #[test]
        fn test_with_0_lists_that_meet_threshold() {
            let input = seat_assignment_fixture_with_default_50_candidates(
                3,
                vec![8, 7, 6, 5, 4, 3, 2, 1, 1, 1],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 0);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(result.steps[0].change.list_number_assigned(), 1);
            assert_eq!(result.steps[1].change.list_number_assigned(), 2);
            assert_eq!(result.steps[2].change.list_number_assigned(), 3);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
        }

        /// Apportionment with residual seats assigned with largest remainders and highest averages methods
        ///
        /// Full seats: [0, 0, 0, 0, 0, 7] - Remainder seats: 3  
        /// Remainders: [0/10, 3, 5, 6, 7, 9], only votes of list 6 meet the threshold of 75% of the quota  
        ///  1 - largest remainder: seat assigned to list 6  
        /// 1st round of highest averages method (assignment to unique lists):  
        ///  2 - highest average: [0/1, 3, 5, 6, 7, 8 7/8] seat assigned to list 6  
        ///  3 - highest average: [0/1, 3, 5, 6, 7, 7 9/10] seat assigned to list 5
        #[test]
        fn test_1st_round_unique_highest_averages_method_regression() {
            let input =
                seat_assignment_fixture_with_default_50_candidates(10, vec![0, 3, 5, 6, 7, 79]);
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 7);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(result.steps[0].change.list_number_assigned(), 6);
            assert_eq!(result.steps[1].change.list_number_assigned(), 6);
            assert_eq!(result.steps[2].change.list_number_assigned(), 5);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, [0, 0, 0, 0, 1, 9]);
        }

        /// Apportionment with 0 votes on candidates
        ///
        /// No votes on candidates cast, all seats are left unassigned
        #[test]
        fn test_with_0_votes() {
            let input = seat_assignment_fixture_with_default_50_candidates(10, vec![0, 0, 0, 0, 0]);
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.seats, 10);
            assert_eq!(result.full_seats, 0);
            assert_eq!(result.residual_seats, 0);
            assert_eq!(result.steps.len(), 0);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![0, 0, 0, 0, 0]);
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
            let input = seat_assignment_fixture_with_default_50_candidates(
                15,
                vec![2571, 977, 567, 536, 453],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 4);
            assert_eq!(result.steps[0].change.list_number_assigned(), 2);
            assert_eq!(result.steps[1].change.list_number_assigned(), 3);
            assert_eq!(result.steps[2].change.list_number_assigned(), 4);
            assert!(
                result.steps[3]
                    .change
                    .is_changed_by_absolute_majority_reassignment()
            );
            assert_eq!(result.steps[3].change.list_number_retracted(), 4);
            assert_eq!(result.steps[3].change.list_number_assigned(), 1);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![8, 3, 2, 1, 1]);
            assert!(result.warnings().is_empty());
        }

        /// Article P 9 Kieswet requires a strict majority of votes (> 50%), so exactly 50% should not trigger it.
        #[test]
        fn test_exactly_half_of_votes_should_not_trigger_absolute_majority_reassignment() {
            let input = seat_assignment_fixture_with_default_50_candidates(7, vec![500, 300, 200]);
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };
            assert!(
                !result
                    .steps
                    .iter()
                    .any(|step| step.change.is_changed_by_absolute_majority_reassignment())
            );
        }

        mod drawing_of_lots {
            use test_log::test;

            use crate::{
                Fraction, SeatChange, seat_assignment,
                seat_assignment::{
                    AbsoluteMajorityReassignedSeat, SeatAssignment,
                    structs::LargestRemainderAssignedSeat,
                },
                structs::{
                    AbsoluteMajorityDrawingLots, LargestRemainderResidualSeatDrawingLots,
                    ListDrawingLotsVariant,
                },
                test_helpers::{
                    ListDrawnMock, get_standings_residual_seats,
                    get_total_seats_from_apportionment_result,
                    seat_assignment_fixture_with_default_50_candidates,
                },
            };

            /// Apportionment with residual seats assigned with largest remainders method
            ///
            /// This test triggers Kieswet Article P 9
            ///
            /// Full seats: [7, 1, 1, 1, 1, 1] - Remainder seats: 3  
            /// Remainders: [170 9/15, 170 12/15, 170 12/15, 170 12/15, 168 12/15, 168 12/15]  
            /// 1 - largest remainder: seat assigned to list 2  
            /// 2 - largest remainder: seat assigned to list 3  
            /// 3 - largest remainder: seat assigned to list 4  
            /// 4 - Drawing of lots is required for lists: [2, 3, 4] to pick a list which the residual seat gets retracted from
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_with_drawing_of_lots_error() {
                let mut input = seat_assignment_fixture_with_default_50_candidates(
                    15,
                    vec![2552, 511, 511, 511, 509, 509],
                );
                let Ok(SeatAssignment::DrawingLotsRequired(variant, preliminary_result)) =
                    seat_assignment(&input)
                else {
                    panic!("should be DrawingLotsRequired");
                };
                assert_eq!(
                    variant,
                    ListDrawingLotsVariant::AbsoluteMajorityLargestRemainder(
                        AbsoluteMajorityDrawingLots {
                            assign_to: 1,
                            options: vec![2, 3, 4],
                        }
                    ),
                );
                assert_eq!(preliminary_result.seats, 15);
                assert_eq!(preliminary_result.full_seats, 12);
                assert_eq!(preliminary_result.residual_seats, 3);
                assert_eq!(preliminary_result.quota, Fraction::new(5103, 15));
                assert_eq!(preliminary_result.steps.len(), 3);
                assert_eq!(
                    get_standings_residual_seats(&preliminary_result),
                    vec![0, 1, 1, 1, 0, 0]
                );

                // Draw list 3
                input.lists_drawn.push(ListDrawnMock {
                    variant: variant.clone(),
                    drawn: 3,
                });
                let Ok(SeatAssignment::Completed(result)) = seat_assignment(&input) else {
                    panic!("should be Completed");
                };

                assert_eq!(result.seats, 15);
                assert_eq!(result.full_seats, 12);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.quota, Fraction::new(5103, 15));

                assert_eq!(
                    get_standings_residual_seats(&result),
                    vec![1, 1, 0, 1, 0, 0]
                );

                assert_eq!(result.steps.len(), 4);
                assert_eq!(
                    result.steps[3].change,
                    SeatChange::AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat {
                        list_retracted_seat: 3,
                        list_assigned_seat: 1,
                        drawing_lots: Some(variant),
                    })
                );
            }

            /// Apportionment with residual seats assigned with largest remainders method
            ///
            /// Full seats: [6, 2, 2, 1, 1, 1, 0, 0] - Remainder seats: 2
            /// Remainders: [60, 0/15, 0/15, 0/15, 0/15, 0/15, 55, 45]
            /// 1 - largest remainder: seat assigned to list 1
            /// 2 - Drawing of lots is required for lists: [2, 3, 4, 5, 6], only 1 seat available
            #[test]
            fn test_with_0_remainders_drawing_of_lots_required() {
                let mut input = seat_assignment_fixture_with_default_50_candidates(
                    15,
                    vec![540, 160, 160, 80, 80, 80, 55, 45],
                );
                let Ok(SeatAssignment::DrawingLotsRequired(variant, preliminary_result)) =
                    seat_assignment(&input)
                else {
                    panic!("should be DrawingLotsRequired");
                };
                assert_eq!(
                    variant,
                    ListDrawingLotsVariant::LargestRemainderResidualSeat(
                        LargestRemainderResidualSeatDrawingLots {
                            max_remainder: Fraction::new(0, 1),
                            residual_seat_numbers: vec![2],
                            options: vec![2, 3, 4, 5, 6],
                            list_remainders: vec![
                                (1, Fraction::new(60, 1)),
                                (2, Fraction::new(0, 1)),
                                (3, Fraction::new(0, 1)),
                                (4, Fraction::new(0, 1)),
                                (5, Fraction::new(0, 1)),
                                (6, Fraction::new(0, 1)),
                                (7, Fraction::new(55, 1)),
                                (8, Fraction::new(45, 1)),
                            ],
                        }
                    ),
                );
                assert_eq!(preliminary_result.seats, 15);
                assert_eq!(preliminary_result.full_seats, 13);
                assert_eq!(preliminary_result.residual_seats, 2);
                assert_eq!(
                    preliminary_result.quota,
                    Fraction {
                        numerator: 80,
                        denominator: 1
                    }
                );
                assert_eq!(preliminary_result.steps.len(), 1);
                assert_eq!(
                    get_standings_residual_seats(&preliminary_result),
                    vec![1, 0, 0, 0, 0, 0, 0, 0]
                );

                // Lot drawn is 6
                input.lists_drawn.push(ListDrawnMock { variant, drawn: 6 });
                let Ok(SeatAssignment::Completed(result)) = seat_assignment(&input) else {
                    panic!("should be Completed");
                };

                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![7, 2, 2, 1, 1, 2, 0, 0]);

                assert_eq!(
                    get_standings_residual_seats(&result),
                    vec![1, 0, 0, 0, 0, 1, 0, 0]
                );

                assert_eq!(result.steps.len(), 2);
                assert_eq!(
                    result.steps[0].change,
                    SeatChange::LargestRemainderAssignment(LargestRemainderAssignedSeat {
                        selected_list_number: 1,
                        list_options: vec![1],
                        list_assigned: vec![1],
                        remainder_votes: Fraction::new(900, 15),
                        drawing_lots: None,
                    })
                );
                assert_eq!(
                    result.steps[1].change,
                    SeatChange::LargestRemainderAssignment(LargestRemainderAssignedSeat {
                        selected_list_number: 6,
                        list_options: vec![2, 3, 4, 5, 6],
                        list_assigned: vec![6],
                        remainder_votes: Fraction::new(0, 15),
                        drawing_lots: Some(ListDrawingLotsVariant::LargestRemainderResidualSeat(
                            LargestRemainderResidualSeatDrawingLots {
                                max_remainder: Fraction::new(0, 1),
                                residual_seat_numbers: vec![2],
                                options: vec![2, 3, 4, 5, 6],
                                list_remainders: vec![
                                    (1, Fraction::new(60, 1)),
                                    (2, Fraction::new(0, 1)),
                                    (3, Fraction::new(0, 1)),
                                    (4, Fraction::new(0, 1)),
                                    (5, Fraction::new(0, 1)),
                                    (6, Fraction::new(0, 1)),
                                    (7, Fraction::new(55, 1)),
                                    (8, Fraction::new(45, 1)),
                                ]
                            }
                        )),
                    })
                );
            }

            /// Apportionment with residual seats assigned with largest remainders method
            ///
            /// Full seats: [6, 1, 1, 1, 1, 1] - Remainder seats: 4  
            /// Remainders: [20, 60, 60, 60, 60, 60]  
            /// 1 - Drawing of lots is required for lists: [2, 3, 4, 5, 6], only 4 seats available
            /// 2 - Drawing of lots is required for lists: [2, 3, 5, 6], only 3 seats available
            #[test]
            fn test_with_drawing_of_lots_required() {
                let mut input = seat_assignment_fixture_with_default_50_candidates(
                    15,
                    vec![500, 140, 140, 140, 140, 140],
                );
                let Ok(SeatAssignment::DrawingLotsRequired(variant, preliminary_result)) =
                    seat_assignment(&input)
                else {
                    panic!("should be DrawingLotsRequired");
                };
                assert_eq!(
                    variant,
                    ListDrawingLotsVariant::LargestRemainderResidualSeat(
                        LargestRemainderResidualSeatDrawingLots {
                            max_remainder: Fraction::new(420, 7),
                            residual_seat_numbers: vec![1, 2, 3, 4],
                            options: vec![2, 3, 4, 5, 6],
                            list_remainders: vec![
                                (1, Fraction::new(500, 25)),
                                (2, Fraction::new(420, 7)),
                                (3, Fraction::new(420, 7)),
                                (4, Fraction::new(420, 7)),
                                (5, Fraction::new(420, 7)),
                                (6, Fraction::new(420, 7)),
                            ],
                        }
                    )
                );
                assert_eq!(preliminary_result.seats, 15);
                assert_eq!(preliminary_result.full_seats, 11);
                assert_eq!(preliminary_result.residual_seats, 4);
                assert_eq!(
                    preliminary_result.quota,
                    Fraction {
                        numerator: 80,
                        denominator: 1
                    }
                );
                assert_eq!(preliminary_result.steps.len(), 0);
                assert_eq!(
                    get_standings_residual_seats(&preliminary_result),
                    vec![0, 0, 0, 0, 0, 0]
                );

                // Drawing lots results in list 4
                input.lists_drawn.push(ListDrawnMock { variant, drawn: 4 });
                let Ok(SeatAssignment::DrawingLotsRequired(variant, preliminary_result)) =
                    seat_assignment(&input)
                else {
                    panic!("should be DrawingLotsRequired");
                };
                assert_eq!(
                    variant,
                    ListDrawingLotsVariant::LargestRemainderResidualSeat(
                        LargestRemainderResidualSeatDrawingLots {
                            max_remainder: Fraction::new(420, 7),
                            residual_seat_numbers: vec![2, 3, 4],
                            options: vec![2, 3, 5, 6],
                            list_remainders: vec![
                                (1, Fraction::new(500, 25)),
                                (2, Fraction::new(420, 7)),
                                (3, Fraction::new(420, 7)),
                                (4, Fraction::new(420, 7)),
                                (5, Fraction::new(420, 7)),
                                (6, Fraction::new(420, 7)),
                            ],
                        }
                    ),
                );
                assert_eq!(preliminary_result.seats, 15);
                assert_eq!(preliminary_result.full_seats, 11);
                assert_eq!(preliminary_result.residual_seats, 4);
                assert_eq!(
                    preliminary_result.quota,
                    Fraction {
                        numerator: 80,
                        denominator: 1
                    }
                );
                assert_eq!(preliminary_result.steps.len(), 1);
                assert_eq!(
                    get_standings_residual_seats(&preliminary_result),
                    vec![0, 0, 0, 1, 0, 0]
                );
            }
        }

        mod list_exhaustion {
            use std::collections::{HashMap, HashSet};

            use test_log::test;

            use super::get_total_seats_from_apportionment_result;
            use crate::{
                ApportionmentWarning,
                seat_assignment::{SeatAssignment, seat_assignment},
                test_helpers::seat_assignment_fixture_with_given_candidate_votes,
            };

            /// Apportionment with no residual seats
            ///
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 4, 3, 2, 1] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// Remainders: [0/15, 0/15, 0/15, 0/15, 0/15]  
            /// 2 - largest remainder: seat assigned to list 5
            #[test]
            fn test_with_list_exhaustion_during_full_seats_assignment() {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    15,
                    vec![
                        vec![500, 500, 500, 500],
                        vec![400, 400, 400, 400],
                        vec![400, 400, 400],
                        vec![400, 400],
                        vec![200, 200],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 14);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 2);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[0].change.list_number_retracted(), 1);
                assert_eq!(result.steps[1].change.list_number_assigned(), 5);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![4, 4, 3, 2, 2]);
                assert!(result.warnings().is_empty());
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
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    17,
                    vec![
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
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 11);
                assert_eq!(result.residual_seats, 6);
                assert_eq!(result.steps.len(), 8);
                assert_eq!(result.steps[0].change.list_number_assigned(), 3);
                assert_eq!(result.steps[1].change.list_number_assigned(), 11);
                assert_eq!(result.steps[2].change.list_number_assigned(), 9);
                assert_eq!(result.steps[3].change.list_number_assigned(), 10);
                assert_eq!(result.steps[4].change.list_number_assigned(), 1);
                assert_eq!(result.steps[5].change.list_number_assigned(), 4);
                assert!(
                    result.steps[6]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[6].change.list_number_retracted(), 10);
                assert_eq!(result.steps[7].change.list_number_assigned(), 6);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![3, 1, 2, 2, 1, 2, 1, 0, 3, 1, 1]);
                assert!(result.warnings().is_empty());
            }

            /// Apportionment with residual seats assigned with largest remainders and highest averages methods
            ///
            /// Full seats: [0, 0, 0, 0, 0, 7] - Remainder seats: 3  
            /// Remainders: [0/10, 3, 5, 6, 7, 9], only votes of list 6 meet the threshold of 75% of the quota  
            ///  1 - largest remainder: seat assigned to list 6  
            /// 1st round of highest averages method (assignment to unique lists):  
            ///  2 - highest average: [0/1, 3, 5, 6, 7, 8 7/8] seat assigned to list 6  
            ///  3 - highest average: [0/1, 3, 5, 6, 7, 7 9/10] seat assigned to list 5  
            ///  4 - Seat first assigned to list 6 has been removed and
            ///      will be assigned to another list in accordance with Article P 10 Kieswet  
            ///  5 - highest average: [0/1, 3, 5, 6, 3 1/2, 7 9/10] seat assigned to list 4
            #[test]
            fn test_with_list_exhaustion_during_residual_seats_assignment_with_unique_highest_averages_method()
             {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    10,
                    vec![
                        vec![0],
                        vec![3],
                        vec![5],
                        vec![6],
                        vec![7],
                        vec![10, 10, 10, 10, 10, 10, 10, 9],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 7);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 5);
                assert_eq!(result.steps[0].change.list_number_assigned(), 6);
                assert_eq!(result.steps[1].change.list_number_assigned(), 6);
                assert_eq!(result.steps[2].change.list_number_assigned(), 5);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.list_number_retracted(), 6);
                assert_eq!(result.steps[4].change.list_number_assigned(), 4);
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
            /// 1st round of highest averages method (assignment to unique lists):  
            ///  6 - highest average: [5, 5, 7 1/7] seat assigned to list 1  
            ///  7 - highest average: [2 1/2, 5, 7 1/7] seat assigned to list 2  
            /// 2nd round of highest averages method (assignment to any list):  
            ///  8 - highest average: [2 1/2, 2 1/2, 7 1/7] seat assigned to list 1  
            ///  9 - highest average: [1 2/3, 2 1/2, 7 1/7] seat assigned to list 2
            #[test]
            fn test_with_list_exhaustion_triggering_2nd_round_highest_average_assignment_with_same_averages()
             {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    6,
                    vec![vec![3, 2], vec![3, 2], vec![25, 25]],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 2);
                assert_eq!(result.residual_seats, 4);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(result.steps[0].change.list_number_assigned(), 3);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 3);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[2].change.list_number_retracted(), 3);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.list_number_retracted(), 3);
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[4].change.list_number_retracted(), 3);
                assert_eq!(result.steps[5].change.list_number_assigned(), 1);
                assert_eq!(result.steps[6].change.list_number_assigned(), 2);
                assert_eq!(result.steps[7].change.list_number_assigned(), 1);
                assert_eq!(result.steps[8].change.list_number_assigned(), 2);
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
            /// 1st round of highest averages method (assignment to unique lists):  
            ///  6 - highest average: [6, 4, 7 1/7] seat assigned to list 1  
            ///  7 - highest average: [3, 4, 7 1/7] seat assigned to list 2  
            /// 2nd round of highest averages method (assignment to any list):  
            ///  8 - highest average: [3, 2, 7 1/7] seat assigned to list 1  
            ///  9 - highest average: [2, 2, 7 1/7] seat assigned to list 2
            #[test]
            fn test_with_list_exhaustion_triggering_2nd_round_highest_average_assignment_with_different_averages()
             {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    6,
                    vec![vec![3, 3], vec![2, 2], vec![25, 25]],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 2);
                assert_eq!(result.residual_seats, 4);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(result.steps[0].change.list_number_assigned(), 3);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 3);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[2].change.list_number_retracted(), 3);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.list_number_retracted(), 3);
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[4].change.list_number_retracted(), 3);
                assert_eq!(result.steps[5].change.list_number_assigned(), 1);
                assert_eq!(result.steps[6].change.list_number_assigned(), 2);
                assert_eq!(result.steps[7].change.list_number_assigned(), 1);
                assert_eq!(result.steps[8].change.list_number_assigned(), 2);
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
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    15,
                    vec![
                        vec![2571, 0, 0, 0, 0, 0, 0],
                        vec![977, 0, 0, 0],
                        vec![567, 0],
                        vec![536, 0],
                        vec![453, 0],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 12);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 6);
                assert_eq!(result.steps[0].change.list_number_assigned(), 2);
                assert_eq!(result.steps[1].change.list_number_assigned(), 3);
                assert_eq!(result.steps[2].change.list_number_assigned(), 4);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(result.steps[3].change.list_number_retracted(), 4);
                assert_eq!(result.steps[3].change.list_number_assigned(), 1);
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[4].change.list_number_retracted(), 1);
                assert_eq!(result.steps[5].change.list_number_assigned(), 4);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![7, 3, 2, 2, 1]);
                assert_eq!(
                    result.warnings(),
                    vec![ApportionmentWarning::AbsoluteMajorityAndListExhaustion],
                );
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
            /// 1st round of highest averages method (assignment to unique lists):  
            /// 6 - highest average: [6 2/5, 8 1/5, 7] seat assigned to list 3
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_and_list_exhaustion_triggering_unique_highest_averages_assignment()
             {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    8,
                    vec![vec![32, 0, 0, 0, 0], vec![41, 0, 0], vec![7]],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 6);
                assert_eq!(result.residual_seats, 2);
                assert_eq!(result.steps.len(), 6);
                assert_eq!(result.steps[0].change.list_number_assigned(), 1);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 1);
                assert_eq!(result.steps[1].change.list_number_assigned(), 2);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[2].change.list_number_retracted(), 2);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.list_number_retracted(), 2);
                assert_eq!(result.steps[4].change.list_number_assigned(), 1);
                assert_eq!(result.steps[5].change.list_number_assigned(), 3);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, [4, 3, 1]);
                assert_eq!(
                    result.warnings(),
                    vec![ApportionmentWarning::AbsoluteMajorityAndListExhaustion],
                );
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
            /// 1st round of highest averages method (assignment to unique lists):  
            /// 7 - highest average: [107 2/5, 10, 85 1/5] seat assigned to list 3  
            /// 8 - highest average: [107 2/5, 10, 71] seat assigned to list 2
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_and_list_exhaustion_triggering_multiple_unique_highest_averages_assignment()
             {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    8,
                    vec![vec![537, 0], vec![10], vec![426, 0, 0, 0, 0, 0]],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 5);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 8);
                assert_eq!(result.steps[0].change.list_number_assigned(), 3);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 3);
                assert_eq!(result.steps[1].change.list_number_assigned(), 1);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[2].change.list_number_retracted(), 1);
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[3].change.list_number_retracted(), 1);
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[4].change.list_number_retracted(), 1);
                assert_eq!(result.steps[5].change.list_number_assigned(), 3);
                assert_eq!(result.steps[6].change.list_number_assigned(), 3);
                assert_eq!(result.steps[7].change.list_number_assigned(), 2);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, [2, 1, 5]);
                assert_eq!(
                    result.warnings(),
                    vec![ApportionmentWarning::AbsoluteMajorityAndListExhaustion],
                );
            }

            /// Apportionment with no residual seats  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 4, 3, 2, 1] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 2 - No eligible list remains: the freed seat is left unassigned
            #[test]
            fn test_with_all_lists_exhausted_leaves_seat_empty() {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    15,
                    vec![
                        vec![500, 500, 500, 500],
                        vec![400, 400, 400, 400],
                        vec![400, 400, 400],
                        vec![400, 400],
                        vec![400],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.seats, 15);
                assert_eq!(result.full_seats, 14);
                assert_eq!(result.residual_seats, 0);
                assert_eq!(result.steps.len(), 1);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[0].change.list_number_retracted(), 1);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![4, 4, 3, 2, 1]);
                assert_eq!(
                    result.warnings(),
                    vec![ApportionmentWarning::NotAllSeatsAssigned],
                );
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
            /// 4 - All lists are exhausted, seat is left unassigned
            #[test]
            fn test_with_2_exhausted_lists_leaves_seat_unassigned() {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    15,
                    vec![
                        vec![500, 500, 500, 500],
                        vec![500, 500, 500, 500],
                        vec![400, 400, 400],
                        vec![400, 0],
                        vec![400],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.seats, 15);
                assert_eq!(result.full_seats, 13);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 3);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[0].change.list_number_retracted(), 1);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 2);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_largest_remainder_assignment()
                );
                assert_eq!(result.steps[2].change.list_number_assigned(), 4);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![4, 4, 3, 2, 1]);
                assert_eq!(
                    result.warnings(),
                    vec![ApportionmentWarning::NotAllSeatsAssigned],
                );
            }

            /// Apportionment where deceased candidates cause a list to be exhausted.
            ///
            /// 15 seats, quota = 1500 / 15 = 100.  
            /// Votes: list 1 = 610, list 2 = 520, list 3 = 370.  
            /// Full seats: [6, 5, 3] - Remainder seats: 1  
            /// Remainders: [10, 20, 70], all lists meet the 3/4 quota threshold.
            ///
            /// 1 - largest remainder: seat assigned to list 3 (remainder 70).  
            /// Initial distribution: [6, 5, 4].
            ///
            /// Marking candidate 6 of list 1 as deceased leaves 5 alive for 6 assigned
            /// seats, triggering article P 10:  
            /// 2 - list 1 has one seat retracted (was a full seat, since list 1 has no
            ///     residual seats).  
            /// 3 - largest remainder reassigns to list 2 (list 3 already got a LR
            ///     seat in step 1, so it no longer qualifies).
            ///
            /// Final distribution: [5, 6, 4].
            #[test]
            fn test_with_list_exhaustion_due_to_deceased_candidates() {
                let mut input = seat_assignment_fixture_with_given_candidate_votes(
                    15,
                    vec![
                        vec![610, 0, 0, 0, 0, 0],
                        vec![520, 0, 0, 0, 0, 0, 0],
                        vec![370, 0, 0, 0, 0],
                    ],
                );
                input.deceased_candidates = HashMap::from([(1, HashSet::from([6]))]);

                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 13);
                assert_eq!(result.residual_seats, 2);
                assert_eq!(result.steps.len(), 3);
                assert_eq!(result.steps[0].change.list_number_assigned(), 3);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 1);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_largest_remainder_assignment()
                );
                assert_eq!(result.steps[2].change.list_number_assigned(), 2);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![5, 6, 4]);
            }
        }
    }

    /// Tests apportionment for councils with 19 or more seats
    mod gte_19_seats {
        use test_log::test;

        use super::check_total_seats_per_list;
        use crate::{
            seat_assignment::{SeatAssignment, seat_assignment},
            test_helpers::{
                get_total_seats_from_apportionment_result,
                seat_assignment_fixture_with_default_50_candidates,
                seat_assignment_fixture_with_given_list_numbers_and_candidate_votes,
            },
        };

        /// Apportionment without remainder seats
        ///
        /// Full seats: [12, 6, 2, 2, 2, 1] - Remainder seats: 0
        #[test]
        fn test_without_remainder_seats() {
            let input = seat_assignment_fixture_with_default_50_candidates(
                25,
                vec![576, 288, 96, 96, 96, 48],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 25);
            assert_eq!(result.residual_seats, 0);
            assert_eq!(result.steps.len(), 0);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![12, 6, 2, 2, 2, 1]);
        }

        /// Apportionment with non-consecutive list numbers
        ///
        /// Full seats: [11, 5, 1, 1, 1] - Remainder seats: 4  
        /// 1 - highest average: [50, 50 2/6, 49, 49 1/2, 50 1/2] seat assigned to list 7  
        /// 2 - highest average: [50, 50 2/6, 49, 49 1/2, 33 2/3] seat assigned to list 3  
        /// 3 - highest average: [50, 43 1/7, 49, 49 1/2, 33 2/3] seat assigned to list 1  
        /// 4 - highest average: [46 2/13, 43 1/7, 49, 49 1/2, 33 2/3] seat assigned to list 6
        #[test]
        fn test_with_non_consecutive_list_numbers() {
            let input = seat_assignment_fixture_with_given_list_numbers_and_candidate_votes(
                23,
                vec![
                    (1, vec![50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]),
                    (3, vec![52, 50, 50, 50, 50, 50]),
                    (4, vec![98]),
                    (6, vec![50, 49]),
                    (7, vec![51, 50]),
                ],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 19);
            assert_eq!(result.residual_seats, 4);
            assert_eq!(result.steps.len(), 4);
            assert_eq!(result.steps[0].change.list_number_assigned(), 7);
            assert_eq!(result.steps[1].change.list_number_assigned(), 3);
            assert_eq!(result.steps[2].change.list_number_assigned(), 1);
            assert_eq!(result.steps[3].change.list_number_assigned(), 6);
            check_total_seats_per_list(&result, &[(1, 12), (3, 6), (4, 1), (6, 2), (7, 2)]);
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
            let input =
                seat_assignment_fixture_with_default_50_candidates(23, vec![600, 302, 98, 99, 101]);
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 19);
            assert_eq!(result.residual_seats, 4);
            assert_eq!(result.steps.len(), 4);
            assert_eq!(result.steps[0].change.list_number_assigned(), 5);
            assert_eq!(result.steps[1].change.list_number_assigned(), 2);
            assert_eq!(result.steps[2].change.list_number_assigned(), 1);
            assert_eq!(result.steps[3].change.list_number_assigned(), 4);
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
            let input = seat_assignment_fixture_with_default_50_candidates(
                19,
                vec![808, 57, 56, 55, 54, 53, 52, 51, 14],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 7);
            assert_eq!(result.steps.len(), 7);
            assert_eq!(result.steps[0].change.list_number_assigned(), 1);
            assert_eq!(result.steps[1].change.list_number_assigned(), 1);
            assert_eq!(result.steps[2].change.list_number_assigned(), 2);
            assert_eq!(result.steps[3].change.list_number_assigned(), 3);
            assert_eq!(result.steps[4].change.list_number_assigned(), 4);
            assert_eq!(result.steps[5].change.list_number_assigned(), 5);
            assert_eq!(result.steps[6].change.list_number_assigned(), 1);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![15, 1, 1, 1, 1, 0, 0, 0, 0]);
        }

        /// Apportionment with 0 votes on candidates
        ///
        /// No votes on candidates cast, all seats are left unassigned
        #[test]
        fn test_with_0_votes() {
            let input = seat_assignment_fixture_with_default_50_candidates(19, vec![0]);
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.seats, 19);
            assert_eq!(result.full_seats, 0);
            assert_eq!(result.residual_seats, 0);
            assert_eq!(result.steps.len(), 0);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![0]);
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
            let input = seat_assignment_fixture_with_default_50_candidates(
                24,
                vec![7501, 1249, 1249, 1249, 1249, 1249, 1248, 7],
            );
            let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                panic!("should be Completed");
            };

            assert_eq!(result.full_seats, 18);
            assert_eq!(result.residual_seats, 6);
            assert_eq!(result.steps.len(), 7);
            assert_eq!(result.steps[0].change.list_number_assigned(), 2);
            assert_eq!(result.steps[1].change.list_number_assigned(), 3);
            assert_eq!(result.steps[2].change.list_number_assigned(), 4);
            assert_eq!(result.steps[3].change.list_number_assigned(), 5);
            assert_eq!(result.steps[4].change.list_number_assigned(), 6);
            assert_eq!(result.steps[5].change.list_number_assigned(), 7);
            assert!(
                result.steps[6]
                    .change
                    .is_changed_by_absolute_majority_reassignment()
            );
            assert_eq!(result.steps[6].change.list_number_retracted(), 7);
            assert_eq!(result.steps[6].change.list_number_assigned(), 1);
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![13, 2, 2, 2, 2, 2, 1, 0]);
            assert!(result.warnings().is_empty());
        }

        mod drawing_of_lots {
            use test_log::test;

            use crate::{
                Fraction, HighestAverageAssignedSeat, SeatChange,
                seat_assignment::{
                    AbsoluteMajorityReassignedSeat, SeatAssignment, seat_assignment,
                },
                structs::{
                    AbsoluteMajorityDrawingLots, HighestAverageResidualSeatDrawingLots,
                    ListDrawingLotsVariant,
                },
                test_helpers::{
                    ListDrawnMock, get_standings_residual_seats,
                    get_total_seats_from_apportionment_result,
                    seat_assignment_fixture_with_default_50_candidates,
                },
            };

            /// Apportionment with residual seats assigned with highest averages method
            ///
            /// This test triggers Kieswet Article P 9
            ///
            /// Full seats: [12, 1, 1, 1, 1, 1, 1, 0] - Remainder seats: 6  
            /// 1 - highest average: [577, 624 1/2, 624 1/2, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 2  
            /// 2 - highest average: [577, 416 1/3, 624 1/2, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 3  
            /// 3 - highest average: [577, 416 1/3, 416 1/3, 624 1/2, 624 1/2, 624, 624, 8] seat assigned to list 4  
            /// 4 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 624 1/2, 624, 624, 8] seat assigned to list 5  
            /// 5 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 624, 624, 8] seat assigned to list 6  
            /// 6 - highest average: [577, 416 1/3, 416 1/3, 416 1/3, 416 1/3, 416, 624, 8] seat assigned to list 7  
            /// 7 - Drawing of lots is required for lists: [6, 7] to pick a list which the residual seat gets retracted from
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_with_drawing_of_lots_error() {
                let mut input = seat_assignment_fixture_with_default_50_candidates(
                    24,
                    vec![7501, 1249, 1249, 1249, 1249, 1248, 1248, 8],
                );
                let Ok(SeatAssignment::DrawingLotsRequired(variant, preliminary_result)) =
                    seat_assignment(&input)
                else {
                    panic!("should be DrawingLotsRequired");
                };
                assert_eq!(
                    variant,
                    ListDrawingLotsVariant::AbsoluteMajorityHighestAverage(
                        AbsoluteMajorityDrawingLots {
                            assign_to: 1,
                            options: vec![6, 7],
                        }
                    )
                );
                assert_eq!(preliminary_result.seats, 24);
                assert_eq!(preliminary_result.full_seats, 18);
                assert_eq!(preliminary_result.residual_seats, 6);
                assert_eq!(preliminary_result.quota, Fraction::new(15001, 24));
                assert_eq!(preliminary_result.steps.len(), 6);
                assert_eq!(
                    get_standings_residual_seats(&preliminary_result),
                    vec![0, 1, 1, 1, 1, 1, 1, 0]
                );

                // Draw lot 6
                input.lists_drawn.push(ListDrawnMock {
                    variant: variant.clone(),
                    drawn: 6,
                });
                let Ok(SeatAssignment::Completed(result)) = seat_assignment(&input) else {
                    panic!("should be Completed");
                };

                assert_eq!(
                    get_standings_residual_seats(&result),
                    vec![1, 1, 1, 1, 1, 0, 1, 0]
                );

                assert_eq!(result.seats, 24);
                assert_eq!(result.full_seats, 18);
                assert_eq!(result.residual_seats, 6);
                assert_eq!(result.quota, Fraction::new(15001, 24));

                assert_eq!(result.steps.len(), 7);
                assert_eq!(
                    result.steps[6].change,
                    SeatChange::AbsoluteMajorityReassignment(AbsoluteMajorityReassignedSeat {
                        list_retracted_seat: 6,
                        list_assigned_seat: 1,
                        drawing_lots: Some(variant),
                    })
                );
            }

            /// Apportionment with residual seats assigned with highest averages method
            ///
            /// Full seats: [9, 2, 2, 2, 2, 2] - Remainder seats: 4  
            /// 1 - highest average: [50, 46 2/3, 46 2/3, 46 2/3, 46 2/3, 46 2/3] seat assigned to list 1  
            /// 2 - Drawing of lots is required for lists: [2, 3, 4, 5, 6], only 3 seats available
            /// 3 - Drawing of lots is required for lists: [2, 3, 5, 6], only 2 seats available
            #[test]
            fn test_with_drawing_of_lots_required() {
                let mut input = seat_assignment_fixture_with_default_50_candidates(
                    23,
                    vec![500, 140, 140, 140, 140, 140],
                );
                let Ok(SeatAssignment::DrawingLotsRequired(variant, preliminary_result)) =
                    seat_assignment(&input)
                else {
                    panic!("should be DrawingLotsRequired");
                };
                assert_eq!(
                    variant,
                    ListDrawingLotsVariant::HighestAverageResidualSeat(
                        HighestAverageResidualSeatDrawingLots {
                            max_average: Fraction::new(140, 3),
                            residual_seat_numbers: vec![2, 3, 4],
                            options: vec![2, 3, 4, 5, 6],
                            list_averages: vec![
                                (1, Fraction::new(500, 11)),
                                (2, Fraction::new(140, 3)),
                                (3, Fraction::new(140, 3)),
                                (4, Fraction::new(140, 3)),
                                (5, Fraction::new(140, 3)),
                                (6, Fraction::new(140, 3)),
                            ]
                        }
                    )
                );
                assert_eq!(preliminary_result.seats, 23);
                assert_eq!(preliminary_result.full_seats, 19);
                assert_eq!(preliminary_result.residual_seats, 4);
                assert_eq!(
                    preliminary_result.quota,
                    Fraction {
                        numerator: 1200,
                        denominator: 23
                    }
                );
                assert_eq!(preliminary_result.steps.len(), 1);
                assert_eq!(
                    get_standings_residual_seats(&preliminary_result),
                    vec![1, 0, 0, 0, 0, 0]
                );

                // Drawing lots results in list 4
                input.lists_drawn.push(ListDrawnMock { variant, drawn: 4 });

                let Ok(SeatAssignment::DrawingLotsRequired(variant, preliminary_result)) =
                    seat_assignment(&input)
                else {
                    panic!("should be DrawingLotsRequired");
                };
                assert_eq!(
                    variant,
                    ListDrawingLotsVariant::HighestAverageResidualSeat(
                        HighestAverageResidualSeatDrawingLots {
                            max_average: Fraction::new(140, 3),
                            residual_seat_numbers: vec![3, 4],
                            options: vec![2, 3, 5, 6],
                            list_averages: vec![
                                (1, Fraction::new(500, 11)),
                                (2, Fraction::new(140, 3)),
                                (3, Fraction::new(140, 3)),
                                (4, Fraction::new(140, 4)),
                                (5, Fraction::new(140, 3)),
                                (6, Fraction::new(140, 3)),
                            ]
                        }
                    )
                );
                assert_eq!(preliminary_result.seats, 23);
                assert_eq!(preliminary_result.full_seats, 19);
                assert_eq!(preliminary_result.residual_seats, 4);
                assert_eq!(
                    preliminary_result.quota,
                    Fraction {
                        numerator: 1200,
                        denominator: 23
                    }
                );
                assert_eq!(preliminary_result.steps.len(), 2);
                assert_eq!(
                    get_standings_residual_seats(&preliminary_result),
                    vec![1, 0, 0, 1, 0, 0]
                );
            }

            /// Apportionment with residual seats assigned with highest averages method
            ///
            /// Full seats: [13, 3, 3, 3] - Remainder seats: 2
            /// 1 - highest average: [35 5/7, 35, 35, 35] seat assigned to list 1
            /// 2 - Drawing of lots is required for lists: [2, 3, 4], only 1 seat available
            #[test]
            fn test_with_drawing_of_lots_one_list_drawn() {
                let mut input = seat_assignment_fixture_with_default_50_candidates(
                    24,
                    vec![500, 140, 140, 140],
                );

                let Ok(SeatAssignment::DrawingLotsRequired(variant, preliminary_result)) =
                    seat_assignment(&input)
                else {
                    panic!("should be DrawingLotsRequired");
                };
                assert_eq!(
                    variant,
                    ListDrawingLotsVariant::HighestAverageResidualSeat(
                        HighestAverageResidualSeatDrawingLots {
                            max_average: Fraction::new(140, 4),
                            residual_seat_numbers: vec![2],
                            options: vec![2, 3, 4],
                            list_averages: vec![
                                (1, Fraction::new(500, 15)),
                                (2, Fraction::new(140, 4)),
                                (3, Fraction::new(140, 4)),
                                (4, Fraction::new(140, 4)),
                            ]
                        },
                    )
                );
                assert_eq!(preliminary_result.seats, 24);
                assert_eq!(preliminary_result.full_seats, 22);
                assert_eq!(preliminary_result.residual_seats, 2);
                assert_eq!(
                    preliminary_result.quota,
                    Fraction {
                        numerator: 920,
                        denominator: 24
                    }
                );
                assert_eq!(preliminary_result.steps.len(), 1);
                assert_eq!(
                    get_standings_residual_seats(&preliminary_result),
                    vec![1, 0, 0, 0]
                );

                // List 3 is drawn, add it to the input's lists_drawn and process again
                input.lists_drawn.push(ListDrawnMock { variant, drawn: 3 });
                let Ok(SeatAssignment::Completed(result)) = seat_assignment(&input) else {
                    panic!("should be Completed");
                };

                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![14, 3, 4, 3]);

                assert_eq!(result.steps.len(), 2);
                assert_eq!(
                    result.steps[0].change,
                    SeatChange::HighestAverageAssignment(HighestAverageAssignedSeat {
                        selected_list_number: 1,
                        list_options: vec![1],
                        list_assigned: vec![1],
                        list_exhausted: vec![],
                        votes_per_seat: Fraction::new(500, 14),
                        drawing_lots: None,
                    })
                );
                assert_eq!(
                    result.steps[1].change,
                    SeatChange::HighestAverageAssignment(HighestAverageAssignedSeat {
                        selected_list_number: 3,
                        list_options: vec![2, 3, 4],
                        list_assigned: vec![3],
                        list_exhausted: vec![],
                        votes_per_seat: Fraction::new(140, 4),
                        drawing_lots: Some(ListDrawingLotsVariant::HighestAverageResidualSeat(
                            HighestAverageResidualSeatDrawingLots {
                                max_average: Fraction::new(35, 1),
                                residual_seat_numbers: vec![2],
                                options: vec![2, 3, 4],
                                list_averages: vec![
                                    (1, Fraction::new(500, 15)),
                                    (2, Fraction::new(140, 4)),
                                    (3, Fraction::new(140, 4)),
                                    (4, Fraction::new(140, 4)),
                                ]
                            }
                        )),
                    })
                );
            }
        }

        mod list_exhaustion {
            use std::collections::{HashMap, HashSet};

            use test_log::test;

            use super::get_total_seats_from_apportionment_result;
            use crate::{
                ApportionmentWarning,
                seat_assignment::{SeatAssignment, seat_assignment},
                test_helpers::seat_assignment_fixture_with_given_candidate_votes,
            };

            /// Apportionment with no residual seats
            ///
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 5, 4, 4, 2] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 2 - highest average: [333 2/6, 333 2/6, 320, 320, 266 2/3] seat assigned to list 5
            #[test]
            fn test_with_list_exhaustion_during_full_seats_assignment() {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    20,
                    vec![
                        vec![500, 500, 500, 500],
                        vec![400, 400, 400, 400, 400],
                        vec![400, 400, 400, 400],
                        vec![400, 400, 400, 400],
                        vec![400, 400, 0],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 19);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 2);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[0].change.list_number_retracted(), 1);
                assert_eq!(result.steps[1].change.list_number_assigned(), 5);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![4, 5, 4, 4, 3]);
                assert!(result.warnings().is_empty());
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
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    19,
                    vec![
                        vec![400, 400, 400, 399, 0],
                        vec![400, 400, 400, 398, 0],
                        vec![400, 400, 400, 398, 0],
                        vec![400, 400, 400, 398, 0],
                        vec![502, 502],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 18);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 3);
                assert_eq!(result.steps[0].change.list_number_assigned(), 5);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 5);
                assert_eq!(result.steps[2].change.list_number_assigned(), 1);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![5, 4, 4, 4, 2]);
                assert!(result.warnings().is_empty());
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
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    24,
                    vec![
                        vec![7501, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        vec![1249, 0],
                        vec![1249, 0],
                        vec![1249, 0],
                        vec![1249, 0],
                        vec![1249, 0],
                        vec![1248, 0],
                        vec![7],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.full_seats, 18);
                assert_eq!(result.residual_seats, 6);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(result.steps[0].change.list_number_assigned(), 2);
                assert_eq!(result.steps[1].change.list_number_assigned(), 3);
                assert_eq!(result.steps[2].change.list_number_assigned(), 4);
                assert_eq!(result.steps[3].change.list_number_assigned(), 5);
                assert_eq!(result.steps[4].change.list_number_assigned(), 6);
                assert_eq!(result.steps[5].change.list_number_assigned(), 7);
                assert!(
                    result.steps[6]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(result.steps[6].change.list_number_retracted(), 7);
                assert_eq!(result.steps[6].change.list_number_assigned(), 1);
                assert!(
                    result.steps[7]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[7].change.list_number_retracted(), 1);
                assert_eq!(result.steps[8].change.list_number_assigned(), 7);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![12, 2, 2, 2, 2, 2, 2, 0]);
                assert_eq!(
                    result.warnings(),
                    vec![ApportionmentWarning::AbsoluteMajorityAndListExhaustion],
                );
            }

            /// Apportionment with no residual seats  
            /// This test triggers Kieswet Article P 10
            ///
            /// Full seats: [5, 5, 4, 4, 2] - Remainder seats: 0  
            /// 1 - Seat first assigned to list 1 has been removed and
            ///     will be assigned to another list in accordance with Article P 10 Kieswet  
            /// 2 - All lists are exhausted, seat is left unassigned
            #[test]
            fn test_with_all_lists_exhausted_leaves_seat_unassigned() {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    20,
                    vec![
                        vec![500, 500, 500, 500],
                        vec![400, 400, 400, 400, 400],
                        vec![400, 400, 400, 400],
                        vec![400, 400, 400, 400],
                        vec![400, 400],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.seats, 20);
                assert_eq!(result.full_seats, 19);
                assert_eq!(result.residual_seats, 0);
                assert_eq!(result.steps.len(), 1);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[0].change.list_number_retracted(), 1);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![4, 5, 4, 4, 2]);
                assert_eq!(
                    result.warnings(),
                    vec![ApportionmentWarning::NotAllSeatsAssigned],
                );
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
            /// 4 - All lists are exhausted, seat is left unassigned
            #[test]
            fn test_with_2_exhausted_lists_leaves_seat_unassigned() {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    20,
                    vec![
                        vec![500, 500, 500, 500],
                        vec![500, 500, 500, 500],
                        vec![400, 400, 400, 400],
                        vec![400, 400, 400, 400],
                        vec![400, 400, 0],
                    ],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.seats, 20);
                assert_eq!(result.full_seats, 18);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 3);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[0].change.list_number_retracted(), 1);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 2);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_highest_average_assignment()
                );
                assert_eq!(result.steps[2].change.list_number_assigned(), 5);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![4, 4, 4, 4, 3]);
            }

            /// Apportionment with lists with zero votes that should not be assigned seats
            ///
            /// Full seats: [5, 0, 0, 0, 0] - Remainder seats: 0
            /// * 1-5 - Seat first assigned to list 1 has been removed and
            ///         will be assigned to another list in accordance with Article P 10 Kieswet
            /// * 6   - All lists are exhausted, seat is left unassigned
            #[test]
            fn test_lists_with_zero_vote_not_assigned_seats() {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    10,
                    vec![vec![500, 0, 0, 0, 0], vec![0], vec![0], vec![0], vec![0]],
                );
                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.seats, 10);
                assert_eq!(result.full_seats, 5);
                assert_eq!(result.residual_seats, 0);
                assert_eq!(result.steps.len(), 5);
                for step in &result.steps {
                    assert!(step.change.is_changed_by_list_exhaustion_removal());
                    assert_eq!(step.change.list_number_retracted(), 1);
                }
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![5, 0, 0, 0, 0]);
            }

            /// Apportionment where deceased candidates cause a list to be exhausted
            /// in a council with >=19 seats (residual assignment via highest averages).
            ///
            /// 20 seats, quota = 2000 / 20 = 100.  
            /// Votes: list 1 = 810, list 2 = 620, list 3 = 570.  
            /// Full seats: [8, 6, 5] - Remainder seats: 1  
            /// Next averages: list 1 = 810/9 = 90, list 2 = 620/7 ≈ 88.57,
            /// list 3 = 570/6 = 95.
            ///
            /// 1 - highest average: seat assigned to list 3 (95).  
            /// Initial distribution: [8, 6, 6].
            ///
            /// Marking candidate 8 of list 1 as deceased leaves 7 alive for 8 assigned
            /// seats, triggering article P 10:  
            /// 2 - list 1 has one seat retracted (was a full seat, since list 1 has no
            ///     residual seats).  
            /// 3 - highest average reassigns to list 2 (list 1 is exhausted; list 3's
            ///     next average is now 570/7 ≈ 81.43, list 2's is 620/7 ≈ 88.57).
            ///
            /// Final distribution: [7, 7, 6].
            #[test]
            fn test_with_list_exhaustion_due_to_deceased_candidates() {
                let mut input = seat_assignment_fixture_with_given_candidate_votes(
                    20,
                    vec![
                        vec![810, 0, 0, 0, 0, 0, 0, 0],
                        vec![620, 0, 0, 0, 0, 0, 0],
                        vec![570, 0, 0, 0, 0, 0, 0],
                    ],
                );
                input.deceased_candidates = HashMap::from([(1, HashSet::from([8]))]);

                let SeatAssignment::Completed(result) = seat_assignment(&input).unwrap() else {
                    panic!("should be Completed");
                };

                assert_eq!(result.steps.len(), 3);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_highest_average_assignment()
                );
                assert_eq!(result.steps[0].change.list_number_assigned(), 3);
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(result.steps[1].change.list_number_retracted(), 1);
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_highest_average_assignment()
                );
                assert_eq!(result.steps[2].change.list_number_assigned(), 2);
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![7, 7, 6]);
            }
        }
    }
}
