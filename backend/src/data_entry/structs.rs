use std::{collections::HashSet, ops::AddAssign};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Json};
use utoipa::ToSchema;
pub use yes_no::YesNo;

use super::status::{DataEntryStatus, DataEntryStatusName};
use crate::{
    APIError,
    domain::committee_session::CommitteeSessionId,
    election::{CandidateNumber, PGNumber, PoliticalGroup},
    error::ErrorReference,
    infra::audit_log::{DataEntryDetails, ResultDetails},
    polling_station::PollingStationId,
};

#[derive(Serialize, Deserialize, Clone, ToSchema, Debug, FromRow, Default)]
#[serde(deny_unknown_fields)]
pub struct PollingStationDataEntry {
    pub polling_station_id: PollingStationId,
    pub committee_session_id: CommitteeSessionId,
    #[schema(value_type = DataEntryStatus)]
    pub state: Json<DataEntryStatus>,
    #[schema(value_type = String)]
    pub updated_at: DateTime<Utc>,
}

impl From<PollingStationDataEntry> for DataEntryDetails {
    fn from(value: PollingStationDataEntry) -> Self {
        let state = value.state.0;

        Self {
            polling_station_id: value.polling_station_id,
            committee_session_id: value.committee_session_id,
            data_entry_status: state.status_name().to_string(),
            data_entry_progress: format!("{}%", state.get_progress()),
            finished_at: state.finished_at().cloned(),
            first_entry_user_id: state.get_first_entry_user_id(),
            second_entry_user_id: state.get_second_entry_user_id(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, ToSchema, Debug, FromRow)]
#[serde(deny_unknown_fields)]
pub struct PollingStationResult {
    pub polling_station_id: PollingStationId,
    pub committee_session_id: CommitteeSessionId,
    #[schema(value_type = PollingStationResults)]
    pub data: Json<PollingStationResults>,
    #[schema(value_type = String)]
    pub created_at: DateTime<Utc>,
}

impl From<PollingStationResult> for ResultDetails {
    fn from(value: PollingStationResult) -> Self {
        Self {
            polling_station_id: value.polling_station_id,
            committee_session_id: value.committee_session_id,
            created_at: value.created_at,
        }
    }
}

/// PollingStationResults contains the results for a polling station.
///
/// The exact type of results depends on the election counting method and
/// whether this is the first or any subsequent data entry session. Based on
/// this, any of four different models can apply
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(tag = "model")]
pub enum PollingStationResults {
    /// Results for centrally counted (CSO) elections, first election committee session.
    /// This contains the data entry values from Model Na 31-2 Bijlage 2.
    CSOFirstSession(CSOFirstSessionResults),
    /// Results for centrally counted (CSO) elections, any subsequent election committee session.
    /// This contains the data entry values from Model Na 14-2 Bijlage 1.
    CSONextSession(CSONextSessionResults),
}

impl PollingStationResults {
    /// Get a reference to the inner CSOFirstSessionResults, if this is of that type.
    pub fn as_cso_first_session(&self) -> Option<&CSOFirstSessionResults> {
        match self {
            PollingStationResults::CSOFirstSession(results) => Some(results),
            _ => None,
        }
    }

    /// Get a mutable reference to the inner CSOFirstSessionResults, if this is of that type.
    pub fn as_cso_first_session_mut(&mut self) -> Option<&mut CSOFirstSessionResults> {
        match self {
            PollingStationResults::CSOFirstSession(results) => Some(results),
            _ => None,
        }
    }

    /// Consume self and return the inner CSOFirstSessionResults, if this is of that type.
    pub fn into_cso_first_session(self) -> Option<CSOFirstSessionResults> {
        match self {
            PollingStationResults::CSOFirstSession(results) => Some(results),
            _ => None,
        }
    }

    pub fn empty_cso_first_session(political_groups: &[PoliticalGroup]) -> Self {
        PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
            voters_counts: Default::default(),
            votes_counts: VotesCounts {
                political_group_total_votes:
                    PollingStationResults::default_political_group_total_votes(political_groups),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: PollingStationResults::default_political_group_votes(
                political_groups,
            ),
        })
    }

