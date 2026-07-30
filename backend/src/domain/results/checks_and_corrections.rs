use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    election::ElectionWithPoliticalGroups,
    field_path::FieldPath,
    results::yes_no::YesNo,
    validate::{DataError, Validate, ValidationResults},
};

/// Checks and corrections ("Controles en correcties")
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct ChecksAndCorrections {
    /// Whether the GSB investigated the counting results on its own initiative
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
    /// Because of an unaccounted difference
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
        _election: &ElectionWithPoliticalGroups,
        _path: &FieldPath,
    ) -> Result<ValidationResults, DataError> {
        let validation_results = ValidationResults::default();
        // TODO: https://github.com/kiesraad/abacus/issues/3687

        Ok(validation_results)
    }
}
