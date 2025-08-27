use std::fmt;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    CandidateVotes, Count, CountingDifferencesPollingStation, DifferencesCounts,
    ExtraInvestigation, PoliticalGroupCandidateVotes, PollingStationResults, VotersCounts,
    VotesCounts,
    comparison::Compare,
    status::{DataEntryStatus, FirstEntryInProgress},
};
use crate::{
    data_entry::{PoliticalGroupTotalVotes, status::FirstEntryHasErrors},
    election::ElectionWithPoliticalGroups,
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
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq, PartialOrd, Ord)]
#[serde(deny_unknown_fields)]
pub enum ValidationResultCode {
    /// CSO: 'Extra onderzoek B1-1': één van beide vragen is beantwoord, en de andere niet
    F101,
    /// CSO: 'Extra onderzoek B1-1': meerdere antwoorden op 1 van de vragen
    F102,
    /// CSO: 'Verschillen met telresultaten van het stembureau': één of beide vragen zijn niet beantwoord
    F111,
    /// CSO: 'Verschillen met telresultaten van het stembureau': meerdere antwoorden per vraag
    F112,
    F201,
    F202,
    F203,
    F301,
    F302,
    F303,
    F304,
    F305,
    F401,
    F402,
    W001,
    W201,
    W202,
    W203,
    W205,
    W301,
    W302,
}

/// Validate that a value is equal to or above a certain percentage threshold of the total,
/// using only integers to avoid floating point arithmetic issues.
/// The threshold is calculated as the percentage of the total, rounded up.
/// For example, if the total is 101 and the percentage is 10, the threshold is 11.
pub fn above_percentage_threshold(value: u32, total: u32, percentage: u8) -> bool {
    if value == 0 && total == 0 {
        false
    } else {
        let threshold = (total as u64 * percentage as u64).div_ceil(100);
        value as u64 >= threshold
    }
}

#[derive(Debug, Clone)]
pub struct FieldPath {
    components: Vec<String>,
}

impl FieldPath {
    pub fn new(field: impl Into<String>) -> Self {
        Self {
            components: vec![field.into()],
        }
    }

    pub fn field(&self, field: impl Into<String>) -> Self {
        let mut path = self.clone();
        path.components.push(field.into());
        path
    }

    pub fn index(&self, index: usize) -> Self {
        let mut path = self.clone();
        path.components
            .last_mut()
            .expect("FieldPath constructed with no components")
            .push_str(&format!("[{index}]"));
        path
    }

    pub fn last(&self) -> &str {
        self.components
            .last()
            .expect("FieldPath constructed with no components")
    }
}

impl fmt::Display for FieldPath {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for (i, component) in self.components.iter().enumerate() {
            if i > 0 {
                write!(f, ".")?;
            }
            write!(f, "{component}")?;
        }

        Ok(())
    }
}

impl From<&str> for FieldPath {
    fn from(s: &str) -> Self {
        Self {
            components: s.split(".").map(|s| s.to_owned()).collect(),
        }
    }
}

impl From<String> for FieldPath {
    fn from(s: String) -> Self {
        Self::from(&s[..])
    }
}

