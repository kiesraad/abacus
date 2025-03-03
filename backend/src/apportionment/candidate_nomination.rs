// TODO: #1046 Article P 15 assignment of seats to candidates that exceeded preference threshold
//  & Article P 17 assignment of seats to other candidates based on list position

// TODO: #1045 Article P 19 reordering of political group candidate list if seats have been assigned

use crate::apportionment::Fraction;
use crate::data_entry::CandidateVotes;
use crate::election::PGNumber;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Contains information about the chosen candidates and the candidate list ranking
/// for a specific political group.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct PoliticalGroupCandidateNomination {
    /// Political group number for which this nomination applies
    #[schema(value_type = u32)]
    pg_number: PGNumber,
    /// Political group name for which this nomination applies
    pub pg_name: String,
    /// The total number of seats assigned to this group
    pub total_seats: u64,
    /// The list of chosen candidates via preferential votes, can be empty  
    /// [Artikel P 15 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=3&artikel=P_15&z=2025-02-12&g=2025-02-12)
    pub preferential_candidate_nomination: Vec<CandidateVotes>,
    /// The list of other chosen candidates, can be empty  
    /// [Artikel P 17 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=3&artikel=P_17&z=2025-02-12&g=2025-02-12)
    pub other_candidate_nomination: Vec<CandidateVotes>,
    /// The ranking of the whole candidate list, can be empty  
    /// [Artikel P 19 Kieswet](https://wetten.overheid.nl/jci1.3:c:BWBR0004627&afdeling=II&hoofdstuk=P&paragraaf=3&artikel=P_19&z=2025-02-12&g=2025-02-12)
    pub candidate_ranking: Vec<CandidateVotes>,
}

/// The result of the candidate nomination procedure.  
/// This contains the preference threshold and percentage that was used.  
/// It contains a list of all chosen candidates in alphabetical order.  
/// It also contains the preferential nomination of candidates, the remaining
/// nomination of candidates and the final ranking of candidates for each political group.
#[derive(Debug, PartialEq, Serialize, Deserialize, ToSchema)]
pub struct CandidateNominationResult {
    /// Preference threshold number of votes
    pub preference_threshold: Fraction,
    /// Preference threshold percentage
    pub preference_threshold_percentage: u64,
    /// List of chosen candidates in alphabetical order
    pub chosen_candidates: Vec<CandidateVotes>,
    /// List of chosen candidates and candidate list ranking per political group
    pub political_group_candidate_nomination: Vec<PoliticalGroupCandidateNomination>,
}
