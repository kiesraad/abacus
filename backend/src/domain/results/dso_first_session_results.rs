use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    compare::Compare,
    field_path::FieldPath,
    results::{
        PollingStationResults,
        about_report::{AboutReport, ChecksAndCorrectionsPresent, CorrigendumPresent},
        checks_and_corrections::ChecksAndCorrections,
        differences_counts::DifferencesCounts,
        political_group_candidate_votes::PoliticalGroupCandidateVotes,
        voters_counts::VotersCounts,
        votes_counts::VotesCounts,
        yes_no::YesNo,
    },
    validate::{DataError, Validate, ValidationResult, ValidationResultCode},
};

/// DSOFirstSessionResults, following the fields in Model N 10-1
///
/// See: Model N 10-1 (Proces-verbaal van een stembureau) from
/// [kiesraad](https://www.kiesraad.nl/documenten/2025/11/27/n-10-1-pv-sb-dso)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DSOFirstSessionResults {
    /// About report ("Over het proces-verbaal")
    pub about_report: AboutReport,
    /// Checks and corrections ("Controles en correcties")
    pub checks_and_corrections: ChecksAndCorrections,
    /// Voters counts ("1. Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("2. Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Differences counts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
    /// Vote counts per list and candidate (5. "Aantal stemmen per lijst en kandidaat")
    pub political_group_votes: Vec<PoliticalGroupCandidateVotes>,
}

impl Compare for DSOFirstSessionResults {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        self.about_report.compare(
            &first_entry.about_report,
            different_fields,
            &path.field("about_report"),
        );

        self.checks_and_corrections.compare(
            &first_entry.checks_and_corrections,
            different_fields,
            &path.field("checks_and_corrections"),
        );

        self.voters_counts.compare(
            &first_entry.voters_counts,
            different_fields,
            &path.field("voters_counts"),
        );

        self.votes_counts.compare(
            &first_entry.votes_counts,
            different_fields,
            &path.field("votes_counts"),
        );

        self.differences_counts.compare(
            &first_entry.differences_counts,
            different_fields,
            &path.field("differences_counts"),
        );

        self.political_group_votes.compare(
            &first_entry.political_group_votes,
            different_fields,
            &path.field("political_group_votes"),
        );
    }
}

impl Validate for DSOFirstSessionResults {
    fn validate(
        &self,
        election: &crate::domain::election::ElectionWithPoliticalGroups,
        path: &FieldPath,
    ) -> Result<crate::domain::validate::ValidationResults, crate::domain::validate::DataError>
    {
        // Invalid state check
        if let (Some(ChecksAndCorrectionsPresent::PageMissing), false) = (
            self.about_report.checks_and_corrections_present,
            self.checks_and_corrections.is_empty(),
        ) {
            return Err(DataError::new(
                "`checks_and_corrections` must be empty when `ChecksAndCorrectionsPresent::PageMissing`.",
            ));
        };

        let mut validation_results = self
            .about_report
            .validate(election, &path.field("about_report"))?;

        if let Some(ChecksAndCorrectionsPresent::PagePresent) =
            self.about_report.checks_and_corrections_present
        {
            match self.about_report.corrigendum_present {
                Some(CorrigendumPresent::TwoDocuments)
                    if self.checks_and_corrections.corrected_results_own_initiative
                        == YesNo::no() =>
                {
                    validation_results.errors.push(ValidationResult {
                        fields: vec![path.field("checks_and_corrections").to_string()],
                        code: ValidationResultCode::F132,
                        context: None,
                    });
                }
                Some(CorrigendumPresent::OneDocument)
                    if self.checks_and_corrections.corrected_results_own_initiative
                        == YesNo::yes() =>
                {
                    validation_results.errors.push(ValidationResult {
                        fields: vec![path.field("checks_and_corrections").to_string()],
                        code: ValidationResultCode::F133,
                        context: None,
                    });
                }
                _ => {}
            }

            validation_results.join(
                self.checks_and_corrections
                    .validate(election, &path.field("checks_and_corrections"))?,
            );
        };

        validation_results.join(self.as_common().validate(election, path)?);
        Ok(validation_results)
    }
}

#[cfg(test)]
mod tests {
    use crate::domain::{
        election::{CommitteeCategory, ElectionCategory, tests::election_fixture},
        results::{
            Results,
            about_report::{AboutReport, ChecksAndCorrectionsPresent, CorrigendumPresent},
            checks_and_corrections::{ChecksAndCorrections, ReasonInvestigationOwnInitiative},
            differences_counts::DifferencesCounts,
            dso_first_session_results::DSOFirstSessionResults,
            voters_counts::VotersCounts,
            votes_counts::VotesCounts,
            yes_no::YesNo,
        },
        validate::{
            DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults,
        },
    };

    fn validate(
        corrigendum_present: Option<CorrigendumPresent>,
        checks_and_corrections_present: Option<ChecksAndCorrectionsPresent>,
        reason_investigation_own_initiative: ReasonInvestigationOwnInitiative,
        corrected_results_own_initiative: YesNo,
        corrected_results_csb_request: YesNo,
    ) -> Result<ValidationResults, DataError> {
        let validation_results = Results::DSOFirstSession(DSOFirstSessionResults {
            about_report: AboutReport {
                corrigendum_present,
                checks_and_corrections_present,
            },
            checks_and_corrections: ChecksAndCorrections {
                reason_investigation_own_initiative,
                corrected_results_own_initiative,
                corrected_results_csb_request,
            },
            voters_counts: VotersCounts::default(),
            votes_counts: VotesCounts::default(),
            differences_counts: DifferencesCounts::default(),
            political_group_votes: vec![],
        })
        .validate(
            &election_fixture(ElectionCategory::Municipal, CommitteeCategory::GSB, &[]),
            &"data".into(),
        )?;

        assert_eq!(validation_results.warnings.len(), 1);

        Ok(validation_results)
    }

