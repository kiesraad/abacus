//! Apportionment calculation with two parts, the seat assignment and the candidate nomination.
//!
//! Crate also contains a definition of a fraction, which is used in all calculations.

mod candidate_nomination;
mod fraction;
mod seat_assignment;
mod structs;
#[cfg(test)]
mod test_helpers;

use structs::{CandidateNumber, ListNumber};

use self::{
    candidate_nomination::candidate_nomination,
    seat_assignment::{as_candidate_nomination_input, seat_assignment},
};
pub use self::{
    candidate_nomination::{
        Candidate, CandidateNomination, CandidateNominationDetails, CandidateRanking,
        ListCandidateNomination, PreferenceThreshold,
    },
    fraction::Fraction,
    seat_assignment::{
        ApportionmentWarning, HighestAverageAssignedSeat, SeatAssignment, SeatAssignmentDetails,
        SeatChange, SeatChangeStep,
    },
    structs::{
        AbsoluteMajorityDrawingLots, ApportionmentDetails, ApportionmentError, ApportionmentInput,
        CandidateDrawingLotsVariant, CandidateDrawn, CandidateVotes,
        HighestAverageResidualSeatDrawingLots, LargestRemainderResidualSeatDrawingLots,
        ListDrawingLotsVariant, ListDrawn, ListVotes,
    },
};

#[derive(Debug, PartialEq)]
pub enum ApportionmentOutput<'a, T: ApportionmentInput> {
    Completed(ApportionmentDetails<'a, T::List>),
    ListDrawingLotsRequired(
        ListDrawingLotsVariant<ListNumber<T::List>>,
        SeatAssignmentDetails<ListNumber<T::List>>,
    ),
    CandidateDrawingLotsRequired(
        CandidateDrawingLotsVariant<ListNumber<T::List>, CandidateNumber<T::List>>,
        SeatAssignmentDetails<ListNumber<T::List>>,
    ),
}

/// Perform seat assignment and candidate nomination on apportionment input.
pub fn process<T: ApportionmentInput>(
    input: &T,
) -> Result<ApportionmentOutput<'_, T>, ApportionmentError> {
    // Check if all list votes are sorted by number
    if !input.list_votes().is_sorted_by_key(|lv| lv.number()) {
        return Err(ApportionmentError::UnsortedInput);
    }

    // Check if all candidate votes are sorted by number
    if input
        .list_votes()
        .iter()
        .any(|lv| !lv.candidate_votes().is_sorted_by_key(|cv| cv.number()))
    {
        return Err(ApportionmentError::UnsortedInput);
    }

    let seat_assignment = match seat_assignment(input)? {
        SeatAssignment::Completed(seat_assignment) => seat_assignment,
        SeatAssignment::DrawingLotsRequired(variant, seat_assignment) => {
            return Ok(ApportionmentOutput::ListDrawingLotsRequired(
                variant,
                seat_assignment,
            ));
        }
    };

    let candidate_nomination_input = as_candidate_nomination_input(input, &seat_assignment);
    let candidate_nomination =
        match candidate_nomination(&candidate_nomination_input, input.candidates_drawn())? {
            CandidateNomination::Completed(candidate_nomination) => candidate_nomination,
            CandidateNomination::DrawingLotsRequired(variant) => {
                return Ok(ApportionmentOutput::CandidateDrawingLotsRequired(
                    variant,
                    seat_assignment,
                ));
            }
        };

    Ok(ApportionmentOutput::Completed(ApportionmentDetails {
        seat_assignment,
        candidate_nomination,
    }))
}

#[cfg(test)]
mod tests {
    use std::{
        assert_matches,
        collections::{HashMap, HashSet},
    };

    use super::{ApportionmentOutput, process};
    use crate::{
        ApportionmentError, Fraction,
        test_helpers::{
            check_chosen_candidates, check_list_candidate_nomination,
            get_total_seats_from_apportionment_result,
            seat_assignment_fixture_with_default_50_candidates,
            seat_assignment_fixture_with_given_candidate_votes,
        },
    };

