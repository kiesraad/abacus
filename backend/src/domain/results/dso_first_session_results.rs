use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::results::{
    counting_differences_polling_station::CountingDifferencesPollingStation,
    differences_counts::DifferencesCounts, extra_investigation::ExtraInvestigation,
    political_group_candidate_votes::PoliticalGroupCandidateVotes, voters_counts::VotersCounts,
    votes_counts::VotesCounts,
};

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DSOFirstSessionResults {
    /// Extra investigation ("B1-1 Alleen bij extra onderzoek")
    pub extra_investigation: ExtraInvestigation,
    /// Counting Differences Polling Station ("B1-2 Verschillen met telresultaten van het stembureau")
    pub counting_differences_polling_station: CountingDifferencesPollingStation,
    /// Voters counts ("1. Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("2. Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Differences counts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
    /// Vote counts per list and candidate (5. "Aantal stemmen per lijst en kandidaat")
    pub political_group_votes: Vec<PoliticalGroupCandidateVotes>,
}
