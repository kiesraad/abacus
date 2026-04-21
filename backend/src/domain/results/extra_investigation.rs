use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::yes_no::YesNo;
use crate::domain::{
    compare::Compare,
    election::{CommitteeCategory, ElectionWithPoliticalGroups},
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
};

/// Extra investigation, part of the results ("B1-1 Alleen bij extra onderzoek")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct ExtraInvestigation {
    /// Whether extra investigation was done for another reason than an unexplained difference
    /// ("Heeft het gemeentelijk stembureau extra onderzoek gedaan vanwege een andere reden dan een onverklaard verschil?")
    pub extra_investigation_other_reason: YesNo,
    /// Whether ballots were (partially) recounted following the extra investigation
    /// ("Zijn de stembiljetten naar aanleiding van het extra onderzoek (gedeeltelijk) herteld?")
    pub ballots_recounted_extra_investigation: YesNo,
}

impl Compare for ExtraInvestigation {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.extra_investigation_other_reason.compare(
            &first_entry.extra_investigation_other_reason,
            different_fields,
            &path.field("extra_investigation_other_reason"),
        );

        self.ballots_recounted_extra_investigation.compare(
            &first_entry.ballots_recounted_extra_investigation,
            different_fields,
            &path.field("ballots_recounted_extra_investigation"),
        );
    }
}

impl Validate for ExtraInvestigation {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        if election.committee_category == CommitteeCategory::GSB {
            if self.extra_investigation_other_reason.is_empty()
                != self.ballots_recounted_extra_investigation.is_empty()
            {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F101,
                    context: None,
                });
            }

            if self.extra_investigation_other_reason.is_both()
                || self.ballots_recounted_extra_investigation.is_both()
            {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F102,
                    context: None,
                });
            }
        }

        Ok(())
    }
}

#[cfg(test)]
pub mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::{election::tests::election_fixture, valid_default::ValidDefault};

    impl ValidDefault for ExtraInvestigation {
        fn valid_default() -> Self {
            Self {
                extra_investigation_other_reason: YesNo::default(),
                ballots_recounted_extra_investigation: YesNo::default(),
            }
        }
    }

    fn validate(
        committee_category: CommitteeCategory,
        investigation: YesNo,
        recounted: YesNo,
    ) -> Result<ValidationResults, DataError> {
        let extra_investigation = ExtraInvestigation {
            extra_investigation_other_reason: investigation,
            ballots_recounted_extra_investigation: recounted,
        };

        let mut validation_results = ValidationResults::default();
        extra_investigation.validate(
            &election_fixture(committee_category, &[]),
            &mut validation_results,
            &"extra_investigation".into(),
        )?;

        assert_eq!(validation_results.warnings.len(), 0);
        Ok(validation_results)
    }

    /// GSB CSO | F.101: 'Alleen bij extra onderzoek B1-1': één van beide vragen is beantwoord, en de andere niet
    #[test]
    fn test_f101() -> Result<(), DataError> {
        use CommitteeCategory::*;

        let f101 = ValidationResult {
            code: ValidationResultCode::F101,
            fields: vec!["extra_investigation".into()],
            context: None,
        };

        let cases = vec![
            (GSB, YesNo::default(), YesNo::default(), false),
            (GSB, YesNo::yes(), YesNo::yes(), false),
            (GSB, YesNo::no(), YesNo::no(), false),
            (GSB, YesNo::yes(), YesNo::no(), false),
            (GSB, YesNo::yes(), YesNo::default(), true),
            (GSB, YesNo::default(), YesNo::no(), true),
            (CSB, YesNo::default(), YesNo::no(), false), // Not applicable for CSB
        ];

        for (committee_category, investigation, recounted, expect_f101) in cases {
            let result = validate(committee_category, investigation.clone(), recounted.clone())?;
            let has_f101 = result.errors.iter().any(|e| e == &f101);
            assert_eq!(
                has_f101, expect_f101,
                "Failed: {committee_category:?}, investigated: {investigation:?}, recounted: {recounted:?}"
            );
        }

        Ok(())
    }

    /// GSB CSO | F.102: 'Alleen bij extra onderzoek B1-1': meerdere antwoorden op 1 van de vragen
    #[test]
    fn test_f102() -> Result<(), DataError> {
        use CommitteeCategory::*;

        let f102 = ValidationResult {
            code: ValidationResultCode::F102,
            fields: vec!["extra_investigation".into()],
            context: None,
        };

        let cases = vec![
            (GSB, YesNo::default(), YesNo::default(), false),
            (GSB, YesNo::yes(), YesNo::yes(), false),
            (GSB, YesNo::yes(), YesNo::no(), false),
            (GSB, YesNo::both(), YesNo::default(), true),
            (GSB, YesNo::default(), YesNo::both(), true),
            (GSB, YesNo::both(), YesNo::both(), true),
            (CSB, YesNo::default(), YesNo::both(), false), // Not applicable for CSB
        ];

        for (committee_category, investigation, recounted, expect_f102) in cases {
            let result = validate(committee_category, investigation.clone(), recounted.clone())?;
            let has_f102 = result.errors.iter().any(|e| e == &f102);
            assert_eq!(
                has_f102, expect_f102,
                "Failed: {committee_category:?}, investigated: {investigation:?}, recounted: {recounted:?}"
            );
        }

        Ok(())
    }

    #[test]
    fn test_multiple_errors() -> Result<(), DataError> {
        let validation_results = validate(CommitteeCategory::GSB, YesNo::both(), YesNo::default())?;
        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F101,
                    fields: vec!["extra_investigation".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F102,
                    fields: vec!["extra_investigation".into()],
                    context: None,
                }
            ]
        );

        let validation_results = validate(CommitteeCategory::GSB, YesNo::default(), YesNo::both())?;
        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F101,
                    fields: vec!["extra_investigation".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F102,
                    fields: vec!["extra_investigation".into()],
                    context: None,
                }
            ]
        );

        Ok(())
    }
}
