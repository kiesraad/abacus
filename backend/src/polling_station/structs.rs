use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::validation::{
    above_percentage_threshold, Validate, ValidationResult, ValidationResultCode, ValidationResults,
};

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

impl Validate for PollingStationResults {
    fn validate(&self, validation_results: &mut ValidationResults, field_name: String) {
        self.voters_counts
            .validate(validation_results, format!("{field_name}.voters_counts"));
        self.votes_counts
            .validate(validation_results, format!("{field_name}.votes_counts"));

        if identical_counts(&self.voters_counts, &self.votes_counts) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.voters_counts"),
                    format!("{field_name}.votes_counts"),
                ],
                code: ValidationResultCode::EqualInput,
            });
        }
    }
}

type Count = u32;

impl Validate for Count {
    fn validate(&self, validation_results: &mut ValidationResults, field_name: String) {
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
/// Used in validations where this is a edge case that needs to be handled.
fn all_zero(voters: &VotersCounts, votes: &VotesCounts) -> bool {
    voters.poll_card_count == 0
        && voters.proxy_certificate_count == 0
        && voters.voter_card_count == 0
        && voters.total_admitted_voters_count == 0
        && votes.votes_candidates_counts == 0
        && votes.blank_votes_count == 0
        && votes.invalid_votes_count == 0
        && votes.total_votes_cast_count == 0
}

/// Check if the voters counts and votes counts are identical, which should
/// result in a warning.
///
/// This is not implemented as Eq because there is no true equality relation
/// between these two sets of numbers.
fn identical_counts(voters: &VotersCounts, votes: &VotesCounts) -> bool {
    !all_zero(voters, votes)
        && voters.poll_card_count == votes.votes_candidates_counts
        && voters.proxy_certificate_count == votes.blank_votes_count
        && voters.voter_card_count == votes.invalid_votes_count
        && voters.total_admitted_voters_count == votes.total_votes_cast_count
}

impl Validate for VotersCounts {
    fn validate(&self, validation_results: &mut ValidationResults, field_name: String) {
        self.poll_card_count
            .validate(validation_results, format!("{field_name}.poll_card_count"));
        self.proxy_certificate_count.validate(
            validation_results,
            format!("{field_name}.proxy_certificate_count"),
        );
        self.voter_card_count
            .validate(validation_results, format!("{field_name}.voter_card_count"));
        self.total_admitted_voters_count.validate(
            validation_results,
            format!("{field_name}.total_admitted_voters_count"),
        );
        // validate that total_admitted_voters_count == poll_card_count + proxy_certificate_count + voter_card_count
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
    fn validate(&self, validation_results: &mut ValidationResults, field_name: String) {
        self.votes_candidates_counts.validate(
            validation_results,
            format!("{field_name}.votes_candidates_counts"),
        );
        self.blank_votes_count.validate(
            validation_results,
            format!("{field_name}.blank_votes_count"),
        );
        self.invalid_votes_count.validate(
            validation_results,
            format!("{field_name}.invalid_votes_count"),
        );
        self.total_votes_cast_count.validate(
            validation_results,
            format!("{field_name}.total_votes_cast_count"),
        );
        // validate that total_votes_cast_count == votes_candidates_counts + blank_votes_count + invalid_votes_count
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_polling_station_results_validation() {
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
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
        };
        polling_station_results.validate(
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
        };
        polling_station_results.validate(
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
        voters_counts.validate(&mut validation_results, "voters_counts".to_string());
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
        votes_counts.validate(&mut validation_results, "votes_counts".to_string());
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
        votes_counts.validate(&mut validation_results, "votes_counts".to_string());
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
        votes_counts.validate(&mut validation_results, "votes_counts".to_string());
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
    }

    #[test]
    fn test_zero_votes_and_zero_voters() {
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            voters_counts: VotersCounts {
                poll_card_count: 0,
                proxy_certificate_count: 0,
                voter_card_count: 0,
                total_admitted_voters_count: 0,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 0,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 0,
            },
        };
        polling_station_results.validate(
            &mut validation_results,
            "polling_station_results".to_string(),
        );
        assert!(validation_results.errors.len() == 0);
        assert!(validation_results.warnings.len() == 0);
    }
}
