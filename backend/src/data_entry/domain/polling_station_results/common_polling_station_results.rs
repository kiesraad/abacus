use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    data_entry::domain::{
        field_path::FieldPath,
        polling_station_results::{
            differences_counts::{DifferencesCounts, validate_differences_counts},
            political_group_candidate_votes::PoliticalGroupCandidateVotes,
            voters_counts::VotersCounts,
            votes_counts::VotesCounts,
        },
        validate::{
            DataError, Validate, ValidationResult, ValidationResultCode, ValidationResultContext,
            ValidationResults,
        },
    },
    election::domain::{election::ElectionWithPoliticalGroups, polling_station::PollingStation},
};

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

impl CommonPollingStationResults {
    fn validate_political_group_votes_errors(
        &self,
        political_group_candidate_votes: &PoliticalGroupCandidateVotes,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        let political_group_total_votes = self
            .votes_counts
            .political_group_total_votes
            .iter()
            .find(|political_group_total_votes| {
                political_group_total_votes.number == political_group_candidate_votes.number
            })
            .ok_or(DataError::new("political group total votes should exist"))?;

        // all candidate votes, cast to u64 to avoid overflow
        let candidate_votes_sum: u64 = political_group_candidate_votes
            .candidate_votes
            .iter()
            .map(|cv| cv.votes as u64)
            .sum::<u64>();

        if (candidate_votes_sum > 0 || political_group_total_votes.total > 0)
            && political_group_candidate_votes.total == 0
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.field("total").to_string()],
                code: ValidationResultCode::F401,
                context: Some(ValidationResultContext {
                    political_group_number: Some(political_group_total_votes.number),
                }),
            });
        } else {
            if political_group_candidate_votes.total as u64 != candidate_votes_sum {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F402,
                    context: Some(ValidationResultContext {
                        political_group_number: Some(political_group_candidate_votes.number),
                    }),
                });
            }

            if political_group_candidate_votes.total != political_group_total_votes.total {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.field("total").to_string()],
                    code: ValidationResultCode::F403,
                    context: Some(ValidationResultContext {
                        political_group_number: Some(political_group_candidate_votes.number),
                    }),
                });
            }
        }

        Ok(())
    }
}

impl Validate for CommonPollingStationResults {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        let total_votes_count = self.votes_counts.total_votes_cast_count;

        self.votes_counts.validate(
            election,
            polling_station,
            validation_results,
            &path.field("votes_counts"),
        )?;

        let votes_counts_path = path.field("votes_counts");
        let voters_counts_path = path.field("voters_counts");

        let total_voters_count = self.voters_counts.total_admitted_voters_count;
        self.voters_counts.validate(
            election,
            polling_station,
            validation_results,
            &voters_counts_path,
        )?;

        if difference_admitted_voters_count_and_votes_cast_count_above_threshold(
            total_voters_count,
            total_votes_count,
        ) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    voters_counts_path
                        .field("total_admitted_voters_count")
                        .to_string(),
                    votes_counts_path
                        .field("total_votes_cast_count")
                        .to_string(),
                ],
                code: ValidationResultCode::W203,
                context: None,
            });
        }

        let differences_counts_path = path.field("differences_counts");

        self.differences_counts.validate(
            election,
            polling_station,
            validation_results,
            &differences_counts_path,
        )?;

        validate_differences_counts(
            &self.differences_counts,
            total_voters_count,
            total_votes_count,
            validation_results,
            &differences_counts_path,
        )?;

        self.political_group_votes.validate(
            election,
            polling_station,
            validation_results,
            &path.field("political_group_votes"),
        )?;

        for (i, pgcv) in self.political_group_votes.iter().enumerate() {
            let pgcv_path = path.field("political_group_votes").index(i);
            self.validate_political_group_votes_errors(pgcv, validation_results, &pgcv_path)?;
        }

        Ok(())
    }
}

