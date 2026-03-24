use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::count::Count;
use crate::domain::{
    compare::Compare,
    election::ElectionWithPoliticalGroups,
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
};

/// Differences counts for GSB, part of the results.
/// (1.4 "Verschillen tussen aantal kiezers en uitgebrachte stemmen")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct GSBDifferencesCounts {
    /// Number of more counted ballots ("Totaal aantal méér getelde stemmen")
    #[schema(value_type = u32)]
    pub more_ballots_count: Count,
    /// Number of fewer counted ballots ("Totaal aantal minder getelde stemmen")
    #[schema(value_type = u32)]
    pub fewer_ballots_count: Count,
}

impl Compare for GSBDifferencesCounts {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare all counts
        self.more_ballots_count.compare(
            &first_entry.more_ballots_count,
            different_fields,
            &path.field("more_ballots_count"),
        );
        self.fewer_ballots_count.compare(
            &first_entry.fewer_ballots_count,
            different_fields,
            &path.field("fewer_ballots_count"),
        );
    }
}

impl GSBDifferencesCounts {
    pub fn zero() -> GSBDifferencesCounts {
        GSBDifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 0,
        }
    }

    fn validate_no_differences(
        &self,
        total_voters_count: u32,
        total_votes_count: u32,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
        if total_voters_count == total_votes_count
            && (self.more_ballots_count != 0 || self.fewer_ballots_count != 0)
        {
            let mut fields = vec![];
            if self.more_ballots_count != 0 {
                fields.push(path.field("more_ballots_count").to_string());
            }
            if self.fewer_ballots_count != 0 {
                fields.push(path.field("fewer_ballots_count").to_string());
            }

            if !fields.is_empty() {
                validation_results.errors.push(ValidationResult {
                    fields,
                    code: ValidationResultCode::F305,
                    context: None,
                });
            }
        }
    }

    fn validate_votes_count_larger_than_voters_count(
        &self,
        total_voters_count: u32,
        total_votes_count: u32,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
        if total_votes_count > total_voters_count
            && self.more_ballots_count != (total_votes_count - total_voters_count)
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.field("more_ballots_count").to_string()],
                code: ValidationResultCode::F306,
                context: None,
            });
        }

        if total_votes_count > total_voters_count && self.fewer_ballots_count != 0 {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("more_ballots_count").to_string(),
                    path.field("fewer_ballots_count").to_string(),
                ],
                code: ValidationResultCode::F307,
                context: None,
            });
        }
    }

    fn validate_votes_count_smaller_than_voters_count(
        &self,
        total_voters_count: u32,
        total_votes_count: u32,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
        if total_votes_count < total_voters_count
            && self.fewer_ballots_count != (total_voters_count - total_votes_count)
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.field("fewer_ballots_count").to_string()],
                code: ValidationResultCode::F308,
                context: None,
            });
        }

        if total_votes_count < total_voters_count && self.more_ballots_count != 0 {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("more_ballots_count").to_string(),
                    path.field("fewer_ballots_count").to_string(),
                ],
                code: ValidationResultCode::F309,
                context: None,
            });
        }
    }
}

pub fn validate_gsb_differences_counts(
    differences_counts: &GSBDifferencesCounts,
    total_voters_count: u32,
    total_votes_count: u32,
    validation_results: &mut ValidationResults,
    differences_counts_path: &FieldPath,
) -> Result<(), DataError> {
    differences_counts.validate_no_differences(
        total_voters_count,
        total_votes_count,
        validation_results,
        differences_counts_path,
    );

    differences_counts.validate_votes_count_larger_than_voters_count(
        total_voters_count,
        total_votes_count,
        validation_results,
        differences_counts_path,
    );

    differences_counts.validate_votes_count_smaller_than_voters_count(
        total_voters_count,
        total_votes_count,
        validation_results,
        differences_counts_path,
    );

    Ok(())
}

