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
    structs::{ApportionmentOutput, CandidateNominationInput, SeatAssignmentInput},
};

pub fn process(input: impl ApportionmentInput) -> Result<ApportionmentOutput, ApportionmentError> {
    let seat_assignment = seat_assignment(SeatAssignmentInput::new(&input))?;
    let candidate_nomination =
        candidate_nomination(CandidateNominationInput::new(&input, &seat_assignment))?;

    Ok(ApportionmentOutput {
        seat_assignment,
        candidate_nomination,
    })
}
