use crate::{data_entry::status::DataEntryStatus, error::ErrorReference, APIError};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Json, FromRow};
use std::ops::AddAssign;
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema, Debug, FromRow, Default)]
pub struct PollingStationDataEntry {
    pub polling_station_id: u32,
    #[schema(value_type = DataEntryStatus)]
    pub state: Json<DataEntryStatus>,
    #[schema(value_type = String)]
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct PollingStationResultsEntry {
    pub polling_station_id: u32,
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
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
pub struct PollingStationResults {
    /// Recounted ("Is er herteld? - See form for official long description of the checkbox")
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub recounted: Option<bool>,
    /// Voters counts ("1. Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("2. Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Voters recounts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    /// When filled in, this field should replace `voters_counts` when using the results.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub voters_recounts: Option<VotersCounts>,
    /// Differences counts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
    /// Vote counts per list and candidate (5. "Aantal stemmen per lijst en kandidaat")
    pub political_group_votes: Vec<PoliticalGroupVotes>,
}

impl PollingStationResults {
    /// This returns the recounts if those are available, otherwise it returns the normal voters counts
    pub fn latest_voters_counts(&self) -> &VotersCounts {
        self.voters_recounts.as_ref().unwrap_or(&self.voters_counts)
    }
}

pub type Count = u32;

/// Voters counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
pub struct VotersCounts {
    /// Number of valid poll cards ("Aantal geldige stempassen")
    #[schema(value_type = u32)]
    pub poll_card_count: Count,
    /// Number of valid proxy certificates ("Aantal geldige volmachtbewijzen")
    #[schema(value_type = u32)]
    pub proxy_certificate_count: Count,
    /// Number of valid voter cards ("Aantal geldige kiezerspassen")
    #[schema(value_type = u32)]
    pub voter_card_count: Count,
    /// Total number of admitted voters ("Totaal aantal toegelaten kiezers")
    #[schema(value_type = u32)]
    pub total_admitted_voters_count: Count,
}

impl AddAssign<&VotersCounts> for VotersCounts {
    fn add_assign(&mut self, other: &Self) {
        self.poll_card_count += other.poll_card_count;
        self.proxy_certificate_count += other.proxy_certificate_count;
        self.voter_card_count += other.voter_card_count;
        self.total_admitted_voters_count += other.total_admitted_voters_count;
    }
}

/// Votes counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
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
pub struct DifferencesCounts {
    /// Number of more counted ballots ("Er zijn méér stembiljetten geteld. Hoeveel stembiljetten zijn er meer geteld?")
    #[schema(value_type = u32)]
    pub more_ballots_count: Count,
    /// Number of fewer counted ballots ("Er zijn minder stembiljetten geteld. Hoeveel stembiljetten zijn er minder geteld")
    #[schema(value_type = u32)]
    pub fewer_ballots_count: Count,
    /// Number of unreturned ballots ("Hoe vaak heeft een kiezer het stembiljet niet ingeleverd?")
    #[schema(value_type = u32)]
    pub unreturned_ballots_count: Count,
    /// Number of fewer ballots handed out ("Hoe vaak is er een stembiljet te weinig uitgereikt?")
    #[schema(value_type = u32)]
    pub too_few_ballots_handed_out_count: Count,
    /// Number of more ballots handed out ("Hoe vaak is er een stembiljet te veel uitgereikt?")
    #[schema(value_type = u32)]
    pub too_many_ballots_handed_out_count: Count,
    /// Number of other explanations ("Hoe vaak is er een andere verklaring voor het verschil?")
    #[schema(value_type = u32)]
    pub other_explanation_count: Count,
    /// Number of no explanations ("Hoe vaak is er geen verklaring voor het verschil?")
    #[schema(value_type = u32)]
    pub no_explanation_count: Count,
}

#[cfg(test)]
impl DifferencesCounts {
    pub fn zero() -> DifferencesCounts {
        DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 0,
            unreturned_ballots_count: 0,
            too_few_ballots_handed_out_count: 0,
            too_many_ballots_handed_out_count: 0,
            other_explanation_count: 0,
            no_explanation_count: 0,
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
pub struct PoliticalGroupVotes {
    pub number: u32,
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
                    format!("Attempted to add candidate '{}' votes in group '{}', but no such candidate exists", cv.number, self.number),
                    ErrorReference::InvalidVoteCandidate,
                ));
            };
            found_can.votes += cv.votes;
        }

        Ok(())
    }

    /// Create `PoliticalGroupVotes` from test data.
    #[cfg(test)]
    pub fn from_test_data(
        number: u32,
        total_count: Count,
        candidate_votes: &[(u32, Count)],
    ) -> Self {
        PoliticalGroupVotes {
            number,
            total: total_count,
            candidate_votes: candidate_votes
                .iter()
                .map(|(number, votes)| CandidateVotes {
                    number: *number,
                    votes: *votes,
                })
                .collect(),
        }
    }

    /// Create `PoliticalGroupVotes` from test data with candidate numbers automatically generated starting from 1.
    #[cfg(test)]
    pub fn from_test_data_auto(number: u32, total_count: Count, candidate_votes: &[Count]) -> Self {
        Self::from_test_data(
            number,
            total_count,
            &candidate_votes
                .iter()
                .enumerate()
                .map(|(i, votes)| (u32::try_from(i + 1).unwrap(), *votes))
                .collect::<Vec<_>>(),
        )
    }
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct CandidateVotes {
    pub number: u32,
    #[schema(value_type = u32)]
    pub votes: Count,
}

#[cfg(test)]
mod tests {
    use super::*;
    use test_log::test;

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
            voter_card_count: 4,
            total_admitted_voters_count: 9,
        };

        curr_votes += &VotersCounts {
            poll_card_count: 1,
            proxy_certificate_count: 2,
            voter_card_count: 3,
            total_admitted_voters_count: 5,
        };

        assert_eq!(curr_votes.poll_card_count, 3);
        assert_eq!(curr_votes.proxy_certificate_count, 5);
        assert_eq!(curr_votes.voter_card_count, 7);
        assert_eq!(curr_votes.total_admitted_voters_count, 14);
    }
}
