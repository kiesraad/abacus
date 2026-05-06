use apportionment::{self};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    apportionment::{CandidateNomination, SeatAssignment},
    election::{self, CandidateNumber, PGNumber},
    results::political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes},
    summary::ElectionSummary,
};

#[derive(Deserialize, Serialize, ToSchema)]
pub struct DeceasedCandidate {
    pub pg_number: PGNumber,
    pub candidate_number: CandidateNumber,
}

#[derive(Clone, Debug)]
pub struct ApportionmentInputData<'a> {
    pub number_of_seats: u32,
    pub list_votes: &'a [PoliticalGroupCandidateVotes],
}

impl<'a> apportionment::ApportionmentInput for ApportionmentInputData<'a> {
    type List = PoliticalGroupCandidateVotes;

    fn number_of_seats(&self) -> u32 {
        self.number_of_seats
    }

    fn list_votes(&self) -> &[Self::List] {
        self.list_votes
    }
}

impl apportionment::ListVotes for PoliticalGroupCandidateVotes {
    type Cv = CandidateVotes;
    type ListNumber = PGNumber;

    fn number(&self) -> Self::ListNumber {
        self.number
    }

    fn candidate_votes(&self) -> &[Self::Cv] {
        &self.candidate_votes
    }
}

impl apportionment::CandidateVotes for CandidateVotes {
    type CandidateNumber = election::CandidateNumber;

    fn number(&self) -> Self::CandidateNumber {
        self.number
    }

    fn votes(&self) -> u32 {
        self.votes
    }
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ElectionApportionmentResponse {
    pub seat_assignment: SeatAssignment,
    pub candidate_nomination: CandidateNomination,
    pub election_summary: ElectionSummary,
}