    pub fn empty_cso_next_session(political_groups: &[PoliticalGroup]) -> Self {
        PollingStationResults::CSONextSession(CSONextSessionResults {
            voters_counts: Default::default(),
            votes_counts: VotesCounts {
                political_group_total_votes:
                    PollingStationResults::default_political_group_total_votes(political_groups),
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: PollingStationResults::default_political_group_votes(
                political_groups,
            ),
        })
    }

    /// Get a reference to the inner CSONextSessionResults, if this is of that type.
    pub fn as_cso_next_session(&self) -> Option<&CSONextSessionResults> {
        match self {
            PollingStationResults::CSONextSession(results) => Some(results),
            _ => None,
        }
    }

    /// Get a mutable reference to the inner CSONextSessionResults, if this is of that type.
    pub fn as_cso_next_session_mut(&mut self) -> Option<&mut CSONextSessionResults> {
        match self {
            PollingStationResults::CSONextSession(results) => Some(results),
            _ => None,
        }
    }

    /// Consume self and return the inner CSONextSessionResults, if this is of that type.
    pub fn into_cso_next_session(self) -> Option<CSONextSessionResults> {
        match self {
            PollingStationResults::CSONextSession(results) => Some(results),
            _ => None,
        }
    }

    /// Common accessor for voter counts regardless of the underlying model.
    pub fn voters_counts(&self) -> &VotersCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &results.voters_counts,
            PollingStationResults::CSONextSession(results) => &results.voters_counts,
        }
    }

    /// Common mutable accessor for voter counts regardless of the underlying model.
    #[cfg(test)]
    pub fn voters_counts_mut(&mut self) -> &mut VotersCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &mut results.voters_counts,
            PollingStationResults::CSONextSession(results) => &mut results.voters_counts,
        }
    }

    /// Common accessor for votes counts regardless of the underlying model.
    pub fn votes_counts(&self) -> &VotesCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &results.votes_counts,
            PollingStationResults::CSONextSession(results) => &results.votes_counts,
        }
    }

    /// Common mutable accessor for votes counts regardless of the underlying model.
    #[cfg(test)]
    pub fn votes_counts_mut(&mut self) -> &mut VotesCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &mut results.votes_counts,
            PollingStationResults::CSONextSession(results) => &mut results.votes_counts,
        }
    }

    /// Common accessor for differences counts regardless of the underlying model.
    pub fn differences_counts(&self) -> &DifferencesCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &results.differences_counts,
            PollingStationResults::CSONextSession(results) => &results.differences_counts,
        }
    }

    /// Common mutable accessor for differences counts regardless of the underlying model.
    #[cfg(test)]
    pub fn differences_counts_mut(&mut self) -> &mut DifferencesCounts {
        match self {
            PollingStationResults::CSOFirstSession(results) => &mut results.differences_counts,
            PollingStationResults::CSONextSession(results) => &mut results.differences_counts,
        }
    }

    /// Common accessor for political group votes regardless of the underlying model.
    pub fn political_group_votes(&self) -> &[PoliticalGroupCandidateVotes] {
        match self {
            PollingStationResults::CSOFirstSession(results) => &results.political_group_votes,
            PollingStationResults::CSONextSession(results) => &results.political_group_votes,
        }
    }

    /// Common mutable accessor for political group votes regardless of the underlying model.
    #[cfg(test)]
    pub fn political_group_votes_mut(&mut self) -> &mut Vec<PoliticalGroupCandidateVotes> {
        match self {
            PollingStationResults::CSOFirstSession(results) => &mut results.political_group_votes,
            PollingStationResults::CSONextSession(results) => &mut results.political_group_votes,
        }
    }

    /// Convert to CommonPollingStationResults, which contains only the common fields.
    pub fn as_common(&self) -> CommonPollingStationResults {
        CommonPollingStationResults {
            voters_counts: self.voters_counts().clone(),
            votes_counts: self.votes_counts().clone(),
            differences_counts: self.differences_counts().clone(),
            political_group_votes: self.political_group_votes().to_vec(),
        }
    }

    /// Returns true if both are of the same model variant, false otherwise.
    pub fn is_same_model(&self, other: &Self) -> bool {
        matches!(
            (self, other),
            (
                PollingStationResults::CSOFirstSession(_),
                PollingStationResults::CSOFirstSession(_)
            ) | (
                PollingStationResults::CSONextSession(_),
                PollingStationResults::CSONextSession(_)
            )
        )
    }

    /// Create a default value for `political_group_votes` (type `Vec<PoliticalGroup>`)
    /// for the given political groups, with all votes set to 0.
    pub fn default_political_group_votes(
        political_groups: &[PoliticalGroup],
    ) -> Vec<PoliticalGroupCandidateVotes> {
        political_groups
            .iter()
            .map(|pg| PoliticalGroupCandidateVotes {
                number: pg.number,
                total: 0,
                candidate_votes: pg
                    .candidates
                    .iter()
                    .map(|c| CandidateVotes {
                        number: c.number,
                        votes: 0,
                    })
                    .collect(),
            })
            .collect()
    }

    /// Create a default value for `political_group_total_votes` in `votes_counts`
    pub fn default_political_group_total_votes(
        political_groups: &[PoliticalGroup],
    ) -> Vec<PoliticalGroupTotalVotes> {
        political_groups
            .iter()
            .map(|pg| PoliticalGroupTotalVotes {
                number: pg.number,
                total: 0,
            })
            .collect()
    }
}

