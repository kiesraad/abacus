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
    fn test_f305() -> Result<(), DataError> {
        // (description, H=votes, D=voters, I=more_ballots, J=fewer_ballots, expect_f305, expected_fields)
        type Case = (&'static str, u32, u32, u32, u32, bool, Vec<&'static str>);
        #[rustfmt::skip]
        let cases: Vec<Case> = vec![
            ("H = D, I = 0, J = 0", 52, 52, 0, 0, false, vec![]),
            ("H = D, I > 0, J = 0", 52, 52, 4, 0, true,  vec!["differences_counts.more_ballots_count"]),
            ("H = D, I = 0, J > 0", 52, 52, 0, 4, true,  vec!["differences_counts.fewer_ballots_count"]),
            ("H = D, I > 0, J > 0", 52, 52, 4, 4, true,  vec!["differences_counts.more_ballots_count", "differences_counts.fewer_ballots_count"]),
            ("H > D, I > 0, J = 0", 72, 52, 4, 0, false, vec![]),
            ("H > D, I = 0, J > 0", 72, 52, 0, 4, false, vec![]),
            ("H < D, I > 0, J = 0", 52, 72, 4, 0, false, vec![]),
            ("H < D, I = 0, J > 0", 52, 72, 0, 4, false, vec![]),
        ];

        for (
            description,
            votes,
            voters,
            more_ballots,
            fewer_ballots,
            expect_f305,
            expected_fields,
        ) in cases
        {
            let mut data = GSBDifferencesCounts::zero();
            data.more_ballots_count = more_ballots;
            data.fewer_ballots_count = fewer_ballots;

            let result = validate(data, voters, votes)?;
            let expected_f305 = ValidationResult {
                code: ValidationResultCode::F305,
                fields: expected_fields.iter().map(|&f| f.into()).collect(),
                context: None,
            };

            let has_f305 = result.errors.iter().any(|e| e == &expected_f305);
            assert_eq!(has_f305, expect_f305, "Failed: {description}");
        }

        Ok(())
    }

    /// CSO | F.306 (Als H > D) I <> H - D
    #[test]
    fn test_f306() -> Result<(), DataError> {
        let f306 = ValidationResult {
            code: ValidationResultCode::F306,
            fields: vec!["differences_counts.more_ballots_count".into()],
            context: None,
        };

        // (description, H=votes, D=voters, I=more_ballots, expect_f306)
        let cases = vec![
            ("H > D, I = H - D", 72, 52, 20, false),
            ("H > D, I < H - D", 72, 52, 4, true),
            ("H > D, I > H - D", 72, 52, 24, true),
            ("H = D, I = H - D", 52, 52, 0, false),
            ("H = D, I > H - D", 52, 52, 4, false),
            ("H < D, I > H - D", 52, 72, 42, false),
        ];

        for (description, votes, voters, more_ballots, expect_f306) in cases {
            let mut data = GSBDifferencesCounts::zero();
            data.more_ballots_count = more_ballots;

            let result = validate(data, voters, votes)?;
            let has_f306 = result.errors.iter().any(|e| e == &f306);
            assert_eq!(has_f306, expect_f306, "Failed: {description}");
        }

        Ok(())
    }

    /// CSO | F.307 (Als H > D) J is ingevuld
    #[test]
    fn test_f307() -> Result<(), DataError> {
        let f307 = ValidationResult {
            code: ValidationResultCode::F307,
            fields: vec![
                "differences_counts.more_ballots_count".into(),
                "differences_counts.fewer_ballots_count".into(),
            ],
            context: None,
        };

        // (description, H=votes, D=voters, J=fewer_ballots, expect_f307)
        let cases = vec![
            ("H > D, J = 0", 72, 52, 0, false),
            ("H > D, J > 0", 72, 52, 3, true),
            ("H = D, J = 0", 52, 52, 0, false),
            ("H = D, J > 0", 52, 52, 3, false),
            ("H < D, J = 0", 52, 72, 0, false),
            ("H < D, J > 0", 52, 72, 3, false),
        ];

        for (description, votes, voters, fewer_ballots, expect_f307) in cases {
            let mut data = GSBDifferencesCounts::zero();
            data.fewer_ballots_count = fewer_ballots;

            let result = validate(data, voters, votes)?;
            let has_f307 = result.errors.iter().any(|e| e == &f307);
            assert_eq!(has_f307, expect_f307, "Failed: {description}");
        }

        Ok(())
    }

    /// CSO | F.308 (Als H < D) J <> D - H
    #[test]
    fn test_f308() -> Result<(), DataError> {
        let f308 = ValidationResult {
            code: ValidationResultCode::F308,
            fields: vec!["differences_counts.fewer_ballots_count".into()],
            context: None,
        };

        // (description, H=votes, D=voters, J=fewer_ballots, expect_f308)
        let cases = vec![
            ("H < D, J = D - H", 52, 72, 20, false),
            ("H < D, J < D - H", 52, 72, 4, true),
            ("H < D, J > D - H", 52, 72, 24, true),
            ("H = D, J = D - H", 52, 52, 0, false),
            ("H = D, J > D - H", 52, 52, 4, false),
            ("H > D, J > D - H", 72, 52, 42, false),
        ];

        for (description, votes, voters, fewer_ballots, expect_f308) in cases {
            let mut data = GSBDifferencesCounts::zero();
            data.fewer_ballots_count = fewer_ballots;

            let result = validate(data, voters, votes)?;
            let has_f308 = result.errors.iter().any(|e| e == &f308);
            assert_eq!(has_f308, expect_f308, "Failed: {description}");
        }

        Ok(())
    }

    /// CSO | F.309 (Als H < D) I is ingevuld
    #[test]
    fn test_f309() -> Result<(), DataError> {
        let f309 = ValidationResult {
            code: ValidationResultCode::F309,
            fields: vec![
                "differences_counts.more_ballots_count".into(),
                "differences_counts.fewer_ballots_count".into(),
            ],
            context: None,
        };

        // (description, H=votes, D=voters, I=more_ballots, expect_f309)
        let cases = vec![
            ("H < D, I = 0", 52, 72, 0, false),
            ("H < D, I > 0", 52, 72, 3, true),
            ("H = D, I = 0", 52, 52, 0, false),
            ("H = D, I > 0", 52, 52, 3, false),
            ("H > D, I = 0", 72, 52, 0, false),
            ("H > D, I > 0", 72, 52, 3, false),
        ];

        for (description, votes, voters, more_ballots, expect_f309) in cases {
            let mut data = GSBDifferencesCounts::zero();
            data.more_ballots_count = more_ballots;

            let result = validate(data, voters, votes)?;
            let has_f309 = result.errors.iter().any(|e| e == &f309);
            assert_eq!(has_f309, expect_f309, "Failed: {description}");
        }

        Ok(())
    }
}
