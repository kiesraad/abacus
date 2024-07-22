use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::election::Election;
use crate::validation::{
    above_percentage_threshold, ValidationResult, ValidationResultCode, ValidationResults,
};

pub trait Validate {
    fn validate(
        &self,
        election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    );
}

/// Polling station of a certain [Election]
#[derive(Serialize, Deserialize, ToSchema, Debug, FromRow)]
pub struct PollingStation {
    pub id: i64,
    pub name: String,
    pub number: i64,
    pub number_of_voters: Option<i64>,
    pub polling_station_type: PollingStationType,
    pub street: String,
    pub house_number: String,
    pub house_number_addition: Option<String>,
    pub postal_code: String,
    pub locality: String,
}

/// Type of Polling station
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, Type)]
pub enum PollingStationType {
    VasteLocatie,
    Bijzonder,
    Mobiel,
}

impl From<String> for PollingStationType {
    fn from(value: String) -> Self {
        match value.as_str() {
            "vaste_locatie" => Self::VasteLocatie,
            "bijzonder" => Self::Bijzonder,
            "mobiel" => Self::Mobiel,
            _ => panic!("invalid PollingStationType"),
        }
    }
}

/// PollingStationResults, following the fields in
/// "Model Na 31-2. Proces-verbaal van een gemeentelijk stembureau/stembureau voor het openbaar lichaam
///  in een gemeente/openbaar lichaam waar een centrale stemopneming wordt verricht"
/// "Bijlage 2: uitkomsten per stembureau"
///  <https://wetten.overheid.nl/BWBR0034180/2023-11-01#Bijlage1_DivisieNa31.2
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PollingStationResults {
    /// Recounted ("Is er herteld? - See form for official long description of the checkbox")
    pub recounted: bool,
    /// Voters counts ("1. Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("2. Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Voters recounts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub voters_recounts: Option<VotersRecounts>,
    /// Differences counts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
    /// Vote counts per list and candidate (5. "Aantal stemmen per lijst en kandidaat")
    pub political_group_votes: Vec<PoliticalGroupVotes>,
}

impl Validate for PollingStationResults {
    fn validate(
        &self,
        election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) {
        // TODO: This needs to be implemented differently, because once you submit empty fields this
        //  error does not trigger, while it does trigger when you arrive at the empty Voters and Votes page
        // if self.recounted && self.voters_recounts.is_none() {
        //     validation_results.errors.push(ValidationResult {
        //         fields: vec![
        //             format!("{field_name}.voters_recounts.poll_card_recount"),
        //             format!("{field_name}.voters_recounts.proxy_certificate_recount"),
        //             format!("{field_name}.voters_recounts.voter_card_recount"),
        //             format!("{field_name}.voters_recounts.total_admitted_voters_recount"),
        //         ],
        //         code: ValidationResultCode::MissingRecounts,
        //     });
        // }

        self.voters_counts.validate(
            election,
            validation_results,
            format!("{field_name}.voters_counts"),
        );
        self.votes_counts.validate(
            election,
            validation_results,
            format!("{field_name}.votes_counts"),
        );
        if let Some(voters_recounts) = &self.voters_recounts {
            voters_recounts.validate(
                election,
                validation_results,
                format!("{field_name}.votes_recounts"),
            );
            if identical_voters_recounts_and_votes_counts(voters_recounts, &self.votes_counts) {
                validation_results.warnings.push(ValidationResult {
                    fields: vec![
                        format!("{field_name}.voters_recounts"),
                        format!("{field_name}.votes_counts"),
                    ],
                    code: ValidationResultCode::EqualInput,
                });
            }
        };

        self.political_group_votes.validate(
            election,
            validation_results,
            format!("{field_name}.political_group_votes"),
        );

        if identical_voters_counts_and_votes_counts(&self.voters_counts, &self.votes_counts) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.voters_counts"),
                    format!("{field_name}.votes_counts"),
                ],
                code: ValidationResultCode::EqualInput,
            });
        }

        // F.13 validate that the total number of valid votes is equal to the sum of all political group totals
        if self.votes_counts.votes_candidates_counts as u64
            != self
                .political_group_votes
                .iter()
                .map(|pgv| pgv.total as u64)
                .sum::<u64>()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.votes_counts.votes_candidates_counts"),
                    format!("{field_name}.political_group_votes"),
                ],
                code: ValidationResultCode::IncorrectTotal,
            });
        }
    }
}

