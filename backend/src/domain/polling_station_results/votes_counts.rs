use std::collections::HashSet;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    APIError,
    domain::{
        compare::Compare,
        election::ElectionWithPoliticalGroups,
        field_path::FieldPath,
        political_group_total_votes::PoliticalGroupTotalVotes,
        polling_station::PollingStation,
        polling_station_results::count::Count,
        validate::{
            DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults,
        },
    },
    error::ErrorReference,
};

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

impl Compare for VotesCounts {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.political_group_total_votes.compare(
            &first_entry.political_group_total_votes,
            different_fields,
            &path.field("political_group_total_votes"),
        );

        // compare all counts
        self.total_votes_candidates_count.compare(
            &first_entry.total_votes_candidates_count,
            different_fields,
            &path.field("total_votes_candidates_count"),
        );
        self.blank_votes_count.compare(
            &first_entry.blank_votes_count,
            different_fields,
            &path.field("blank_votes_count"),
        );
        self.invalid_votes_count.compare(
            &first_entry.invalid_votes_count,
            different_fields,
            &path.field("invalid_votes_count"),
        );
        self.total_votes_cast_count.compare(
            &first_entry.total_votes_cast_count,
            different_fields,
            &path.field("total_votes_cast_count"),
        );
    }
}

impl VotesCounts {
    fn validate_votes_counts_errors(
        &self,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
        let political_group_total_votes_sum: u64 = self
            .political_group_total_votes
            .iter()
            .map(|pgv| pgv.total as u64)
            .sum::<u64>();
        if political_group_total_votes_sum != self.total_votes_candidates_count as u64 {
            let mut fields: Vec<String> = self
                .political_group_total_votes
                .iter()
                .enumerate()
                .map(|(i, _)| {
                    path.field("political_group_total_votes")
                        .index(i)
                        .field("total")
                        .to_string()
                })
                .collect();
            fields.push(path.field("total_votes_candidates_count").to_string());

            validation_results.errors.push(ValidationResult {
                fields,
                code: ValidationResultCode::F202,
                context: None,
            });
        }

        if self.total_votes_candidates_count + self.blank_votes_count + self.invalid_votes_count
            != self.total_votes_cast_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("total_votes_candidates_count").to_string(),
                    path.field("blank_votes_count").to_string(),
                    path.field("invalid_votes_count").to_string(),
                    path.field("total_votes_cast_count").to_string(),
                ],
                code: ValidationResultCode::F203,
                context: None,
            });
        }
    }

    fn validate_votes_counts_warnings(
        &self,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
        if above_percentage_threshold(self.blank_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("blank_votes_count").to_string()],
                code: ValidationResultCode::W201,
                context: None,
            });
        }

        if above_percentage_threshold(self.invalid_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("invalid_votes_count").to_string()],
                code: ValidationResultCode::W202,
                context: None,
            });
        }

        if self.total_votes_cast_count == 0 {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("total_votes_cast_count").to_string()],
                code: ValidationResultCode::W204,
                context: None,
            });
        }
    }
}

/// Validate that a value is equal to or above a certain percentage threshold of the total,
/// using only integers to avoid floating point arithmetic issues.
/// The threshold is calculated as the percentage of the total, rounded up.
/// For example, if the total is 101 and the percentage is 10, the threshold is 11.
fn above_percentage_threshold(value: u32, total: u32, percentage: u8) -> bool {
    if value == 0 && total == 0 {
        false
    } else {
        let threshold = (total as u64 * percentage as u64).div_ceil(100);
        value as u64 >= threshold
    }
}

