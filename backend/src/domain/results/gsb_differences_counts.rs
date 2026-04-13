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

    /// F312 totaal aantal kiezers =
    ///   totaal aantal uitgebrachte stemmen - meer getelde stemmen + minder getelde stemmen
    pub fn validate_sum(
        &self,
        voters_count: Count,
        votes_count: Count,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
        if i64::from(voters_count)
            != (i64::from(votes_count) - i64::from(self.more_ballots_count)
                + i64::from(self.fewer_ballots_count))
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("more_ballots_count").to_string(),
                    path.field("fewer_ballots_count").to_string(),
                ],
                code: ValidationResultCode::F312,
                context: None,
            });
        }
    }
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
        voters_count: u32,
        votes_count: u32,
    ) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();

        data.validate_sum(
            voters_count,
            votes_count,
            &mut validation_results,
            &"differences_counts".into(),
        );

        Ok(validation_results)
    }

    /// F.312 totaal aantal kiezers =
    ///   totaal aantal uitgebrachte stemmen - meer getelde stemmen + minder getelde stemmen
    #[test]
    fn test_f312() -> Result<(), DataError> {
        let validation_error = ValidationResult {
            code: ValidationResultCode::F312,
            fields: vec![
                "differences_counts.more_ballots_count".into(),
                "differences_counts.fewer_ballots_count".into(),
            ],
            context: None,
        };

        // (D=total voters, H=total votes, I=more ballots, J=fewer ballots, expect_error)
        let cases = vec![
            (90, 80, 20, 30, false),
            (92, 82, 20, 30, false),
            (92, 80, 18, 30, false),
            (92, 80, 20, 32, false),
            (92, 80, 20, 30, true),
            (90, 82, 20, 30, true),
            (90, 80, 22, 30, true),
            (90, 80, 20, 32, true),
            (90, 90, 91, 0, true), // check for subtract with overflow
        ];

        for (voters, votes, more, fewer, expect_error) in cases {
            let mut data = GSBDifferencesCounts::zero();
            data.more_ballots_count = more;
            data.fewer_ballots_count = fewer;
            let result = validate(data, voters, votes)?;

            let has_error = result.errors.iter().any(|e| e == &validation_error);
            assert_eq!(
                has_error, expect_error,
                "{voters} == {votes} - {more} + {fewer} should result in error: {expect_error}",
            );
        }

        Ok(())
    }
}