type Count = u32;

impl Validate for Count {
    fn validate(
        &self,
        _election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) {
        if self > &1_000_000_000 {
            validation_results.errors.push(ValidationResult {
                fields: vec![field_name],
                code: ValidationResultCode::OutOfRange,
            });
        }
    }
}

/// Voters counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
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

/// Check if all voters counts and votes counts are equal to zero.
/// Used in validations where this is an edge case that needs to be handled.
fn all_zero_voters_counts_and_votes_counts(voters: &VotersCounts, votes: &VotesCounts) -> bool {
    voters.poll_card_count == 0
        && voters.proxy_certificate_count == 0
        && voters.voter_card_count == 0
        && voters.total_admitted_voters_count == 0
        && votes.votes_candidates_counts == 0
        && votes.blank_votes_count == 0
        && votes.invalid_votes_count == 0
        && votes.total_votes_cast_count == 0
}

/// Check if the voters counts and votes counts are identical, which should result in a warning.
///
/// This is not implemented as Eq because there is no true equality relation
/// between these two sets of numbers.
fn identical_voters_counts_and_votes_counts(voters: &VotersCounts, votes: &VotesCounts) -> bool {
    !all_zero_voters_counts_and_votes_counts(voters, votes)
        && voters.poll_card_count == votes.votes_candidates_counts
        && voters.proxy_certificate_count == votes.blank_votes_count
        && voters.voter_card_count == votes.invalid_votes_count
        && voters.total_admitted_voters_count == votes.total_votes_cast_count
}

impl Validate for VotersCounts {
    fn validate(
        &self,
        election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) {
        // F.01 validate all counts
        self.poll_card_count.validate(
            election,
            validation_results,
            format!("{field_name}.poll_card_count"),
        );
        self.proxy_certificate_count.validate(
            election,
            validation_results,
            format!("{field_name}.proxy_certificate_count"),
        );
        self.voter_card_count.validate(
            election,
            validation_results,
            format!("{field_name}.voter_card_count"),
        );
        self.total_admitted_voters_count.validate(
            election,
            validation_results,
            format!("{field_name}.total_admitted_voters_count"),
        );

        // F.11 validate that total_admitted_voters_count == poll_card_count + proxy_certificate_count + voter_card_count
        if self.poll_card_count + self.proxy_certificate_count + self.voter_card_count
            != self.total_admitted_voters_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.total_admitted_voters_count"),
                    format!("{field_name}.poll_card_count"),
                    format!("{field_name}.proxy_certificate_count"),
                    format!("{field_name}.voter_card_count"),
                ],
                code: ValidationResultCode::IncorrectTotal,
            });
        }
    }
}

/// Votes counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotesCounts {
    /// Number of valid votes on candidates
    /// ("Aantal stembiljetten met een geldige stem op een kandidaat")
    #[schema(value_type = u32)]
    pub votes_candidates_counts: Count,
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

impl Validate for VotesCounts {
    fn validate(
        &self,
        election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) {
        // F.01 validate all counts
        self.votes_candidates_counts.validate(
            election,
            validation_results,
            format!("{field_name}.votes_candidates_counts"),
        );
        self.blank_votes_count.validate(
            election,
            validation_results,
            format!("{field_name}.blank_votes_count"),
        );
        self.invalid_votes_count.validate(
            election,
            validation_results,
            format!("{field_name}.invalid_votes_count"),
        );
        self.total_votes_cast_count.validate(
            election,
            validation_results,
            format!("{field_name}.total_votes_cast_count"),
        );

        // F.12 validate that total_votes_cast_count == votes_candidates_counts + blank_votes_count + invalid_votes_count
        if self.votes_candidates_counts + self.blank_votes_count + self.invalid_votes_count
            != self.total_votes_cast_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.total_votes_cast_count"),
                    format!("{field_name}.votes_candidates_counts"),
                    format!("{field_name}.blank_votes_count"),
                    format!("{field_name}.invalid_votes_count"),
                ],
                code: ValidationResultCode::IncorrectTotal,
            });
        }

        // stop validation for warnings if there are errors
        if !validation_results.errors.is_empty() {
            return;
        }

        // validate that number of blank votes is no more than 3%
        if above_percentage_threshold(self.blank_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.blank_votes_count"),
                    format!("{field_name}.total_votes_cast_count"),
                ],
                code: ValidationResultCode::AboveThreshold,
            });
        }

        // validate that number of invalid votes is no more than 3%
        if above_percentage_threshold(self.invalid_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.invalid_votes_count"),
                    format!("{field_name}.total_votes_cast_count"),
                ],
                code: ValidationResultCode::AboveThreshold,
            });
        }
    }
}

