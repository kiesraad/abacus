use serde::{Deserialize, Serialize};
use std::fmt;
use utoipa::ToSchema;

use super::{
    CandidateVotes, Count, DifferencesCounts, PoliticalGroupVotes, PollingStationResults,
    VotersCounts, VotesCounts,
};
use crate::{election::Election, polling_station::PollingStation};

#[derive(Serialize, Deserialize, ToSchema, Debug, Default, PartialEq, Eq)]
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
pub struct ValidationResult {
    pub fields: Vec<String>,
    pub code: ValidationResultCode,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum ValidationResultCode {
    F101,
    F201,
    F202,
    F203,
    F204,
    F301,
    F302,
    F303,
    F304,
    F305,
    F401,
    W201,
    W202,
    W203,
    W204,
    W205,
    W206,
    W207,
    W208,
    W209,
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
            .push_str(&format!("[{}]", index));
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
            write!(f, "{}", component)?;
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
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError>;
}

pub fn validate_polling_station_results(
    polling_station_results: &PollingStationResults,
    polling_station: &PollingStation,
    election: &Election,
) -> Result<ValidationResults, DataError> {
    let mut validation_results = ValidationResults::default();
    polling_station_results.validate(
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

impl Validate for PollingStationResults {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        let total_votes_count = self.votes_counts.total_votes_cast_count;
        let total_voters_count: Count;

        self.votes_counts.validate(
            election,
            polling_station,
            validation_results,
            &path.field("votes_counts"),
        )?;

        if let Some(recounted) = self.recounted {
            if recounted && self.voters_recounts.is_none() {
                return Err(DataError::new(
                    "recounted==true but voters_recounts is None",
                ));
            } else if !recounted && self.voters_recounts.is_some() {
                return Err(DataError::new(
                    "recounted==false but voters_recounts is Some",
                ));
            }
        } else {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.field("recounted").to_string()],
                code: ValidationResultCode::F101,
            });
        }

        let votes_counts_path = path.field("votes_counts");
        let voters_counts_path = path.field("voters_counts");
        let voters_recounts_path = path.field("voters_recounts");
        let differences_counts_path = path.field("differences_counts");

        if let Some(voters_recounts) = &self.voters_recounts {
            // if recounted = true
            total_voters_count = voters_recounts.total_admitted_voters_count;
            voters_recounts.validate(
                election,
                polling_station,
                validation_results,
                &voters_recounts_path,
            )?;

            // W.209 validate that the numbers in voters_recounts and votes_counts are not the same
            if identical_voters_counts_and_votes_counts(voters_recounts, &self.votes_counts) {
                validation_results.warnings.push(ValidationResult {
                    fields: vec![
                        votes_counts_path
                            .field("votes_candidates_count")
                            .to_string(),
                        votes_counts_path.field("blank_votes_count").to_string(),
                        votes_counts_path.field("invalid_votes_count").to_string(),
                        votes_counts_path
                            .field("total_votes_cast_count")
                            .to_string(),
                        voters_recounts_path.field("poll_card_count").to_string(),
                        voters_recounts_path
                            .field("proxy_certificate_count")
                            .to_string(),
                        voters_recounts_path.field("voter_card_count").to_string(),
                        voters_recounts_path
                            .field("total_admitted_voters_count")
                            .to_string(),
                    ],
                    code: ValidationResultCode::W209,
                });
            }
        } else {
            // if recounted = false
            total_voters_count = self.voters_counts.total_admitted_voters_count;
            self.voters_counts.validate(
                election,
                polling_station,
                validation_results,
                &voters_counts_path,
            )?;

            // W.208 validate that the numbers in voters_counts and votes_counts are not the same
            if identical_voters_counts_and_votes_counts(&self.voters_counts, &self.votes_counts) {
                validation_results.warnings.push(ValidationResult {
                    fields: vec![
                        voters_counts_path.to_string(),
                        votes_counts_path.to_string(),
                    ],
                    code: ValidationResultCode::W208,
                });
            }
        }

