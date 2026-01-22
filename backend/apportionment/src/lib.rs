use crate::{
    candidate_nomination::candidate_nomination,
    seat_assignment::seat_assignment,
    structs::{CandidateNominationInput, SeatAssignmentInput},
};

// TODO: Temp
pub type PGNumber = u32;

// TODO: Fix positions of struct, fix visibilities
mod candidate_nomination;
mod fraction;
mod seat_assignment;
mod structs;

#[cfg(test)]
pub(crate) mod test_helpers;

pub use crate::candidate_nomination::CandidateNominationResult;
pub use crate::seat_assignment::SeatAssignmentResult;
pub use crate::structs::{
    ApportionmentError, ApportionmentInput, CandidateVotesTrait, PoliticalGroupVotesTrait,
};

// Place somewhere
pub struct ApportionmentResponse {
    pub seat_assignment: SeatAssignmentResult,
    pub candidate_nomination: CandidateNominationResult,
}

pub async fn process(
    input: impl ApportionmentInput,
) -> Result<ApportionmentResponse, ApportionmentError> {
    let seat_assignment = seat_assignment(SeatAssignmentInput::from(&input))?;
    let candidate_nomination =
        candidate_nomination(CandidateNominationInput::from((&input, &seat_assignment)))?;

    Ok(ApportionmentResponse {
        seat_assignment,
        candidate_nomination,
    })
}
