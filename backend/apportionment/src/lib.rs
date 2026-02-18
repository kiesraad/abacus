//! Apportionment calculation with two parts, the seat assignment and the candidate nomination.
//!
//! Crate also contains a definition of a fraction, which is used in all calculations.

mod candidate_nomination;
mod fraction;
mod seat_assignment;
mod structs;
#[cfg(test)]
mod test_helpers;

pub use self::{
    candidate_nomination::CandidateNominationResult,
    fraction::Fraction,
    seat_assignment::SeatAssignmentResult,
    structs::{ApportionmentError, ApportionmentInput, CandidateVotesTrait, ListVotesTrait},
};
use self::{
    candidate_nomination::candidate_nomination,
    seat_assignment::{as_candidate_nomination_input, seat_assignment},
    structs::ApportionmentOutput,
};

/// Perform seat assignment and candidate nomination on apportionment input.
pub fn process<T: ApportionmentInput>(
    input: &T,
) -> Result<ApportionmentOutput<'_, T::List>, ApportionmentError> {
    let seat_assignment = seat_assignment(input)?;
    let candidate_nomination_input = as_candidate_nomination_input(input, &seat_assignment);
    let candidate_nomination = candidate_nomination(&candidate_nomination_input)?;

    Ok(ApportionmentOutput {
        seat_assignment,
        candidate_nomination,
    })
}

#[cfg(test)]
mod tests {
    use super::process;
    use crate::test_helpers::{check_chosen_candidates, check_list_candidate_nomination};
    use crate::{
        Fraction,
        test_helpers::{
            get_total_seats_from_apportionment_result,
            seat_assignment_fixture_with_default_50_candidates,
        },
    };

    #[test]
    fn test_apportionment_process() {
        let input = seat_assignment_fixture_with_default_50_candidates(
            15,
            vec![540, 160, 160, 80, 80, 80, 60, 40],
        );
        let result = process(&input).unwrap();
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
            &input.list_votes[0].number,
            &input.list_votes[0].candidate_votes[..7],
            &input.list_votes[0].candidate_votes[8..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            &input.list_votes[1].number,
            &input.list_votes[1].candidate_votes[..2],
            &input.list_votes[1].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            &input.list_votes[2].number,
            &input.list_votes[2].candidate_votes[..2],
            &input.list_votes[2].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            &input.list_votes[3].number,
            &input.list_votes[3].candidate_votes[..1],
            &input.list_votes[3].candidate_votes[1..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            &input.list_votes[4].number,
            &input.list_votes[4].candidate_votes[..1],
            &input.list_votes[4].candidate_votes[1..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            &input.list_votes[5].number,
            &input.list_votes[5].candidate_votes[..1],
            &input.list_votes[5].candidate_votes[1..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            &input.list_votes[6].number,
            &input.list_votes[6].candidate_votes[..1],
            &input.list_votes[6].candidate_votes[2..],
        );
        check_chosen_candidates(
            &result.candidate_nomination.chosen_candidates,
            &input.list_votes[7].number,
            &[],
            &input.list_votes[7].candidate_votes[1..],
        );
    }
}