    /// GSB DSO | F.132: 'Controles en correcties - Op eigen initiatief': 'controles en correcties aanwezig' = 'ja' EN 'gecorrigeerde telresultaten' = 'nee' EN 'Over het proces-verbaal: Is er een corrigendum?' = 'ja'
    #[test]
    #[expect(clippy::too_many_lines)]
    fn test_f132() -> Result<(), DataError> {
        let f132 = ValidationResult {
            code: ValidationResultCode::F132,
            fields: vec!["data.checks_and_corrections".into()],
            context: None,
        };

        let cases = vec![
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                ReasonInvestigationOwnInitiative::default(),
                YesNo::no(),
                YesNo::default(),
                true,
            ),
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                ReasonInvestigationOwnInitiative {
                    unaccounted_difference: true,
                    other_error: false,
                },
                YesNo::no(),
                YesNo::default(),
                true,
            ),
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                ReasonInvestigationOwnInitiative::default(),
                YesNo::yes(),
                YesNo::default(),
                false,
            ),
            (
                Some(CorrigendumPresent::OneDocument),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                ReasonInvestigationOwnInitiative::default(),
                YesNo::no(),
                YesNo::default(),
                false,
            ),
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                ReasonInvestigationOwnInitiative {
                    unaccounted_difference: true,
                    other_error: true,
                },
                YesNo::no(),
                YesNo::default(),
                true,
            ),
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PageMissing),
                ReasonInvestigationOwnInitiative::default(),
                YesNo::default(),
                YesNo::default(),
                false,
            ),
        ];

        for (
            case_index,
            (
                corrigendum_present,
                checks_and_corrections_present,
                reason_investigation_own_initiative,
                corrected_results_own_initiative,
                corrected_results_csb_request,
                expect_f132,
            ),
        ) in cases.into_iter().enumerate()
        {
            let result = validate(
                corrigendum_present,
                checks_and_corrections_present,
                reason_investigation_own_initiative.clone(),
                corrected_results_own_initiative.clone(),
                corrected_results_csb_request.clone(),
            )?;

            let has_f132 = result.errors.iter().any(|e| e == &f132);
            assert_eq!(
                has_f132, expect_f132,
                "Case #{case_index} failed: corrigendum_present: {corrigendum_present:?}, reason_investigation_own_initiative: {reason_investigation_own_initiative:?}, corrected_results_own_initiative: {corrected_results_own_initiative:?}, corrected_results_csb_request: {corrected_results_csb_request:?}"
            );
        }

        Ok(())
    }

    /// GSB DSO | F.133: 'Controles en correcties - Op eigen initiatief': 'controles en correcties aanwezig' = 'ja' EN 'gecorrigeerde telresultaten' = 'ja' EN 'Over het proces-verbaal: Is er een corrigendum?' = 'nee'
    #[test]
    #[expect(clippy::too_many_lines)]
    fn test_f133() -> Result<(), DataError> {
        let f133 = ValidationResult {
            code: ValidationResultCode::F133,
            fields: vec!["data.checks_and_corrections".into()],
            context: None,
        };

        let cases = vec![
            (
                Some(CorrigendumPresent::OneDocument),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                ReasonInvestigationOwnInitiative::default(),
                YesNo::yes(),
                YesNo::default(),
                true,
            ),
            (
                Some(CorrigendumPresent::TwoDocuments),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                ReasonInvestigationOwnInitiative::default(),
                YesNo::no(),
                YesNo::no(),
                false,
            ),
            (
                Some(CorrigendumPresent::OneDocument),
                Some(ChecksAndCorrectionsPresent::PagePresent),
                ReasonInvestigationOwnInitiative {
                    unaccounted_difference: true,
                    other_error: false,
                },
                YesNo::yes(),
                YesNo::no(),
                true,
            ),
            (
                Some(CorrigendumPresent::OneDocument),
                Some(ChecksAndCorrectionsPresent::PageMissing),
                ReasonInvestigationOwnInitiative::default(),
                YesNo::default(),
                YesNo::default(),
                false,
            ),
        ];

        for (
            case_index,
            (
                corrigendum_present,
                checks_and_corrections_present,
                reason_investigation_own_initiative,
                corrected_results_own_initiative,
                corrected_results_csb_request,
                expect_f133,
            ),
        ) in cases.into_iter().enumerate()
        {
            let result = validate(
                corrigendum_present,
                checks_and_corrections_present,
                reason_investigation_own_initiative.clone(),
                corrected_results_own_initiative.clone(),
                corrected_results_csb_request.clone(),
            )?;
            let has_f133 = result.errors.iter().any(|e| e == &f133);
            assert_eq!(
                has_f133, expect_f133,
                "Case #{case_index} failed: reason_investigation_own_initiative: {reason_investigation_own_initiative:?}, corrected_results_own_initiative: {corrected_results_own_initiative:?}, corrected_results_csb_request: {corrected_results_csb_request:?}"
            );
        }

        Ok(())
    }
}
