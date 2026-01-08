use std::fmt;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    APIError,
    data_entry::domain::field_path::FieldPath,
    election::{ElectionWithPoliticalGroups, PGNumber},
    polling_station::PollingStation,
};

#[derive(Serialize, Deserialize, ToSchema, Debug, Default, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ValidationResults {
    pub errors: Vec<ValidationResult>,
    pub warnings: Vec<ValidationResult>,
}

impl ValidationResults {
    pub fn append(&mut self, other: &mut Self) {
        self.errors.append(&mut other.errors);
        self.warnings.append(&mut other.warnings);
    }

    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }

    pub fn has_warnings(&self) -> bool {
        !self.warnings.is_empty()
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ValidationResult {
    pub fields: Vec<String>,
    pub code: ValidationResultCode,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub context: Option<ValidationResultContext>,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ValidationResultContext {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false, value_type = u32)]
    pub political_group_number: Option<PGNumber>,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(deny_unknown_fields)]
pub enum ValidationResultCode {
    /// CSO: 'Alleen bij extra onderzoek B1-1': één van beide vragen is beantwoord, en de andere niet
    F101,
    /// CSO: 'Alleen bij extra onderzoek B1-1': meerdere antwoorden op 1 van de vragen
    F102,
    /// CSO: 'Verschillen met telresultaten van het stembureau': één of beide vragen zijn niet beantwoord
    F111,
    /// CSO: 'Verschillen met telresultaten van het stembureau': meerdere antwoorden per vraag
    F112,
    /// CSO/DSO: 'Aantal kiezers en stemmen': stempassen + volmachten <> totaal toegelaten kiezers
    F201,
    /// CSO/DSO: 'Aantal kiezers en stemmen': E.1 t/m E.n tellen niet op naar E
    F202,
    /// CSO/DSO: 'Aantal kiezers en stemmen': stemmen op kandidaten + blanco stemmen + ongeldige stemmen <> totaal aantal uitgebrachte stemmen
    F203,
    /// CSO: "Vergelijk D&H": (checkbox D=H is aangevinkt, maar D<>H)
    F301,
    /// CSO: "Vergelijk D&H": (checkbox H>D is aangevinkt, maar H<=D)
    F302,
    /// CSO: "Vergelijk D&H": (checkbox H<D is aangevinkt, maar H>=D)
    F303,
    /// CSO: "Vergelijk D&H": Meerdere aangevinkt of geen enkele aangevinkt
    F304,
    /// CSO: (Als D = H) I en/of J zijn ingevuld
    F305,
    /// CSO: (Als H > D) I <> H - D
    F306,
    /// CSO: (Als H > D) J is ingevuld
    F307,
    /// CSO: (Als H < D) J <> D - H
    F308,
    /// CSO: (Als H < D) I is ingevuld
    F309,
    /// CSO: (Als D <> H en verklaring voor verschil niks aangevinkt of 'ja' en 'nee' aangevinkt)
    F310,
    /// CSO: 'Kandidaten en lijsttotalen': Er zijn (stemmen op kandidaten of het lijsttotaal van corresponderende E.x is groter dan 0) en het totaal aantal stemmen op een lijst = leeg of 0
    F401,
    /// CSO: 'Kandidaten en lijsttotalen': (Als F.401 niet getoond wordt) Totaal aantal stemmen op een lijst <> som van aantal stemmen op de kandidaten van die lijst
    F402,
    /// CSO: 'Kandidaten en lijsttotalen': (Als F.401 niet getoond wordt) Totaal aantal stemmen op een lijst komt niet overeen met het lijsttotaal van corresponderende E.x
    F403,

    W001,
    /// CSO/DSO: 'Aantal kiezers en stemmen': Aantal blanco stemmen is groter dan of gelijk aan 3% van het totaal aantal uitgebrachte stemmen
    W201,
    /// CSO/DSO: 'Aantal kiezers en stemmen': Aantal ongeldige stemmen is groter dan of gelijk aan 3% van het totaal aantal uitgebrachte stemmen
    W202,
    /// CSO/DSO: 'Aantal kiezers en stemmen': Verschil tussen totaal aantal toegelaten kiezers en totaal aantal uitgebrachte stemmen is groter dan of gelijk aan 2% en groter dan of gelijk aan 15
    W203,
    /// CSO/DSO: 'Aantal kiezers en stemmen': Totaal aantal uitgebrachte stemmen leeg of 0
    W204,
}

#[derive(Debug, Eq, PartialEq)]
pub struct DataError {
    pub message: &'static str,
}

impl DataError {
    pub fn new(message: &'static str) -> Self {
        Self { message }
    }
}

impl fmt::Display for DataError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "Data error: {}", self.message)
    }
}

impl From<DataError> for APIError {
    fn from(err: DataError) -> Self {
        APIError::InvalidData(err)
    }
}

pub trait Validate {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError>;
}

pub trait ValidateRoot: Validate {
    fn start_validate(
        &self,
        polling_station: &PollingStation,
        election: &ElectionWithPoliticalGroups,
    ) -> Result<ValidationResults, DataError> {
        let mut validation_results = ValidationResults::default();
        self.validate(
            election,
            polling_station,
            &mut validation_results,
            &"data".into(),
        )?;
        validation_results
            .errors
            .sort_by(|a, b| a.code.cmp(&b.code));
        validation_results
            .warnings
            .sort_by(|a, b| a.code.cmp(&b.code));
        Ok(validation_results)
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

    /// Tests that ValidationResults can be appended together, combining errors and warnings.
    #[test]
    fn test_validation_result_append() {
        let mut result1 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field1".to_string()],
                code: ValidationResultCode::F201,
                context: None,
            }],
            warnings: vec![],
        };

        let mut result2 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field2".to_string()],
                code: ValidationResultCode::F203,
                context: None,
            }],
            warnings: vec![],
        };

        result1.append(&mut result2);

        // appending should combine the errors and warnings
        assert_eq!(result1.errors.len(), 2);
        assert_eq!(result1.warnings.len(), 0);
    }

    /// Tests the has_errors() and has_warnings() helper methods on ValidationResults.
    #[test]
    fn test_has_errors_has_warnings_methods() {
        let result1 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field1".to_string()],
                code: ValidationResultCode::F201,
                context: None,
            }],
            warnings: vec![
                ValidationResult {
                    fields: vec!["field1".to_string()],
                    code: ValidationResultCode::W001,
                    context: None,
                },
                ValidationResult {
                    fields: vec!["field1".to_string()],
                    code: ValidationResultCode::W201,
                    context: None,
                },
            ],
        };

        assert!(result1.has_warnings());
        assert!(result1.has_errors());

        let result2 = ValidationResults {
            errors: vec![],
            warnings: vec![],
        };

        assert!(!result2.has_warnings());
        assert!(!result2.has_errors());
    }
}
