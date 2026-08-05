use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    election::ElectionWithPoliticalGroups,
    field_path::FieldPath,
    validate::{DataError, Validate, ValidationResults},
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
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub enum CorrigendumPresent {
    /// "Ja, ik heb twee documenten (een proces-verbaal en een corrigendum)"
    TwoDocuments,
    /// "Nee, ik heb één document (alleen een proces-verbaal)"
    OneDocument,
}

/// Whether the extra page "controles en correcties" is inserted in the report
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
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
        _election: &ElectionWithPoliticalGroups,
        _path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        let validation_results = ValidationResults::default();
        // TODO: https://github.com/kiesraad/abacus/issues/3687

        Ok(validation_results)
    }
}
