use std::ops::AddAssign;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    election::ElectionWithPoliticalGroups,
    field_path::FieldPath,
    polling_station::PollingStation,
    polling_station_results::count::Count,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
};

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

impl Compare for VotersCounts {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        // compare all counts
        self.poll_card_count.compare(
            &first_entry.poll_card_count,
            different_fields,
            &path.field("poll_card_count"),
        );
        self.proxy_certificate_count.compare(
            &first_entry.proxy_certificate_count,
            different_fields,
            &path.field("proxy_certificate_count"),
        );
        self.total_admitted_voters_count.compare(
            &first_entry.total_admitted_voters_count,
            different_fields,
            &path.field("total_admitted_voters_count"),
        );
    }
}

impl Validate for VotersCounts {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.poll_card_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("poll_card_count"),
        )?;
        self.proxy_certificate_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("proxy_certificate_count"),
        )?;
        self.total_admitted_voters_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total_admitted_voters_count"),
        )?;

        if self.poll_card_count + self.proxy_certificate_count != self.total_admitted_voters_count {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("poll_card_count").to_string(),
                    path.field("proxy_certificate_count").to_string(),
                    path.field("total_admitted_voters_count").to_string(),
                ],
                code: ValidationResultCode::F201,
                context: None,
            });
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{
        election::PGNumber,
        political_group_total_votes::PoliticalGroupTotalVotes,
        polling_station_results::{
            PollingStationResults, cso_first_session_results::CSOFirstSessionResults,
            differences_counts::DifferencesCounts,
            political_group_candidate_votes::PoliticalGroupCandidateVotes,
            votes_counts::VotesCounts,
        },
    };

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

    /// Tests that polling station results with voters count differences are correctly identified as not equal.
    #[test]
    fn test_not_equal_voters_counts_differences() {
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
        let mut second_entry = first_entry.clone();
        second_entry
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .poll_card_count = 101;
        second_entry
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .total_admitted_voters_count = 106;
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 2);
        assert_eq!(
            different_fields[0],
            "polling_station_results.voters_counts.poll_card_count"
        );
        assert_eq!(
            different_fields[1],
            "polling_station_results.voters_counts.total_admitted_voters_count"
        );
    }

    /// Tests that polling station results with differences in both voters counts and votes counts are correctly identified as not equal.
    #[test]
    #[allow(clippy::too_many_lines)]
    fn test_not_equal_voters_counts_and_votes_counts_differences() {
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
        let mut second_entry = first_entry.clone();
        second_entry
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts = VotersCounts {
            poll_card_count: 101,
            proxy_certificate_count: 1,
            total_admitted_voters_count: 102,
        };
        second_entry
            .as_cso_first_session_mut()
            .unwrap()
            .votes_counts = VotesCounts {
            political_group_total_votes: vec![PoliticalGroupTotalVotes {
                number: PGNumber::from(1),
                total: 101,
            }],
            total_votes_candidates_count: 101,
            blank_votes_count: 1,
            invalid_votes_count: 1,
            total_votes_cast_count: 103,
        };
        second_entry.compare(
            &first_entry,
            &mut different_fields,
            &"polling_station_results".into(),
        );
        assert_eq!(different_fields.len(), 8);
        assert_eq!(
            different_fields[0],
            "polling_station_results.voters_counts.poll_card_count"
        );
        assert_eq!(
            different_fields[1],
            "polling_station_results.voters_counts.proxy_certificate_count"
        );
        assert_eq!(
            different_fields[2],
            "polling_station_results.voters_counts.total_admitted_voters_count"
        );
        assert_eq!(
            different_fields[3],
            "polling_station_results.votes_counts.political_group_total_votes[0].total"
        );
        assert_eq!(
            different_fields[4],
            "polling_station_results.votes_counts.total_votes_candidates_count"
        );
        assert_eq!(
            different_fields[5],
            "polling_station_results.votes_counts.blank_votes_count"
        );
        assert_eq!(
            different_fields[6],
            "polling_station_results.votes_counts.invalid_votes_count"
        );
        assert_eq!(
            different_fields[7],
            "polling_station_results.votes_counts.total_votes_cast_count"
        );
    }

    fn validate(
        poll_card_count: u32,
        proxy_certificate_count: u32,
        total_admitted_voters_count: u32,
    ) -> Result<ValidationResults, DataError> {
        let voters_counts = VotersCounts {
            poll_card_count,
            proxy_certificate_count,
            total_admitted_voters_count,
        };

        let mut validation_results = ValidationResults::default();
        voters_counts.validate(
            &ElectionWithPoliticalGroups::election_fixture(&[]),
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"voters_counts".into(),
        )?;

        Ok(validation_results)
    }

    /// CSO/DSO | F.201: 'Aantal kiezers en stemmen': stempassen + volmachten <> totaal toegelaten kiezers
    #[test]
    fn test_f201() -> Result<(), DataError> {
        let validation_results = validate(100, 50, 150)?;
        assert!(validation_results.errors.is_empty());

        let validation_results = validate(100, 150, 151)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F201,
                fields: vec![
                    "voters_counts.poll_card_count".into(),
                    "voters_counts.proxy_certificate_count".into(),
                    "voters_counts.total_admitted_voters_count".into()
                ],
                context: None,
            }]
        );

        Ok(())
    }
}
