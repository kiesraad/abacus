use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    data_entry::domain::{
        compare::Compare,
        field_path::FieldPath,
        polling_station_results::count::Count,
        validate::{
            DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults,
        },
        yes_no::YesNo,
    },
    election::domain::ElectionWithPoliticalGroups,
    polling_station::PollingStation,
};

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

impl Compare for DifferencesCounts {
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
        self.compare_votes_cast_admitted_voters.compare(
            &first_entry.compare_votes_cast_admitted_voters,
            different_fields,
            &path.field("compare_votes_cast_admitted_voters"),
        );

        self.difference_completely_accounted_for.compare(
            &first_entry.difference_completely_accounted_for,
            different_fields,
            &path.field("difference_completely_accounted_for"),
        );
    }
}

impl Compare for DifferenceCountsCompareVotesCastAdmittedVoters {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.admitted_voters_equal_votes_cast.compare(
            &first_entry.admitted_voters_equal_votes_cast,
            different_fields,
            &path.field("admitted_voters_equal_votes_cast"),
        );
        self.votes_cast_greater_than_admitted_voters.compare(
            &first_entry.votes_cast_greater_than_admitted_voters,
            different_fields,
            &path.field("votes_cast_greater_than_admitted_voters"),
        );
        self.votes_cast_smaller_than_admitted_voters.compare(
            &first_entry.votes_cast_smaller_than_admitted_voters,
            different_fields,
            &path.field("votes_cast_smaller_than_admitted_voters"),
        );
    }
}

impl DifferencesCounts {
    fn validate_differences_checkboxes(
        &self,
        total_voters_count: u32,
        total_votes_count: u32,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
        let equal_checked = self
            .compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast;
        let greater_than_checked = self
            .compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters;
        let smaller_than_checked = self
            .compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters;

        if equal_checked && (total_voters_count != total_votes_count) {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field(
                        "compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast",
                    )
                    .to_string(),
                ],
                code: ValidationResultCode::F301,
                context: None,
            });
        }

        if greater_than_checked && total_votes_count <= total_voters_count {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field(
                        "compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters",
                    )
                        .to_string(),
                ],
                code: ValidationResultCode::F302,
                context: None,
            });
        }

        if smaller_than_checked && total_votes_count >= total_voters_count {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field(
                        "compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters",
                    )
                        .to_string(),
                ],
                code: ValidationResultCode::F303,
                context: None,
            });
        }

        // Check if all or multiple fields are checked or none at all.
        let compare_matches = [equal_checked, greater_than_checked, smaller_than_checked]
            .into_iter()
            .filter(|b| *b)
            .count();

        if compare_matches != 1 {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.field("compare_votes_cast_admitted_voters").to_string()],
                code: ValidationResultCode::F304,
                context: None,
            });
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

    fn validate_accounted_for(
        &self,
        total_voters_count: u32,
        total_votes_count: u32,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
        let accounted_for = &self.difference_completely_accounted_for;
        if (total_voters_count != total_votes_count)
            && (accounted_for.is_empty() || (accounted_for.is_both()))
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("difference_completely_accounted_for")
                        .to_string(),
                ],
                code: ValidationResultCode::F310,
                context: None,
            });
        }
    }
}

pub fn validate_differences_counts(
    differences_counts: &DifferencesCounts,
    total_voters_count: u32,
    total_votes_count: u32,
    validation_results: &mut ValidationResults,
    differences_counts_path: &FieldPath,
) -> Result<(), DataError> {
    differences_counts.validate_differences_checkboxes(
        total_voters_count,
        total_votes_count,
        validation_results,
        differences_counts_path,
    );

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

    differences_counts.validate_accounted_for(
        total_voters_count,
        total_votes_count,
        validation_results,
        differences_counts_path,
    );

    Ok(())
}

