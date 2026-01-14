use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    election::ElectionWithPoliticalGroups,
    field_path::FieldPath,
    polling_station::PollingStation,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
    yes_no::YesNo,
};

/// Extra investigation, part of the polling station results ("B1-1 Alleen bij extra onderzoek")
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
        _election: &ElectionWithPoliticalGroups,
        _polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
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

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use crate::domain::{
        election::ElectionWithPoliticalGroups,
        polling_station::PollingStation,
        polling_station_results::extra_investigation::ExtraInvestigation,
        valid_default::ValidDefault,
        validate::{
            DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults,
        },
        yes_no::YesNo,
    };

    impl ValidDefault for ExtraInvestigation {
        fn valid_default() -> Self {
            Self {
                extra_investigation_other_reason: YesNo::default(),
                ballots_recounted_extra_investigation: YesNo::default(),
            }
        }
    }

    fn validate(
        investigation_yes: bool,
        investigation_no: bool,
        recounted_yes: bool,
        recounted_no: bool,
    ) -> Result<ValidationResults, DataError> {
        let extra_investigation = ExtraInvestigation {
            extra_investigation_other_reason: YesNo::new(investigation_yes, investigation_no),
            ballots_recounted_extra_investigation: YesNo::new(recounted_yes, recounted_no),
        };

        let mut validation_results = ValidationResults::default();
        extra_investigation.validate(
            &ElectionWithPoliticalGroups::election_fixture(&[]),
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"extra_investigation".into(),
        )?;

        assert_eq!(validation_results.warnings.len(), 0);
        Ok(validation_results)
    }

    #[test]
    fn test_no_validation_errors() -> Result<(), DataError> {
        let validation_results = validate(false, false, false, false)?;
        assert_eq!(validation_results.errors, []);

        let validation_results = validate(true, false, false, true)?;
        assert_eq!(validation_results.errors, []);

        Ok(())
    }

    /// CSO | F.101: 'Alleen bij extra onderzoek B1-1': één van beide vragen is beantwoord, en de andere niet
    #[test]
    fn test_f101() -> Result<(), DataError> {
        let validation_results = validate(false, true, false, false)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F101,
                fields: vec!["extra_investigation".into()],
                context: None,
            }]
        );

        let validation_results = validate(false, false, false, true)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F101,
                fields: vec!["extra_investigation".into()],
                context: None,
            }]
        );

        Ok(())
    }

    /// CSO | F.102: 'Alleen bij extra onderzoek B1-1': meerdere antwoorden op 1 van de vragen
    #[test]
    fn test_f102() -> Result<(), DataError> {
        let validation_results = validate(true, true, true, true)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F102,
                fields: vec!["extra_investigation".into()],
                context: None,
            }]
        );

        Ok(())
    }

    #[test]
    fn test_multiple_errors() -> Result<(), DataError> {
        let validation_results = validate(true, true, false, false)?;
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

        let validation_results = validate(false, false, true, true)?;
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
