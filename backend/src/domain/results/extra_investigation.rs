use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::yes_no::YesNo;
use crate::domain::{
    compare::Compare,
    election::{CommitteeCategory, ElectionWithPoliticalGroups},
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
};

/// Extra investigation, part of the results ("B1-1 Extra onderzoek")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct ExtraInvestigation {
    /// Whether extra investigation was done
    /// ("Heeft het gemeentelijk stembureau extra onderzoek gedaan?")
    pub extra_investigation_done: YesNo,
    /// Whether ballots were (partially) recounted following the extra investigation
    /// ("Zijn de stembiljetten naar aanleiding van het extra onderzoek (gedeeltelijk) herteld?")
    pub ballots_recounted_extra_investigation: YesNo,
}

impl Compare for ExtraInvestigation {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.extra_investigation_done.compare(
            &first_entry.extra_investigation_done,
            different_fields,
            &path.field("extra_investigation_done"),
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
        path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();
        if election.committee_category == CommitteeCategory::GSB {
            if self.extra_investigation_done.is_empty() {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F101,
                    context: None,
                });
            }

            if self.extra_investigation_done == YesNo::yes()
                && self.ballots_recounted_extra_investigation.is_empty()
            {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F102,
                    context: None,
                });
            }

            if self.extra_investigation_done == YesNo::no()
                && !self.ballots_recounted_extra_investigation.is_empty()
            {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F103,
                    context: None,
                });
            }

            if self.extra_investigation_done.is_both()
                || self.ballots_recounted_extra_investigation.is_both()
            {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F104,
                    context: None,
                });
            }
        }

        Ok(validation_results)
    }
}

#[cfg(test)]
pub mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::{
        election::{ElectionCategory, tests::election_fixture},
        valid_default::ValidDefault,
    };

    impl ValidDefault for ExtraInvestigation {
        fn valid_default() -> Self {
            Self {
                extra_investigation_done: YesNo::no(),
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
            extra_investigation_done: investigation,
            ballots_recounted_extra_investigation: recounted,
        };

        let validation_results = extra_investigation.validate(
            &election_fixture(ElectionCategory::Municipal, committee_category, &[]),
            &"extra_investigation".into(),
        )?;

        assert_eq!(validation_results.warnings.len(), 0);
        Ok(validation_results)
    }

    /// GSB CSO | F.101: 'Extra onderzoek B1-1': de eerste vraag is niet beantwoord
    #[test]
    fn test_f101() -> Result<(), DataError> {
        use CommitteeCategory::*;

        let f101 = ValidationResult {
            code: ValidationResultCode::F101,
            fields: vec!["extra_investigation".into()],
            context: None,
        };

        let cases = vec![
            (GSB, YesNo::default(), YesNo::default(), true),
            (GSB, YesNo::yes(), YesNo::yes(), false),
            (GSB, YesNo::no(), YesNo::no(), false),
            (GSB, YesNo::yes(), YesNo::no(), false),
            (GSB, YesNo::yes(), YesNo::default(), false),
            (GSB, YesNo::default(), YesNo::no(), true),
            (CSB, YesNo::default(), YesNo::no(), false), // Not applicable for CSB
        ];

        for (committee_category, investigation, recounted, expect_f101) in cases {
            let result = validate(committee_category, investigation, recounted)?;
            let has_f101 = result.errors.iter().any(|e| e == &f101);
            assert_eq!(
                has_f101, expect_f101,
                "Failed: {committee_category:?}, investigated: {investigation:?}, recounted: {recounted:?}"
            );
        }

        Ok(())
    }

    /// GSB CSO | F.102: 'Extra onderzoek B1-1': 'extra onderzoek gedaan' = 'ja' en de tweede vraag is niet beantwoord
    #[test]
    fn test_f102() -> Result<(), DataError> {
        use CommitteeCategory::*;

        let f102 = ValidationResult {
            code: ValidationResultCode::F102,
            fields: vec!["extra_investigation".into()],
            context: None,
        };

        let cases = vec![
            (GSB, YesNo::yes(), YesNo::default(), true),
            (GSB, YesNo::yes(), YesNo::no(), false),
            (GSB, YesNo::yes(), YesNo::yes(), false),
            (GSB, YesNo::no(), YesNo::default(), false),
            (GSB, YesNo::default(), YesNo::default(), false),
            (CSB, YesNo::yes(), YesNo::default(), false), // Not applicable for CSB
        ];

        for (committee_category, investigation, recounted, expect_f102) in cases {
            let result = validate(committee_category, investigation, recounted)?;
            let has_f102 = result.errors.iter().any(|e| e == &f102);
            assert_eq!(
                has_f102, expect_f102,
                "Failed: {committee_category:?}, investigated: {investigation:?}, recounted: {recounted:?}"
            );
        }

        Ok(())
    }

    /// GSB CSO | F.103: 'Extra onderzoek B1-1': 'extra onderzoek gedaan' = 'nee' en de tweede vraag is beantwoord
    #[test]
    fn test_f103() -> Result<(), DataError> {
        use CommitteeCategory::*;

        let f103 = ValidationResult {
            code: ValidationResultCode::F103,
            fields: vec!["extra_investigation".into()],
            context: None,
        };

        let cases = vec![
            (GSB, YesNo::no(), YesNo::default(), false),
            (GSB, YesNo::no(), YesNo::yes(), true),
            (GSB, YesNo::no(), YesNo::no(), true),
            (GSB, YesNo::yes(), YesNo::yes(), false),
            (GSB, YesNo::default(), YesNo::yes(), false),
            (CSB, YesNo::no(), YesNo::yes(), false), // Not applicable for CSB
        ];

        for (committee_category, investigation, recounted, expect_f103) in cases {
            let result = validate(committee_category, investigation, recounted)?;
            let has_f103 = result.errors.iter().any(|e| e == &f103);
            assert_eq!(
                has_f103, expect_f103,
                "Failed: {committee_category:?}, investigated: {investigation:?}, recounted: {recounted:?}"
            );
        }

        Ok(())
    }

    /// GSB CSO | F.104: 'Extra onderzoek B1-1': meerdere antwoorden op 1 van de vragen
    #[test]
    fn test_f104() -> Result<(), DataError> {
        use CommitteeCategory::*;

        let f104 = ValidationResult {
            code: ValidationResultCode::F104,
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

        for (committee_category, investigation, recounted, expect_f104) in cases {
            let result = validate(committee_category, investigation, recounted)?;
            let has_f104 = result.errors.iter().any(|e| e == &f104);
            assert_eq!(
                has_f104, expect_f104,
                "Failed: {committee_category:?}, investigated: {investigation:?}, recounted: {recounted:?}"
            );
        }

        Ok(())
    }

    #[test]
    fn test_multiple_errors() -> Result<(), DataError> {
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
                    code: ValidationResultCode::F104,
                    fields: vec!["extra_investigation".into()],
                    context: None,
                }
            ]
        );

        Ok(())
    }
}