impl Validate for DifferencesCounts {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.more_ballots_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("more_ballots_count"),
        )?;
        self.fewer_ballots_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("fewer_ballots_count"),
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        data_entry::domain::{
            political_group_total_votes::PoliticalGroupTotalVotes,
            polling_station_results::{
                PollingStationResults, cso_first_session_results::CSOFirstSessionResults,
                political_group_candidate_votes::PoliticalGroupCandidateVotes,
                voters_counts::VotersCounts, votes_counts::VotesCounts,
            },
            valid_default::ValidDefault,
        },
        election::domain::PGNumber,
    };

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

    /// Tests that polling station results with equal data and no differences counts are correctly identified as equal.
    #[test]
    fn test_equal_no_differences_counts() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
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
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that polling station results with equal data and with differences counts are correctly identified as equal.
    #[test]
    fn test_equal_with_differences_counts() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
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
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
                difference_completely_accounted_for: Default::default(),
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: Default::default(),
                        votes_cast_greater_than_admitted_voters: Default::default(),
                        votes_cast_smaller_than_admitted_voters: Default::default(),
                    },
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that polling station results with equal data and no differences counts are correctly identified as equal.
    #[test]
    fn test_equal_no_differences_counts_variant() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
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
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that polling station results with equal data and with differences counts are correctly identified as equal.
    #[test]
    fn test_equal_with_differences_counts_variant() {
        let mut different_fields = vec![];
        let first_entry = PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
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
            differences_counts: DifferencesCounts {
                more_ballots_count: 1,
                fewer_ballots_count: 0,
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: Default::default(),
                        votes_cast_greater_than_admitted_voters: Default::default(),
                        votes_cast_smaller_than_admitted_voters: Default::default(),
                    },
                difference_completely_accounted_for: Default::default(),
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let second_entry = first_entry.clone();
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 0);
    }

    /// Tests that polling station results with differences in differences counts are correctly identified as not equal.
    #[test]
    #[allow(clippy::too_many_lines)]
    fn test_not_equal_differences_counts_differences() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: Default::default(),
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
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 2,
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: false,
                        votes_cast_greater_than_admitted_voters: true,
                        votes_cast_smaller_than_admitted_voters: true,
                    },
                difference_completely_accounted_for: Default::default(),
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                PGNumber::from(1),
                &[100],
            )],
        });
        let mut second_entry = first_entry.clone();
        second_entry
            .as_cso_first_session_mut()
            .unwrap()
            .differences_counts = DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 2,
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: true,
                votes_cast_greater_than_admitted_voters: false,
                votes_cast_smaller_than_admitted_voters: false,
            },
            difference_completely_accounted_for: Default::default(),
        };
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 3);
        assert_eq!(
            different_fields[0],
            "polling_station_results.differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast"
        );
        assert_eq!(
            different_fields[1],
            "polling_station_results.differences_counts.compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters"
        );
        assert_eq!(
            different_fields[2],
            "polling_station_results.differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters"
        );
    }

    fn validate(
        data: DifferencesCounts,
        total_voters_counts: u32,
        total_votes_counts: u32,
    ) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();

        validate_differences_counts(
            &data,
            total_voters_counts,
            total_votes_counts,
            &mut validation_results,
            &"differences_counts".into(),
        )?;

        Ok(validation_results)
    }

    /// CSO | F.301: "Vergelijk D&H": (checkbox D=H is aangevinkt, maar D<>H)
    #[test]
    fn test_f301() -> Result<(), DataError> {
        // D = H checked & D = H
        let mut data = DifferencesCounts::zero();
        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 105, 105)?;

        assert!(validation_results.errors.is_empty());

        // D = H checked & D <> H
        let mut data = DifferencesCounts::zero();
        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 105, 104)?;

        assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F301,
                    fields: vec![
                        "differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast".into(),
                    ],
                    context: None,
                }, ValidationResult {
                    code: ValidationResultCode::F308,
                    fields: vec![
                        "differences_counts.fewer_ballots_count".into(),
                    ],
                    context: None,
                }]
            );

        Ok(())
    }

    /// CSO | F.302: "Vergelijk D&H": (checkbox H>D is aangevinkt, maar H<=D)
    #[test]
    fn test_f302() -> Result<(), DataError> {
        // H > D checked & H > D
        let mut data = DifferencesCounts::zero();
        data.more_ballots_count = 1;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 104, 105)?;

        assert!(validation_results.errors.is_empty());

        // H > D checked & H < D
        let mut data = DifferencesCounts::zero();
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 105, 104)?;

        assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F302,
                    fields: vec![
                        "differences_counts.compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters".into(),
                    ],
                    context: None,
                }, ValidationResult {
                    code: ValidationResultCode::F308,
                    fields: vec![
                        "differences_counts.fewer_ballots_count".into(),
                    ],
                    context: None,
                }]
            );

        // H > D checked & H = D
        let mut data = DifferencesCounts::zero();
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 105, 105)?;

        assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F302,
                    fields: vec![
                        "differences_counts.compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters".into(),
                    ],
                    context: None,
                }]
            );

        Ok(())
    }

    /// CSO | F.303: "Vergelijk D&H": (checkbox H<D is aangevinkt, maar H>=D)
    #[test]
    fn test_f303() -> Result<(), DataError> {
        // H < D checked & H < D
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 1;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 104, 103)?;

        assert!(validation_results.errors.is_empty());

        // H < D checked & H > D
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 103, 104)?;

        assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F303,
                    fields: vec![
                        "differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters".into(),
                    ],
                    context: None,
                },
                    ValidationResult {
                        code: ValidationResultCode::F306,
                        fields: vec!["differences_counts.more_ballots_count".into()],
                        context: None,
                    }]
            );

        // H < D checked & H = D
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 103, 103)?;

        assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F303,
                    fields: vec![
                        "differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters".into(),
                    ],
                    context: None,
                }]
            );

        Ok(())
    }

    /// CSO | F.304: "Vergelijk D&H": Meerdere aangevinkt of geen enkele aangevinkt
    #[test]
    fn test_f304_none_checked() -> Result<(), DataError> {
        // Only 1 checked: D = H checked & D = H
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 105, 105)?;

        assert!(validation_results.errors.is_empty());

        // None checked
        let mut data = DifferencesCounts::zero();

        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 105, 105)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F304,
                fields: vec!["differences_counts.compare_votes_cast_admitted_voters".into(),],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.304: "Vergelijk D&H": Meerdere aangevinkt of geen enkele aangevinkt
    #[test]
    fn test_f304_multiple_checked() -> Result<(), DataError> {
        // Multiple (not all) checked
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 105, 104)?;

        assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F301,
                    fields: vec![
                        "differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast".into(),
                    ],
                    context: None,
                }, ValidationResult {
                    code: ValidationResultCode::F304,
                    fields: vec![
                        "differences_counts.compare_votes_cast_admitted_voters".into(),
                    ],
                    context: None,
                },
                    ValidationResult {
                        code: ValidationResultCode::F308,
                        fields: vec![
                            "differences_counts.fewer_ballots_count".into(),
                        ],
                        context: None,
                    }]
            );

        Ok(())
    }

    /// CSO | F.304: "Vergelijk D&H": Meerdere aangevinkt of geen enkele aangevinkt
    #[test]
    fn test_f304_all_checked() -> Result<(), DataError> {
        // All checked
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 105, 104)?;

        assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F301,
                    fields: vec![
                        "differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast".into(),
                    ],
                    context: None,
                },
                    ValidationResult {
                        code: ValidationResultCode::F302,
                        fields: vec![
                            "differences_counts.compare_votes_cast_admitted_voters.votes_cast_greater_than_admitted_voters".into(),
                        ],
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F304,
                        fields: vec![
                            "differences_counts.compare_votes_cast_admitted_voters".into(),
                        ],
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F308,
                        fields: vec![
                            "differences_counts.fewer_ballots_count".into(),
                        ],
                        context: None,
                    }]
            );

        Ok(())
    }

    /// CSO | F.305 (Als D = H) I en/of J zijn ingevuld
    #[test]
    fn test_f305_more_ballots_count() -> Result<(), DataError> {
        // D = H & I is filled in
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 52, 52)?;

        assert!(validation_results.errors.is_empty());

        // D < H & I and J not filled in (make sure no F.305 error is triggered)
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 52, 53)?;

        assert_eq!(
                validation_results.errors,
                [
                    ValidationResult {
                        code: ValidationResultCode::F301,
                        fields: vec!["differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast".into()],
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F306,
                        fields: vec!["differences_counts.more_ballots_count".into()],
                        context: None,
                    }
                ]
            );

        // D > H & I and J not filled in (make sure no F.305 error is triggered)
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 53, 52)?;

        assert_eq!(
                validation_results.errors,
                [
                    ValidationResult {
                        code: ValidationResultCode::F301,
                        fields: vec!["differences_counts.compare_votes_cast_admitted_voters.admitted_voters_equal_votes_cast".into()],
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F308,
                        fields: vec!["differences_counts.fewer_ballots_count".into()],
                        context: None,
                    }
                ]
            );

        Ok(())
    }

    #[test]
    fn test_f305_more_and_fewer_ballots_count_both_filled() -> Result<(), DataError> {
        // D = H & I and J filled in
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.fewer_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 20;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 52, 72)?;

        assert!(validation_results.errors.is_empty());

        Ok(())
    }

    /// CSO | F.306 (Als H > D) I <> H - D
    #[test]
    fn test_f306_votes_equals_voters() -> Result<(), DataError> {
        // H = D & I < H - D
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 10;
        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 30;
        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 30;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 24;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 3;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 30;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 3;
        data.compare_votes_cast_admitted_voters
            .admitted_voters_equal_votes_cast = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 3;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 2;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 46, 44)?;

        assert!(validation_results.errors.is_empty());

        // H < D & J < D - H
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 1;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 5;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 5;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 44, 44)?;

        assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F303,
                    fields: vec!["differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters".into()],
                    context: None,
                }, ValidationResult {
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
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 5;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 3;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 44, 44)?;

        assert_eq!(
                validation_results.errors,
                [
                    ValidationResult {
                        code: ValidationResultCode::F303,
                        fields: vec!["differences_counts.compare_votes_cast_admitted_voters.votes_cast_smaller_than_admitted_voters".into()],
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F305,
                        fields: vec!["differences_counts.more_ballots_count".into()],
                        context: None,
                    }
                ]
            );

        Ok(())
    }

    /// CSO | F.309 (Als H < D) I is ingevuld
    #[test]
    fn test_f309_votes_greater_than_voters() -> Result<(), DataError> {
        // H < D & I = 0
        let mut data = DifferencesCounts::zero();

        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 5;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

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

    /// CSO | F.310 (Als D <> H en verklaring voor verschil niks aangevinkt of 'ja' en 'nee' aangevinkt)
    #[test]
    fn test_f310_one_checked() -> Result<(), DataError> {
        // D < H & difference_completely_accounted_for.yes checked
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 44, 48)?;

        assert!(validation_results.errors.is_empty());

        // D > H & difference_completely_accounted_for.yes checked
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::yes();

        let validation_results = validate(data, 48, 44)?;

        assert!(validation_results.errors.is_empty());

        // D < H & difference_completely_accounted_for.no checked
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::no();

        let validation_results = validate(data, 44, 48)?;

        assert!(validation_results.errors.is_empty());

        // D > H & difference_completely_accounted_for.no checked
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::no();

        let validation_results = validate(data, 48, 44)?;

        assert!(validation_results.errors.is_empty());

        Ok(())
    }

    /// CSO | F.310 (Als D <> H en verklaring voor verschil niks aangevinkt of 'ja' en 'nee' aangevinkt)
    #[test]
    fn test_f310_none_checked() -> Result<(), DataError> {
        // D < H & difference_completely_accounted_for none checked
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;

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
                        "differences_counts.fewer_ballots_count".into(),
                    ],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F310,
                    fields: vec!["differences_counts.difference_completely_accounted_for".into(),],
                    context: None,
                }
            ]
        );

        // D > H & difference_completely_accounted_for none checked
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;

        let validation_results = validate(data, 44, 48)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F310,
                fields: vec!["differences_counts.difference_completely_accounted_for".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.310 (Als D <> H en verklaring voor verschil niks aangevinkt of 'ja' en 'nee' aangevinkt)
    #[test]
    fn test_f310_all_checked() -> Result<(), DataError> {
        // D < H & difference_completely_accounted_for both checked
        let mut data = DifferencesCounts::zero();

        data.more_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_greater_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::both();

        let validation_results = validate(data, 44, 48)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F310,
                fields: vec!["differences_counts.difference_completely_accounted_for".into(),],
                context: None,
            }]
        );

        // D > H & difference_completely_accounted_for both checked
        let mut data = DifferencesCounts::zero();

        data.fewer_ballots_count = 4;
        data.compare_votes_cast_admitted_voters
            .votes_cast_smaller_than_admitted_voters = true;
        data.difference_completely_accounted_for = YesNo::both();

        let validation_results = validate(data, 48, 44)?;

        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F310,
                fields: vec!["differences_counts.difference_completely_accounted_for".into(),],
                context: None,
            }]
        );

        Ok(())
    }
}