        // W.203 & W.204 validate that the difference between total votes count and total voters count is not above threshold
        if difference_admitted_voters_count_and_votes_cast_count_above_threshold(
            total_voters_count,
            total_votes_count,
        ) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    votes_counts_path
                        .field("total_votes_cast_count")
                        .to_string(),
                    if self.recounted == Some(true) {
                        voters_recounts_path
                            .field("total_admitted_voters_count")
                            .to_string()
                    } else {
                        voters_counts_path
                            .field("total_admitted_voters_count")
                            .to_string()
                    },
                ],
                code: if self.recounted == Some(true) {
                    ValidationResultCode::W204
                } else {
                    ValidationResultCode::W203
                },
            });
        }

        if let Some(number_of_voters) = polling_station.number_of_voters {
            // W.206 & W.207 validate that total votes count and total voters count are not exceeding polling stations number of eligible voters
            let mut fields = vec![];
            if i64::from(total_votes_count) > number_of_voters {
                fields.push(
                    votes_counts_path
                        .field("total_votes_cast_count")
                        .to_string(),
                );
            }
            if i64::from(total_voters_count) > number_of_voters {
                fields.push(if self.recounted == Some(true) {
                    voters_recounts_path
                        .field("total_admitted_voters_count")
                        .to_string()
                } else {
                    voters_counts_path
                        .field("total_admitted_voters_count")
                        .to_string()
                });
            }
            if !fields.is_empty() {
                validation_results.warnings.push(ValidationResult {
                    fields,
                    code: if self.recounted == Some(true) {
                        ValidationResultCode::W207
                    } else {
                        ValidationResultCode::W206
                    },
                });
            }
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
            if self.differences_counts.unreturned_ballots_count != 0 {
                fields.push(
                    differences_counts_path
                        .field("unreturned_ballots_count")
                        .to_string(),
                );
            }
            if self.differences_counts.too_few_ballots_handed_out_count != 0 {
                fields.push(
                    differences_counts_path
                        .field("too_few_ballots_handed_out_count")
                        .to_string(),
                );
            }
            if self.differences_counts.too_many_ballots_handed_out_count != 0 {
                fields.push(
                    differences_counts_path
                        .field("too_many_ballots_handed_out_count")
                        .to_string(),
                );
            }
            if self.differences_counts.other_explanation_count != 0 {
                fields.push(
                    differences_counts_path
                        .field("other_explanation_count")
                        .to_string(),
                );
            }
            if self.differences_counts.no_explanation_count != 0 {
                fields.push(
                    differences_counts_path
                        .field("no_explanation_count")
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

        // F.204 validate that the total number of valid votes is equal to the sum of all political group totals
        if self.votes_counts.votes_candidates_count as u64
            != self
                .political_group_votes
                .iter()
                .map(|pgv| pgv.total as u64)
                .sum::<u64>()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    votes_counts_path
                        .field("votes_candidates_count")
                        .to_string(),
                    path.field("political_group_votes").to_string(),
                ],
                code: ValidationResultCode::F204,
            });
        }
        Ok(())
    }
}

impl Validate for Count {
    fn validate(
        &self,
        _election: &Election,
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

/// Check if all voters counts and votes counts are equal to zero.
/// Used in validations where this is an edge case that needs to be handled.
fn all_zero_voters_counts_and_votes_counts(voters: &VotersCounts, votes: &VotesCounts) -> bool {
    voters.poll_card_count == 0
        && voters.proxy_certificate_count == 0
        && voters.voter_card_count == 0
        && voters.total_admitted_voters_count == 0
        && votes.votes_candidates_count == 0
        && votes.blank_votes_count == 0
        && votes.invalid_votes_count == 0
        && votes.total_votes_cast_count == 0
}

/// Check if the voters counts and votes counts are identical, which should result in a warning.
///
/// This is not implemented as Eq because there is no true equality relation
/// between these two sets of numbers.
fn identical_voters_counts_and_votes_counts(voters: &VotersCounts, votes: &VotesCounts) -> bool {
    !all_zero_voters_counts_and_votes_counts(voters, votes)
        && voters.poll_card_count == votes.votes_candidates_count
        && voters.proxy_certificate_count == votes.blank_votes_count
        && voters.voter_card_count == votes.invalid_votes_count
        && voters.total_admitted_voters_count == votes.total_votes_cast_count
}

impl Validate for VotersCounts {
    fn validate(
        &self,
        election: &Election,
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
        self.voter_card_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("voter_card_count"),
        )?;
        self.total_admitted_voters_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("total_admitted_voters_count"),
        )?;

        // F.201/F.203 validate that total_admitted_voters_count == poll_card_count + proxy_certificate_count + voter_card_count
        if self.poll_card_count + self.proxy_certificate_count + self.voter_card_count
            != self.total_admitted_voters_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("poll_card_count").to_string(),
                    path.field("proxy_certificate_count").to_string(),
                    path.field("voter_card_count").to_string(),
                    path.field("total_admitted_voters_count").to_string(),
                ],
                code: if path.last() == "voters_recounts" {
                    ValidationResultCode::F203
                } else {
                    ValidationResultCode::F201
                },
            });
        }
        Ok(())
    }
}

