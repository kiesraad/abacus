use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    data_entry::domain::{
        compare::Compare,
        field_path::FieldPath,
        validate::{
            DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults,
        },
        yes_no::YesNo,
    },
    election::domain::{election::ElectionWithPoliticalGroups, polling_station::PollingStation},
};

/// Counting Differences Polling Station,
/// part of the polling station results ("B1-2 Verschillen met telresultaten van het stembureau")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct CountingDifferencesPollingStation {
    /// Whether there was an unexplained difference between the number of voters and votes
    /// ("Was er in de telresultaten van het stembureau een onverklaard verschil tussen het totaal aantal getelde stembiljetten en het aantal toegelaten kiezers?")
    pub unexplained_difference_ballots_voters: YesNo,
    /// Whether there was a difference between the total votes per list as determined by the polling station and by the typist
    /// ("Is er een verschil tussen het totaal aantal getelde stembiljetten per lijst zoals eerder vastgesteld door het stembureau en zoals door u geteld op het gemeentelijk stembureau?")
    pub difference_ballots_per_list: YesNo,
}

impl Compare for CountingDifferencesPollingStation {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.unexplained_difference_ballots_voters.compare(
            &first_entry.unexplained_difference_ballots_voters,
            different_fields,
            &path.field("unexplained_difference_ballots_voters"),
        );

        self.difference_ballots_per_list.compare(
            &first_entry.difference_ballots_per_list,
            different_fields,
            &path.field("difference_ballots_per_list"),
        );
    }
}

impl Validate for CountingDifferencesPollingStation {
    fn validate(
        &self,
        _election: &ElectionWithPoliticalGroups,
        _polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        if self.unexplained_difference_ballots_voters.is_empty()
            || self.difference_ballots_per_list.is_empty()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F111,
                context: None,
            });
        }

        if self.unexplained_difference_ballots_voters.is_both()
            || self.difference_ballots_per_list.is_both()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F112,
                context: None,
            });
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::data_entry::domain::valid_default::ValidDefault;

    impl ValidDefault for CountingDifferencesPollingStation {
        fn valid_default() -> Self {
            Self {
                unexplained_difference_ballots_voters: YesNo::no(),
                difference_ballots_per_list: YesNo::no(),
            }
        }
    }

    fn validate(
        unexplained_yes: bool,
        unexplained_no: bool,
        ballots_yes: bool,
        ballots_no: bool,
    ) -> Result<ValidationResults, DataError> {
        let counting_differences_polling_station = CountingDifferencesPollingStation {
            unexplained_difference_ballots_voters: YesNo::new(unexplained_yes, unexplained_no),
            difference_ballots_per_list: YesNo::new(ballots_yes, ballots_no),
        };

        let mut validation_results = ValidationResults::default();
        counting_differences_polling_station.validate(
            &ElectionWithPoliticalGroups::election_fixture(&[]),
            &PollingStation::polling_station_fixture(None),
            &mut validation_results,
            &"counting_differences_polling_station".into(),
        )?;

        assert_eq!(validation_results.warnings.len(), 0);
        Ok(validation_results)
    }

    #[test]
    fn test_no_validation_errors() -> Result<(), DataError> {
        let validation_results = validate(false, true, false, true)?;
        assert_eq!(validation_results.errors, []);

        let validation_results = validate(true, false, true, false)?;
        assert_eq!(validation_results.errors, []);

        Ok(())
    }

    /// CSO | F.111: 'Verschillen met telresultaten van het stembureau': één of beide vragen zijn niet beantwoord
    #[test]
    fn test_f111() -> Result<(), DataError> {
        let validation_results = validate(false, true, false, false)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F111,
                fields: vec!["counting_differences_polling_station".into()],
                context: None,
            }]
        );

        let validation_results = validate(false, false, false, true)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F111,
                fields: vec!["counting_differences_polling_station".into()],
                context: None,
            }]
        );

        let validation_results = validate(false, false, false, false)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F111,
                fields: vec!["counting_differences_polling_station".into()],
                context: None,
            }]
        );

        Ok(())
    }

    // CSO | F.112: 'Verschillen met telresultaten van het stembureau': meerdere antwoorden per vraag
    #[test]
    fn test_f112() -> Result<(), DataError> {
        let validation_results = validate(true, true, false, true)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F112,
                fields: vec!["counting_differences_polling_station".into()],
                context: None,
            }]
        );

        let validation_results = validate(false, true, true, true)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F112,
                fields: vec!["counting_differences_polling_station".into()],
                context: None,
            }]
        );

        let validation_results = validate(true, true, true, true)?;
        assert_eq!(
            validation_results.errors,
            [ValidationResult {
                code: ValidationResultCode::F112,
                fields: vec!["counting_differences_polling_station".into()],
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
                    code: ValidationResultCode::F111,
                    fields: vec!["counting_differences_polling_station".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F112,
                    fields: vec!["counting_differences_polling_station".into()],
                    context: None,
                }
            ]
        );

        let validation_results = validate(false, false, true, true)?;
        assert_eq!(
            validation_results.errors,
            [
                ValidationResult {
                    code: ValidationResultCode::F111,
                    fields: vec!["counting_differences_polling_station".into()],
                    context: None,
                },
                ValidationResult {
                    code: ValidationResultCode::F112,
                    fields: vec!["counting_differences_polling_station".into()],
                    context: None,
                }
            ]
        );

        Ok(())
    }
}
