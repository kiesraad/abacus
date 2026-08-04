use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    field_path::FieldPath,
    results::{
        about_report::AboutReport, checks_and_corrections::ChecksAndCorrections,
        differences_counts::DifferencesCounts,
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
    /// About report ("Over het proces-verbaal")
    pub about_report: AboutReport,
    /// Checks and corrections ("Controles en correcties")
    pub checks_and_corrections: ChecksAndCorrections,
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
        self.about_report.compare(
            &first_entry.about_report,
            different_fields,
            &path.field("about_report"),
        );

        self.checks_and_corrections.compare(
            &first_entry.checks_and_corrections,
            different_fields,
            &path.field("checks_and_corrections"),
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
