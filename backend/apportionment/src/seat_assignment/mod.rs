use std::cmp::Ordering;

mod residual_seat_assignment;
mod structs;
use tracing::info;

use self::{
    residual_seat_assignment::assign_remainder,
    structs::{
        AbsoluteMajorityReassignedSeat, ListExhaustionRemovedSeat, ListStanding, SeatChange,
        SeatChangeStep,
    },
};
use super::{
    ApportionmentInput, ListVotesTrait,
    fraction::Fraction,
    structs::{
        ApportionmentError, CandidateNominationInput, CandidateNominationInputType, ListNumber,
    },
};
pub use structs::SeatAssignmentResult;

/// Seat assignment
pub(crate) fn seat_assignment<T: ApportionmentInput>(
    input: &T,
) -> Result<SeatAssignmentResult, ApportionmentError> {
    info!("Seat assignment");
    info!("Seats: {}", input.number_of_seats());

    if input.total_votes() == 0 {
        info!("No votes on candidates cast");
        return Err(ApportionmentError::ZeroVotesCast);
    }

    // [Artikel P 5 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP5)
    // Calculate electoral quota (kiesdeler) as a proper fraction
    let quota = Fraction::from(input.total_votes()) / Fraction::from(input.number_of_seats());
    info!("Quota: {}", quota);

    // [Artikel P 6 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP6)
    let initial_standing: Vec<ListStanding> = input
        .list_votes()
        .iter()
        .map(|list| ListStanding::new(list, quota))
        .collect();

    let full_seats = initial_standing
        .iter()
        .map(|list| list.full_seats)
        .sum::<u32>();
    let residual_seats = input.number_of_seats() - full_seats;

    let (mut steps, current_standings) = if residual_seats > 0 {
        assign_remainder::<T::List>(
            &initial_standing,
            input.number_of_seats(),
            residual_seats,
            0,
            &[],
            None,
        )?
    } else {
        info!("All seats have been assigned without any residual seats");
        (vec![], initial_standing)
    };

    // [Artikel P 9 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP9)
    let (cumulative_standings, assigned_seat) = if let Some(last_step) = steps.last() {
        reassign_residual_seat_for_absolute_majority(
            input.number_of_seats(),
            input.total_votes(),
            input.list_votes(),
            &last_step.change.list_assigned(),
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

    // TODO: #797 [Artikel P 19a Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf3_ArtikelP19a)
    // mark deceased candidates

    // [Artikel P 10 Kieswet](https://wetten.overheid.nl/BWBR0004627/2026-01-01/#AfdelingII_HoofdstukP_Paragraaf2_ArtikelP10)
    let (final_steps, final_standing) = reassign_residual_seats_for_exhausted_lists(
        cumulative_standings,
        input.number_of_seats(),
        input.list_votes(),
        residual_seats,
        steps,
    )?;

    let final_full_seats = final_standing
        .iter()
        .map(|list| list.full_seats)
        .sum::<u32>();
    let final_residual_seats = input.number_of_seats() - final_full_seats;

    Ok(SeatAssignmentResult {
        seats: input.number_of_seats(),
        full_seats: final_full_seats,
        residual_seats: final_residual_seats,
        quota,
        steps: final_steps,
        final_standing: final_standing.into_iter().map(Into::into).collect(),
    })
}

pub fn get_total_seats_per_list_number_from_apportionment_result(
    result: &SeatAssignmentResult,
) -> Vec<(ListNumber, u32)> {
    result
        .final_standing
        .iter()
        .map(|p| (p.list_number, p.total_seats))
        .collect::<Vec<_>>()
}

pub fn as_candidate_nomination_input<'a, T: ApportionmentInput>(
    input: &'a T,
    seat_assignment: &SeatAssignmentResult,
) -> CandidateNominationInputType<'a, T> {
    CandidateNominationInput {
        number_of_seats: input.number_of_seats(),
        list_votes: input.list_votes(),
        quota: seat_assignment.quota,
        total_seats_per_list: get_total_seats_per_list_number_from_apportionment_result(
            seat_assignment,
        ),
    }
}

/// Create a vector containing just the list numbers from an iterator of the current standing
fn list_numbers(standing: &[&ListStanding]) -> Vec<ListNumber> {
    standing.iter().map(|s| s.list_number).collect()
}

