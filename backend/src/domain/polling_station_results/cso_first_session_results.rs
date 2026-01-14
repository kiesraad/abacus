use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    field_path::FieldPath,
    polling_station_results::{
        counting_differences_polling_station::CountingDifferencesPollingStation,
        differences_counts::DifferencesCounts, extra_investigation::ExtraInvestigation,
        political_group_candidate_votes::PoliticalGroupCandidateVotes, voters_counts::VotersCounts,
        votes_counts::VotesCounts,
    },
};

/// CSOFirstSessionResults, following the fields in Model Na 31-2 Bijlage 2.
///
/// See "Model Na 31-2. Proces-verbaal van een gemeentelijk stembureau/stembureau voor het openbaar
/// lichaam in een gemeente/openbaar lichaam waar een centrale stemopneming wordt verricht,
/// Bijlage 2: uitkomsten per stembureau" from the
/// [Kiesregeling](https://wetten.overheid.nl/BWBR0034180/2024-04-01#Bijlage1_DivisieNa31.2) or
/// [Verkiezingstoolbox](https://www.rijksoverheid.nl/onderwerpen/verkiezingen/verkiezingentoolkit/modellen).
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct CSOFirstSessionResults {
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

impl CSOFirstSessionResults {
    /// The admitted voters have been recounted in this session
    pub fn admitted_voters_have_been_recounted(&self) -> bool {
        matches!(
            self.counting_differences_polling_station
                .unexplained_difference_ballots_voters
                .as_bool(),
            Some(true)
        ) || matches!(
            self.counting_differences_polling_station
                .difference_ballots_per_list
                .as_bool(),
            Some(true)
        ) || matches!(
            self.differences_counts
                .difference_completely_accounted_for
                .as_bool(),
            Some(false)
        )
    }
}

impl Compare for CSOFirstSessionResults {
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