/// CommonPollingStationResults contains the common fields for polling station results,
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct CommonPollingStationResults {
    /// Voters counts ("Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Differences counts ("Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
    /// Vote counts per list and candidate ("Aantal stemmen per lijst en kandidaat")
    pub political_group_votes: Vec<PoliticalGroupCandidateVotes>,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CommonPollingStationResultsWithoutVotes {
    /// Voters counts ("Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Differences counts ("Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
}

impl From<CommonPollingStationResults> for CommonPollingStationResultsWithoutVotes {
    fn from(value: CommonPollingStationResults) -> Self {
        Self {
            voters_counts: value.voters_counts,
            votes_counts: value.votes_counts,
            differences_counts: value.differences_counts,
        }
    }
}

/// CSOFirstSessionResults, following the fields in Model Na 31-2 Bijlage 2.
///
/// See "Model Na 31-2. Proces-verbaal van een gemeentelijk stembureau/stembureau voor het openbaar
/// lichaam in een gemeente/openbaar lichaam waar een centrale stemopneming wordt verricht,
/// Bijlage 2: uitkomsten per stembureau" from the
/// [Kiesregeling](https://wetten.overheid.nl/BWBR0034180/2026-01-01#Bijlage1_DivisieNa31.2) or
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

/// CSONextSessionResults, following the fields in Model Na 14-2 Bijlage 1.
///
/// See "Model Na 14-2. Corrigendum bij het proces-verbaal van een gemeentelijk stembureau/
/// stembureau voor het openbaar lichaam, Bijlage 1: uitkomsten per stembureau" from the
/// [Kiesregeling](https://wetten.overheid.nl/BWBR0034180/2026-01-01#Bijlage1_DivisieNa14.2) or
/// [Verkiezingstoolbox](https://www.rijksoverheid.nl/onderwerpen/verkiezingen/verkiezingentoolkit/modellen).
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct CSONextSessionResults {
    /// Voters counts ("Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Differences counts ("Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
    /// Vote counts per list and candidate ("Aantal stemmen per lijst en kandidaat")
    pub political_group_votes: Vec<PoliticalGroupCandidateVotes>,
}

pub type Count = u32;

/// Voters counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct VotersCounts {
    /// Number of valid poll cards ("Aantal geldige stempassen")
    #[schema(value_type = u32)]
    pub poll_card_count: Count,
    /// Number of valid proxy certificates ("Aantal geldige volmachtbewijzen")
    #[schema(value_type = u32)]
    pub proxy_certificate_count: Count,
    /// Total number of admitted voters ("Totaal aantal toegelaten kiezers")
    #[schema(value_type = u32)]
    pub total_admitted_voters_count: Count,
}

impl AddAssign<&VotersCounts> for VotersCounts {
    fn add_assign(&mut self, other: &Self) {
        self.poll_card_count += other.poll_card_count;
        self.proxy_certificate_count += other.proxy_certificate_count;
        self.total_admitted_voters_count += other.total_admitted_voters_count;
    }
}

