use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    election::{CommitteeCategory, ElectionWithPoliticalGroups},
    field_path::FieldPath,
    results::yes_no::YesNo,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
};

/// Checks and corrections ("Controles en correcties")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct ChecksAndCorrections {
    /// Why the GSB investigated the counting results on its own initiative
    /// ("Op eigen initiatief van het gemeentelijk stembureau: Waarom heeft het gemeentelijk stembureau
    ///  de telresultaten onderzocht?")
    pub reason_investigation_own_initiative: ReasonInvestigationOwnInitiative,

    /// Whether the investigation on its own initiative has led to corrected results
    /// ("Op eigen initiatief van het gemeentelijk stembureau: Zijn er gecorrigeerde telresultaten?")
    pub corrected_results_own_initiative: YesNo,

    /// Whether investigation at the request of the central electoral committee
    /// has led to corrected results
    /// ("Op verzoek van het centraal stembureau: Zijn er gecorrigeerde telresultaten?")
    pub corrected_results_csb_request: YesNo,
}

/// Reason for investigation on own initiative
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct ReasonInvestigationOwnInitiative {
    /// Because of an unaccounted-for difference
    /// ("Vanwege een onverklaard verschil")
    pub unaccounted_difference: bool,
    /// Because of a (suspected) other error
    /// ("Vanwege (het vermoeden van) een andere fout")
    pub other_error: bool,
}

impl Compare for ChecksAndCorrections {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.reason_investigation_own_initiative.compare(
            &first_entry.reason_investigation_own_initiative,
            different_fields,
            &path.field("reason_investigation_own_initiative"),
        );

        self.corrected_results_own_initiative.compare(
            &first_entry.corrected_results_own_initiative,
            different_fields,
            &path.field("corrected_results_own_initiative"),
        );

        self.corrected_results_csb_request.compare(
            &first_entry.corrected_results_csb_request,
            different_fields,
            &path.field("corrected_results_csb_request"),
        );
    }
}

impl Compare for ReasonInvestigationOwnInitiative {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.unaccounted_difference.compare(
            &first_entry.unaccounted_difference,
            different_fields,
            &path.field("unaccounted_difference"),
        );

        self.other_error.compare(
            &first_entry.other_error,
            different_fields,
            &path.field("other_error"),
        );
    }
}

impl Validate for ChecksAndCorrections {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();

	if election.committee_category == CommitteeCategory::GSB {
	    if (!self.reason_investigation_own_initiative.unaccounted_difference && !self.reason_investigation_own_initiative.other_error)
		|| self.corrected_results_own_initiative.is_empty() {
		    validation_results.errors.push(ValidationResult {
			fields: vec![path.to_string()],
			code: ValidationResultCode::F131,
			context: None,
                    });
		}

	    if self.corrected_results_own_initiative == YesNo::no() {
		validation_results.errors.push(ValidationResult {
			fields: vec![path.to_string()],
			code: ValidationResultCode::F132,
			context: None,
                    });
	    }
        Ok(validation_results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{
        election::{CommitteeCategory, ElectionCategory, tests::election_fixture},
        results::yes_no::YesNo,
        validate::{DataError, ValidationResult, ValidationResultCode, ValidationResults},
    };

    fn validate(
        committee_category: CommitteeCategory,
        reason_investigation_own_initiative: ReasonInvestigationOwnInitiative,
        corrected_results_own_initiative: YesNo,
        corrected_results_csb_request: YesNo,
    ) -> Result<ValidationResults, DataError> {
        let checks_and_corrections = ChecksAndCorrections {
            reason_investigation_own_initiative,
            corrected_results_own_initiative,
            corrected_results_csb_request,
        };

        let validation_results = checks_and_corrections.validate(
            &election_fixture(ElectionCategory::Municipal, committee_category, &[]),
            &"checks_and_corrections".into(),
        )?;

        assert_eq!(validation_results.warnings.len(), 0);
        Ok(validation_results)
    }

    /// GSB DSO | F.131: 'Controles en correcties': geen vinkjes bij de eerste twee vragen
    #[test]
    #[allow(clippy::too_many_lines)]
    fn test_f131() -> Result<(), DataError> {
        let f131 = ValidationResult {
            code: ValidationResultCode::F131,
            fields: vec!["checks_and_corrections".into()],
            context: None,
        };

        let cases = vec![
            (
                ReasonInvestigationOwnInitiative::default(),
                YesNo::default(),
                YesNo::default(),
                true,
            ),
            (
                ReasonInvestigationOwnInitiative {
                    unaccounted_difference: true,
                    other_error: false,
                },
                YesNo::no(),
                YesNo::default(),
                false,
            ),
            (
                ReasonInvestigationOwnInitiative::default(),
                YesNo::yes(),
                YesNo::no(),
                true,
            ),
            (
                ReasonInvestigationOwnInitiative { unaccounted_difference: true, other_error: true },
                YesNo::yes(),
                YesNo::no(),
                false,
            ),
	    (
                ReasonInvestigationOwnInitiative { unaccounted_difference: true, other_error: false },
                YesNo::no(),
                YesNo::yes(),
                false,
            ),
        ];

        for (
            reason_investigation_own_initiative,
            corrected_results_own_initiative,
            corrected_results_csb_request,
            expect_f131,
        ) in cases
        {
            let result = validate(
                CommitteeCategory::GSB,
                reason_investigation_own_initiative,
                corrected_results_own_initiative,
                corrected_results_csb_request,
            )?;
            let has_f131 = result.errors.iter().any(|e| e == &f131);
            assert_eq!(has_f131, expect_f131,);
        }

        Ok(())
    }

    /// GSB DSO | F.132: 'Controles en correcties': Ongeldige set documenten (vraag 'gecorrigeerde telresultaten' = 'nee')
    #[test]
    fn test_f132() -> Result<(), DataError> {
        let f132 = ValidationResult {
            code: ValidationResultCode::F132,
            fields: vec!["checks_and_corrections".into()],
            context: None,
        };

        let cases = vec![
            (
                ReasonInvestigationOwnInitiative::default(),
                YesNo::default(),
                YesNo::default(),
                false,
            ),
	    (
                ReasonInvestigationOwnInitiative::default(),
                YesNo::no(),
                YesNo::yes(),
                true,
            ),
	    (
                ReasonInvestigationOwnInitiative { unaccounted_difference: true, other_error: false },
                YesNo::no(),
                YesNo::no(),
                true,
            ),
	    (
                ReasonInvestigationOwnInitiative { unaccounted_difference: true, other_error: true },
                YesNo::yes(),
                YesNo::no(),
                false,
            ),
        ];

        for (
            reason_investigation_own_initiative,
            corrected_results_own_initiative,
            corrected_results_csb_request,
            expect_f132,
        ) in cases
        {
            let result = validate(
                CommitteeCategory::GSB,
                reason_investigation_own_initiative.clone(),
                corrected_results_own_initiative.clone(),
                corrected_results_csb_request.clone(),
            )?;
            let has_f132 = result.errors.iter().any(|e| e == &f132);
            assert_eq!(has_f132, expect_f132,
	               "Failed: reason_investigation_own_initiative: {reason_investigation_own_initiative:?}, corrected_results_own_initiative: {corrected_results_own_initiative:?}, corrected_results_csb_request: {corrected_results_csb_request:?}"
	    );
        }

	Ok(())
    }

    }
}
