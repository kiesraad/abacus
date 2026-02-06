mod candidate_nomination;
mod fraction;
mod int_newtype_macro;
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
    seat_assignment::seat_assignment,
    structs::{ApportionmentOutput, as_candidate_nomination_input},
};

pub fn process<T: ApportionmentInput>(
    input: &T,
) -> Result<ApportionmentOutput<'_, T::List>, ApportionmentError> {
    let seat_assignment = seat_assignment(input)?;
    let candidate_nomination_input = as_candidate_nomination_input(input, &seat_assignment);
    let candidate_nomination = candidate_nomination::<T>(&candidate_nomination_input)?;

    Ok(ApportionmentOutput {
        seat_assignment,
        candidate_nomination,
    })
}

#[cfg(test)]
mod tests {
    use super::process;
    use crate::{
        Fraction, seat_assignment::get_total_seats_from_apportionment_result, structs::ListNumber,
        test_helpers::seat_assignment_fixture_with_default_50_candidates,
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
            ListNumber::from(1)
        );
        assert_eq!(
            result.seat_assignment.steps[1]
                .change
                .list_number_assigned(),
            ListNumber::from(7)
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
        // TODO: Do we want to check the full candidate nomination result?
        //  In that case we need to move some test helper functions
        //  out of candidate nomination tests to test_helpers.rs
        //  and potentially move some structs as well
    }
}
