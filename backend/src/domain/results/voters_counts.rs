use std::ops::AddAssign;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::count::Count;
use crate::domain::{
    compare::Compare,
    election::ElectionWithPoliticalGroups,
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
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.poll_card_count.validate(
            election,
            validation_results,
            &path.field("poll_card_count"),
        )?;
        self.proxy_certificate_count.validate(
            election,
            validation_results,
            &path.field("proxy_certificate_count"),
        )?;
        self.total_admitted_voters_count.validate(
            election,
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
    use test_log::test;

    use super::*;
    use crate::domain::election::tests::election_fixture;

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
            &election_fixture(&[]),
            &mut validation_results,
            &"voters_counts".into(),
        )?;

        Ok(validation_results)
    }

    /// GSB CSO, GSB DSO, CSB | F.201: 'Aantal kiezers en stemmen': stempassen + volmachten <> totaal toegelaten kiezers
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
