use std::ops::AddAssign;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Json};
use utoipa::ToSchema;

use super::status::{DataEntryStatus, DataEntryStatusName};
use crate::{
    APIError,
    audit_log::DataEntryDetails,
    election::{CandidateNumber, PGNumber, PoliticalGroup},
    error::ErrorReference,
};

#[derive(Serialize, Deserialize, Clone, ToSchema, Debug, FromRow, Default)]
#[serde(deny_unknown_fields)]
pub struct PollingStationDataEntry {
    pub polling_station_id: u32,
    pub committee_session_id: u32,
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
            data_entry_status: state.status_name().to_string(),
            data_entry_progress: state.get_progress(),
            finished_at: state.finished_at().cloned(),
            first_entry_user_id: state.get_first_entry_user_id(),
            second_entry_user_id: state.get_second_entry_user_id(),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct PollingStationResultsEntry {
    pub polling_station_id: u32,
    pub committee_session_id: u32,
    pub data: PollingStationResults,
    pub created_at: DateTime<Utc>,
}

/// PollingStationResults, following the fields in Model Na 31-2 Bijlage 2.
///
/// See "Model Na 31-2. Proces-verbaal van een gemeentelijk stembureau/stembureau voor het openbaar
/// lichaam in een gemeente/openbaar lichaam waar een centrale stemopneming wordt verricht,
/// Bijlage 2: uitkomsten per stembureau" from the
/// [Kiesregeling](https://wetten.overheid.nl/BWBR0034180/2024-04-01#Bijlage1_DivisieNa31.2) or
/// [Verkiezingstoolbox](https://www.rijksoverheid.nl/onderwerpen/verkiezingen/verkiezingentoolkit/modellen).
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PollingStationResults {
    /// Extra investigation ("B1-1 Extra onderzoek")
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
    pub political_group_votes: Vec<PoliticalGroupVotes>,
}

impl PollingStationResults {
    /// Create a default value for `political_group_votes` (type `Vec<PoliticalGroup>`)
    /// for the given political groups, with all votes set to 0.
    pub fn default_political_group_votes(
        political_groups: &[PoliticalGroup],
    ) -> Vec<PoliticalGroupVotes> {
        political_groups
            .iter()
            .map(|pg| PoliticalGroupVotes {
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
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct VotesCounts {
    /// Number of valid votes on candidates
    /// ("Aantal stembiljetten met een geldige stem op een kandidaat")
    #[schema(value_type = u32)]
    pub votes_candidates_count: Count,
    /// Number of blank votes ("Aantal blanco stembiljetten")
    #[schema(value_type = u32)]
    pub blank_votes_count: Count,
    /// Number of invalid votes ("Aantal ongeldige stembiljetten")
    #[schema(value_type = u32)]
    pub invalid_votes_count: Count,
    /// Total number of votes cast ("Totaal aantal getelde stemmen")
    #[schema(value_type = u32)]
    pub total_votes_cast_count: Count,
}

impl AddAssign<&VotesCounts> for VotesCounts {
    fn add_assign(&mut self, other: &Self) {
        self.votes_candidates_count += other.votes_candidates_count;
        self.blank_votes_count += other.blank_votes_count;
        self.invalid_votes_count += other.invalid_votes_count;
        self.total_votes_cast_count += other.total_votes_cast_count;
    }
}

/// Differences counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct DifferencesCounts {
    /// Number of more counted ballots ("Er zijn méér stembiljetten geteld. Hoeveel stembiljetten zijn er meer geteld?")
    #[schema(value_type = u32)]
    pub more_ballots_count: Count,
    /// Number of fewer counted ballots ("Er zijn minder stembiljetten geteld. Hoeveel stembiljetten zijn er minder geteld")
    #[schema(value_type = u32)]
    pub fewer_ballots_count: Count,
    /// Whether total of admitted voters and total of votes cast match.
    /// ("D en H zijn gelijk")
    pub admitted_voters_equals_votes_cast: YesNo,
    /// Whether total of admitted voters is greater than total of votes cast match.
    /// ("H is groter dan D (meer uitgebrachte stemmen dan toegelaten kiezers)")
    pub votes_cast_greater_than_admitted_voters: YesNo,
    /// Whether total of admitted voters is less than total of votes cast match.
    /// ("H is kleiner dan D (minder uitgebrachte stemmen dan toegelaten kiezers)")
    pub votes_cast_smaller_than_admitted_voters: YesNo,
    /// Whether the difference between the total of admitted voters and total of votes cast is explained.
    /// ("Verschil tussen D en H volledig verklaard?")
    pub difference_completely_accounted_for: YesNo,
}

impl DifferencesCounts {
    pub fn zero() -> DifferencesCounts {
        DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 0,
            admitted_voters_equals_votes_cast: Default::default(),
            votes_cast_greater_than_admitted_voters: Default::default(),
            votes_cast_smaller_than_admitted_voters: Default::default(),
            difference_completely_accounted_for: Default::default(),
        }
    }
}

/// Yes/No response structure for boolean questions with separate yes and no fields.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct YesNo {
    pub yes: bool,
    pub no: bool,
}

/// Extra investigation, part of the polling station results ("B1-1 Extra onderzoek")
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
    /// ("Was er in de telresultaten van het stembureau een onverklaard verschil tussen het totaal aantal getelde stembiljetten het aantal toegelaten kiezers?")
    pub unexplained_difference_ballots_voters: YesNo,
    /// Whether there was a difference between the total votes per list as determined by the polling station and by the typist
    /// ("Is er een verschil tussen het totaal aantal getelde stembiljetten per lijst zoals eerder vastgesteld door het stembureau en zoals door u geteld op het gemeentelijk stembureau?")
    pub difference_ballots_per_list: YesNo,
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroupVotes {
    #[schema(value_type = u32)]
    pub number: PGNumber,
    #[schema(value_type = u32)]
    pub total: Count,
    pub candidate_votes: Vec<CandidateVotes>,
}

impl PoliticalGroupVotes {
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

    /// Create `PoliticalGroupVotes` from test data with candidate numbers automatically generated starting from 1.
    #[cfg(test)]
    pub fn from_test_data_auto(number: PGNumber, candidate_votes: &[Count]) -> Self {
        PoliticalGroupVotes {
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

#[derive(Serialize, Deserialize, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct CandidateVotes {
    #[schema(value_type = u32)]
    pub number: CandidateNumber,
    #[schema(value_type = u32)]
    pub votes: Count,
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

    #[test]
    fn test_votes_addition() {
        let mut curr_votes = VotesCounts {
            votes_candidates_count: 2,
            blank_votes_count: 3,
            invalid_votes_count: 4,
            total_votes_cast_count: 9,
        };

        curr_votes += &VotesCounts {
            votes_candidates_count: 1,
            blank_votes_count: 2,
            invalid_votes_count: 3,
            total_votes_cast_count: 5,
        };

        assert_eq!(curr_votes.votes_candidates_count, 3);
        assert_eq!(curr_votes.blank_votes_count, 5);
        assert_eq!(curr_votes.invalid_votes_count, 7);
        assert_eq!(curr_votes.total_votes_cast_count, 14);
    }

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