/// Votes counts, part of the polling station results.
/// Following the fields in Model CSO Na 31-2 Bijlage 1.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct VotesCounts {
    /// Total votes per list
    pub political_group_total_votes: Vec<PoliticalGroupTotalVotes>,
    /// Total number of valid votes on candidates
    /// ("Totaal stemmen op kandidaten")
    #[schema(value_type = u32)]
    pub total_votes_candidates_count: Count,
    /// Number of blank votes ("Blanco stembiljetten")
    #[schema(value_type = u32)]
    pub blank_votes_count: Count,
    /// Number of invalid votes ("Ongeldige stembiljetten")
    #[schema(value_type = u32)]
    pub invalid_votes_count: Count,
    /// Total number of votes cast ("Totaal uitgebrachte stemmen")
    #[schema(value_type = u32)]
    pub total_votes_cast_count: Count,
}

impl VotesCounts {
    pub fn add(&mut self, other: &Self) -> Result<(), APIError> {
        // Get sets of political group numbers from both collections
        let self_numbers: HashSet<_> = self
            .political_group_total_votes
            .iter()
            .map(|pg| pg.number)
            .collect();
        let other_numbers: HashSet<_> = other
            .political_group_total_votes
            .iter()
            .map(|pg| pg.number)
            .collect();

        // Check that both have exactly the same political groups
        if self_numbers != other_numbers {
            let missing_in_self: Vec<_> = other_numbers.difference(&self_numbers).collect();
            let missing_in_other: Vec<_> = self_numbers.difference(&other_numbers).collect();

            if !missing_in_self.is_empty() {
                return Err(APIError::AddError(
                    format!(
                        "Political group(s) {missing_in_self:?} exist in source but not in target",
                    ),
                    ErrorReference::InvalidVoteGroup,
                ));
            }
            if !missing_in_other.is_empty() {
                return Err(APIError::AddError(
                    format!(
                        "Political group(s) {missing_in_other:?} exist in target but not in source",
                    ),
                    ErrorReference::InvalidVoteGroup,
                ));
            }
        }

        // Add totals of political groups with the same number
        for pg in &other.political_group_total_votes {
            if let Some(existing) = self
                .political_group_total_votes
                .iter_mut()
                .find(|e| e.number == pg.number)
            {
                existing.total += pg.total;
            }
        }

        self.total_votes_candidates_count += other.total_votes_candidates_count;
        self.blank_votes_count += other.blank_votes_count;
        self.invalid_votes_count += other.invalid_votes_count;
        self.total_votes_cast_count += other.total_votes_cast_count;

        Ok(())
    }
}

/// Differences counts, part of the polling station results.
/// (B1-3.3 "Verschillen tussen aantal kiezers en uitgebrachte stemmen")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct DifferencesCounts {
    /// Whether total of admitted voters and total of votes cast match.
    /// (B1-3.3.1 "Vergelijk D (totaal toegelaten kiezers) en H (totaal uitgebrachte stemmen)")
    pub compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters,
    /// Number of more counted ballots ("Aantal méér getelde stemmen (bereken: H min D)")
    #[schema(value_type = u32)]
    pub more_ballots_count: Count,
    /// Number of fewer counted ballots ("Aantal minder getelde stemmen (bereken: D min H)")
    #[schema(value_type = u32)]
    pub fewer_ballots_count: Count,
    /// Whether the difference between the total of admitted voters and total of votes cast is explained.
    /// (B1-3.3.2 "Zijn er tijdens de stemming dingen opgeschreven die het verschil tussen D en H volledig verklaren?")
    pub difference_completely_accounted_for: YesNo,
}

/// Compare votes cast admitted voters, part of the differences counts.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct DifferenceCountsCompareVotesCastAdmittedVoters {
    /// Whether total of admitted voters and total of votes cast match.
    /// ("D en H zijn gelijk")
    pub admitted_voters_equal_votes_cast: bool,
    /// Whether total of admitted voters is greater than total of votes cast match.
    /// ("H is groter dan D (meer uitgebrachte stemmen dan toegelaten kiezers)")
    pub votes_cast_greater_than_admitted_voters: bool,
    /// Whether total of admitted voters is less than total of votes cast match.
    /// ("H is kleiner dan D (minder uitgebrachte stemmen dan toegelaten kiezers)")
    pub votes_cast_smaller_than_admitted_voters: bool,
}