#[derive(Debug, Eq, PartialEq)]
pub struct DataError {
    message: &'static str,
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

pub trait Validate {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError>;
}

pub fn validate_data_entry_status(
    data_entry_status: &DataEntryStatus,
    polling_station: &PollingStation,
    election: &ElectionWithPoliticalGroups,
) -> Result<ValidationResults, DataError> {
    let mut validation_results = ValidationResults::default();
    data_entry_status.validate(
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

impl Validate for DataEntryStatus {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        match self {
            DataEntryStatus::FirstEntryInProgress(FirstEntryInProgress {
                first_entry: entry,
                ..
            })
            | DataEntryStatus::FirstEntryHasErrors(FirstEntryHasErrors {
                finalised_first_entry: entry,
                ..
            }) => {
                entry.validate(
                    election,
                    polling_station,
                    validation_results,
                    &"data".into(),
                )?;
                Ok(())
            }
            DataEntryStatus::SecondEntryInProgress(state) => {
                state.second_entry.validate(
                    election,
                    polling_station,
                    validation_results,
                    &"data".into(),
                )?;
                let mut different_fields: Vec<String> = vec![];
                state.second_entry.compare(
                    &state.finalised_first_entry,
                    &mut different_fields,
                    path,
                );
                if !different_fields.is_empty() {
                    validation_results.warnings.push(ValidationResult {
                        fields: different_fields.clone(),
                        code: ValidationResultCode::W001,
                    });
                }
                Ok(())
            }
            _ => Ok(()),
        }
    }
}

impl Validate for PollingStationResults {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        self.extra_investigation.validate(
            election,
            polling_station,
            validation_results,
            &path.field("extra_investigation"),
        )?;

        self.counting_differences_polling_station.validate(
            election,
            polling_station,
            validation_results,
            &path.field("counting_differences_polling_station"),
        )?;

        let total_votes_count = self.votes_counts.total_votes_cast_count;

        self.votes_counts.validate(
            election,
            polling_station,
            validation_results,
            &path.field("votes_counts"),
        )?;

        let votes_counts_path = path.field("votes_counts");
        let voters_counts_path = path.field("voters_counts");
        let differences_counts_path = path.field("differences_counts");

        let total_voters_count = self.voters_counts.total_admitted_voters_count;
        self.voters_counts.validate(
            election,
            polling_station,
            validation_results,
            &voters_counts_path,
        )?;

        // W.203 validate that the difference between total votes count and total voters count is not above threshold
        if difference_admitted_voters_count_and_votes_cast_count_above_threshold(
            total_voters_count,
            total_votes_count,
        ) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    votes_counts_path
                        .field("total_votes_cast_count")
                        .to_string(),
                    voters_counts_path
                        .field("total_admitted_voters_count")
                        .to_string(),
                ],
                code: ValidationResultCode::W203,
            });
        }

        if total_voters_count < total_votes_count {
            // F.301 validate that the difference for more ballots counted is correct
            if (total_votes_count - total_voters_count)
                != self.differences_counts.more_ballots_count
            {
                validation_results.errors.push(ValidationResult {
                    fields: vec![
                        differences_counts_path
                            .field("more_ballots_count")
                            .to_string(),
                    ],
                    code: ValidationResultCode::F301,
                });
            }
            // F.302 validate that fewer ballots counted is empty
            if self.differences_counts.fewer_ballots_count != 0 {
                validation_results.errors.push(ValidationResult {
                    fields: vec![
                        differences_counts_path
                            .field("fewer_ballots_count")
                            .to_string(),
                    ],
                    code: ValidationResultCode::F302,
                });
            }
        }

        if total_voters_count > total_votes_count {
            // F.303 validate that the difference for fewer ballots counted is correct
            if (total_voters_count - total_votes_count)
                != self.differences_counts.fewer_ballots_count
            {
                validation_results.errors.push(ValidationResult {
                    fields: vec![
                        differences_counts_path
                            .field("fewer_ballots_count")
                            .to_string(),
                    ],
                    code: ValidationResultCode::F303,
                });
            }
            // F.304 validate that more ballots counted is empty
            if self.differences_counts.more_ballots_count != 0 {
                validation_results.errors.push(ValidationResult {
                    fields: vec![
                        differences_counts_path
                            .field("more_ballots_count")
                            .to_string(),
                    ],
                    code: ValidationResultCode::F304,
                });
            }
        }

        // F.305 validate that no differences should be filled in when there is no difference in the totals
        if total_voters_count == total_votes_count {
            let mut fields = vec![];
            if self.differences_counts.more_ballots_count != 0 {
                fields.push(
                    differences_counts_path
                        .field("more_ballots_count")
                        .to_string(),
                );
            }
            if self.differences_counts.fewer_ballots_count != 0 {
                fields.push(
                    differences_counts_path
                        .field("fewer_ballots_count")
                        .to_string(),
                );
            }
            if !fields.is_empty() {
                validation_results.errors.push(ValidationResult {
                    fields,
                    code: ValidationResultCode::F305,
                });
            }
        }

        self.differences_counts.validate(
            election,
            polling_station,
            validation_results,
            &differences_counts_path,
        )?;

        self.political_group_votes.validate(
            election,
            polling_station,
            validation_results,
            &path.field("political_group_votes"),
        )?;

        // F.202 validate that the total number of valid votes is equal to the sum of all political group totals
        if self.votes_counts.total_votes_candidates_count as u64
            != self
                .political_group_votes
                .iter()
                .map(|pgv| pgv.total as u64)
                .sum::<u64>()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    votes_counts_path
                        .field("total_votes_candidates_count")
                        .to_string(),
                    path.field("political_group_votes").to_string(),
                ],
                code: ValidationResultCode::F202,
            });
        }
        Ok(())
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
        if self.extra_investigation_other_reason.is_answered()
            != self.ballots_recounted_extra_investigation.is_answered()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F101,
            });
        }
        if self.extra_investigation_other_reason.is_invalid()
            || self.ballots_recounted_extra_investigation.is_invalid()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F102,
            });
        }
        Ok(())
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
        if !self.unexplained_difference_ballots_voters.is_answered()
            || !self.difference_ballots_per_list.is_answered()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F111,
            });
        }
        if self.unexplained_difference_ballots_voters.is_invalid()
            || self.difference_ballots_per_list.is_invalid()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F112,
            });
        }
        Ok(())
    }
}

impl Validate for Count {
    fn validate(
        &self,
        _election: &ElectionWithPoliticalGroups,
        _polling_station: &PollingStation,
        _validation_results: &mut ValidationResults,
        _field_name: &FieldPath,
    ) -> Result<(), DataError> {
        if self > &999_999_999 {
            return Err(DataError::new("count out of range"));
        }
        Ok(())
    }
}

impl Validate for VotersCounts {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.poll_card_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("poll_card_count"),
        )?;
        self.proxy_certificate_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("proxy_certificate_count"),
        )?;
        self.total_admitted_voters_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total_admitted_voters_count"),
        )?;

        // F.201 validate that total_admitted_voters_count == poll_card_count + proxy_certificate_count
        if self.poll_card_count + self.proxy_certificate_count != self.total_admitted_voters_count {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("poll_card_count").to_string(),
                    path.field("proxy_certificate_count").to_string(),
                    path.field("total_admitted_voters_count").to_string(),
                ],
                code: ValidationResultCode::F201,
            });
        }
        Ok(())
    }
}

