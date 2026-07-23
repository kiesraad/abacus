use std::ops::AddAssign;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::count::Count;
use crate::domain::{
    compare::Compare,
    election::{ElectionCategory, ElectionWithPoliticalGroups},
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
};

/// Voters counts, part of the results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct VotersCounts {
    /// Number of valid poll cards ("Aantal geldige stempassen")
    #[schema(value_type = u32)]
    pub poll_card_count: Count,
    /// Number of valid proxy certificates ("Aantal geldige volmachtbewijzen")
    #[schema(value_type = u32)]
    pub proxy_certificate_count: Count,
    /// Number of valid voter cards ("Aantal geldige kiezerspassen")
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u32)]
    pub voter_card_count: Option<Count>,
    /// Total number of admitted voters ("Totaal aantal toegelaten kiezers")
    #[schema(value_type = u32)]
    pub total_admitted_voters_count: Count,
}

impl AddAssign<&VotersCounts> for VotersCounts {
    fn add_assign(&mut self, other: &Self) {
        self.poll_card_count += other.poll_card_count;
        self.proxy_certificate_count += other.proxy_certificate_count;

        // If both are Some, add the values
        if let (Some(self_voter_card_count), Some(other_voter_card_count)) =
            (self.voter_card_count, other.voter_card_count)
        {
            self.voter_card_count = Some(self_voter_card_count + other_voter_card_count);
        }
        // If self is None and other is Some, set self to other's value
        else if self.voter_card_count.is_none() && other.voter_card_count.is_some() {
            self.voter_card_count = other.voter_card_count;
        }

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

        match (&self.voter_card_count, &first_entry.voter_card_count) {
            // If both Some, compare the values
            (Some(voter_card_count), Some(first_entry_voter_card_count)) => {
                voter_card_count.compare(
                    first_entry_voter_card_count,
                    different_fields,
                    &path.field("voter_card_count"),
                );
            }
            // If both none, do nothing
            (None, None) => {}
            // If one is Some and the other is None, add to different_fields
            _ => different_fields.push(path.field("voter_card_count").to_string()),
        }

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
        path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();
        // validate all counts
        validation_results.join(
            self.poll_card_count
                .validate(election, &path.field("poll_card_count"))?,
        );
        validation_results.join(
            self.proxy_certificate_count
                .validate(election, &path.field("proxy_certificate_count"))?,
        );

        match (election.category, self.voter_card_count) {
            (ElectionCategory::Municipal, None) => {}
            (ElectionCategory::Municipal, Some(_)) => {
                return Err(DataError::new(
                    "Voter card count is not allowed for municipal elections",
                ));
            }
            (_, None) => {
                return Err(DataError::new(
                    "Voter card count is required for non-municipal elections",
                ));
            }
            (_, Some(voter_card_count)) => {
                validation_results
                    .join(voter_card_count.validate(election, &path.field("voter_card_count"))?);
            }
        }

        validation_results.join(
            self.total_admitted_voters_count
                .validate(election, &path.field("total_admitted_voters_count"))?,
        );

        if self.poll_card_count + self.proxy_certificate_count + self.voter_card_count.unwrap_or(0)
            != self.total_admitted_voters_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("poll_card_count").to_string(),
                    path.field("proxy_certificate_count").to_string(),
                    path.field("voter_card_count").to_string(),
                    path.field("total_admitted_voters_count").to_string(),
                ],
                code: ValidationResultCode::F201,
                context: None,
            });
        }
        Ok(validation_results)
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::election::{
        CommitteeCategory, CommitteeCategory::*, tests::election_fixture,
    };

    #[test]
    fn test_voters_addition() {
        let mut curr_votes = VotersCounts {
            poll_card_count: 2,
            proxy_certificate_count: 3,
            voter_card_count: None,
            total_admitted_voters_count: 9,
        };

        curr_votes += &VotersCounts {
            poll_card_count: 1,
            proxy_certificate_count: 2,
            voter_card_count: None,
            total_admitted_voters_count: 5,
        };

        assert_eq!(curr_votes.poll_card_count, 3);
        assert_eq!(curr_votes.proxy_certificate_count, 5);
        assert_eq!(curr_votes.voter_card_count, None);
        assert_eq!(curr_votes.total_admitted_voters_count, 14);
    }

    #[test]
    fn test_voters_addition_with_voter_card_count() {
        let mut curr_votes = VotersCounts {
            poll_card_count: 2,
            proxy_certificate_count: 3,
            voter_card_count: Some(4),
            total_admitted_voters_count: 9,
        };

        curr_votes += &VotersCounts {
            poll_card_count: 1,
            proxy_certificate_count: 2,
            voter_card_count: Some(2),
            total_admitted_voters_count: 5,
        };

        assert_eq!(curr_votes.voter_card_count, Some(6));
    }

    #[test]
    fn test_voters_addition_takes_voter_card_count_from_other() {
        let mut curr_votes = VotersCounts {
            poll_card_count: 2,
            proxy_certificate_count: 3,
            voter_card_count: None,
            total_admitted_voters_count: 9,
        };

        curr_votes += &VotersCounts {
            poll_card_count: 1,
            proxy_certificate_count: 2,
            voter_card_count: Some(2),
            total_admitted_voters_count: 5,
        };

        assert_eq!(curr_votes.voter_card_count, Some(2));
    }

    fn validate(
        committee_category: CommitteeCategory,
        election_category: ElectionCategory,
        poll_card_count: u32,
        proxy_certificate_count: u32,
        voter_card_count: Option<u32>,
        total_admitted_voters_count: u32,
    ) -> Result<ValidationResults, DataError> {
        let voters_counts = VotersCounts {
            poll_card_count,
            proxy_certificate_count,
            voter_card_count,
            total_admitted_voters_count,
        };

        let mut election = election_fixture(committee_category, &[]);
        election.category = election_category;

        voters_counts.validate(&election, &"voters_counts".into())
    }

    /// GSB CSO, GSB DSO, CSB | F.201: 'Aantal kiezers en stemmen': stempassen + volmachten + kiezerspassen <> totaal toegelaten kiezers
    #[test]
    fn test_f201() -> Result<(), DataError> {
        let validation_results = validate(GSB, ElectionCategory::Municipal, 100, 50, None, 150)?;
        assert!(validation_results.errors.is_empty());

        let f201 = vec![ValidationResult {
            code: ValidationResultCode::F201,
            fields: vec![
                "voters_counts.poll_card_count".into(),
                "voters_counts.proxy_certificate_count".into(),
                "voters_counts.voter_card_count".into(),
                "voters_counts.total_admitted_voters_count".into(),
            ],
            context: None,
        }];

        let validation_results = validate(GSB, ElectionCategory::Municipal, 100, 150, None, 151)?;
        assert_eq!(validation_results.errors, f201);

        // Also applies for CSB
        let validation_results = validate(CSB, ElectionCategory::Municipal, 100, 150, None, 151)?;
        assert_eq!(validation_results.errors, f201);

        Ok(())
    }

    /// GSB CSO, GSB DSO, CSB | F.201: 'Aantal kiezers en stemmen': stempassen + volmachten + kiezerspassen <> totaal toegelaten kiezers
    #[test]
    fn test_f201_with_voter_card_count() -> Result<(), DataError> {
        let validation_results =
            validate(GSB, ElectionCategory::Provincial, 100, 50, Some(25), 175)?;
        assert!(validation_results.errors.is_empty());

        let f201 = vec![ValidationResult {
            code: ValidationResultCode::F201,
            fields: vec![
                "voters_counts.poll_card_count".into(),
                "voters_counts.proxy_certificate_count".into(),
                "voters_counts.voter_card_count".into(),
                "voters_counts.total_admitted_voters_count".into(),
            ],
            context: None,
        }];

        let validation_results =
            validate(GSB, ElectionCategory::Provincial, 100, 50, Some(25), 176)?;
        assert_eq!(validation_results.errors, f201);

        // Also applies for water authority elections
        let validation_results = validate(
            GSB,
            ElectionCategory::WaterAuthority,
            100,
            50,
            Some(25),
            176,
        )?;
        assert_eq!(validation_results.errors, f201);

        Ok(())
    }

    #[test]
    fn test_voter_card_count_not_allowed_for_municipal() {
        let result = validate(GSB, ElectionCategory::Municipal, 100, 50, Some(25), 175);
        assert_eq!(
            result.unwrap_err().message,
            "Voter card count is not allowed for municipal elections"
        );
    }

    #[test]
    fn test_voter_card_count_required_for_non_municipal() {
        let result = validate(GSB, ElectionCategory::Provincial, 100, 50, None, 150);
        assert_eq!(
            result.unwrap_err().message,
            "Voter card count is required for non-municipal elections"
        );

        let result = validate(GSB, ElectionCategory::WaterAuthority, 100, 50, None, 150);
        assert_eq!(
            result.unwrap_err().message,
            "Voter card count is required for non-municipal elections"
        );
    }

    #[test]
    fn test_compare_equal_voter_card_count() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = VotersCounts {
            poll_card_count: 100,
            proxy_certificate_count: 50,
            voter_card_count: Some(25),
            total_admitted_voters_count: 175,
        };

        first_entry
            .clone()
            .compare(&first_entry, &mut different_fields, &"voters_counts".into());

        assert!(different_fields.is_empty());
    }

    #[test]
    fn test_compare_different_voter_card_count() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = VotersCounts {
            poll_card_count: 100,
            proxy_certificate_count: 50,
            voter_card_count: Some(25),
            total_admitted_voters_count: 175,
        };
        let mut second_entry = first_entry.clone();
        second_entry.voter_card_count = Some(26);

        second_entry.compare(&first_entry, &mut different_fields, &"voters_counts".into());

        assert_eq!(
            different_fields,
            vec!["voters_counts.voter_card_count".to_string()]
        );
    }

    #[test]
    fn test_compare_voter_card_count_some_and_none() {
        let first_entry = VotersCounts {
            poll_card_count: 100,
            proxy_certificate_count: 50,
            voter_card_count: Some(25),
            total_admitted_voters_count: 175,
        };
        let mut second_entry = first_entry.clone();
        second_entry.voter_card_count = None;

        let mut different_fields: Vec<String> = vec![];
        second_entry.compare(&first_entry, &mut different_fields, &"voters_counts".into());
        assert_eq!(
            different_fields,
            vec!["voters_counts.voter_card_count".to_string()]
        );

        // Also a difference in the other direction
        let mut different_fields: Vec<String> = vec![];
        first_entry.compare(
            &second_entry,
            &mut different_fields,
            &"voters_counts".into(),
        );
        assert_eq!(
            different_fields,
            vec!["voters_counts.voter_card_count".to_string()]
        );
    }

    #[test]
    fn test_compare_voter_card_count_both_none() {
        let mut different_fields: Vec<String> = vec![];
        let first_entry = VotersCounts {
            poll_card_count: 100,
            proxy_certificate_count: 50,
            voter_card_count: None,
            total_admitted_voters_count: 150,
        };

        first_entry
            .clone()
            .compare(&first_entry, &mut different_fields, &"voters_counts".into());

        assert!(different_fields.is_empty());
    }
}