    #[test]
    #[expect(clippy::too_many_lines)]
    fn test_apportionment_process() {
        let input = seat_assignment_fixture_with_default_50_candidates(
            15,
            vec![540, 160, 160, 80, 80, 80, 60, 40],
        );
        let Ok(ApportionmentOutput::Completed(result)) = process(&input) else {
            panic!("should be Completed")
        };
        assert_eq!(result.seat_assignment.full_seats, 13);
        assert_eq!(result.seat_assignment.residual_seats, 2);
        assert_eq!(result.seat_assignment.steps.len(), 2);
        assert_eq!(
            result.seat_assignment.steps[0]
                .change
                .list_number_assigned(),
            1
        );
        assert_eq!(
            result.seat_assignment.steps[1]
                .change
                .list_number_assigned(),
            7
        );
        let total_seats = get_total_seats_from_apportionment_result(&result.seat_assignment);
        assert_eq!(total_seats, vec![7, 2, 2, 1, 1, 1, 1, 0]);
        assert_eq!(
            result.candidate_nomination.preference_threshold.percentage,
            50
        );
        assert_eq!(
            result
                .candidate_nomination
                .preference_threshold
                .number_of_votes,
            Fraction::new(40, 1)
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[0],
            &[1],
            &[2, 3, 4, 5, 6, 7],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[1],
            &[1],
            &[2],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[2],
            &[1],
            &[2],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[3],
            &[1],
            &[],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[4],
            &[1],
            &[],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[5],
            &[1],
            &[],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[6],
            &[1],
            &[],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[7],
            &[],
            &[],
            &[],
        );

        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            input.list_votes[0].number,
            &input.list_votes[0].candidate_votes[..7],
            &input.list_votes[0].candidate_votes[8..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            input.list_votes[1].number,
            &input.list_votes[1].candidate_votes[..2],
            &input.list_votes[1].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            input.list_votes[2].number,
            &input.list_votes[2].candidate_votes[..2],
            &input.list_votes[2].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            input.list_votes[3].number,
            &input.list_votes[3].candidate_votes[..1],
            &input.list_votes[3].candidate_votes[1..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            input.list_votes[4].number,
            &input.list_votes[4].candidate_votes[..1],
            &input.list_votes[4].candidate_votes[1..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            input.list_votes[5].number,
            &input.list_votes[5].candidate_votes[..1],
            &input.list_votes[5].candidate_votes[1..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            input.list_votes[6].number,
            &input.list_votes[6].candidate_votes[..1],
            &input.list_votes[6].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            input.list_votes[7].number,
            &[],
            &input.list_votes[7].candidate_votes[1..],
        );
    }

    /// Same as `test_apportionment_process`, but on list 1 we mark two candidates as deceased:
    /// - candidate 1, who originally received the only preferential seat on list 1
    /// - candidate 50, who had 0 votes and never received a seat (control case)
    ///
    /// Seat assignment must be unchanged (votes of deceased candidates still count toward
    /// the list total). Only the candidate nomination changes for list 1.
    #[test]
    #[expect(clippy::too_many_lines)]
    fn test_apportionment_process_with_deceased_candidates() {
        let mut input = seat_assignment_fixture_with_default_50_candidates(
            15,
            vec![540, 160, 160, 80, 80, 80, 60, 40],
        );
        input.deceased_candidates = HashMap::from([(1, HashSet::from([1, 50]))]);

        let Ok(ApportionmentOutput::Completed(result)) = process(&input) else {
            panic!("should be Completed")
        };

        // Seat assignment is identical to the `test_apportionment_process` test.
        assert_eq!(result.seat_assignment.full_seats, 13);
        assert_eq!(result.seat_assignment.residual_seats, 2);
        let total_seats = get_total_seats_from_apportionment_result(&result.seat_assignment);
        assert_eq!(total_seats, vec![7, 2, 2, 1, 1, 1, 1, 0]);

        // List 1: candidate 1 is deceased, so nobody meets the preference threshold.
        // The 7 nominated "other" candidates are the next 7 alive candidates by number.
        // Expect updated ranking
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[0],
            &[],
            &[2, 3, 4, 5, 6, 7, 8],
            &(2..=49).collect::<Vec<_>>(),
        );
        // Lists 2–8 unchanged.
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[1],
            &[1],
            &[2],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[2],
            &[1],
            &[2],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[3],
            &[1],
            &[],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[4],
            &[1],
            &[],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[5],
            &[1],
            &[],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[6],
            &[1],
            &[],
            &[],
        );
        check_list_candidate_nomination(
            &result.candidate_nomination.list_candidate_nomination[7],
            &[],
            &[],
            &[],
        );

        // List 1 chosen: candidates 2..=8 (indices 1..8)
        // Not chosen: candidate 1 (deceased, index 0) and candidates 9..=50 (indices 8..)
        let list1 = &input.list_votes[0];
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            list1.number,
            &list1.candidate_votes[1..8],
            &[&list1.candidate_votes[..1], &list1.candidate_votes[8..]].concat(),
        );
    }

