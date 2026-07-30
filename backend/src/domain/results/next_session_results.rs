use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    differences_counts::DifferencesCounts,
    political_group_candidate_votes::PoliticalGroupCandidateVotes, voters_counts::VotersCounts,
    votes_counts::VotesCounts,
};
use crate::domain::{compare::Compare, field_path::FieldPath};

/// NextSessionResults, following the fields in Model Na 14-2 Bijlage 1/Na 14-1 versie 2.
///
/// See "Model Na 14-2. Corrigendum bij het proces-verbaal van een gemeentelijk stembureau/
/// stembureau voor het openbaar lichaam, Bijlage 1: uitkomsten per stembureau" from
/// https://www.kiesraad.nl/documenten/2025/11/27/na-14-2-corrigendum-gsb-inclusief-bijlage-voor-cso).
/// See also "Model Na 14-1 (Corrigendum bij het proces-verbaal van een stembureau)"
/// https://www.kiesraad.nl/documenten/2025/11/27/model-na-14-1.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct NextSessionResults {
    /// Voters counts ("Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Differences counts ("Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
    /// Vote counts per list and candidate ("Aantal stemmen per lijst en kandidaat")
    pub political_group_votes: Vec<PoliticalGroupCandidateVotes>,
}

impl Compare for NextSessionResults {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
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