fn get_number_of_candidates<T: ListVotesTrait>(
    input_list_votes: &[T],
    list_number: ListNumber,
) -> u32 {
    let list_votes = input_list_votes
        .iter()
        .find(|list_votes| list_votes.number() == list_number)
        .expect("List votes exists");
    u32::try_from(list_votes.candidate_votes().len()).expect("Number of candidates fits in u32")
}

fn list_numbers_with_exhausted_seats<'a, T: ListVotesTrait>(
    standings: impl Iterator<Item = &'a ListStanding>,
    input_list_votes: &[T],
) -> Vec<(ListNumber, u32)> {
    standings.fold(vec![], |mut exhausted_list_numbers_and_seats, s| {
        let number_of_candidates = get_number_of_candidates(input_list_votes, s.list_number);
        if number_of_candidates.cmp(&s.total_seats()) == Ordering::Less {
            exhausted_list_numbers_and_seats.push((
                s.list_number,
                number_of_candidates.abs_diff(s.total_seats()),
            ))
        }
        exhausted_list_numbers_and_seats
    })
}

/// If a list got the absolute majority of votes but not the absolute majority of seats,
/// re-assign the last residual seat to the list with the absolute majority.  
/// This re-assignment is done according to article P 9 of the Kieswet.
fn reassign_residual_seat_for_absolute_majority<T: ListVotesTrait>(
    seats: u32,
    total_votes: u32,
    list_votes: &[T],
    lists_last_residual_seat: &[ListNumber],
    standings: Vec<ListStanding>,
) -> Result<(Vec<ListStanding>, Option<SeatChange>), ApportionmentError> {
    let half_of_votes_count: Fraction = Fraction::from(total_votes) * Fraction::new(1, 2);

    // Find list with an absolute majority of votes. Return early if we find none
    let Some(majority_list_votes) = list_votes
        .iter()
        .find(|list| Fraction::from(list.total_votes()) > half_of_votes_count)
    else {
        return Ok((standings, None));
    };

    let half_of_seats_count: Fraction = Fraction::from(seats) * Fraction::new(1, 2);
    let standing_of_list_with_majority_votes = standings
        .iter()
        .find(|list_standing| list_standing.list_number == majority_list_votes.number())
        .expect("Standing exists");

    let list_seats = Fraction::from(standing_of_list_with_majority_votes.total_seats());

    if list_seats <= half_of_seats_count {
        if lists_last_residual_seat.len() > 1 {
            info!(
                "Drawing of lots is required for lists: {:?} to pick a list which the residual seat gets retracted from",
                lists_last_residual_seat
            );
            return Err(ApportionmentError::DrawingOfLotsNotImplemented);
        }

        // Reassign the seat
        let mut standing = standings.clone();
        for list_standing in standing.iter_mut() {
            if list_standing.list_number == lists_last_residual_seat[0] {
                list_standing.residual_seats -= 1
            }
            if list_standing.list_number == majority_list_votes.number() {
                list_standing.residual_seats += 1
            }
        }

        info!(
            "Seat first assigned to list {} has been reassigned to list {} in accordance with Article P 9 Kieswet",
            lists_last_residual_seat[0],
            majority_list_votes.number()
        );
        Ok((
            standing,
            Some(SeatChange::AbsoluteMajorityReassignment(
                AbsoluteMajorityReassignedSeat {
                    list_retracted_seat: lists_last_residual_seat[0],
                    list_assigned_seat: majority_list_votes.number(),
                },
            )),
        ))
    } else {
        Ok((standings, None))
    }
}