impl Validate for VotesCounts {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // validate all counts
        self.votes_candidates_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("votes_candidates_count"),
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

        // F.202 validate that total_votes_cast_count == votes_candidates_count + blank_votes_count + invalid_votes_count
        if self.votes_candidates_count + self.blank_votes_count + self.invalid_votes_count
            != self.total_votes_cast_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("votes_candidates_count").to_string(),
                    path.field("blank_votes_count").to_string(),
                    path.field("invalid_votes_count").to_string(),
                    path.field("total_votes_cast_count").to_string(),
                ],
                code: ValidationResultCode::F202,
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

impl Validate for DifferencesCounts {
    fn validate(
        &self,
        election: &Election,
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
        self.unreturned_ballots_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("unreturned_ballots_count"),
        )?;
        self.too_few_ballots_handed_out_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("too_few_ballots_handed_out_count"),
        )?;
        self.too_many_ballots_handed_out_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("too_many_ballots_handed_out_count"),
        )?;
        self.other_explanation_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("other_explanation_count"),
        )?;
        self.no_explanation_count.validate(
            election,
            polling_station,
            validation_results,
            &path.field("no_explanation_count"),
        )?;

        // W.301 validate that more_ballots_count == too_many_ballots_handed_out_count + other_explanation_count + no_explanation_count - unreturned_ballots_count - too_few_ballots_handed_out_count
        if self.more_ballots_count != 0
            && (i64::from(self.too_many_ballots_handed_out_count)
                + i64::from(self.other_explanation_count)
                + i64::from(self.no_explanation_count)
                - i64::from(self.unreturned_ballots_count)
                - i64::from(self.too_few_ballots_handed_out_count)
                != i64::from(self.more_ballots_count))
        {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    path.field("more_ballots_count").to_string(),
                    path.field("too_many_ballots_handed_out_count").to_string(),
                    path.field("other_explanation_count").to_string(),
                    path.field("no_explanation_count").to_string(),
                    path.field("unreturned_ballots_count").to_string(),
                    path.field("too_few_ballots_handed_out_count").to_string(),
                ],
                code: ValidationResultCode::W301,
            });
        }
        // W.302 validate that fewer_ballots_count == unreturned_ballots_count + too_few_ballots_handed_out_count + other_explanation_count + no_explanation_count
        if self.fewer_ballots_count != 0
            && (i64::from(self.unreturned_ballots_count)
                + i64::from(self.too_few_ballots_handed_out_count)
                + i64::from(self.other_explanation_count)
                + i64::from(self.no_explanation_count)
                - i64::from(self.too_many_ballots_handed_out_count)
                != i64::from(self.fewer_ballots_count))
        {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    path.field("fewer_ballots_count").to_string(),
                    path.field("unreturned_ballots_count").to_string(),
                    path.field("too_few_ballots_handed_out_count").to_string(),
                    path.field("too_many_ballots_handed_out_count").to_string(),
                    path.field("other_explanation_count").to_string(),
                    path.field("no_explanation_count").to_string(),
                ],
                code: ValidationResultCode::W302,
            });
        }
        Ok(())
    }
}

impl Validate for Vec<PoliticalGroupVotes> {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of political groups has the correct length
        let pg = election.political_groups.as_ref();
        if pg.is_none() || pg.expect("candidate list should not be None").len() != self.len() {
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

impl Validate for PoliticalGroupVotes {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) -> Result<(), DataError> {
        // check if the list of candidates has the correct length
        let pg = election
            .political_groups
            .as_ref()
            .expect("candidate list should not be None")
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

        // F.401 validate whether the total number of votes matches the sum of all candidate votes,
        // cast to u64 to avoid overflow
        if self.total as u64
            != self
                .candidate_votes
                .iter()
                .map(|cv| cv.votes as u64)
                .sum::<u64>()
        {
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
        election: &Election,
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
    use super::*;
    use crate::{
        election::tests::election_fixture, polling_station::structs::tests::polling_station_fixture,
    };
    use test_log::test;

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
                code: ValidationResultCode::F202,
            }],
            warnings: vec![],
        };