impl DifferencesCounts {
    pub fn zero() -> DifferencesCounts {
        DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 0,
            difference_completely_accounted_for: Default::default(),
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: false,
                votes_cast_greater_than_admitted_voters: false,
                votes_cast_smaller_than_admitted_voters: false,
            },
        }
    }
}

mod yes_no {
    use super::*;

    /// Yes/No response structure for boolean questions with separate yes and no fields.
    #[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
    #[serde(deny_unknown_fields)]
    pub struct YesNo {
        yes: bool,
        no: bool,
    }

    impl YesNo {
        pub fn new(yes: bool, no: bool) -> Self {
            Self { yes, no }
        }

        pub fn yes() -> Self {
            Self::new(true, false)
        }

        pub fn no() -> Self {
            Self::new(false, true)
        }

        pub fn both() -> Self {
            Self::new(true, true)
        }

        /// true if both `yes` and `no` are false
        pub fn is_empty(&self) -> bool {
            !self.yes && !self.no
        }

        /// true if both `yes` and `no` are true
        pub fn is_both(&self) -> bool {
            self.yes && self.no
        }

        /// Some(true) if `yes` is true and `no` is false,
        /// Some(false) if `yes` is false and `no` is true, otherwise None
        pub fn as_bool(&self) -> Option<bool> {
            match (self.yes, self.no) {
                (true, false) => Some(true),
                (false, true) => Some(false),
                _ => None,
            }
        }
    }
}

/// Extra investigation, part of the polling station results ("B1-1 Alleen bij extra onderzoek")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct ExtraInvestigation {
    /// Whether extra investigation was done for another reason than an unexplained difference
    /// ("Heeft het gemeentelijk stembureau extra onderzoek gedaan vanwege een andere reden dan een onverklaard verschil?")
    pub extra_investigation_other_reason: YesNo,
    /// Whether ballots were (partially) recounted following the extra investigation
    /// ("Zijn de stembiljetten naar aanleiding van het extra onderzoek (gedeeltelijk) herteld?")
    pub ballots_recounted_extra_investigation: YesNo,
}

/// Counting Differences Polling Station,
/// part of the polling station results ("B1-2 Verschillen met telresultaten van het stembureau")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct CountingDifferencesPollingStation {
    /// Whether there was an unexplained difference between the number of voters and votes
    /// ("Was er in de telresultaten van het stembureau een onverklaard verschil tussen het totaal aantal getelde stembiljetten en het aantal toegelaten kiezers?")
    pub unexplained_difference_ballots_voters: YesNo,
    /// Whether there was a difference between the total votes per list as determined by the polling station and by the typist
    /// ("Is er een verschil tussen het totaal aantal getelde stembiljetten per lijst zoals eerder vastgesteld door het stembureau en zoals door u geteld op het gemeentelijk stembureau?")
    pub difference_ballots_per_list: YesNo,
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroupCandidateVotes {
    #[schema(value_type = u32)]
    pub number: PGNumber,
    #[schema(value_type = u32)]
    pub total: Count,
    pub candidate_votes: Vec<CandidateVotes>,
}

impl PoliticalGroupCandidateVotes {
    pub fn add(&mut self, other: &Self) -> Result<(), APIError> {
        if self.number != other.number {
            return Err(APIError::AddError(
                format!(
                    "Attempted to add votes of group '{}' to '{}'",
                    other.number, self.number
                ),
                ErrorReference::InvalidVoteGroup,
            ));
        }

        self.total += other.total;

        for cv in other.candidate_votes.iter() {
            let Some(found_can) = self
                .candidate_votes
                .iter_mut()
                .find(|c| c.number == cv.number)
            else {
                return Err(APIError::AddError(
                    format!(
                        "Attempted to add candidate '{}' votes in group '{}', but no such candidate exists",
                        cv.number, self.number
                    ),
                    ErrorReference::InvalidVoteCandidate,
                ));
            };
            found_can.votes += cv.votes;
        }

        Ok(())
    }