/// Check if the difference between the total admitted voters count and the total votes cast count
/// is above the threshold, meaning 2% or more or 15 or more, which should result in a warning.
fn difference_admitted_voters_count_and_votes_cast_count_above_threshold(
    admitted_voters: u32,
    votes_cast: u32,
) -> bool {
    let float_admitted_voters: f64 = f64::from(admitted_voters);
    let float_votes_cast: f64 = f64::from(votes_cast);
    f64::abs(float_admitted_voters - float_votes_cast) / float_votes_cast >= 0.02
        || f64::abs(float_admitted_voters - float_votes_cast) >= 15.0
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        data_entry::domain::{
            political_group_total_votes::PoliticalGroupTotalVotes, valid_default::ValidDefault,
        },
        election::domain::election::PGNumber,
    };

    fn create_test_data() -> CommonPollingStationResults {
        CommonPollingStationResults {
            voters_counts: VotersCounts {
                poll_card_count: 90,
                proxy_certificate_count: 0,
                total_admitted_voters_count: 90,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(1),
                        total: 60,
                    },
                    PoliticalGroupTotalVotes {
                        number: PGNumber::from(2),
                        total: 30,
                    },
                ],
                total_votes_candidates_count: 90,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 90,
            },
            differences_counts: ValidDefault::valid_default(),
            political_group_votes: vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(1), &[10, 20, 30]),
                PoliticalGroupCandidateVotes::from_test_data_auto(PGNumber::from(2), &[5, 10, 15]),
            ],
        }
    }

    fn validate(data: CommonPollingStationResults) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();

        data.validate(
            // Adjust election political group list to the given test data
            &ElectionWithPoliticalGroups::election_fixture(
                &data
                    .political_group_votes
                    .iter()
                    .map(|pg| u32::try_from(pg.candidate_votes.len()).unwrap())
                    .collect::<Vec<_>>(),
            ),
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"data".into(),
        )?;

        Ok(validation_results)
    }

    /// Tests the difference_equal_or_above function with various input combinations.
    #[test]
    fn test_difference_admitted_voters_count_and_votes_cast_count_above_threshold() {
        let cases = [
            // Percentage
            (101, 100, false), // < 2%
            (102, 100, true),  // == 2%
            (103, 100, true),  // > 2%
            // Absolute amount
            (1014, 1000, false), // < 15
            (1015, 1000, true),  // == 15
            (1016, 1000, true),  // > 15
            // Absolute amount (reversed)
            (1000, 1014, false), // < 15
            (1000, 1015, true),  // == 15
            (1000, 1016, true),  // > 15
        ];

        for (admitted_voters, votes_cast, expected) in cases {
            assert_eq!(
                difference_admitted_voters_count_and_votes_cast_count_above_threshold(
                    admitted_voters,
                    votes_cast
                ),
                expected,
                "Failed for admitted_voters={admitted_voters}, votes_cast={votes_cast}, expected={expected}"
            );
        }
    }

    #[test]
    fn test_default() -> Result<(), DataError> {
        let validation_results = validate(create_test_data())?;
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 0);
        Ok(())
    }

    /// CSO/DSO | W.203: 'Aantal kiezers en stemmen': Verschil tussen totaal aantal toegelaten kiezers en totaal aantal uitgebrachte stemmen is groter dan of gelijk aan 2% en groter dan of gelijk aan 15
    #[test]
    fn test_w203() -> Result<(), DataError> {
        let cases = [
            (101, 100, false),   // < 2%
            (102, 100, true),    // == 2%
            (103, 100, true),    // > 2%
            (1000, 1014, false), // < 15
            (1000, 1015, true),  // == 15
            (1000, 1016, true),  // > 15
            (1016, 1000, true),  // > 15 (reversed)
        ];

        for (admitted_voters, votes_cast, expected) in cases {
            let mut data = create_test_data();
            data.voters_counts.total_admitted_voters_count = admitted_voters;
            data.votes_counts.total_votes_cast_count = votes_cast;

            let validation_results = validate(data)?;

            if expected {
                assert_eq!(
                    validation_results.warnings,
                    [ValidationResult {
                        code: ValidationResultCode::W203,
                        fields: vec![
                            "data.voters_counts.total_admitted_voters_count".into(),
                            "data.votes_counts.total_votes_cast_count".into(),
                        ],
                        context: None,
                    }],
                    "Warning not found for admitted_voters={admitted_voters}, votes_cast={votes_cast}",
                );
            } else {
                assert!(validation_results.warnings.is_empty());
            }
        }

        Ok(())
    }

    /// CSO | F.401 `Er zijn (stemmen op kandidaten of het lijsttotaal van corresponderende E.x is groter dan 0) en het totaal aantal stemmen op een lijst = leeg of 0`
    #[test]
    fn test_f401() -> Result<(), DataError> {
        // Only F.401 is triggered.
        // Candidate votes sum > 0 & political group candidates votes total == 0
        let mut data = create_test_data();
        data.political_group_votes[1].total = 0;

        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F401,
                fields: vec!["data.political_group_votes[1].total".into()],
                context: Some(ValidationResultContext {
                    political_group_number: Some(PGNumber::from(2)),
                }),
            }]
        );

        // Only F.401 is triggered.
        // Political group total votes > 0 & political group candidates votes total == 0
        data.political_group_votes[1].candidate_votes[0].votes = 0;
        data.political_group_votes[1].candidate_votes[1].votes = 0;
        data.political_group_votes[1].candidate_votes[2].votes = 0;
        data.political_group_votes[1].total = 0;

        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F401,
                fields: vec!["data.political_group_votes[1].total".into()],
                context: Some(ValidationResultContext {
                    political_group_number: Some(PGNumber::from(2)),
                }),
            }]
        );

        // Expect only F.401 (F.401, F.402 and F.403 are triggered)
        data.political_group_votes[1].candidate_votes[0].votes += 10;

        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F401,
                fields: vec!["data.political_group_votes[1].total".into()],
                context: Some(ValidationResultContext {
                    political_group_number: Some(PGNumber::from(2)),
                }),
            }]
        );

        Ok(())
    }

    #[test]
    fn test_f401_multiple_errors() -> Result<(), DataError> {
        let mut data = create_test_data();
        // Covers multiple errors over different political groups:
        // Following 2 tests check that F.401 is triggered for both political group votes.
        // - Expect F.402 and F.403 for group 1.
        // - Expect only F.401 for group 2 (F.401, F.402 and F.403 are triggered)
        data.political_group_votes[0].candidate_votes[0].votes = 0;
        data.political_group_votes[0].total = 30;
        data.political_group_votes[1].candidate_votes[0].votes = 10;
        data.political_group_votes[1].total = 0;

        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F402,
                    fields: vec!["data.political_group_votes[0]".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(1)),
                    }),
                },
                ValidationResult {
                    code: ValidationResultCode::F403,
                    fields: vec!["data.political_group_votes[0].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(1)),
                    }),
                },
                ValidationResult {
                    code: ValidationResultCode::F401,
                    fields: vec!["data.political_group_votes[1].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(2)),
                    }),
                }
            ]
        );

        // Covers multiple errors over different political groups:
        // - Expect only F.401 for group 1 (F.401, F.402 and F.403 are triggered)
        // - Expect F.402 for group 2.
        data.political_group_votes[0].candidate_votes[0].votes = 0;
        data.political_group_votes[0].candidate_votes[1].votes = 0;
        data.political_group_votes[0].candidate_votes[2].votes = 0;
        data.political_group_votes[0].total = 0;
        data.political_group_votes[1].candidate_votes[0].votes = 0;
        data.political_group_votes[1].total = 30;

        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F401,
                    fields: vec!["data.political_group_votes[0].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(1)),
                    }),
                },
                ValidationResult {
                    code: ValidationResultCode::F402,
                    fields: vec!["data.political_group_votes[1]".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(2)),
                    }),
                },
            ]
        );

        Ok(())
    }

    /// CSO | F.402 (Als F.401 niet getoond wordt) `Totaal aantal stemmen op een lijst <> som van aantal stemmen op de kandidaten van die lijst`
    #[test]
    fn test_f402() -> Result<(), DataError> {
        let mut data = create_test_data();
        data.political_group_votes[1].total = 0;

        // When list total is empty, don't expect F.402, but F.401
        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F401,
                fields: vec!["data.political_group_votes[1].total".into()],
                context: Some(ValidationResultContext {
                    political_group_number: Some(PGNumber::from(2)),
                }),
            }]
        );

        data.political_group_votes[1].candidate_votes[0].votes = 0;
        data.political_group_votes[1].total = 30;

        // Expect F.402 when list total doesn't match candidate votes
        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F402,
                fields: vec!["data.political_group_votes[1]".into()],
                context: Some(ValidationResultContext {
                    political_group_number: Some(PGNumber::from(2)),
                }),
            }]
        );

        Ok(())
    }

    /// CSO | F.403 (Als F.401 niet getoond wordt) `Totaal aantal stemmen op een lijst komt niet overeen met het lijsttotaal van corresponderende E.x`
    #[test]
    fn test_f403() -> Result<(), DataError> {
        let mut data = create_test_data();
        data.political_group_votes[1].candidate_votes[0].votes += 10;
        data.political_group_votes[1].total += 10;
        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F403,
                fields: vec!["data.political_group_votes[1].total".into()],
                context: Some(ValidationResultContext {
                    political_group_number: Some(PGNumber::from(2)),
                }),
            }],
        );

        // Multiple invalid case
        data.political_group_votes[0].candidate_votes[0].votes += 10;
        data.political_group_votes[0].total += 10;
        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F403,
                    fields: vec!["data.political_group_votes[0].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(1)),
                    }),
                },
                ValidationResult {
                    code: ValidationResultCode::F403,
                    fields: vec!["data.political_group_votes[1].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(2)),
                    }),
                }
            ],
        );

        // When list total is empty, don't expect F.403, but F.401
        data.political_group_votes[1].total = 0;
        let validation_results = validate(data.clone())?;
        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F403,
                    fields: vec!["data.political_group_votes[0].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(1)),
                    }),
                },
                ValidationResult {
                    code: ValidationResultCode::F401,
                    fields: vec!["data.political_group_votes[1].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(PGNumber::from(2)),
                    }),
                }
            ],
        );

        Ok(())
    }
}
