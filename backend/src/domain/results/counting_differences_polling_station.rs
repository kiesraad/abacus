use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::yes_no::YesNo;
use crate::domain::{
    compare::Compare,
    election::{CommitteeCategory, ElectionWithPoliticalGroups},
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
};

/// Counting Differences Polling Station,
/// part of the results ("B1-2 Verschillen met telresultaten van het stembureau")
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

impl Validate for CountingDifferencesPollingStation {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        if election.committee_category == CommitteeCategory::GSB {
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
        }

        Ok(())
    }
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

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::{
        election::{CommitteeCategory, tests::election_fixture},
        valid_default::ValidDefault,
    };

    impl ValidDefault for CountingDifferencesPollingStation {
        fn valid_default() -> Self {
            Self {
                unexplained_difference_ballots_voters: YesNo::no(),
                difference_ballots_per_list: YesNo::no(),
            }
        }
    }

    fn validate(
        committee_category: CommitteeCategory,
        unexplained: YesNo,
        ballots: YesNo,
    ) -> Result<ValidationResults, DataError> {
        let counting_differences_polling_station = CountingDifferencesPollingStation {
            unexplained_difference_ballots_voters: unexplained,
            difference_ballots_per_list: ballots,
        };

        let mut validation_results = ValidationResults::default();
        counting_differences_polling_station.validate(
            &election_fixture(committee_category, &[]),
            &mut validation_results,
            &"counting_differences_polling_station".into(),
        )?;

        assert_eq!(validation_results.warnings.len(), 0);
        Ok(validation_results)
    }

    /// GSB CSO | F.111: 'Verschillen met telresultaten van het stembureau': één of beide vragen zijn niet beantwoord
    #[test]
    fn test_f111() -> Result<(), DataError> {
        use CommitteeCategory::*;

        let f111 = ValidationResult {
            code: ValidationResultCode::F111,
            fields: vec!["counting_differences_polling_station".into()],
            context: None,
        };

        let cases = vec![
            (GSB, YesNo::yes(), YesNo::yes(), false),
            (GSB, YesNo::yes(), YesNo::no(), false),
            (GSB, YesNo::default(), YesNo::no(), true),
            (GSB, YesNo::yes(), YesNo::default(), true),
            (GSB, YesNo::default(), YesNo::default(), true),
            (CSB, YesNo::default(), YesNo::no(), false), // Not applicable for CSB
        ];

        for (committee_category, unexplained, ballots, expect_f111) in cases {
            let result = validate(committee_category, unexplained.clone(), ballots.clone())?;
            let has_f111 = result.errors.iter().any(|e| e == &f111);
            assert_eq!(
                has_f111, expect_f111,
                "Failed: {committee_category:?}, unexplained: {unexplained:?}, ballots: {ballots:?}"
            );
        }

        Ok(())
    }

    // CSO | F.112: 'Verschillen met telresultaten van het stembureau': meerdere antwoorden per vraag
    #[test]
    fn test_f112() -> Result<(), DataError> {
        use CommitteeCategory::*;

        let f112 = ValidationResult {
            code: ValidationResultCode::F112,
            fields: vec!["counting_differences_polling_station".into()],
            context: None,
        };

        let cases = vec![
            (GSB, YesNo::yes(), YesNo::yes(), false),
            (GSB, YesNo::yes(), YesNo::no(), false),
            (GSB, YesNo::both(), YesNo::no(), true),
            (GSB, YesNo::yes(), YesNo::both(), true),
            (GSB, YesNo::both(), YesNo::both(), true),
            (CSB, YesNo::both(), YesNo::no(), false), // Not applicable for CSB
        ];

        for (committee_category, unexplained, ballots, expect_f112) in cases {
            let result = validate(committee_category, unexplained.clone(), ballots.clone())?;
            let has_f112 = result.errors.iter().any(|e| e == &f112);
            assert_eq!(
                has_f112, expect_f112,
                "Failed: {committee_category:?}, unexplained: {unexplained:?}, ballots: {ballots:?}"
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

        let validation_results = validate(CommitteeCategory::GSB, YesNo::default(), YesNo::both())?;
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