/// If lists got more seats than candidates on their lists,
/// re-assign those excess seats to other lists without exhausted lists.  
/// This re-assignment is done according to article P 10 of the Kieswet.
fn reassign_residual_seats_for_exhausted_lists<T: ListVotesTrait>(
    previous_standings: Vec<ListStanding>,
    seats: u32,
    list_votes: &[T],
    assigned_residual_seats: u32,
    previous_steps: Vec<SeatChangeStep>,
) -> Result<(Vec<SeatChangeStep>, Vec<ListStanding>), ApportionmentError> {
    let exhausted_lists = list_numbers_with_exhausted_seats(previous_standings.iter(), list_votes);
    if !exhausted_lists.is_empty() {
        let mut current_standings = previous_standings.clone();
        let mut seats_to_reassign = 0;
        let mut list_exhaustion_steps: Vec<SeatChangeStep> = vec![];

        // Remove excess seats from exhausted lists
        for (list_number, seats) in exhausted_lists {
            seats_to_reassign += seats;
            let mut full_seat: bool = false;
            for _ in 1..=seats {
                for list_standing in current_standings.iter_mut() {
                    if list_standing.list_number == list_number {
                        if list_standing.residual_seats > 0 {
                            list_standing.residual_seats -= 1;
                        } else {
                            list_standing.full_seats -= 1;
                            full_seat = true;
                        }
                    }
                }
                info!(
                    "Seat first assigned to list {} has been removed and will be assigned to another list in accordance with Article P 10 Kieswet",
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
        (current_steps, current_standings) = assign_remainder(
            &current_standings,
            seats,
            assigned_residual_seats + seats_to_reassign,
            assigned_residual_seats,
            &current_steps,
            Some(list_votes),
        )?;
        Ok((current_steps, current_standings))
    } else {
        Ok((previous_steps, previous_standings))
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use crate::{
        SeatAssignmentResult,
        fraction::Fraction,
        seat_assignment::{
            ListStanding, SeatChange, get_total_seats_per_list_number_from_apportionment_result,
            list_numbers,
        },
        structs::ListNumber,
        test_helpers::convert_total_seats_per_u32_list_number_to_total_seats_per_list_number,
    };
    use test_log::test;

    impl SeatChange {
        /// Returns true if the seat was changed through the list exhaustion removal
        pub fn is_changed_by_list_exhaustion_removal(&self) -> bool {
            matches!(self, Self::ListExhaustionRemoval(_))
        }
    }

    pub fn get_total_seats_from_apportionment_result(result: &SeatAssignmentResult) -> Vec<u32> {
        result
            .final_standing
            .iter()
            .map(|p| p.total_seats)
            .collect::<Vec<_>>()
    }

    fn check_total_seats_per_list(
        result: &SeatAssignmentResult,
        expected_total_seats_per_list: Vec<(u32, u32)>,
    ) {
        let total_seats_per_list_number =
            get_total_seats_per_list_number_from_apportionment_result(result);
        let expected_total_seats_per_list_number =
            convert_total_seats_per_u32_list_number_to_total_seats_per_list_number(
                expected_total_seats_per_list,
            );
        assert_eq!(
            expected_total_seats_per_list_number,
            total_seats_per_list_number
        );
    }

    #[test]
    fn test_list_numbers() {
        let standing = [
            &ListStanding {
                list_number: ListNumber::from(2),
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
            &ListStanding {
                list_number: ListNumber::from(3),
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
            &ListStanding {
                list_number: ListNumber::from(4),
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
            &ListStanding {
                list_number: ListNumber::from(5),
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
            &ListStanding {
                list_number: ListNumber::from(6),
                votes_cast: 1249,
                remainder_votes: Fraction::new(14975, 24),
                meets_remainder_threshold: true,
                next_votes_per_seat: Fraction::new(1249, 2),
                full_seats: 1,
                residual_seats: 0,
            },
        ];
        assert_eq!(list_numbers(&standing), vec![2, 3, 4, 5, 6]);
    }

    /// Tests apportionment for councils with less than 19 seats
    mod lt_19_seats {
        use test_log::test;

        use super::get_total_seats_from_apportionment_result;
        use crate::{
            ApportionmentError, seat_assignment::seat_assignment, structs::ListNumber,
            test_helpers::seat_assignment_fixture_with_default_50_candidates,
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
            let result = seat_assignment(&input).unwrap();
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
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 13);
            assert_eq!(result.residual_seats, 2);
            assert_eq!(result.steps.len(), 2);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(1)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(7)
            );
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
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 10);
            assert_eq!(result.residual_seats, 5);
            assert_eq!(result.steps.len(), 5);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(1)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(1)
            );
            assert_eq!(
                result.steps[2].change.list_number_assigned(),
                ListNumber::from(2)
            );
            assert_eq!(
                result.steps[3].change.list_number_assigned(),
                ListNumber::from(3)
            );
            assert_eq!(
                result.steps[4].change.list_number_assigned(),
                ListNumber::from(4)
            );
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
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(1)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(2)
            );
            assert_eq!(
                result.steps[2].change.list_number_assigned(),
                ListNumber::from(3)
            );
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
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 0);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(1)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(2)
            );
            assert_eq!(
                result.steps[2].change.list_number_assigned(),
                ListNumber::from(3)
            );
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
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 7);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 3);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(6)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(6)
            );
            assert_eq!(
                result.steps[2].change.list_number_assigned(),
                ListNumber::from(5)
            );
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, [0, 0, 0, 0, 1, 9]);
        }

        /// Apportionment with 0 votes on candidates
        ///
        /// No votes on candidates cast
        #[test]
        fn test_with_0_votes() {
            let input = seat_assignment_fixture_with_default_50_candidates(10, vec![0, 0, 0, 0, 0]);
            let result = seat_assignment(&input);
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
            let input = seat_assignment_fixture_with_default_50_candidates(
                15,
                vec![2571, 977, 567, 536, 453],
            );
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 3);
            assert_eq!(result.steps.len(), 4);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(2)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(3)
            );
            assert_eq!(
                result.steps[2].change.list_number_assigned(),
                ListNumber::from(4)
            );
            assert!(
                result.steps[3]
                    .change
                    .is_changed_by_absolute_majority_reassignment()
            );
            assert_eq!(
                result.steps[3].change.list_number_retracted(),
                ListNumber::from(4)
            );
            assert_eq!(
                result.steps[3].change.list_number_assigned(),
                ListNumber::from(1)
            );
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![8, 3, 2, 1, 1]);
        }

        mod drawing_of_lots {
            use test_log::test;

            use crate::{
                ApportionmentError, seat_assignment,
                test_helpers::seat_assignment_fixture_with_default_50_candidates,
            };

            /// Apportionment with residual seats assigned with largest remainders method  
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
                let input = seat_assignment_fixture_with_default_50_candidates(
                    15,
                    vec![2552, 511, 511, 511, 509, 509],
                );
                let result = seat_assignment(&input);
                assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
            }

            /// Apportionment with residual seats assigned with largest remainders method
            ///
            /// Full seats: [6, 2, 2, 1, 1, 1, 0, 0] - Remainder seats: 2  
            /// Remainders: [60, 0/15, 0/15, 0/15, 0/15, 0/15, 55, 45]  
            /// 1 - largest remainder: seat assigned to list 1  
            /// 2 - Drawing of lots is required for lists: [2, 3, 4, 5, 6], only 1 seat available
            #[test]
            fn test_with_0_remainders_drawing_of_lots_error() {
                let input = seat_assignment_fixture_with_default_50_candidates(
                    15,
                    vec![540, 160, 160, 80, 80, 80, 55, 45],
                );
                let result = seat_assignment(&input);
                assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
            }

            /// Apportionment with residual seats assigned with largest remainders method
            ///
            /// Full seats: [6, 1, 1, 1, 1, 1] - Remainder seats: 4  
            /// Remainders: [20, 60, 60, 60, 60, 60]  
            /// 1 - Drawing of lots is required for lists: [2, 3, 4, 5, 6], only 4 seats available
            #[test]
            fn test_with_drawing_of_lots_error() {
                let input = seat_assignment_fixture_with_default_50_candidates(
                    15,
                    vec![500, 140, 140, 140, 140, 140],
                );
                let result = seat_assignment(&input);
                assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
            }
        }

        mod list_exhaustion {
            use test_log::test;

            use super::get_total_seats_from_apportionment_result;
            use crate::{
                ApportionmentError,
                seat_assignment::{seat_assignment, tests::check_total_seats_per_list},
                structs::ListNumber,
                test_helpers::{
                    seat_assignment_fixture_with_given_candidate_votes,
                    seat_assignment_fixture_with_given_list_numbers_and_candidate_votes,
                },
            };

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
                let input = seat_assignment_fixture_with_given_list_numbers_and_candidate_votes(
                    15,
                    vec![
                        (1, vec![500, 500, 500, 500]),
                        (2, vec![400, 400, 400, 400]),
                        (4, vec![400, 400, 400]),
                        (5, vec![400, 400]),
                        (7, vec![200, 200]),
                    ],
                );
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 14);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 2);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[0].change.list_number_retracted(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[1].change.list_number_assigned(),
                    ListNumber::from(7)
                );
                check_total_seats_per_list(&result, vec![(1, 4), (2, 4), (4, 3), (5, 2), (7, 2)]);
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 11);
                assert_eq!(result.residual_seats, 6);
                assert_eq!(result.steps.len(), 8);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(3)
                );
                assert_eq!(
                    result.steps[1].change.list_number_assigned(),
                    ListNumber::from(11)
                );
                assert_eq!(
                    result.steps[2].change.list_number_assigned(),
                    ListNumber::from(9)
                );
                assert_eq!(
                    result.steps[3].change.list_number_assigned(),
                    ListNumber::from(10)
                );
                assert_eq!(
                    result.steps[4].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[5].change.list_number_assigned(),
                    ListNumber::from(4)
                );
                assert!(
                    result.steps[6]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[6].change.list_number_retracted(),
                    ListNumber::from(10)
                );
                assert_eq!(
                    result.steps[7].change.list_number_assigned(),
                    ListNumber::from(6)
                );
                let total_seats = get_total_seats_from_apportionment_result(&result);
                assert_eq!(total_seats, vec![3, 1, 2, 2, 1, 2, 1, 0, 3, 1, 1]);
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 7);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 5);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(6)
                );
                assert_eq!(
                    result.steps[1].change.list_number_assigned(),
                    ListNumber::from(6)
                );
                assert_eq!(
                    result.steps[2].change.list_number_assigned(),
                    ListNumber::from(5)
                );
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[3].change.list_number_retracted(),
                    ListNumber::from(6)
                );
                assert_eq!(
                    result.steps[4].change.list_number_assigned(),
                    ListNumber::from(4)
                );
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 2);
                assert_eq!(result.residual_seats, 4);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[1].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[2].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[3].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[4].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert_eq!(
                    result.steps[5].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[6].change.list_number_assigned(),
                    ListNumber::from(2)
                );
                assert_eq!(
                    result.steps[7].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[8].change.list_number_assigned(),
                    ListNumber::from(2)
                );
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 2);
                assert_eq!(result.residual_seats, 4);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[1].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[2].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[3].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[4].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert_eq!(
                    result.steps[5].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[6].change.list_number_assigned(),
                    ListNumber::from(2)
                );
                assert_eq!(
                    result.steps[7].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[8].change.list_number_assigned(),
                    ListNumber::from(2)
                );
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 12);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 6);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(2)
                );
                assert_eq!(
                    result.steps[1].change.list_number_assigned(),
                    ListNumber::from(3)
                );
                assert_eq!(
                    result.steps[2].change.list_number_assigned(),
                    ListNumber::from(4)
                );
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(
                    result.steps[3].change.list_number_retracted(),
                    ListNumber::from(4)
                );
                assert_eq!(
                    result.steps[3].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[4].change.list_number_retracted(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[5].change.list_number_assigned(),
                    ListNumber::from(4)
                );
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
            /// 1st round of highest averages method (assignment to unique lists):  
            /// 6 - highest average: [6 2/5, 8 1/5, 7] seat assigned to list 3
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_and_list_exhaustion_triggering_unique_highest_averages_assignment()
             {
                let input = seat_assignment_fixture_with_given_candidate_votes(
                    8,
                    vec![vec![32, 0, 0, 0, 0], vec![41, 0, 0], vec![7]],
                );
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 6);
                assert_eq!(result.residual_seats, 2);
                assert_eq!(result.steps.len(), 6);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(
                    result.steps[1].change.list_number_retracted(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[1].change.list_number_assigned(),
                    ListNumber::from(2)
                );
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[2].change.list_number_retracted(),
                    ListNumber::from(2)
                );
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[3].change.list_number_retracted(),
                    ListNumber::from(2)
                );
                assert_eq!(
                    result.steps[4].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[5].change.list_number_assigned(),
                    ListNumber::from(3)
                );
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 5);
                assert_eq!(result.residual_seats, 3);
                assert_eq!(result.steps.len(), 8);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(3)
                );
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(
                    result.steps[1].change.list_number_retracted(),
                    ListNumber::from(3)
                );
                assert_eq!(
                    result.steps[1].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert!(
                    result.steps[2]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[2].change.list_number_retracted(),
                    ListNumber::from(1)
                );
                assert!(
                    result.steps[3]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[3].change.list_number_retracted(),
                    ListNumber::from(1)
                );
                assert!(
                    result.steps[4]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[4].change.list_number_retracted(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[5].change.list_number_assigned(),
                    ListNumber::from(3)
                );
                assert_eq!(
                    result.steps[6].change.list_number_assigned(),
                    ListNumber::from(3)
                );
                assert_eq!(
                    result.steps[7].change.list_number_assigned(),
                    ListNumber::from(2)
                );
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
                let result = seat_assignment(&input);
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
                let result = seat_assignment(&input);
                assert_eq!(result, Err(ApportionmentError::AllListsExhausted));
            }
        }
    }

    /// Tests apportionment for councils with 19 or more seats
    mod gte_19_seats {
        use test_log::test;

        use super::get_total_seats_from_apportionment_result;
        use crate::{
            ApportionmentError, seat_assignment::seat_assignment, structs::ListNumber,
            test_helpers::seat_assignment_fixture_with_default_50_candidates,
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
            let result = seat_assignment(&input).unwrap();
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
            let input =
                seat_assignment_fixture_with_default_50_candidates(23, vec![600, 302, 98, 99, 101]);
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 19);
            assert_eq!(result.residual_seats, 4);
            assert_eq!(result.steps.len(), 4);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(5)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(2)
            );
            assert_eq!(
                result.steps[2].change.list_number_assigned(),
                ListNumber::from(1)
            );
            assert_eq!(
                result.steps[3].change.list_number_assigned(),
                ListNumber::from(4)
            );
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
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 12);
            assert_eq!(result.residual_seats, 7);
            assert_eq!(result.steps.len(), 7);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(1)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(1)
            );
            assert_eq!(
                result.steps[2].change.list_number_assigned(),
                ListNumber::from(2)
            );
            assert_eq!(
                result.steps[3].change.list_number_assigned(),
                ListNumber::from(3)
            );
            assert_eq!(
                result.steps[4].change.list_number_assigned(),
                ListNumber::from(4)
            );
            assert_eq!(
                result.steps[5].change.list_number_assigned(),
                ListNumber::from(5)
            );
            assert_eq!(
                result.steps[6].change.list_number_assigned(),
                ListNumber::from(1)
            );
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![15, 1, 1, 1, 1, 0, 0, 0, 0]);
        }

        /// Apportionment with 0 votes on candidates
        ///
        /// No votes on candidates cast
        #[test]
        fn test_with_0_votes() {
            let input = seat_assignment_fixture_with_default_50_candidates(19, vec![0]);
            let result = seat_assignment(&input);
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
            let input = seat_assignment_fixture_with_default_50_candidates(
                24,
                vec![7501, 1249, 1249, 1249, 1249, 1249, 1248, 7],
            );
            let result = seat_assignment(&input).unwrap();
            assert_eq!(result.full_seats, 18);
            assert_eq!(result.residual_seats, 6);
            assert_eq!(result.steps.len(), 7);
            assert_eq!(
                result.steps[0].change.list_number_assigned(),
                ListNumber::from(2)
            );
            assert_eq!(
                result.steps[1].change.list_number_assigned(),
                ListNumber::from(3)
            );
            assert_eq!(
                result.steps[2].change.list_number_assigned(),
                ListNumber::from(4)
            );
            assert_eq!(
                result.steps[3].change.list_number_assigned(),
                ListNumber::from(5)
            );
            assert_eq!(
                result.steps[4].change.list_number_assigned(),
                ListNumber::from(6)
            );
            assert_eq!(
                result.steps[5].change.list_number_assigned(),
                ListNumber::from(7)
            );
            assert!(
                result.steps[6]
                    .change
                    .is_changed_by_absolute_majority_reassignment()
            );
            assert_eq!(
                result.steps[6].change.list_number_retracted(),
                ListNumber::from(7)
            );
            assert_eq!(
                result.steps[6].change.list_number_assigned(),
                ListNumber::from(1)
            );
            let total_seats = get_total_seats_from_apportionment_result(&result);
            assert_eq!(total_seats, vec![13, 2, 2, 2, 2, 2, 1, 0]);
        }

        mod drawing_of_lots {
            use test_log::test;

            use crate::{
                ApportionmentError, seat_assignment::seat_assignment,
                test_helpers::seat_assignment_fixture_with_default_50_candidates,
            };

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
            /// 7 - Drawing of lots is required for lists: [6, 7] to pick a list which the residual seat gets retracted from
            #[test]
            fn test_with_absolute_majority_of_votes_but_not_seats_with_drawing_of_lots_error() {
                let input = seat_assignment_fixture_with_default_50_candidates(
                    24,
                    vec![7501, 1249, 1249, 1249, 1249, 1248, 1248, 8],
                );
                let result = seat_assignment(&input);
                assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
            }

            /// Apportionment with residual seats assigned with highest averages method
            ///
            /// Full seats: [9, 2, 2, 2, 2, 2] - Remainder seats: 4  
            /// 1 - highest average: [50, 46 2/3, 46 2/3, 46 2/3, 46 2/3, 46 2/3] seat assigned to list 1  
            /// 2 - Drawing of lots is required for lists: [2, 3, 4, 5, 6], only 3 seats available
            #[test]
            fn test_with_drawing_of_lots_error() {
                let input = seat_assignment_fixture_with_default_50_candidates(
                    23,
                    vec![500, 140, 140, 140, 140, 140],
                );
                let result = seat_assignment(&input);
                assert_eq!(result, Err(ApportionmentError::DrawingOfLotsNotImplemented));
            }
        }

        mod list_exhaustion {
            use test_log::test;

            use super::get_total_seats_from_apportionment_result;
            use crate::{
                ApportionmentError, seat_assignment::seat_assignment, structs::ListNumber,
                test_helpers::seat_assignment_fixture_with_given_candidate_votes,
            };

            /// Apportionment with no residual seats  
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 19);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 2);
                assert!(
                    result.steps[0]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[0].change.list_number_retracted(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[1].change.list_number_assigned(),
                    ListNumber::from(5)
                );
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 18);
                assert_eq!(result.residual_seats, 1);
                assert_eq!(result.steps.len(), 3);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(5)
                );
                assert!(
                    result.steps[1]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[1].change.list_number_retracted(),
                    ListNumber::from(5)
                );
                assert_eq!(
                    result.steps[2].change.list_number_assigned(),
                    ListNumber::from(1)
                );
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
                let result = seat_assignment(&input).unwrap();
                assert_eq!(result.full_seats, 18);
                assert_eq!(result.residual_seats, 6);
                assert_eq!(result.steps.len(), 9);
                assert_eq!(
                    result.steps[0].change.list_number_assigned(),
                    ListNumber::from(2)
                );
                assert_eq!(
                    result.steps[1].change.list_number_assigned(),
                    ListNumber::from(3)
                );
                assert_eq!(
                    result.steps[2].change.list_number_assigned(),
                    ListNumber::from(4)
                );
                assert_eq!(
                    result.steps[3].change.list_number_assigned(),
                    ListNumber::from(5)
                );
                assert_eq!(
                    result.steps[4].change.list_number_assigned(),
                    ListNumber::from(6)
                );
                assert_eq!(
                    result.steps[5].change.list_number_assigned(),
                    ListNumber::from(7)
                );
                assert!(
                    result.steps[6]
                        .change
                        .is_changed_by_absolute_majority_reassignment()
                );
                assert_eq!(
                    result.steps[6].change.list_number_retracted(),
                    ListNumber::from(7)
                );
                assert_eq!(
                    result.steps[6].change.list_number_assigned(),
                    ListNumber::from(1)
                );
                assert!(
                    result.steps[7]
                        .change
                        .is_changed_by_list_exhaustion_removal()
                );
                assert_eq!(
                    result.steps[7].change.list_number_retracted(),
                    ListNumber::from(1)
                );
                assert_eq!(
                    result.steps[8].change.list_number_assigned(),
                    ListNumber::from(7)
                );
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
                let result = seat_assignment(&input);
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
                let result = seat_assignment(&input);
                assert_eq!(result, Err(ApportionmentError::AllListsExhausted));
            }
        }
    }
}