/// Voters recounts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotersRecounts {
    /// Number of valid poll cards ("Aantal geldige stempassen")
    #[schema(value_type = u32)]
    pub poll_card_recount: Count,
    /// Number of valid proxy certificates ("Aantal geldige volmachtbewijzen")
    #[schema(value_type = u32)]
    pub proxy_certificate_recount: Count,
    /// Number of valid voter cards ("Aantal geldige kiezerspassen")
    #[schema(value_type = u32)]
    pub voter_card_recount: Count,
    /// Total number of admitted voters ("Totaal aantal toegelaten kiezers")
    #[schema(value_type = u32)]
    pub total_admitted_voters_recount: Count,
}

/// Check if all voters recounts and votes counts are equal to zero.
/// Used in validations where this is an edge case that needs to be handled.
fn all_zero_voters_recounts_and_votes_counts(voters: &VotersRecounts, votes: &VotesCounts) -> bool {
    voters.poll_card_recount == 0
        && voters.proxy_certificate_recount == 0
        && voters.voter_card_recount == 0
        && voters.total_admitted_voters_recount == 0
        && votes.votes_candidates_counts == 0
        && votes.blank_votes_count == 0
        && votes.invalid_votes_count == 0
        && votes.total_votes_cast_count == 0
}

/// Check if the voters recounts and votes counts are identical, which should result in a warning.
///
/// This is not implemented as Eq because there is no true equality relation
/// between these two sets of numbers.
fn identical_voters_recounts_and_votes_counts(
    voters: &VotersRecounts,
    votes: &VotesCounts,
) -> bool {
    !all_zero_voters_recounts_and_votes_counts(voters, votes)
        && voters.poll_card_recount == votes.votes_candidates_counts
        && voters.proxy_certificate_recount == votes.blank_votes_count
        && voters.voter_card_recount == votes.invalid_votes_count
        && voters.total_admitted_voters_recount == votes.total_votes_cast_count
}

impl Validate for VotersRecounts {
    fn validate(
        &self,
        election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) {
        // F.01 validate all counts
        self.poll_card_recount.validate(
            election,
            validation_results,
            format!("{field_name}.poll_card_recount"),
        );
        self.proxy_certificate_recount.validate(
            election,
            validation_results,
            format!("{field_name}.proxy_certificate_recount"),
        );
        self.voter_card_recount.validate(
            election,
            validation_results,
            format!("{field_name}.voter_card_recount"),
        );
        self.total_admitted_voters_recount.validate(
            election,
            validation_results,
            format!("{field_name}.total_admitted_voters_recount"),
        );

        // validate that total_admitted_voters_recount == poll_card_recount + proxy_certificate_recount + voter_card_recount
        if self.poll_card_recount + self.proxy_certificate_recount + self.voter_card_recount
            != self.total_admitted_voters_recount
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.total_admitted_voters_recount"),
                    format!("{field_name}.poll_card_recount"),
                    format!("{field_name}.proxy_certificate_recount"),
                    format!("{field_name}.voter_card_recount"),
                ],
                code: ValidationResultCode::IncorrectTotal,
            });
        }
    }
}

/// Differences counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
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

// TODO: impl Validate for DifferencesCounts

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PoliticalGroupVotes {
    pub number: u8,
    #[schema(value_type = u32)]
    pub total: Count,
    pub candidate_votes: Vec<CandidateVotes>,
}

