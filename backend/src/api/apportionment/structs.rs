use std::collections::{HashMap, HashSet};

use apportionment::{self};
use serde::Serialize;
use utoipa::ToSchema;

use crate::domain::{
    apportionment::{ApportionmentWarning, CandidateNomination, SeatAssignment},
    apportionment_state::DeceasedCandidate,
    election::{self, PGNumber},
    results::political_group_candidate_votes::{CandidateVotes, PoliticalGroupCandidateVotes},
    summary::ElectionSummary,
};

#[derive(Clone, Debug)]
pub struct ApportionmentInputData<'a> {
    pub number_of_seats: u32,
    pub list_votes: &'a [PoliticalGroupCandidateVotes],
    pub deceased_candidates: HashMap<PGNumber, HashSet<election::CandidateNumber>>,
}

impl<'a> ApportionmentInputData<'a> {
    pub fn new(
        number_of_seats: u32,
        list_votes: &'a [PoliticalGroupCandidateVotes],
        deceased_candidates: &[DeceasedCandidate],
    ) -> Self {
        let mut grouped: HashMap<PGNumber, HashSet<election::CandidateNumber>> = HashMap::new();

        for dc in deceased_candidates {
            grouped
                .entry(dc.pg_number)
                .or_default()
                .insert(dc.candidate_number);
        }

        Self {
            number_of_seats,
            list_votes,
            deceased_candidates: grouped,
        }
    }
}

impl<'a> apportionment::ApportionmentInput for ApportionmentInputData<'a> {
    type List = PoliticalGroupCandidateVotes;

    fn number_of_seats(&self) -> u32 {
        self.number_of_seats
    }

    fn list_votes(&self) -> &[Self::List] {
        self.list_votes
    }

    fn deceased_candidates(&self) -> &HashMap<PGNumber, HashSet<election::CandidateNumber>> {
        &self.deceased_candidates
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
    pub warnings: Vec<ApportionmentWarning>,
}