impl Validate for VotesCounts {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.political_group_total_votes.validate(
            election,
            polling_station,
            validation_results,
            &path.field("political_group_total_votes"),
        )?;
        self.total_votes_candidates_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total_votes_candidates_count"),
        )?;
        self.blank_votes_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("blank_votes_count"),
        )?;
        self.invalid_votes_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("invalid_votes_count"),
        )?;
        self.total_votes_cast_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total_votes_cast_count"),
        )?;

        self.validate_votes_counts_errors(validation_results, path);

        self.validate_votes_counts_warnings(validation_results, path);

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;
    use crate::domain::{
        election::PGNumber, political_group_total_votes::PoliticalGroupTotalVotes,
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

    fn validate(
        political_group_total_votes: &[u32],
        total_votes_candidates_count: u32,
        blank_votes_count: u32,
        invalid_votes_count: u32,
        total_votes_cast_count: u32,
    ) -> Result<ValidationResults, DataError> {
        let votes_counts = VotesCounts {
            political_group_total_votes: political_group_total_votes
                .iter()
                .enumerate()
                .map(|(i, &total)| PoliticalGroupTotalVotes {
                    number: PGNumber::try_from(i + 1).unwrap(),
                    total,
                })
                .collect(),
            total_votes_candidates_count,
            blank_votes_count,
            invalid_votes_count,
            total_votes_cast_count,
        };

        let mut validation_results = ValidationResults::default();
        votes_counts.validate(
            &ElectionWithPoliticalGroups::election_fixture(&[1, 1, 1]),
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"votes_counts".into(),
        )?;

        Ok(validation_results)
    }

    /// Tests the above_percentage_threshold function with various input combinations.
    #[test]
    fn test_above_percentage_threshold() {
        // Below
        assert!(!above_percentage_threshold(10, 101, 10));
        assert!(!above_percentage_threshold(9, 100, 10));
        assert!(!above_percentage_threshold(0, 0, 10));

        // Equal
        assert!(above_percentage_threshold(10, 100, 10));

        // Above
        assert!(above_percentage_threshold(11, 101, 10));
        assert!(above_percentage_threshold(10, 0, 10));
    }

    /// CSO/DSO | F.202: 'Aantal kiezers en stemmen': E.1 t/m E.n tellen niet op naar E
    #[test]
    fn test_f202() -> Result<(), DataError> {
        let validation_results = validate(&[50, 30, 20], 100, 0, 0, 100)?;
        assert!(validation_results.errors.is_empty());

        let validation_results = validate(&[49, 30, 20], 100, 0, 0, 100)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F202,
                fields: vec![
                    "votes_counts.political_group_total_votes[0].total".into(),
                    "votes_counts.political_group_total_votes[1].total".into(),
                    "votes_counts.political_group_total_votes[2].total".into(),
                    "votes_counts.total_votes_candidates_count".into(),
                ],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO/DSO | F.203: 'Aantal kiezers en stemmen': stemmen op kandidaten + blanco stemmen + ongeldige stemmen <> totaal aantal uitgebrachte stemmen
    #[test]
    fn test_f203() -> Result<(), DataError> {
        let validation_results = validate(&[50, 30, 20], 100, 1, 2, 103)?;
        assert!(validation_results.errors.is_empty());

        let validation_results = validate(&[50, 30, 20], 100, 1, 2, 104)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F203,
                fields: vec![
                    "votes_counts.total_votes_candidates_count".into(),
                    "votes_counts.blank_votes_count".into(),
                    "votes_counts.invalid_votes_count".into(),
                    "votes_counts.total_votes_cast_count".into(),
                ],
                context: None,
            }],
        );

        Ok(())
    }

    /// CSO/DSO | W.201: 'Aantal kiezers en stemmen': Aantal blanco stemmen is groter dan of gelijk aan 3% van het totaal aantal uitgebrachte stemmen
    #[test]
    fn test_w201() -> Result<(), DataError> {
        // < 3% of blank votes
        let validation_results = validate(&[40, 20, 11], 71, 29, 0, 100)?;
        assert!(validation_results.errors.is_empty());

        // == 3% of blank votes
        let validation_results = validate(&[40, 20, 10], 70, 30, 0, 100)?;
        assert_eq!(
            validation_results.warnings,
            [ValidationResult {
                code: ValidationResultCode::W201,
                fields: vec!["votes_counts.blank_votes_count".into()],
                context: None,
            }],
        );

        // > 3% of blank votes
        let validation_results = validate(&[40, 20, 9], 69, 31, 0, 100)?;
        assert_eq!(
            validation_results.warnings,
            [ValidationResult {
                code: ValidationResultCode::W201,
                fields: vec!["votes_counts.blank_votes_count".into()],
                context: None,
            }],
        );

        Ok(())
    }

    /// CSO/DSO | W.202: 'Aantal kiezers en stemmen': Aantal ongeldige stemmen is groter dan of gelijk aan 3% van het totaal aantal uitgebrachte stemmen
    #[test]
    fn test_w202() -> Result<(), DataError> {
        // < 3% of invalid votes
        let validation_results = validate(&[40, 20, 11], 71, 0, 29, 100)?;
        assert!(validation_results.errors.is_empty());

        // == 3% of invalid votes
        let validation_results = validate(&[40, 20, 10], 70, 0, 30, 100)?;
        assert_eq!(
            validation_results.warnings,
            [ValidationResult {
                code: ValidationResultCode::W202,
                fields: vec!["votes_counts.invalid_votes_count".into()],
                context: None,
            }],
        );

        // > 3% of invalid votes
        let validation_results = validate(&[40, 20, 9], 69, 0, 31, 100)?;
        assert_eq!(
            validation_results.warnings,
            [ValidationResult {
                code: ValidationResultCode::W202,
                fields: vec!["votes_counts.invalid_votes_count".into()],
                context: None,
            }],
        );

        Ok(())
    }

    /// CSO/DSO | W.204: 'Aantal kiezers en stemmen': Totaal aantal uitgebrachte stemmen leeg of 0
    #[test]
    fn test_w204() -> Result<(), DataError> {
        let validation_results = validate(&[50, 30, 20], 100, 0, 0, 100)?;
        assert!(validation_results.errors.is_empty());

        let validation_results = validate(&[0, 0, 0], 0, 0, 0, 0)?;
        assert_eq!(
            validation_results.warnings,
            [ValidationResult {
                code: ValidationResultCode::W204,
                fields: vec!["votes_counts.total_votes_cast_count".into()],
                context: None,
            }],
        );

        Ok(())
    }

    #[test]
    fn test_multiple() -> Result<(), DataError> {
        let validation_results = validate(&[50, 30, 20], 99, 10, 10, 0)?;
        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F202,
                    fields: vec![
                        "votes_counts.political_group_total_votes[0].total".into(),
                        "votes_counts.political_group_total_votes[1].total".into(),
                        "votes_counts.political_group_total_votes[2].total".into(),
                        "votes_counts.total_votes_candidates_count".into(),
                    ],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F203,
                    fields: vec![
                        "votes_counts.total_votes_candidates_count".into(),
                        "votes_counts.blank_votes_count".into(),
                        "votes_counts.invalid_votes_count".into(),
                        "votes_counts.total_votes_cast_count".into(),
                    ],
                    context: None,
                }
            ],
        );
        assert_eq!(
            validation_results.warnings,
            [
                ValidationResult {
                    code: ValidationResultCode::W201,
                    fields: vec!["votes_counts.blank_votes_count".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::W202,
                    fields: vec!["votes_counts.invalid_votes_count".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::W204,
                    fields: vec!["votes_counts.total_votes_cast_count".into()],
                    context: None,
                }
            ],
        );

        Ok(())
    }
}