impl Validate for Vec<PoliticalGroupVotes> {
    fn validate(
        &self,
        election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) {
        // check if the list of political groups has the correct length
        let pg = election.political_groups.as_ref();
        if pg.is_none() || pg.expect("candidate list should not be None").len() != self.len() {
            validation_results.errors.push(ValidationResult {
                fields: vec![field_name],
                code: ValidationResultCode::IncorrectCandidatesList,
            });
            return;
        }

        // check each political group
        self.iter().enumerate().for_each(|(i, pgv)| {
            let number = pgv.number;
            if number as usize != i + 1 {
                validation_results.errors.push(ValidationResult {
                    fields: vec![format!("{field_name}[{i}].number")],
                    code: ValidationResultCode::IncorrectCandidatesList,
                });
                return;
            }
            pgv.validate(election, validation_results, format!("{field_name}[{i}]"));
        });
    }
}

impl Validate for PoliticalGroupVotes {
    fn validate(
        &self,
        election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) {
        // check if the list of candidates has the correct length
        let pg = election
            .political_groups
            .as_ref()
            .expect("candidate list should not be None")
            .get(self.number as usize - 1)
            .expect("political group should exist");

        // check if the number of candidates is correct
        if pg.candidates.len() != self.candidate_votes.len() {
            validation_results.errors.push(ValidationResult {
                fields: vec![format!("{field_name}.candidate_votes")],
                code: ValidationResultCode::IncorrectCandidatesList,
            });
            return;
        }

        // validate all candidates
        self.candidate_votes.iter().enumerate().for_each(|(i, cv)| {
            let number = cv.number;
            if number as usize != i + 1 {
                validation_results.errors.push(ValidationResult {
                    fields: vec![format!("{field_name}.candidate_votes[{i}].number")],
                    code: ValidationResultCode::IncorrectCandidatesList,
                });
                return;
            }
            cv.validate(
                election,
                validation_results,
                format!("{field_name}.candidate_votes[{i}]"),
            );
        });

        // F.01 validate the total number of votes
        self.total
            .validate(election, validation_results, format!("{field_name}.total"));

        // F.31 validate whether if the total number of votes matches the sum of all candidate votes,
        // cast to u64 to avoid overflow
        if self.total as u64
            != self
                .candidate_votes
                .iter()
                .map(|cv| cv.votes as u64)
                .sum::<u64>()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![format!("{field_name}.total")],
                code: ValidationResultCode::IncorrectTotal,
            });
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct CandidateVotes {
    pub number: u8,
    #[schema(value_type = u32)]
    pub votes: Count,
}

impl Validate for CandidateVotes {
    fn validate(
        &self,
        election: &Election,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) {
        // F.01
        self.votes
            .validate(election, validation_results, format!("{field_name}.votes"));
    }
}

#[cfg(test)]
mod tests {
    use crate::election::tests::election_fixture;

    use super::*;

