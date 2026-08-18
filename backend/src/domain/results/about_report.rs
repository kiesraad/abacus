use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    election::{CommitteeCategory, ElectionWithPoliticalGroups},
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults},
};

/// Information about the report ("Over het proces-verbaal")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct AboutReport {
    /// Whether a corrigendum accompanies the report
    /// ("Is er een corrigendum bij het papieren proces-verbaal aanwezig?")
    #[serde(deserialize_with = "Option::deserialize")]
    #[schema(required = true)]
    pub corrigendum_present: Option<CorrigendumPresent>,
    /// Whether the extra page "controles en correcties" is inserted in the report
    /// ("Is voorin het proces-verbaal de extra pagina controles en correcties ingevoegd?")
    #[serde(deserialize_with = "Option::deserialize")]
    #[schema(required = true)]
    pub checks_and_corrections_present: Option<ChecksAndCorrectionsPresent>,
}

/// Whether a corrigendum accompanies the report
#[derive(Serialize, Deserialize, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum CorrigendumPresent {
    /// "Ja, ik heb twee documenten (een proces-verbaal en een corrigendum)"
    TwoDocuments,
    /// "Nee, ik heb één document (alleen een proces-verbaal)"
    OneDocument,
}

/// Whether the extra page "controles en correcties" is inserted in the report
#[derive(Serialize, Deserialize, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum ChecksAndCorrectionsPresent {
    /// "Ja, de pagina 'controles en correcties' is aanwezig"
    PagePresent,
    /// "Nee, de pagina ontbreekt"
    PageMissing,
}

impl Compare for AboutReport {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        if self.corrigendum_present != first_entry.corrigendum_present {
            different_fields.push(path.field("corrigendum_present").to_string());
        }

        if self.checks_and_corrections_present != first_entry.checks_and_corrections_present {
            different_fields.push(path.field("checks_and_corrections_present").to_string());
        }
    }
}

impl Validate for AboutReport {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();

        if election.committee_category == CommitteeCategory::GSB {
            if self.corrigendum_present.is_none() || self.checks_and_corrections_present.is_none() {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F121,
                    context: None,
                });
            };

            if let (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PageMissing),
            ) = (
                self.corrigendum_present,
                self.checks_and_corrections_present,
            ) {
                validation_results.errors.push(ValidationResult {
                    fields: vec![path.to_string()],
                    code: ValidationResultCode::F122,
                    context: None,
                });
            }
        }

        Ok(validation_results)
    }
}

#[cfg(test)]
mod tests {
    use crate::domain::{
        election::{CommitteeCategory, ElectionCategory, tests::election_fixture},
        results::about_report::{AboutReport, ChecksAndCorrectionsPresent, CorrigendumPresent},
        validate::{
            DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults,
        },
    };

    fn validate(
        committee_category: CommitteeCategory,
        corrigendum_present: Option<CorrigendumPresent>,
        checks_and_corrections_present: Option<ChecksAndCorrectionsPresent>,
    ) -> Result<ValidationResults, DataError> {
        let about_report = AboutReport {
            corrigendum_present,
            checks_and_corrections_present,
        };

        let validation_results = about_report.validate(
            &election_fixture(ElectionCategory::Municipal, committee_category, &[]),
            &"about_report".into(),
        )?;

        assert_eq!(validation_results.warnings.len(), 0);
        Ok(validation_results)
    }

    /// GSB DSO | F.121: Over het proces-verbaal: Niet alle vragen bij 'Over het proces-verbaal' zijn beantwoord
    #[test]
    fn test_f121() -> Result<(), DataError> {
        let f121 = ValidationResult {
            code: ValidationResultCode::F121,
            fields: vec!["about_report".into()],
            context: None,
        };

        let cases = vec![
            (None, None, true),
            (Some(CorrigendumPresent::OneDocument), None, true),
            (None, Some(ChecksAndCorrectionsPresent::PageMissing), true),
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PageMissing),
                false,
            ),
        ];

        for (corrigendum_present, checks_and_corrections_present, expect_f121) in cases {
            let result = validate(
                CommitteeCategory::GSB,
                corrigendum_present,
                checks_and_corrections_present,
            )?;
            let has_f121 = result.errors.iter().any(|e| e == &f121);
            assert_eq!(
                has_f121, expect_f121,
                "Failed: corrigendum_present: {corrigendum_present:?}, checks_and_corrections_present: {checks_and_corrections_present:?}"
            );
        }

        Ok(())
    }

    /// GSB DSO | F.122: Over het proces-verbaal: Ongeldige combinatie van antwoorden: wel corrigendum, geen inlegvel
    #[test]
    fn test_f122() -> Result<(), DataError> {
        let f122 = ValidationResult {
            code: ValidationResultCode::F122,
            fields: vec!["about_report".into()],
            context: None,
        };

        let cases = vec![
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PageMissing),
                true,
            ),
            (
                Some(CorrigendumPresent::OneDocument),
                Some(ChecksAndCorrectionsPresent::PageMissing),
                false,
            ),
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                false,
            ),
        ];

        for (corrigendum_present, checks_and_corrections_present, expect_f122) in cases {
            let result = validate(
                CommitteeCategory::GSB,
                corrigendum_present,
                checks_and_corrections_present,
            )?;
            let has_f122 = result.errors.iter().any(|e| e == &f122);
            assert_eq!(
                has_f122, expect_f122,
                "Failed: corrigendum_present: {corrigendum_present:?}, checks_and_corrections_present: {checks_and_corrections_present:?}"
            );
        }

        Ok(())
    }
}