    /// Create `PoliticalGroupCandidateVotes` from test data with candidate numbers automatically generated starting from 1.
    #[cfg(test)]
    pub fn from_test_data_auto(number: PGNumber, candidate_votes: &[Count]) -> Self {
        PoliticalGroupCandidateVotes {
            number,
            total: candidate_votes.iter().sum(),
            candidate_votes: candidate_votes
                .iter()
                .enumerate()
                .map(|(i, votes)| CandidateVotes {
                    number: CandidateNumber::try_from(i + 1).unwrap(),
                    votes: *votes,
                })
                .collect(),
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroupTotalVotes {
    #[schema(value_type = u32)]
    pub number: PGNumber,
    #[schema(value_type = u32)]
    pub total: Count,
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct CandidateVotes {
    #[schema(value_type = u32)]
    pub number: CandidateNumber,
    #[schema(value_type = u32)]
    pub votes: Count,
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryStatusResponse {
    pub status: DataEntryStatusName,
}

impl From<PollingStationDataEntry> for DataEntryStatusResponse {
    fn from(data_entry: PollingStationDataEntry) -> Self {
        DataEntryStatusResponse {
            status: data_entry.state.0.status_name(),
        }
    }
}

impl From<DataEntryStatus> for DataEntryStatusResponse {
    fn from(data_entry_status: DataEntryStatus) -> Self {
        DataEntryStatusResponse {
            status: data_entry_status.status_name(),
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    pub trait ValidDefault {
        fn valid_default() -> Self;
    }

    impl ValidDefault for ExtraInvestigation {
        fn valid_default() -> Self {
            Self {
                extra_investigation_other_reason: YesNo::default(),
                ballots_recounted_extra_investigation: YesNo::default(),
            }
        }
    }

    impl ValidDefault for CountingDifferencesPollingStation {
        fn valid_default() -> Self {
            Self {
                unexplained_difference_ballots_voters: YesNo::no(),
                difference_ballots_per_list: YesNo::no(),
            }
        }
    }

    impl ValidDefault for DifferencesCounts {
        fn valid_default() -> Self {
            Self {
                compare_votes_cast_admitted_voters: {
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: true,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    }
                },
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                difference_completely_accounted_for: YesNo::yes(),
            }
        }
    }

    pub fn example_polling_station_results() -> PollingStationResults {
        PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 99,
                proxy_certificate_count: 1,
                total_admitted_voters_count: 100,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 56,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 40,
                    },
                ],
                total_votes_candidates_count: 96,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 100,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: true,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: YesNo::yes(),
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[36, 20]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[30, 10]),
            ],
        })
    }

    impl PollingStationResults {
        pub fn with_warning(mut self) -> Self {
            let extra_blank_votes: Count = 100;

            let voters_counts = self.voters_counts_mut();
            voters_counts.poll_card_count += extra_blank_votes;
            voters_counts.total_admitted_voters_count += extra_blank_votes;

            let votes_counts = self.votes_counts_mut();
            votes_counts.blank_votes_count += extra_blank_votes;
            votes_counts.total_votes_cast_count += extra_blank_votes;

            self
        }

        pub fn with_error(mut self) -> Self {
            let voters_counts = self.voters_counts_mut();
            voters_counts.poll_card_count = 10;
            voters_counts.proxy_certificate_count = 10;
            voters_counts.total_admitted_voters_count = 80;

            self
        }

        pub fn with_difference(mut self) -> Self {
            let extra_proxy_certificate: Count = 10;

            let voters_counts = self.voters_counts_mut();
            voters_counts.poll_card_count -= extra_proxy_certificate;
            voters_counts.proxy_certificate_count += extra_proxy_certificate;

            self
        }
    }

    mod polling_station_results {
        use crate::data_entry::PollingStationResults;