    #[test]
    fn test_polling_station_results_validation() {
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 1,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 5, // incorrect total
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 5,
                blank_votes_count: 6,
                invalid_votes_count: 7,
                total_votes_cast_count: 20, // incorrect total
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 5,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 5,
                }],
            }],
        };
        let election = election_fixture(&[1]);
        polling_station_results.validate(
            &election,
            &mut validation_results,
            "polling_station_results".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 2);
        assert_eq!(validation_results.warnings.len(), 0);
    }

    #[test]
    fn test_polling_station_identical_counts_validation() {
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 1000,
                proxy_certificate_count: 1,
                voter_card_count: 1,
                total_admitted_voters_count: 1002,
            },
            // same as above
            votes_counts: VotesCounts {
                votes_candidates_counts: 1000,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 1002,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 1000,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 1000,
                }],
            }],
        };
        let election = election_fixture(&[1]);
        polling_station_results.validate(
            &election,
            &mut validation_results,
            "polling_station_results".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::EqualInput
        );
    }

    #[test]
    fn test_voters_counts_validation() {
        let mut validation_results = ValidationResults::default();
        let voters_counts = VotersCounts {
            poll_card_count: 1_000_000_001, // out of range
            proxy_certificate_count: 2,
            voter_card_count: 3,
            total_admitted_voters_count: 1_000_000_006, // correct but out of range
        };
        let election = election_fixture(&[]);
        voters_counts.validate(
            &election,
            &mut validation_results,
            "voters_counts".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 2);
        assert_eq!(validation_results.warnings.len(), 0);
    }

    #[test]
    fn test_votes_counts_validation() {
        // test incorrect total
        let mut validation_results = ValidationResults::default();
        let votes_counts = VotesCounts {
            votes_candidates_counts: 5,
            blank_votes_count: 6,
            invalid_votes_count: 7,
            total_votes_cast_count: 20, // incorrect total
        };
        let election = election_fixture(&[]);
        votes_counts.validate(
            &election,
            &mut validation_results,
            "votes_counts".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);

        // test high number of blank votes
        let mut validation_results = ValidationResults::default();
        let votes_counts = VotesCounts {
            votes_candidates_counts: 100,
            blank_votes_count: 10, // high number of blank votes
            invalid_votes_count: 1,
            total_votes_cast_count: 111,
        };
        votes_counts.validate(
            &election,
            &mut validation_results,
            "votes_counts".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);

        // test high number of invalid votes
        let mut validation_results = ValidationResults::default();
        let votes_counts = VotesCounts {
            votes_candidates_counts: 100,
            blank_votes_count: 1,
            invalid_votes_count: 10, // high number of invalid votes
            total_votes_cast_count: 111,
        };
        votes_counts.validate(
            &election,
            &mut validation_results,
            "votes_counts".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
    }

    #[test]
    fn test_voters_recounts_validation() {
        let mut validation_results = ValidationResults::default();
        let voters_recounts = VotersRecounts {
            poll_card_recount: 1_000_000_001, // out of range
            proxy_certificate_recount: 2,
            voter_card_recount: 3,
            total_admitted_voters_recount: 1_000_000_006, // correct but out of range
        };
        let election = election_fixture(&[]);
        voters_recounts.validate(
            &election,
            &mut validation_results,
            "voters_recounts".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 2);
        assert_eq!(validation_results.warnings.len(), 0);
    }

    #[test]
    fn test_political_group_votes_validation() {
        // create a valid political group votes with two groups and two candidates each
        let mut political_group_votes = vec![
            PoliticalGroupVotes {
                number: 1,
                total: 25,
                candidate_votes: vec![
                    CandidateVotes {
                        number: 1,
                        votes: 14,
                    },
                    CandidateVotes {
                        number: 2,
                        votes: 11,
                    },
                ],
            },
            PoliticalGroupVotes {
                number: 2,
                total: 20,
                candidate_votes: vec![
                    CandidateVotes {
                        number: 1,
                        votes: 0,
                    },
                    CandidateVotes {
                        number: 2,
                        votes: 20,
                    },
                ],
            },
        ];
        let election = election_fixture(&[2, 2]);

        // validate with correct totals and correct number of candidates
        let mut validation_results = ValidationResults::default();
        political_group_votes.validate(
            &election,
            &mut validation_results,
            "political_group_votes".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 0);

        // validate with incorrect totals
        political_group_votes[0].total = 20;
        let mut validation_results = ValidationResults::default();
        political_group_votes.validate(
            &election,
            &mut validation_results,
            "political_group_votes".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::IncorrectTotal
        );

        // validate with incorrect number of candidates for the first political group
        political_group_votes[0].total = 25;
        let election = election_fixture(&[3, 2]);
        let mut validation_results = ValidationResults::default();
        political_group_votes.validate(
            &election,
            &mut validation_results,
            "political_group_votes".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::IncorrectCandidatesList
        );

        // validate with incorrect number of political groups
        let election = election_fixture(&[2, 2, 2]);
        let mut validation_results = ValidationResults::default();
        political_group_votes.validate(
            &election,
            &mut validation_results,
            "political_group_votes".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::IncorrectCandidatesList
        );

        // validate with correct number of political groups but mixed up numbers
        let election = election_fixture(&[2, 2]);
        political_group_votes[0].number = 2;
        let mut validation_results = ValidationResults::default();
        political_group_votes.validate(
            &election,
            &mut validation_results,
            "political_group_votes".to_string(),
        );
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::IncorrectCandidatesList
        );
    }
}
