use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    field_path::FieldPath,
    results::{
        counting_differences_polling_station::CountingDifferencesPollingStation,
        differences_counts::DifferencesCounts, extra_investigation::ExtraInvestigation,
        political_group_candidate_votes::PoliticalGroupCandidateVotes, voters_counts::VotersCounts,
        votes_counts::VotesCounts,
    },
};

/// DSOFirstSessionResults, following the fields in Model N 10-1
///
/// See: Model N 10-1 (Proces-verbaal van een stembureau) from
/// [kiesraad](https://www.kiesraad.nl/documenten/2025/11/27/n-10-1-pv-sb-dso)
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

impl Compare for DSOFirstSessionResults {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.extra_investigation.compare(
            &first_entry.extra_investigation,
            different_fields,
            &path.field("extra_investigation"),
        );

        self.counting_differences_polling_station.compare(
            &first_entry.counting_differences_polling_station,
            different_fields,
            &path.field("counting_differences_polling_station"),
        );

        self.voters_counts.compare(
            &first_entry.voters_counts,
            different_fields,
            &path.field("voters_counts"),
        );

        self.votes_counts.compare(
            &first_entry.votes_counts,
            different_fields,
            &path.field("votes_counts"),
        );

        self.differences_counts.compare(
            &first_entry.differences_counts,
            different_fields,
            &path.field("differences_counts"),
        );

        self.political_group_votes.compare(
            &first_entry.political_group_votes,
            different_fields,
            &path.field("political_group_votes"),
        );
    }
}