impl Validate for VotesCounts {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.political_group_total_votes.validate(
            election,
            polling_station,
            validation_results,
            &path.field("political_group_total_votes"),
        )?;
        self.total_votes_candidates_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total_votes_candidates_count"),
        )?;
        self.blank_votes_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("blank_votes_count"),
        )?;
        self.invalid_votes_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("invalid_votes_count"),
        )?;
        self.total_votes_cast_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total_votes_cast_count"),
        )?;

        // F.203 validate that total_votes_cast_count == total_votes_candidates_count + blank_votes_count + invalid_votes_count
        if self.total_votes_candidates_count + self.blank_votes_count + self.invalid_votes_count
            != self.total_votes_cast_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("total_votes_candidates_count").to_string(),
                    path.field("blank_votes_count").to_string(),
                    path.field("invalid_votes_count").to_string(),
                    path.field("total_votes_cast_count").to_string(),
                ],
                code: ValidationResultCode::F203,
            });
        }

        // stop validation for warnings if there are errors
        if !validation_results.errors.is_empty() {
            return Ok(());
        }

        // W.201 validate that number of blank votes is no more than 3%
        if above_percentage_threshold(self.blank_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("blank_votes_count").to_string()],
                code: ValidationResultCode::W201,
            });
        }

        // W.202 validate that number of invalid votes is no more than 3%
        if above_percentage_threshold(self.invalid_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("invalid_votes_count").to_string()],
                code: ValidationResultCode::W202,
            });
        }

        // W.205 validate that total number of votes cast is not 0
        if self.total_votes_cast_count == 0 {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("total_votes_cast_count").to_string()],
                code: ValidationResultCode::W205,
            });
        }
        Ok(())
    }
}

impl Validate for Vec<PoliticalGroupTotalVotes> {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        _polling_station: &PollingStation,
        _validation_results: &mut ValidationResults,
        _path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of political group total votes has the correct length
        if election.political_groups.len() != self.len() {
            return Err(DataError::new(
                "list of political group total votes does not have correct length",
            ));
        }

        // check each political group total votes
        for (i, pgv) in self.iter().enumerate() {
            let number = pgv.number;
            if number as usize != i + 1 {
                return Err(DataError::new(
                    "political group total votes numbers are not consecutive",
                ));
            }
        }
        Ok(())
    }
}

impl Validate for DifferencesCounts {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.more_ballots_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("more_ballots_count"),
        )?;
        self.fewer_ballots_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("fewer_ballots_count"),
        )?;

        // W.301 validate that more_ballots_count == too_many_ballots_handed_out_count + other_explanation_count + no_explanation_count - unreturned_ballots_count - too_few_ballots_handed_out_count
        if self.more_ballots_count != 0
            && (self
                .compare_votes_cast_admitted_voters
                .votes_cast_greater_than_admitted_voters
                && !self
                    .compare_votes_cast_admitted_voters
                    .admitted_voters_equal_votes_cast
                && !self
                    .compare_votes_cast_admitted_voters
                    .votes_cast_smaller_than_admitted_voters
                && !self.difference_completely_accounted_for.yes
                && self.difference_completely_accounted_for.no)
        {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("more_ballots_count").to_string()],
                code: ValidationResultCode::W301,
            });
        }
        // W.302 validate that fewer_ballots_count == unreturned_ballots_count + too_few_ballots_handed_out_count + other_explanation_count + no_explanation_count
        if self.fewer_ballots_count != 0
            && (self
                .compare_votes_cast_admitted_voters
                .votes_cast_smaller_than_admitted_voters
                && !self
                    .compare_votes_cast_admitted_voters
                    .admitted_voters_equal_votes_cast
                && !self
                    .compare_votes_cast_admitted_voters
                    .votes_cast_greater_than_admitted_voters
                && !self.difference_completely_accounted_for.yes
                && self.difference_completely_accounted_for.no)
        {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("fewer_ballots_count").to_string()],
                code: ValidationResultCode::W302,
            });
        }
        Ok(())
    }
}

impl Validate for Vec<PoliticalGroupCandidateVotes> {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of political groups has the correct length
        if election.political_groups.len() != self.len() {
            return Err(DataError::new(
                "list of political groups does not have correct length",
            ));
        }

        // check each political group
        for (i, pgv) in self.iter().enumerate() {
            let number = pgv.number;
            if number as usize != i + 1 {
                return Err(DataError::new(
                    "political group numbers are not consecutive",
                ));
            }
            pgv.validate(
                election,
                polling_station,
                validation_results,
                &path.index(i),
            )?;
        }
        Ok(())
    }
}

impl Validate for PoliticalGroupCandidateVotes {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of candidates has the correct length
        let pg = election
            .political_groups
            .get(self.number as usize - 1)
            .expect("political group should exist");

        // check if the number of candidates is correct
        if pg.candidates.len() != self.candidate_votes.len() {
            return Err(DataError::new("incorrect number of candidates"));
        }