        #[test]
        fn test_cso_first_session_as() {
            let cso_first_session = PollingStationResults::CSOFirstSession(Default::default());
            assert!(cso_first_session.as_cso_first_session().is_some());
            assert!(cso_first_session.as_cso_next_session().is_none());
            assert!(
                cso_first_session
                    .clone()
                    .as_cso_first_session_mut()
                    .is_some()
            );
            assert!(
                cso_first_session
                    .clone()
                    .as_cso_next_session_mut()
                    .is_none()
            );
        }

        #[test]
        fn test_cso_next_session_as() {
            let cso_next_session = PollingStationResults::CSONextSession(Default::default());
            assert!(cso_next_session.as_cso_first_session().is_none());
            assert!(cso_next_session.as_cso_next_session().is_some());

            assert!(
                cso_next_session
                    .clone()
                    .as_cso_first_session_mut()
                    .is_none()
            );
            assert!(cso_next_session.clone().as_cso_next_session_mut().is_some());
        }

        #[test]
        fn test_cso_first_session_into() {
            let cso_first_session = PollingStationResults::CSOFirstSession(Default::default());
            assert!(cso_first_session.clone().into_cso_first_session().is_some());
            assert!(cso_first_session.clone().into_cso_next_session().is_none());
        }

        #[test]
        fn test_cso_next_session_into() {
            let cso_next_session = PollingStationResults::CSONextSession(Default::default());
            assert!(cso_next_session.clone().into_cso_first_session().is_none());
            assert!(cso_next_session.clone().into_cso_next_session().is_some());
        }
    }

    mod votes_counts {
        use crate::{
            APIError,
            data_entry::{PoliticalGroupTotalVotes, VotesCounts},
            election::PGNumber,
            error::ErrorReference,
        };

        #[test]
        fn test_votes_addition() {
            let mut curr_votes = VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 10,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 20,
                    },
                ],
                total_votes_candidates_count: 2,
                blank_votes_count: 3,
                invalid_votes_count: 4,
                total_votes_cast_count: 9,
            };

            curr_votes
                .add(&VotesCounts {
                    political_group_total_votes: vec![
                        PoliticalGroupTotalVotes {
                            number: PGNumber::from(1),
                            total: 11,
                        },
                        PoliticalGroupTotalVotes {
                            number: PGNumber::from(2),
                            total: 12,
                        },
                    ],
                    total_votes_candidates_count: 1,
                    blank_votes_count: 2,
                    invalid_votes_count: 3,
                    total_votes_cast_count: 5,
                })
                .unwrap();

            assert_eq!(curr_votes.political_group_total_votes.len(), 2);
            assert_eq!(curr_votes.political_group_total_votes[0].total, 21);
            assert_eq!(curr_votes.political_group_total_votes[1].total, 32);

            assert_eq!(curr_votes.total_votes_candidates_count, 3);
            assert_eq!(curr_votes.blank_votes_count, 5);
            assert_eq!(curr_votes.invalid_votes_count, 7);
            assert_eq!(curr_votes.total_votes_cast_count, 14);
        }

        #[test]
        fn test_votes_addition_error() {
            let mut curr_votes = VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(1),
                    total: 10,
                }],
                total_votes_candidates_count: 2,
                blank_votes_count: 3,
                invalid_votes_count: 4,
                total_votes_cast_count: 9,
            };

            let mut other = VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(2),
                    total: 20,
                }],
                total_votes_candidates_count: 1,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 5,
            };

            let result = curr_votes.add(&other);
            assert!(matches!(
                result,
                Err(APIError::AddError(_, ErrorReference::InvalidVoteGroup))
            ));

            let result = other.add(&curr_votes);
            assert!(matches!(
                result,
                Err(APIError::AddError(_, ErrorReference::InvalidVoteGroup))
            ));
        }
    }

    mod voters_counts {
        use crate::data_entry::VotersCounts;

        #[test]
        fn test_voters_addition() {
            let mut curr_votes = VotersCounts {
                poll_card_count: 2,
                proxy_certificate_count: 3,
                total_admitted_voters_count: 9,
            };

            curr_votes += &VotersCounts {
                poll_card_count: 1,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 5,
            };

            assert_eq!(curr_votes.poll_card_count, 3);
            assert_eq!(curr_votes.proxy_certificate_count, 5);
            assert_eq!(curr_votes.total_admitted_voters_count, 14);
        }
    }
}