impl Validate for GSBDifferencesCounts {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.more_ballots_count.validate(
            election,
            validation_results,
            &path.field("more_ballots_count"),
        )?;
        self.fewer_ballots_count.validate(
            election,
            validation_results,
            &path.field("fewer_ballots_count"),
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::{
        election::PGNumber,
        results::{
            Results, gsb_results::GSBResults,
            political_group_candidate_votes::PoliticalGroupCandidateVotes,
            political_group_total_votes::PoliticalGroupTotalVotes, voters_counts::VotersCounts,
            votes_counts::VotesCounts,
        },
    };

    /// Tests that results with equal data and no differences counts are correctly identified as equal.
    #[test]
    fn test_equal_no_differences_counts() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = Results::GSB(GSBResults {
            number_of_voters: 105,
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(1),
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 105,
            },
            differences_counts: GSBDifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let second_entry = first_entry.clone();
        second_entry.compare(&first_entry, &mut different_fields, &"results".into());
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that results with equal data and with differences counts are correctly identified as equal.
    #[test]
    fn test_equal_with_differences_counts() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = Results::GSB(GSBResults {
            number_of_voters: 105,
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(1),
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 1,
                invalid_votes_count: 2,
                total_votes_cast_count: 103,
            },
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let second_entry = first_entry.clone();
        second_entry.compare(&first_entry, &mut different_fields, &"results".into());
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that results with equal data and no differences counts are correctly identified as equal.
    #[test]
    fn test_equal_no_differences_counts_variant() {
        let mut different_fields = vec![];
        let first_entry = Results::GSB(GSBResults {
            number_of_voters: 105,
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(1),
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 104,
            },
            differences_counts: GSBDifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let second_entry = first_entry.clone();
        second_entry.compare(&first_entry, &mut different_fields, &"results".into());
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that results with equal data and with differences counts are correctly identified as equal.
    #[test]
    fn test_equal_with_differences_counts_variant() {
        let mut different_fields = vec![];
        let first_entry = Results::GSB(GSBResults {
            number_of_voters: 105,
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(1),
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 105,
            },
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let second_entry = first_entry.clone();
        second_entry.compare(&first_entry, &mut different_fields, &"results".into());
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that results with voters count differences are correctly identified as not equal.
    #[test]
    fn test_not_equal_voters_counts_differences() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = Results::GSB(GSBResults {
            number_of_voters: 105,
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(1),
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 105,
            },
            differences_counts: GSBDifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let mut second_entry = first_entry.clone();
        second_entry.voters_counts_mut().poll_card_count = 101;
        second_entry.voters_counts_mut().total_admitted_voters_count = 106;
        second_entry.compare(&first_entry, &mut different_fields, &"results".into());
        assert_eq!(different_fields.len(), 2);
        assert_eq!(different_fields[0], "results.voters_counts.poll_card_count");
        assert_eq!(
            different_fields[1],
            "results.voters_counts.total_admitted_voters_count"
        );
    }

    /// Tests that results with differences in differences counts are correctly identified as not equal.
    #[test]
    fn test_not_equal_differences_counts_differences() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = Results::GSB(GSBResults {
            number_of_voters: 105,
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(1),
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 1,
                invalid_votes_count: 2,
                total_votes_cast_count: 103,
            },
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let mut second_entry = first_entry.clone();
        *second_entry.differences_counts_mut().more_ballots_count = 2;
        *second_entry.differences_counts_mut().fewer_ballots_count = 0;
        second_entry.compare(&first_entry, &mut different_fields, &"results".into());
        assert_eq!(different_fields.len(), 2);
        assert_eq!(
            different_fields[0],
            "results.differences_counts.more_ballots_count"
        );
        assert_eq!(
            different_fields[1],
            "results.differences_counts.fewer_ballots_count"
        );
    }

    /// Tests that results with differences in both voters counts and votes counts are correctly identified as not equal.
    #[test]
    fn test_not_equal_voters_counts_and_votes_counts_differences() {
        let mut different_fields = vec![];
        let first_entry = Results::GSB(GSBResults {
            number_of_voters: 105,
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: PGNumber::from(1),
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 104,
            },
            differences_counts: GSBDifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let mut second_entry = first_entry.clone();
        *second_entry.voters_counts_mut() = VotersCounts {
            poll_card_count: 101,
            proxy_certificate_count: 1,
            total_admitted_voters_count: 102,
        };
        *second_entry.votes_counts_mut() = VotesCounts {
            political_group_total_votes: vec![PoliticalGroupTotalVotes {
                number: PGNumber::from(1),
                total: 101,
            }],
            total_votes_candidates_count: 101,
            blank_votes_count: 1,
            invalid_votes_count: 1,
            total_votes_cast_count: 103,
        };
        second_entry.compare(&first_entry, &mut different_fields, &"results".into());
        assert_eq!(different_fields.len(), 8);
        assert_eq!(different_fields[0], "results.voters_counts.poll_card_count");
        assert_eq!(
            different_fields[1],
            "results.voters_counts.proxy_certificate_count"
        );
        assert_eq!(
            different_fields[2],
            "results.voters_counts.total_admitted_voters_count"
        );
        assert_eq!(
            different_fields[3],
            "results.votes_counts.political_group_total_votes.0.total"
        );
        assert_eq!(
            different_fields[4],
            "results.votes_counts.total_votes_candidates_count"
        );
        assert_eq!(
            different_fields[5],
            "results.votes_counts.blank_votes_count"
        );
        assert_eq!(
            different_fields[6],
            "results.votes_counts.invalid_votes_count"
        );
        assert_eq!(
            different_fields[7],
            "results.votes_counts.total_votes_cast_count"
        );
    }

    /// Tests that results with differences in political group votes are correctly identified as not equal.
    #[test]
    fn test_not_equal_political_group_votes_differences() {
        let mut different_fields = vec![];
        let first_entry = Results::GSB(GSBResults {
            number_of_voters: 105,
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 100,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 0,
                    },
                ],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 3,
                total_votes_cast_count: 105,
            },
            differences_counts: GSBDifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
            },
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[100, 0]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[0]),
            ],
        });
        let mut second_entry = first_entry.clone();
        *second_entry.political_group_votes_mut() = vec![
            PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[50, 30]),
            PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[20]),
        ];
        second_entry.compare(&first_entry, &mut different_fields, &"results".into());
        assert_eq!(different_fields.len(), 5);
        assert_eq!(
            different_fields[0],
            "results.political_group_votes.0.candidate_votes.0.votes"
        );
        assert_eq!(
            different_fields[1],
            "results.political_group_votes.0.candidate_votes.1.votes"
        );
        assert_eq!(different_fields[2], "results.political_group_votes.0.total");
        assert_eq!(
            different_fields[3],
            "results.political_group_votes.1.candidate_votes.0.votes"
        );
        assert_eq!(different_fields[4], "results.political_group_votes.1.total");
    }

