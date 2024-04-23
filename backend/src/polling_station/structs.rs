use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// PollingStationResults, following the fields in
/// "Model N 10-1. Proces-verbaal van een stembureau"
/// <https://wetten.overheid.nl/BWBR0034180/2023-11-01#Bijlage1_DivisieN10.1>
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PollingStationResults {
    /// Voters counts ("3. Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("4. Aantal uitgebrachte stemmen")
    pub votes_counts: VotesCounts,
}

/// Voters counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotersCounts {
    /// Number of valid poll cards ("Aantal geldige stempassen")
    pub poll_card_count: u32,
    /// Number of valid proxy certificates ("Aantal geldige volmachtbewijzen")
    pub proxy_certificate_count: u32,
    /// Number of valid voter cards ("Aantal geldige kiezerspassen")
    pub voter_card_count: u32,
    /// Total number of admitted voters ("Totaal aantal toegelaten kiezers")
    pub total_admitted_voters_count: u32,
}

/// Votes counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotesCounts {
    /// Number of valid votes on candidates
    /// ("Aantal stembiljetten met een geldige stem op een kandidaat")
    pub votes_candidates_counts: u32,
    /// Number of blank votes ("Aantal blanco stembiljetten")
    pub blank_votes_count: u32,
    /// Number of invalid votes ("Aantal ongeldige stembiljetten")
    pub invalid_votes_count: u32,
    /// Total number of votes cast ("Totaal aantal getelde stemmen")
    pub total_votes_cast_count: u32,
}
