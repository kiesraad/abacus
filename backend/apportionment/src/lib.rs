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
    seat_assignment::{as_candidate_nomination_input, seat_assignment},
    structs::ApportionmentOutput,
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