    fn validate(
        data: GSBDifferencesCounts,
        total_voters_counts: u32,
        total_votes_counts: u32,
    ) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();

        validate_gsb_differences_counts(
            &data,
            total_voters_counts,
            total_votes_counts,
            &mut validation_results,
            &"differences_counts".into(),
        )?;

        Ok(validation_results)
    }

    /// CSO | F.305 (Als D = H) I en/of J zijn ingevuld
    #[test]
    fn test_f305_more_ballots_count() -> Result<(), DataError> {
        // D = H & I is filled in
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 4;

        let validation_results = validate(data, 52, 52)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F305,
                fields: vec!["differences_counts.more_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.305 (Als D = H) I en/of J zijn ingevuld
    #[test]
    fn test_f305_fewer_ballots_count() -> Result<(), DataError> {
        // D = H & J is filled in
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 4;

        let validation_results = validate(data, 52, 52)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F305,
                fields: vec!["differences_counts.fewer_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.305 (Als D = H) I en/of J zijn ingevuld
    #[test]
    fn test_f305_more_and_fewer_ballots_count_not_filled() -> Result<(), DataError> {
        // D = H & I and J not filled in
        let data = GSBDifferencesCounts::zero();
        let validation_results = validate(data, 52, 52)?;

        assert!(validation_results.errors.is_empty());

        // D < H & I and J not filled in (make sure no F.305 error is triggered)
        let data = GSBDifferencesCounts::zero();
        let validation_results = validate(data, 52, 53)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F306,
                fields: vec!["differences_counts.more_ballots_count".into()],
                context: None,
            }]
        );

        // D > H & I and J not filled in (make sure no F.305 error is triggered)
        let data = GSBDifferencesCounts::zero();
        let validation_results = validate(data, 53, 52)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F308,
                fields: vec!["differences_counts.fewer_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    #[test]
    fn test_f305_more_and_fewer_ballots_count_both_filled() -> Result<(), DataError> {
        // D = H & I and J filled in
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 4;
        data.fewer_ballots_count = 4;

        let validation_results = validate(data, 52, 52)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F305,
                fields: vec![
                    "differences_counts.more_ballots_count".into(),
                    "differences_counts.fewer_ballots_count".into()
                ],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.306 (Als H > D) I <> H - D
    #[test]
    fn test_f306_votes_greater_than_voters() -> Result<(), DataError> {
        // H > D & I = H - D
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 20;

        let validation_results = validate(data, 52, 72)?;

        assert!(validation_results.errors.is_empty());

        Ok(())
    }

    /// CSO | F.306 (Als H > D) I <> H - D
    #[test]
    fn test_f306_votes_equals_voters() -> Result<(), DataError> {
        // H = D & I < H - D
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 10;

        let validation_results = validate(data, 52, 52)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F305,
                fields: vec!["differences_counts.more_ballots_count".into()],
                context: None,
            }]
        );

        // H = D & I > H - D
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 30;

        let validation_results = validate(data, 52, 52)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F305,
                fields: vec!["differences_counts.more_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.306 (Als H > D) I <> H - D
    #[test]
    fn test_f306_votes_smaller_than_voters() -> Result<(), DataError> {
        // H < D & I > H - D
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 30;

        let validation_results = validate(data, 72, 52)?;

        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F308,
                    fields: vec!["differences_counts.fewer_ballots_count".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F309,
                    fields: vec![
                        "differences_counts.more_ballots_count".into(),
                        "differences_counts.fewer_ballots_count".into()
                    ],
                    context: None,
                }
            ]
        );

        // H < D & I < H - D
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 4;

        let validation_results = validate(data, 72, 52)?;

        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F308,
                    fields: vec!["differences_counts.fewer_ballots_count".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F309,
                    fields: vec![
                        "differences_counts.more_ballots_count".into(),
                        "differences_counts.fewer_ballots_count".into()
                    ],
                    context: None,
                }
            ]
        );

        Ok(())
    }

    /// CSO | F.306 (Als H > D) I <> H - D
    #[test]
    fn test_f306_error() -> Result<(), DataError> {
        // H > D & I < H - D
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 4;

        let validation_results = validate(data, 52, 72)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F306,
                fields: vec!["differences_counts.more_ballots_count".into()],
                context: None,
            }]
        );

        // H > D & I > H - D
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 24;

        let validation_results = validate(data, 52, 72)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F306,
                fields: vec!["differences_counts.more_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.307 (Als H > D) J is ingevuld
    #[test]
    fn test_f307_votes_greater_than_voters_fewer_ballots_count_zero() -> Result<(), DataError> {
        // H > D & J == 0
        let data = GSBDifferencesCounts::zero();
        let validation_results = validate(data, 52, 62)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F306,
                fields: vec!["differences_counts.more_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    #[test]
    fn test_f307_votes_greater_than_voters_fewer_ballots_count_filled() -> Result<(), DataError> {
        // H > D & J < 0
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 3;

        let validation_results = validate(data, 52, 62)?;

        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F306,
                    fields: vec!["differences_counts.more_ballots_count".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F307,
                    fields: vec![
                        "differences_counts.more_ballots_count".into(),
                        "differences_counts.fewer_ballots_count".into()
                    ],
                    context: None,
                }
            ]
        );

        // H > D & J > 0
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 30;

        let validation_results = validate(data, 52, 62)?;

        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F306,
                    fields: vec!["differences_counts.more_ballots_count".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F307,
                    fields: vec![
                        "differences_counts.more_ballots_count".into(),
                        "differences_counts.fewer_ballots_count".into()
                    ],
                    context: None,
                }
            ]
        );

        Ok(())
    }

    /// CSO | F.307 (Als H > D) J is ingevuld
    #[test]
    fn test_f307_votes_equals_voters() -> Result<(), DataError> {
        // H = D & J < 0
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 3;

        let validation_results = validate(data, 52, 52)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F305,
                fields: vec!["differences_counts.fewer_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.307 (Als H > D) J is ingevuld
    #[test]
    fn test_f307_votes_smaller_than_voters() -> Result<(), DataError> {
        // H = D & J > 0
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 3;

        let validation_results = validate(data, 62, 52)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F308,
                fields: vec!["differences_counts.fewer_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.308 (Als H < D) J <> D - H
    #[test]
    fn test_f308_votes_smaller_than_voters() -> Result<(), DataError> {
        // H < D & J = D - H
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 2;

        let validation_results = validate(data, 46, 44)?;

        assert!(validation_results.errors.is_empty());

        // H < D & J < D - H
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 1;

        let validation_results = validate(data, 46, 44)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F308,
                fields: vec!["differences_counts.fewer_ballots_count".into()],
                context: None,
            }]
        );

        // H < D & J > D - H
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 5;

        let validation_results = validate(data, 46, 44)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F308,
                fields: vec!["differences_counts.fewer_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.308 (Als H < D) J <> D - H
    #[test]
    fn test_f308_votes_equals_voters() -> Result<(), DataError> {
        // H = D & J > D - H
        let mut data = GSBDifferencesCounts::zero();
        data.fewer_ballots_count = 5;

        let validation_results = validate(data, 44, 44)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F305,
                fields: vec!["differences_counts.fewer_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.309 (Als H < D) I is ingevuld
    #[test]
    fn test_f309_votes_smaller_than_voters() -> Result<(), DataError> {
        // H < D & I = 0
        let data = GSBDifferencesCounts::zero();
        let validation_results = validate(data, 48, 44)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F308,
                fields: vec!["differences_counts.fewer_ballots_count".into(),],
                context: None,
            }]
        );

        // H < D & I > 0
        let mut data = GSBDifferencesCounts::zero();

        data.more_ballots_count = 5;

        let validation_results = validate(data, 48, 44)?;

        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F308,
                    fields: vec!["differences_counts.fewer_ballots_count".into(),],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F309,
                    fields: vec![
                        "differences_counts.more_ballots_count".into(),
                        "differences_counts.fewer_ballots_count".into()
                    ],
                    context: None,
                }
            ]
        );

        Ok(())
    }

    /// CSO | F.309 (Als H < D) I is ingevuld
    #[test]
    fn test_f309_votes_equals_voters() -> Result<(), DataError> {
        // H = D & I > 0
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 3;

        let validation_results = validate(data, 44, 44)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F305,
                fields: vec!["differences_counts.more_ballots_count".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.309 (Als H < D) I is ingevuld
    #[test]
    fn test_f309_votes_greater_than_voters() -> Result<(), DataError> {
        // H < D & I = 0
        let data = GSBDifferencesCounts::zero();
        let validation_results = validate(data, 48, 44)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F308,
                fields: vec!["differences_counts.fewer_ballots_count".into(),],
                context: None,
            }]
        );

        // H < D & I > 0
        let mut data = GSBDifferencesCounts::zero();
        data.more_ballots_count = 5;

        let validation_results = validate(data, 48, 44)?;

        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F308,
                    fields: vec!["differences_counts.fewer_ballots_count".into(),],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F309,
                    fields: vec![
                        "differences_counts.more_ballots_count".into(),
                        "differences_counts.fewer_ballots_count".into()
                    ],
                    context: None,
                }
            ]
        );

        Ok(())
    }
}