        result1.append(&mut result2);

        // appending should combine the errors and warnings
        assert_eq!(result1.errors.len(), 2);
        assert_eq!(result1.warnings.len(), 0);
    }

    #[test]
    fn test_above_percentage_threshold() {
        assert!(above_percentage_threshold(11, 101, 10));
        assert!(!above_percentage_threshold(10, 101, 10));
        assert!(above_percentage_threshold(10, 100, 10));

        assert!(above_percentage_threshold(10, 0, 10));
    }

    #[test]
    fn test_below_percentage_threshold() {
        assert!(!above_percentage_threshold(9, 100, 10));
        assert!(!above_percentage_threshold(0, 0, 10));
    }

    /// test error F.101: `recounted` set to `None`
    #[test]
    fn test_recounted_none() {
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: None,
            voters_counts: Default::default(),
            votes_counts: Default::default(),
            voters_recounts: None,
            differences_counts: Default::default(),
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[42])],
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
        assert_eq!(validation_results.errors.len(), 2);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F101
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F204
        );
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W205
        );
    }

    #[test]
    fn test_polling_station_results_incorrect_total_and_difference_validation() {
        // test F.201 incorrect total, F.202 incorrect total, F.301 incorrect difference & W.203 above threshold in absolute numbers
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 29,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 35, // F.201 incorrect total & W.203 above threshold in absolute numbers
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 44,
                blank_votes_count: 1,
                invalid_votes_count: 4,
                total_votes_cast_count: 50, // F.202 incorrect total & W.203 above threshold in absolute numbers
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0, // F.301 incorrect difference
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[44])],
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
            ValidationResultCode::F202
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "polling_station_results.votes_counts.votes_candidates_count",
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
                "polling_station_results.voters_counts.voter_card_count",
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
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 100,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 104,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 2,  // F.304 should be empty
                fewer_ballots_count: 0, // F.303 incorrect difference
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 2,
            },
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[100])],
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
        assert_eq!(validation_results.warnings.len(), 0);
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

        // test F.201 incorrect total, F.202 incorrect total, F.203 incorrect total, F.301 incorrect difference, F.302 should be empty & W.204 above threshold in percentage
        validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: Some(true),
            voters_counts: VotersCounts {
                poll_card_count: 1,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 5, // F.201 incorrect total & W.204 above threshold in percentage
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 3,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 6, // F.202 incorrect total & W.204 above threshold in percentage
            },
            voters_recounts: Some(VotersCounts {
                poll_card_count: 1,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 5, // F.203 incorrect total
            }),
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,  // F.301 incorrect difference
                fewer_ballots_count: 2, // F.302 should be empty
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 2,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[3])],
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
            ValidationResultCode::F202
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "polling_station_results.votes_counts.votes_candidates_count",
                "polling_station_results.votes_counts.blank_votes_count",
                "polling_station_results.votes_counts.invalid_votes_count",
                "polling_station_results.votes_counts.total_votes_cast_count",
            ]
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F203
        );
        assert_eq!(
            validation_results.errors[1].fields,
            vec![
                "polling_station_results.voters_recounts.poll_card_count",
                "polling_station_results.voters_recounts.proxy_certificate_count",
                "polling_station_results.voters_recounts.voter_card_count",
                "polling_station_results.voters_recounts.total_admitted_voters_count",
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
            ValidationResultCode::W204
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_recounts.total_admitted_voters_count"
            ]
        );

        // test F.303 incorrect difference, F.304 should be empty & W.204 above threshold in absolute numbers
        validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: Some(true),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 101,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 105, // W.204 above threshold in absolute numbers
            },
            voters_recounts: Some(VotersCounts {
                poll_card_count: 115,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 120, // W.204 above threshold in absolute numbers
            }),
            differences_counts: DifferencesCounts {
                more_ballots_count: 15, // F.304 should be empty
                fewer_ballots_count: 0, // F.303 incorrect difference
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 8,
                no_explanation_count: 7,
            },
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[101])],
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
            ValidationResultCode::W204
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_recounts.total_admitted_voters_count"
            ]
        );
    }

    #[test]
    fn test_polling_station_results_wrong_and_no_difference_validation() {
        // test F.304 should be empty & W.203 above threshold in percentage
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 50,
                proxy_certificate_count: 2,
                voter_card_count: 4,
                total_admitted_voters_count: 56, // W.203 above threshold in percentage
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 50,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 52, // W.203 above threshold in percentage
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 4, // F.304 should be empty
                fewer_ballots_count: 4,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 2,
                no_explanation_count: 2,
            },
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[50])],
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

        // test F.305 no difference expected
        validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 46,
                proxy_certificate_count: 2,
                voter_card_count: 4,
                total_admitted_voters_count: 52,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 50,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 52,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 4, // F.305 no difference expected
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 2, // F.305 no difference expected
                no_explanation_count: 2,    // F.305 no difference expected
            },
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[50])],
        };
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
            vec![
                "polling_station_results.differences_counts.more_ballots_count",
                "polling_station_results.differences_counts.other_explanation_count",
                "polling_station_results.differences_counts.no_explanation_count",
            ]
        );

        // test F.305 no difference expected & F.204 incorrect total
        validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: Some(true),
            voters_counts: VotersCounts {
                poll_card_count: 50,
                proxy_certificate_count: 2,
                voter_card_count: 4,
                total_admitted_voters_count: 56,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 50,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 52,
            },
            voters_recounts: Some(VotersCounts {
                poll_card_count: 46,
                proxy_certificate_count: 2,
                voter_card_count: 4,
                total_admitted_voters_count: 52,
            }),
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 4,      // F.305 no difference expected
                unreturned_ballots_count: 1, // F.305 no difference expected
                too_few_ballots_handed_out_count: 1, // F.305 no difference expected
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 1, // F.305 no difference expected
                no_explanation_count: 1,    // F.305 no difference expected
            },
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 49, // F.204 incorrect total
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 49,
                }],
            }],
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
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F305
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "polling_station_results.differences_counts.fewer_ballots_count",
                "polling_station_results.differences_counts.unreturned_ballots_count",
                "polling_station_results.differences_counts.too_few_ballots_handed_out_count",
                "polling_station_results.differences_counts.other_explanation_count",
                "polling_station_results.differences_counts.no_explanation_count"
            ]
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F204
        );
        assert_eq!(
            validation_results.errors[1].fields,
            vec![
                "polling_station_results.votes_counts.votes_candidates_count",
                "polling_station_results.political_group_votes"
            ]
        );
    }

    #[test]
    fn test_polling_station_above_eligible_voters_threshold_validation() {
        let mut validation_results = ValidationResults::default();
        // test W.206 total admitted voters and total votes cast are not exceeding polling stations number of eligible voters
        let mut polling_station_results = PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 50,
                proxy_certificate_count: 1,
                voter_card_count: 0,
                total_admitted_voters_count: 51, // W.206 should not exceed polling stations eligible voters
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 51,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 51, // W.206 should not exceed polling stations eligible voters
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[51])],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(Some(i64::from(50)));
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W206
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_counts.total_admitted_voters_count",
            ]
        );

        // test W.207 total votes cast count and total admitted voters recount are not exceeding polling stations number of eligible voters
        validation_results = ValidationResults::default();
        polling_station_results.recounted = Some(true);
        polling_station_results.voters_recounts = Some(VotersCounts {
            poll_card_count: 50,
            proxy_certificate_count: 0,
            voter_card_count: 1,
            total_admitted_voters_count: 51, // W.207 should not exceed polling stations eligible voters
        });
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W207
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_recounts.total_admitted_voters_count"
            ]
        );
    }

    #[test]
    fn test_polling_station_identical_counts_validation() {
        let mut validation_results = ValidationResults::default();
        // test W.208 equal input
        let mut polling_station_results = PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                // W.208 equal input
                poll_card_count: 1000,
                proxy_certificate_count: 1,
                voter_card_count: 1,
                total_admitted_voters_count: 1002,
            },
            votes_counts: VotesCounts {
                // W.208 equal input
                votes_candidates_count: 1000,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 1002,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts::zero(),
            political_group_votes: vec![PoliticalGroupVotes::from_test_data_auto(1, &[1000])],
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
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W208
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.voters_counts",
                "polling_station_results.votes_counts"
            ]
        );

        // test W.209 equal input
        validation_results = ValidationResults::default();
        polling_station_results.recounted = Some(true);
        // voters_counts is not equal to votes_counts
        polling_station_results.voters_counts = VotersCounts {
            poll_card_count: 998,
            proxy_certificate_count: 1,
            voter_card_count: 1,
            total_admitted_voters_count: 1000,
        };
        // voters_recounts is now equal to votes_counts: W.209 equal input
        polling_station_results.voters_recounts = Some(VotersCounts {
            poll_card_count: 1000,
            proxy_certificate_count: 1,
            voter_card_count: 1,
            total_admitted_voters_count: 1002,
        });
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"polling_station_results".into(),
            )
            .unwrap();
        assert_eq!(validation_results.errors.len(), 0);
        assert_eq!(validation_results.warnings.len(), 1);
        assert_eq!(
            validation_results.warnings[0].code,
            ValidationResultCode::W209
        );
        assert_eq!(
            validation_results.warnings[0].fields,
            vec![
                "polling_station_results.votes_counts.votes_candidates_count",
                "polling_station_results.votes_counts.blank_votes_count",
                "polling_station_results.votes_counts.invalid_votes_count",
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_recounts.poll_card_count",
                "polling_station_results.voters_recounts.proxy_certificate_count",
                "polling_station_results.voters_recounts.voter_card_count",
                "polling_station_results.voters_recounts.total_admitted_voters_count"
            ]
        );
    }

    #[test]
    fn test_voters_counts_validation() {
        let mut validation_results = ValidationResults::default();
        // test out of range
        let mut voters_counts = VotersCounts {
            poll_card_count: 1_000_000_001, // out of range
            proxy_certificate_count: 2,
            voter_card_count: 3,
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
            voter_card_count: 7,
            total_admitted_voters_count: 20, // F.201 incorrect total
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
                "voters_counts.voter_card_count",
                "voters_counts.total_admitted_voters_count",
            ]
        );
    }

    #[test]
    fn test_votes_counts_validation() {
        let mut validation_results = ValidationResults::default();
        // test out of range
        let mut votes_counts = VotesCounts {
            votes_candidates_count: 1_000_000_001, // out of range
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

        // test F.202 incorrect total
        validation_results = ValidationResults::default();
        votes_counts = VotesCounts {
            votes_candidates_count: 5,
            blank_votes_count: 6,
            invalid_votes_count: 7,
            total_votes_cast_count: 20, // F.202 incorrect total
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
            ValidationResultCode::F202
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec![
                "votes_counts.votes_candidates_count",
                "votes_counts.blank_votes_count",
                "votes_counts.invalid_votes_count",
                "votes_counts.total_votes_cast_count",
            ]
        );

        // test W.201 high number of blank votes
        validation_results = ValidationResults::default();
        votes_counts = VotesCounts {
            votes_candidates_count: 100,
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
            votes_candidates_count: 100,
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
            votes_candidates_count: 0,
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

    #[test]
    fn test_voters_recounts_validation() {
        let mut validation_results = ValidationResults::default();
        // test out of range
        let mut voters_recounts = VotersCounts {
            poll_card_count: 1_000_000_001, // out of range
            proxy_certificate_count: 2,
            voter_card_count: 3,
            total_admitted_voters_count: 1_000_000_006, // correct but out of range
        };
        let election = election_fixture(&[]);
        let polling_station = polling_station_fixture(None);
        let res = voters_recounts.validate(
            &election,
            &polling_station,
            &mut validation_results,
            &"voters_recounts".into(),
        );
        assert!(res.is_err());

        // test F.203 incorrect total
        validation_results = ValidationResults::default();
        voters_recounts = VotersCounts {
            poll_card_count: 5,
            proxy_certificate_count: 6,
            voter_card_count: 7,
            total_admitted_voters_count: 20, // F.203 incorrect total
        };
        voters_recounts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                &"voters_recounts".into(),
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
                "voters_recounts.poll_card_count",
                "voters_recounts.proxy_certificate_count",
                "voters_recounts.voter_card_count",
                "voters_recounts.total_admitted_voters_count",
            ]
        );
    }

    #[test]
    fn test_differences_counts_validation() {
        let mut validation_results = ValidationResults::default();
        // test out of range
        let mut differences_counts = DifferencesCounts {
            more_ballots_count: 1_000_000_002, // correct but out of range
            fewer_ballots_count: 0,
            unreturned_ballots_count: 0,
            too_few_ballots_handed_out_count: 0,
            too_many_ballots_handed_out_count: 1,
            other_explanation_count: 1,
            no_explanation_count: 1_000_000_000, // out of range
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
            more_ballots_count: 1, // W.301 incorrect total
            fewer_ballots_count: 0,
            unreturned_ballots_count: 2,          // W.301 incorrect total
            too_few_ballots_handed_out_count: 0,  // W.301 incorrect total
            too_many_ballots_handed_out_count: 1, // W.301 incorrect total
            other_explanation_count: 0,           // W.301 incorrect total
            no_explanation_count: 0,              // W.301 incorrect total
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
            vec![
                "differences_counts.more_ballots_count",
                "differences_counts.too_many_ballots_handed_out_count",
                "differences_counts.other_explanation_count",
                "differences_counts.no_explanation_count",
                "differences_counts.unreturned_ballots_count",
                "differences_counts.too_few_ballots_handed_out_count"
            ]
        );

        // test W.301 incorrect total
        validation_results = ValidationResults::default();
        differences_counts = DifferencesCounts {
            more_ballots_count: 5, // W.301 incorrect total
            fewer_ballots_count: 0,
            unreturned_ballots_count: 0,          // W.301 incorrect total
            too_few_ballots_handed_out_count: 0,  // W.301 incorrect total
            too_many_ballots_handed_out_count: 1, // W.301 incorrect total
            other_explanation_count: 1,           // W.301 incorrect total
            no_explanation_count: 1,              // W.301 incorrect total
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
            vec![
                "differences_counts.more_ballots_count",
                "differences_counts.too_many_ballots_handed_out_count",
                "differences_counts.other_explanation_count",
                "differences_counts.no_explanation_count",
                "differences_counts.unreturned_ballots_count",
                "differences_counts.too_few_ballots_handed_out_count"
            ]
        );

        // test calculation for fewer_ballots_count does not add up and becomes minus
        validation_results = ValidationResults::default();
        differences_counts = DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 1,               // W.302 incorrect total
            unreturned_ballots_count: 1,          // W.302 incorrect total
            too_few_ballots_handed_out_count: 0,  // W.302 incorrect total
            too_many_ballots_handed_out_count: 2, // W.302 incorrect total
            other_explanation_count: 0,           // W.302 incorrect total
            no_explanation_count: 0,              // W.302 incorrect total
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
            vec![
                "differences_counts.fewer_ballots_count",
                "differences_counts.unreturned_ballots_count",
                "differences_counts.too_few_ballots_handed_out_count",
                "differences_counts.too_many_ballots_handed_out_count",
                "differences_counts.other_explanation_count",
                "differences_counts.no_explanation_count"
            ]
        );

        // test W.302 incorrect total
        validation_results = ValidationResults::default();
        differences_counts = DifferencesCounts {
            more_ballots_count: 0,
            fewer_ballots_count: 5,               // W.302 incorrect total
            unreturned_ballots_count: 1,          // W.302 incorrect total
            too_few_ballots_handed_out_count: 1,  // W.302 incorrect total
            too_many_ballots_handed_out_count: 0, // W.302 incorrect total
            other_explanation_count: 1,           // W.302 incorrect total
            no_explanation_count: 1,              // W.302 incorrect total
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
            vec![
                "differences_counts.fewer_ballots_count",
                "differences_counts.unreturned_ballots_count",
                "differences_counts.too_few_ballots_handed_out_count",
                "differences_counts.too_many_ballots_handed_out_count",
                "differences_counts.other_explanation_count",
                "differences_counts.no_explanation_count"
            ]
        );
    }

    #[test]
    fn test_political_group_votes_validation() {
        let mut validation_results = ValidationResults::default();
        // create a valid political group votes with two groups and two candidates each
        let mut political_group_votes = vec![
            PoliticalGroupVotes {
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
            PoliticalGroupVotes {
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
}