    /// Scenarios testing deceased candidates and seat assignment.
    ///
    /// All cases share the same small fixture:
    /// 5 seats, quota = 480 / 5 = 96.
    /// List 1: 300 votes -> 3 full seats.
    /// List 2: 100 -> 1 full seat.
    /// List 3: 80 -> 0 full seats, 1 residual (largest remainder = 80, threshold 72)
    /// Initial distribution: [3, 1, 1].
    #[test]
    #[allow(clippy::too_many_lines, reason = "Written out cases take many lines")]
    fn test_apportionment_process_with_deceased_scenarios() {
        struct Case {
            name: &'static str,
            deceased: HashMap<u32, HashSet<u32>>,
            expected_seats: Vec<u32>,
            expects_exhaustion_step: bool,
        }

        let cases = vec![
            Case {
                name: "no deceased -> initial distribution",
                deceased: HashMap::new(),
                expected_seats: vec![3, 1, 1],
                expects_exhaustion_step: false,
            },
            Case {
                name: "deceased on a list whose alive count still covers its seats",
                // List 2, # alive = 1, list 2 seats = 1 -> not exhausted
                deceased: HashMap::from([(2, HashSet::from([2]))]),
                expected_seats: vec![3, 1, 1],
                expects_exhaustion_step: false,
            },
            Case {
                name: "single-seat exhaustion on list 1 -> reassigns to list 2",
                // List 1, # alive = 2, list 1 seats = 3 -> exhausted by 1.
                // List 3 already got a largest remainder seat, so only list 2 qualifies.
                deceased: HashMap::from([(1, HashSet::from([3]))]),
                expected_seats: vec![2, 2, 1],
                expects_exhaustion_step: true,
            },
            Case {
                name: "two-seat exhaustion on list 1 -> list 2 gets LR, list 3 gets UHA",
                // List 1, # alive = 1, list 1 seats = 3 -> exhausted by 2.
                // First retraction reassigns via largest remainder to list 2; after that
                // both list 2 and list 3 have gotten their LR seat, so the second seat
                // is assigned through unique-highest-average and goes to list 3.
                deceased: HashMap::from([(1, HashSet::from([2, 3]))]),
                expected_seats: vec![1, 2, 2],
                expects_exhaustion_step: true,
            },
            Case {
                name: "all of list 3 deceased -> list 2 absorbs the retracted seat",
                // List 3, # alive = 0, list 3 seats = 1 -> exhausted by 1.
                // The retracted seat goes to list 2 via LR assignment
                // list 1 already has 3 full seats from full-quota assignment.
                deceased: HashMap::from([(3, HashSet::from([1, 2]))]),
                expected_seats: vec![3, 2, 0],
                expects_exhaustion_step: true,
            },
        ];

        for case in cases {
            let mut input = seat_assignment_fixture_with_given_candidate_votes(
                5,
                vec![vec![300, 0, 0], vec![100, 0], vec![80, 0]],
            );
            input.deceased_candidates = case.deceased;

            let result =
                process(&input).unwrap_or_else(|e| panic!("case `{}` failed: {e:?}", case.name));

            let ApportionmentOutput::Completed(result) = result else {
                panic!("should be Completed for case {}", case.name)
            };

            let total_seats = get_total_seats_from_apportionment_result(&result.seat_assignment);
            assert_eq!(total_seats, case.expected_seats, "case: {}", case.name);

            let has_exhaustion_step = result
                .seat_assignment
                .steps
                .iter()
                .any(|s| s.change.is_changed_by_list_exhaustion_removal());
            assert_eq!(
                has_exhaustion_step, case.expects_exhaustion_step,
                "case: {} (steps: {:#?})",
                case.name, result.seat_assignment.steps,
            );
        }
    }

    #[test]
    fn test_apportionment_process_unsorted_list_number_fails() {
        let mut input = seat_assignment_fixture_with_default_50_candidates(
            15,
            vec![540, 160, 160, 80, 80, 80, 60, 40],
        );

        input.list_votes.reverse();

        assert_matches!(process(&input), Err(ApportionmentError::UnsortedInput));
    }

    #[test]
    fn test_apportionment_process_unsorted_list_candidate_number_fails() {
        let mut input = seat_assignment_fixture_with_default_50_candidates(
            15,
            vec![540, 160, 160, 80, 80, 80, 60, 40],
        );

        input.list_votes.iter_mut().for_each(|lv| {
            lv.candidate_votes.reverse();
        });

        assert_matches!(process(&input), Err(ApportionmentError::UnsortedInput));
    }
}
