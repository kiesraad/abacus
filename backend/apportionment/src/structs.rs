// TODO: use "list" iso "political group"

#[cfg(test)]
use crate::PGNumber;
use crate::{
    fraction::Fraction,
    seat_assignment::{SeatAssignmentResult, get_total_seats_from_apportionment_result},
};

/// Errors that can occur during apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentError {
    AllListsExhausted,
    ApportionmentNotAvailableUntilDataEntryFinalised,
    DrawingOfLotsNotImplemented,
    ZeroVotesCast,
}

pub trait ApportionmentInput {
    type Pg: PoliticalGroupVotesTrait;

    fn number_of_seats(&self) -> u32;
    fn total_votes(&self) -> u32;
    fn political_group_votes(&self) -> &[Self::Pg];
}

pub trait PoliticalGroupVotesTrait {
    type Cv: CandidateVotesTrait;

    fn number(&self) -> u32;
    fn total(&self) -> u32;
    fn candidate_votes(&self) -> &[Self::Cv];
}

pub trait CandidateVotesTrait {
    fn number(&self) -> u32;
    fn votes(&self) -> u32;
}

// Internal
pub(crate) struct SeatAssignmentInput {
    pub number_of_seats: u32,
    pub total_votes: u32,
    pub political_group_votes: Vec<PoliticalGroupVotes>,
}

impl<T> From<&T> for SeatAssignmentInput
where
    T: ApportionmentInput,
{
    fn from(input: &T) -> Self {
        SeatAssignmentInput {
            number_of_seats: input.number_of_seats(),
            total_votes: input.total_votes(),
            political_group_votes: political_group_votes_from_input(input),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct PoliticalGroupVotes {
    pub number: u32,
    pub list_votes: u32,
    pub candidate_votes: Vec<CandidateVotes>,
}

impl PoliticalGroupVotes {
    #[cfg(test)]
    pub fn from_test_data_auto(number: PGNumber, candidate_votes: &[u32]) -> Self {
        use crate::structs::CandidateVotes;

        PoliticalGroupVotes {
            number,
            list_votes: candidate_votes.iter().sum(),
            candidate_votes: candidate_votes
                .iter()
                .enumerate()
                .map(|(i, votes)| CandidateVotes {
                    number: u32::try_from(i + 1).unwrap(),
                    votes: *votes,
                })
                .collect(),
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CandidateVotes {
    pub number: u32,
    pub votes: u32,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct CandidateNominationInput {
    // TODO: Rename to election_seats?
    pub number_of_seats: u32,
    pub political_group_votes: Vec<PoliticalGroupVotes>,
    pub quota: Fraction,
    // TODO: Rename to political_group_seats? Should be mapped by PGNumber, not index
    pub total_seats: Vec<u32>,
}

impl<T> From<(&T, &SeatAssignmentResult)> for CandidateNominationInput
where
    T: ApportionmentInput,
{
    fn from(input: (&T, &SeatAssignmentResult)) -> Self {
        CandidateNominationInput {
            number_of_seats: input.0.number_of_seats(),
            political_group_votes: political_group_votes_from_input(input.0),
            quota: input.1.quota,
            total_seats: get_total_seats_from_apportionment_result(input.1),
        }
    }
}

// Could also be done this way, preferences?
// impl CandidateNominationInput {
//     pub fn new(input: impl ApportionmentInput, seat_assignment: &SeatAssignmentResult) -> Self {
//         CandidateNominationInput {
//             number_of_seats: input.number_of_seats(),
//             political_group_votes: political_group_votes_from_input(&input),

//             quota: seat_assignment.quota,
//             total_seats: get_total_seats_from_apportionment_result(&seat_assignment),
//         }
//     }
// }

fn political_group_votes_from_input<T: ApportionmentInput>(input: &T) -> Vec<PoliticalGroupVotes> {
    input
        .political_group_votes()
        .iter()
        .map(|pg| PoliticalGroupVotes {
            number: pg.number(),
            list_votes: pg.total(),
            candidate_votes: pg
                .candidate_votes()
                .iter()
                .map(|cv| CandidateVotes {
                    number: cv.number(),
                    votes: cv.votes(),
                })
                .collect(),
        })
        .collect()
}