        // validate all candidates
        for (i, cv) in self.candidate_votes.iter().enumerate() {
            let number = cv.number;
            if number as usize != i + 1 {
                return Err(DataError::new("candidate numbers are not consecutive"));
            }
            cv.validate(
                election,
                polling_station,
                validation_results,
                &path.field("candidate_votes").index(i),
            )?;
        }

        // validate the total number of votes
        self.total.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total"),
        )?;

        // all candidate votes, cast to u64 to avoid overflow
        let candidate_votes_sum: u64 = self
            .candidate_votes
            .iter()
            .map(|cv| cv.votes as u64)
            .sum::<u64>();
        if candidate_votes_sum > 0 && self.total == 0 {
            // F.402 validate whether the total number of votes is empty when there are candidate votes
            validation_results.errors.push(ValidationResult {
                fields: vec![path.field("total").to_string()],
                code: ValidationResultCode::F402,
            });
        } else if self.total as u64 != candidate_votes_sum {
            // F.401 validate whether the total number of votes matches the sum of all candidate votes
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F401,
            });
        }
        Ok(())
    }
}

/// Check if the difference between the total admitted voters count and the total votes cast count
/// is above the threshold, meaning 2% or more or 15 or more, which should result in a warning.
fn difference_admitted_voters_count_and_votes_cast_count_above_threshold(
    admitted_voters: u32,
    votes_cast: u32,
) -> bool {
    let float_admitted_voters: f64 = f64::from(admitted_voters);
    let float_votes_cast: f64 = f64::from(votes_cast);
    f64::abs(float_admitted_voters - float_votes_cast) / float_votes_cast >= 0.02
        || f64::abs(float_admitted_voters - float_votes_cast) >= 15.0
}

impl Validate for CandidateVotes {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        self.votes.validate(
            election,
            polling_station,
            validation_results,
            &path.field("votes"),
        )
    }
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::data_entry::{DifferenceCountsCompareVotesCastAdmittedVoters, YesNo};
    use crate::{
        data_entry::{PoliticalGroupTotalVotes, tests::ValidDefault},
        election::tests::election_fixture,
        polling_station::structs::tests::polling_station_fixture,
    };

    mod extra_investigation {
        use crate::{
            data_entry::{
                DataError, ExtraInvestigation, Validate, ValidationResult, ValidationResultCode,
                ValidationResults, YesNo,
            },
            election::tests::election_fixture,
            polling_station::structs::tests::polling_station_fixture,
        };

        fn validate(
            investigation_yes: bool,
            investigation_no: bool,
            recounted_yes: bool,
            recounted_no: bool,
        ) -> Result<ValidationResults, DataError> {
            let extra_investigation = ExtraInvestigation {
                extra_investigation_other_reason: YesNo {
                    yes: investigation_yes,
                    no: investigation_no,
                },
                ballots_recounted_extra_investigation: YesNo {
                    yes: recounted_yes,
                    no: recounted_no,
                },
            };

            let mut validation_results = ValidationResults::default();
            extra_investigation.validate(
                &election_fixture(&[]),
                &polling_station_fixture(None),
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

        /// CSO | F.101: 'Extra onderzoek B1-1': één van beide vragen is beantwoord, en de andere niet
        #[test]
        fn test_f101() -> Result<(), DataError> {
            let validation_results = validate(false, true, false, false)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F101,
                    fields: vec!["extra_investigation".into()],
                }]
            );

            let validation_results = validate(false, false, false, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F101,
                    fields: vec!["extra_investigation".into()],
                }]
            );

            Ok(())
        }

        /// CSO | F.102: 'Extra onderzoek B1-1': meerdere antwoorden op 1 van de vragen
        #[test]
        fn test_f102() -> Result<(), DataError> {
            let validation_results = validate(true, true, true, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F102,
                    fields: vec!["extra_investigation".into()],
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
                    },
                    ValidationResult {
                        code: ValidationResultCode::F102,
                        fields: vec!["extra_investigation".into()],
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
                    },
                    ValidationResult {
                        code: ValidationResultCode::F102,
                        fields: vec!["extra_investigation".into()],
                    }
                ]
            );

            Ok(())
        }
    }

    mod counting_differences_polling_station {
        use crate::{
            data_entry::{
                CountingDifferencesPollingStation, DataError, Validate, ValidationResult,
                ValidationResultCode, ValidationResults, YesNo,
            },
            election::tests::election_fixture,
            polling_station::structs::tests::polling_station_fixture,
        };

        fn validate(
            unexplained_yes: bool,
            unexplained_no: bool,
            ballots_yes: bool,
            ballots_no: bool,
        ) -> Result<ValidationResults, DataError> {
            let counting_differences_polling_station = CountingDifferencesPollingStation {
                unexplained_difference_ballots_voters: YesNo {
                    yes: unexplained_yes,
                    no: unexplained_no,
                },
                difference_ballots_per_list: YesNo {
                    yes: ballots_yes,
                    no: ballots_no,
                },
            };

            let mut validation_results = ValidationResults::default();
            counting_differences_polling_station.validate(
                &election_fixture(&[]),
                &polling_station_fixture(None),
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
                }]
            );

            let validation_results = validate(false, false, false, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F111,
                    fields: vec!["counting_differences_polling_station".into()],
                }]
            );

            let validation_results = validate(false, false, false, false)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F111,
                    fields: vec!["counting_differences_polling_station".into()],
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
                }]
            );

            let validation_results = validate(false, true, true, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F112,
                    fields: vec!["counting_differences_polling_station".into()],
                }]
            );

            let validation_results = validate(true, true, true, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F112,
                    fields: vec!["counting_differences_polling_station".into()],
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
                    },
                    ValidationResult {
                        code: ValidationResultCode::F112,
                        fields: vec!["counting_differences_polling_station".into()],
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
                    },
                    ValidationResult {
                        code: ValidationResultCode::F112,
                        fields: vec!["counting_differences_polling_station".into()],
                    }
                ]
            );

            Ok(())
        }
    }

    /// Tests that ValidationResults can be appended together, combining errors and warnings.
    #[test]
    fn test_validation_result_append() {
        let mut result1 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field1".to_string()],
                code: ValidationResultCode::F201,
            }],
            warnings: vec![],
        };

        let mut result2 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field2".to_string()],
                code: ValidationResultCode::F203,
            }],
            warnings: vec![],
        };

        result1.append(&mut result2);

        // appending should combine the errors and warnings
        assert_eq!(result1.errors.len(), 2);
        assert_eq!(result1.warnings.len(), 0);
    }

    /// Tests the above_percentage_threshold function with various input combinations.
    #[test]
    fn test_above_percentage_threshold() {
        assert!(above_percentage_threshold(11, 101, 10));
        assert!(!above_percentage_threshold(10, 101, 10));
        assert!(above_percentage_threshold(10, 100, 10));

        assert!(above_percentage_threshold(10, 0, 10));
    }

    /// Tests cases where values are below the percentage threshold.
    #[test]
    fn test_below_percentage_threshold() {
        assert!(!above_percentage_threshold(9, 100, 10));
        assert!(!above_percentage_threshold(0, 0, 10));
    }

    /// test validation with default values
    #[test]
    fn test_default_values() {
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: Default::default(),
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 0,
                }],
                ..Default::default()
            },
            differences_counts: Default::default(),
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[42],
            )],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(None);
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F202
        );
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W205
        );
    }

    /// Tests validation of polling station results with incorrect totals and differences.
    /// Covers F.201 (incorrect voters total), F.203 (incorrect votes total), F.301-F.305 (difference errors), and W.203 (threshold warnings).
    #[test]
    fn test_incorrect_total_and_difference() {
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 29,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 35, // F.201 incorrect total & W.203 above threshold in absolute numbers
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 44,
                }],
                total_votes_candidates_count: 44,
                blank_votes_count: 1,
                invalid_votes_count: 4,
                total_votes_cast_count: 50, // F.203 incorrect total & W.203 above threshold in absolute numbers
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 0, // F.301 incorrect difference
                fewer_ballots_count: 0,
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: true,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: Default::default(),
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[44],
            )],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(None);
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 3);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F203
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_candidates_count",
                "polling_station_results.votes_counts.blank_votes_count",
                "polling_station_results.votes_counts.invalid_votes_count",
                "polling_station_results.votes_counts.total_votes_cast_count",
            ]
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F201
        );
        assert_eq!(
            validation_results.errors[1].fields,
            vec![
                "polling_station_results.voters_counts.poll_card_count",
                "polling_station_results.voters_counts.proxy_certificate_count",
                "polling_station_results.voters_counts.total_admitted_voters_count",
            ]
        );
        assert_eq!(
            validation_results.errors[2].code,
            ValidationResultCode::F301
        );
        assert_eq!(
            validation_results.errors[2].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count"]
        );
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W203
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_counts.total_admitted_voters_count",
            ]
        );

        // test F.303 incorrect difference & F.304 should be empty
        validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 103,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 104,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 2,  // F.304 should be empty
                fewer_ballots_count: 0, // F.303 incorrect difference
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: false,
                        votes_cast_greater_than_admitted_voters: true,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: YesNo {
                    yes: false,
                    no: true,
                },
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[100],
            )],
        };
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 2);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F303
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.fewer_ballots_count",]
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F304
        );
        assert_eq!(
            validation_results.errors[1].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count"]
        );

        // test F.201 incorrect total, F.203 incorrect total, F.301 incorrect difference, F.302 should be empty & W.203 above threshold in percentage
        validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 4,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 5, // F.201 incorrect total & W.204 above threshold in percentage
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 3,
                }],
                total_votes_candidates_count: 3,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 6, // F.203 incorrect total & W.204 above threshold in percentage
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,  // F.301 incorrect difference
                fewer_ballots_count: 2, // F.302 should be empty
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: true,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: YesNo {
                    yes: true,
                    no: false,
                },
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(1, &[3])],
        };
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 4);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F203
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_candidates_count",
                "polling_station_results.votes_counts.blank_votes_count",
                "polling_station_results.votes_counts.invalid_votes_count",
                "polling_station_results.votes_counts.total_votes_cast_count",
            ]
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F201
        );
        assert_eq!(
            validation_results.errors[1].fields,
            vec![
                "polling_station_results.voters_counts.poll_card_count",
                "polling_station_results.voters_counts.proxy_certificate_count",
                "polling_station_results.voters_counts.total_admitted_voters_count",
            ]
        );
        assert_eq!(
            validation_results.errors[2].code,
            ValidationResultCode::F301
        );
        assert_eq!(
            validation_results.errors[2].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count",]
        );
        assert_eq!(
            validation_results.errors[3].code,
            ValidationResultCode::F302
        );
        assert_eq!(
            validation_results.errors[3].fields,
            vec!["polling_station_results.differences_counts.fewer_ballots_count"]
        );
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W203
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_counts.total_admitted_voters_count"
            ]
        );

        // test F.303 incorrect difference, F.304 should be empty & W.203 above threshold in absolute numbers
        validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 102, // Fixed: 100 + 2 = 102
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 82,
                }],
                total_votes_candidates_count: 82,
                blank_votes_count: 1,
                invalid_votes_count: 2,
                total_votes_cast_count: 85, // Changed so voters > votes (102 > 85) with 17 difference for W.203
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 15, // F.304 should be empty
                fewer_ballots_count: 0, // F.303 incorrect difference
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: false,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: Default::default(),
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[82],
            )],
        };
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 2);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F303
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.fewer_ballots_count",]
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F304
        );
        assert_eq!(
            validation_results.errors[1].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count",]
        );
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W203
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_counts.total_admitted_voters_count"
            ]
        );
    }

    /// Tests validation when differences are incorrectly specified (F.304)
    /// and the difference between voters counts and votes counts is >2% (W.203).
    #[test]
    fn test_differences() {
        let polling_station_results = PollingStationResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 54,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 56, // W.203 above threshold in percentage
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 50,
                }],
                total_votes_candidates_count: 50,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 52, // W.203 above threshold in percentage
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 4, // F.304 should be empty
                fewer_ballots_count: 4,
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: false,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: Default::default(),
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[50],
            )],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(None);
        let mut validation_results = ValidationResults::default();
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F304
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count",]
        );
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W203
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_counts.total_admitted_voters_count",
            ]
        );
    }

    /// Tests validation when no differences are expected (F.305)
    #[test]
    fn test_no_differences_expected() {
        let polling_station_results = PollingStationResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 50,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 52,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 50,
                }],
                total_votes_candidates_count: 50,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 52,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 4, // F.305 no difference expected
                fewer_ballots_count: 0,
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: false,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: Default::default(),
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes::from_test_data_auto(
                1,
                &[50],
            )],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(None);
        let mut validation_results = ValidationResults::default();
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F305
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count",]
        );
    }

    /// Tests validation when no differences are expected (F.305)
    /// and an incorrect total (F.202)
    #[test]
    fn test_no_differences_expected_and_incorrect_total() {
        let polling_station_results = PollingStationResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 50,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 52,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 40,
                }],
                total_votes_candidates_count: 50,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 52,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 4, // F.305 no difference expected
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: false,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: Default::default(),
            },
            political_group_votes: vec![PoliticalGroupCandidateVotes {
                number: 1,
                total: 49, // F.202 incorrect total
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 49,
                }],
            }],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(None);
        let mut validation_results = ValidationResults::default();
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 2);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F305
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.fewer_ballots_count",]
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F202
        );
        assert_eq!(
            validation_results.errors[1].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_candidates_count",
                "polling_station_results.political_group_votes"
            ]
        );
    }

    /// Tests validation of VotersCounts including out-of-range values and incorrect totals (F.201).
    #[test]
    fn test_voters_counts_validation() {
        let mut validation_results = ValidationResults::default();
        // test out of range
        let mut voters_counts = VotersCounts {
            poll_card_count: 1_000_000_001, // out of range
            proxy_certificate_count: 2,
            total_admitted_voters_count: 1_000_000_006, // correct but out of range
        };
        let election = election_fixture(&[]);
        let polling_station = polling_station_fixture(None);
        let res = voters_counts.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"voters_counts".into(),
        );
        assert!(res.is_err());

        // test F.201 incorrect total
        validation_results = ValidationResults::default();
        voters_counts = VotersCounts {
            poll_card_count: 5,
            proxy_certificate_count: 6,
            total_admitted_voters_count: 20, // F.201 incorrect total (5+6≠20)
        };
        voters_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"voters_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F201
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "voters_counts.poll_card_count",
                "voters_counts.proxy_certificate_count",
                "voters_counts.total_admitted_voters_count",
            ]
        );
    }

    /// Tests validation of VotesCounts including out-of-range values, incorrect totals (F.203),
    /// and warnings for high blank votes (W.201), invalid votes (W.202), and zero total (W.205).
    #[test]
    fn test_votes_counts_validation() {
        let mut validation_results = ValidationResults::default();
        // test out of range
        let mut votes_counts = VotesCounts {
            political_group_total_votes: vec![],
            total_votes_candidates_count: 1_000_000_001, // out of range
            blank_votes_count: 2,
            invalid_votes_count: 3,
            total_votes_cast_count: 1_000_000_006, // correct but out of range
        };
        let election = election_fixture(&[]);
        let polling_station = polling_station_fixture(None);
        let res = votes_counts.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"votes_counts".into(),
        );
        assert!(res.is_err());

        // test F.203 incorrect total
        validation_results = ValidationResults::default();
        votes_counts = VotesCounts {
            political_group_total_votes: vec![],
            total_votes_candidates_count: 5,
            blank_votes_count: 6,
            invalid_votes_count: 7,
            total_votes_cast_count: 20, // F.203 incorrect total
        };
        votes_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"votes_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F203
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "votes_counts.total_votes_candidates_count",
                "votes_counts.blank_votes_count",
                "votes_counts.invalid_votes_count",
                "votes_counts.total_votes_cast_count",
            ]
        );

        // test W.201 high number of blank votes
        validation_results = ValidationResults::default();
        votes_counts = VotesCounts {
            political_group_total_votes: vec![],
            total_votes_candidates_count: 100,
            blank_votes_count: 10, // W.201 above threshold
            invalid_votes_count: 1,
            total_votes_cast_count: 111,
        };
        votes_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"votes_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W201
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec!["votes_counts.blank_votes_count",]
        );

        // test W.202 high number of invalid votes
        validation_results = ValidationResults::default();
        votes_counts = VotesCounts {
            political_group_total_votes: vec![],
            total_votes_candidates_count: 100,
            blank_votes_count: 1,
            invalid_votes_count: 10, // W.202 above threshold
            total_votes_cast_count: 111,
        };
        votes_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"votes_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W202
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec!["votes_counts.invalid_votes_count",]
        );

        // test W.205 total votes cast should not be zero
        validation_results = ValidationResults::default();
        votes_counts = VotesCounts {
            political_group_total_votes: vec![],
            total_votes_candidates_count: 0,
            blank_votes_count: 0,
            invalid_votes_count: 0,
            total_votes_cast_count: 0, // W.205 should not be zero
        };
        votes_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"votes_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W205
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec!["votes_counts.total_votes_cast_count",]
        );
    }

    /// Tests validation of additional VotersCounts with same validation rules as primary voters counts.
    #[test]
    fn test_voters_counts_validation_additional() {
        let mut validation_results = ValidationResults::default();
        // test out of range
        let mut voters_counts_additional = VotersCounts {
            poll_card_count: 1_000_000_001, // out of range
            proxy_certificate_count: 2,
            total_admitted_voters_count: 1_000_000_006, // correct but out of range
        };
        let election = election_fixture(&[]);
        let polling_station = polling_station_fixture(None);
        let res = voters_counts_additional.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"voters_counts_additional".into(),
        );
        assert!(res.is_err());

        // test F.201 incorrect total
        validation_results = ValidationResults::default();
        voters_counts_additional = VotersCounts {
            poll_card_count: 5,
            proxy_certificate_count: 6,
            total_admitted_voters_count: 20, // F.201 incorrect total (5+6≠20)
        };
        voters_counts_additional
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"voters_counts_additional".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F201
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "voters_counts_additional.poll_card_count",
                "voters_counts_additional.proxy_certificate_count",
                "voters_counts_additional.total_admitted_voters_count",
            ]
        );
    }

    /// Tests validation of DifferencesCounts including out-of-range values and incorrect totals (W.301, W.302).
    #[test]
    fn test_differences_counts_validation() {
        let mut validation_results = ValidationResults::default();
        // test out of range
        let mut differences_counts = DifferencesCounts {
            more_ballots_count: 1_000_000_002, // correct but out of range
            fewer_ballots_count: 0,
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: false,
                votes_cast_greater_than_admitted_voters: false,
                votes_cast_smaller_than_admitted_voters: false,
            },
            difference_completely_accounted_for: Default::default(),
        };
        let election = election_fixture(&[]);
        let polling_station = polling_station_fixture(None);
        let res = differences_counts.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"differences_counts".into(),
        );
        assert!(res.is_err());

        // test calculation for more_ballots_count does not add up and becomes minus
        validation_results = ValidationResults::default();
        differences_counts = DifferencesCounts {
            more_ballots_count: 111, // W.301 incorrect total
            fewer_ballots_count: 0,
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: false,
                votes_cast_greater_than_admitted_voters: true,
                votes_cast_smaller_than_admitted_voters: false,
            },
            difference_completely_accounted_for: YesNo {
                yes: false,
                no: true,
            },
        };
        differences_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"differences_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W301
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec!["differences_counts.more_ballots_count",]
        );

        // test W.301 incorrect total
        validation_results = ValidationResults::default();
        differences_counts = DifferencesCounts {
            more_ballots_count: 5, // W.301 incorrect total
            fewer_ballots_count: 0,
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: false,
                votes_cast_greater_than_admitted_voters: true,
                votes_cast_smaller_than_admitted_voters: false,
            },
            difference_completely_accounted_for: YesNo {
                yes: false,
                no: true,
            },
        };
        differences_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"differences_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W301
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec!["differences_counts.more_ballots_count",]
        );

        // test calculation for fewer_ballots_count does not add up and becomes minus
        validation_results = ValidationResults::default();
        differences_counts = DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 1, // W.302 incorrect total
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: false,
                votes_cast_greater_than_admitted_voters: false,
                votes_cast_smaller_than_admitted_voters: true,
            },
            difference_completely_accounted_for: YesNo {
                yes: false,
                no: true,
            },
        };
        differences_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"differences_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W302
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec!["differences_counts.fewer_ballots_count",]
        );

        // test W.302 incorrect total
        validation_results = ValidationResults::default();
        differences_counts = DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 5, // W.302 incorrect total
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: false,
                votes_cast_greater_than_admitted_voters: false,
                votes_cast_smaller_than_admitted_voters: true,
            },
            difference_completely_accounted_for: YesNo {
                yes: false,
                no: true,
            },
        };
        differences_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"differences_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W302
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec!["differences_counts.fewer_ballots_count",]
        );
    }

    /// Tests validation of political group votes including out-of-range values, incorrect totals (F.401),
    /// missing totals (F.402), and mismatched candidate/group counts.
    #[test]
    fn test_political_group_votes_validation() {
        let mut validation_results = ValidationResults::default();
        // create a valid political group votes with two groups and two candidates each
        let mut political_group_votes = vec![
            PoliticalGroupCandidateVotes {
                number: 1,
                total: 25,
                candidate_votes: vec![
                    CandidateVotes {
                        number: 1,
                        votes: 14,
                    },
                    CandidateVotes {
                        number: 2,
                        votes: 11,
                    },
                ],
            },
            PoliticalGroupCandidateVotes {
                number: 2,
                total: 1_000_000_000, // out of range
                candidate_votes: vec![
                    CandidateVotes {
                        number: 1,
                        votes: 0,
                    },
                    CandidateVotes {
                        number: 2,
                        votes: 1_000_000_000, // out of range
                    },
                ],
            },
        ];
        let mut election = election_fixture(&[2, 2]);
        let polling_station = polling_station_fixture(None);

        // validate out of range number of candidates
        let res = political_group_votes.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"political_group_votes".into(),
        );
        assert!(res.is_err());

        // validate with correct in range votes for second political group but incorrect total for first political group
        validation_results = ValidationResults::default();
        political_group_votes[1].candidate_votes[1].votes = 20;
        political_group_votes[1].total = 20;
        political_group_votes[0].total = 20;
        political_group_votes
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"political_group_votes".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F401
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["political_group_votes[0]"]
        );

        // validate with missing total for second political group
        validation_results = ValidationResults::default();
        political_group_votes[0].total = 0;
        political_group_votes
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"political_group_votes".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F402
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["political_group_votes[0].total"]
        );

        // validate with incorrect number of candidates for the first political group
        validation_results = ValidationResults::default();
        election = election_fixture(&[3, 2]);
        political_group_votes[0].total = 25;
        let res = political_group_votes.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"political_group_votes".into(),
        );
        assert!(res.is_err());

        // validate with incorrect number of political groups
        validation_results = ValidationResults::default();
        election = election_fixture(&[2, 2, 2]);
        let res = political_group_votes.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"political_group_votes".into(),
        );
        assert!(res.is_err());

        // validate with correct number of political groups but mixed up numbers
        validation_results = ValidationResults::default();
        election = election_fixture(&[2, 2]);
        political_group_votes[0].number = 2;
        let res = political_group_votes.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"political_group_votes".into(),
        );
        assert!(res.is_err());
    }

    /// Tests the has_errors() and has_warnings() helper methods on ValidationResults.
    #[test]
    fn test_has_errors_has_warnings_methods() {
        let result1 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field1".to_string()],
                code: ValidationResultCode::F201,
            }],
            warnings: vec![
                ValidationResult {
                    fields: vec!["field1".to_string()],
                    code: ValidationResultCode::W001,
                },
                ValidationResult {
                    fields: vec!["field1".to_string()],
                    code: ValidationResultCode::W201,
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

    /// Tests that when more_ballots_count exactly matches the calculated difference, warning W.301 is avoided.
    #[test]
    fn test_exact_correct_count_avoids_w301() {
        let election = election_fixture(&[]);
        let polling_station = polling_station_fixture(None);
        let mut validation_results = ValidationResults::default();

        // Difference is 10
        let differences_counts = DifferencesCounts {
            more_ballots_count: 10, // W.301 correct total
            fewer_ballots_count: 0,
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: false,
                votes_cast_greater_than_admitted_voters: true,
                votes_cast_smaller_than_admitted_voters: false,
            },
            difference_completely_accounted_for: YesNo {
                yes: false,
                no: true,
            },
        };
        differences_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"differences_counts".into(),
            )
            .unwrap();

        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
    }

    /// Tests that when fewer_ballots_count exactly matches the calculated difference, warning W.302 is avoided.
    #[test]
    fn test_exact_correct_count_avoids_w302() {
        let election = election_fixture(&[]);
        let polling_station = polling_station_fixture(None);
        let mut validation_results = ValidationResults::default();

        // 3 + 3 + 3 + 3 - 2 = 10
        let differences_counts = DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 10,
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: false,
                votes_cast_greater_than_admitted_voters: false,
                votes_cast_smaller_than_admitted_voters: false,
            },
            difference_completely_accounted_for: Default::default(),
        };
        differences_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"differences_counts".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 0);
    }
}
