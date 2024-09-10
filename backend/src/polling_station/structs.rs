use crate::election::Election;
use crate::validation::{
    above_percentage_threshold, ValidationResult, ValidationResultCode, ValidationResults,
};
use crate::APIError;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use std::fmt;
use std::ops::AddAssign;
use utoipa::ToSchema;

#[derive(Debug)]
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
        field_name: String,
    ) -> Result<(), DataError>;
}

/// Polling station of a certain [Election]
#[derive(Serialize, Deserialize, ToSchema, Debug, FromRow, Clone)]
pub struct PollingStation {
    pub id: u32,
    pub election_id: u32,
    pub name: String,
    pub number: i64,
    pub number_of_voters: Option<i64>,
    pub polling_station_type: PollingStationType,
    pub street: String,
    pub house_number: String,
    pub house_number_addition: Option<String>,
    pub postal_code: String,
    pub locality: String,
}

/// Type of Polling station
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, Type)]
pub enum PollingStationType {
    VasteLocatie,
    Bijzonder,
    Mobiel,
}

impl From<String> for PollingStationType {
    fn from(value: String) -> Self {
        match value.as_str() {
            "vaste_locatie" => Self::VasteLocatie,
            "bijzonder" => Self::Bijzonder,
            "mobiel" => Self::Mobiel,
            _ => panic!("invalid PollingStationType"),
        }
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

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct PollingStationResultsEntry {
    pub polling_station_id: u32,
    pub data: PollingStationResults,
}

/// PollingStationResults, following the fields in
/// "Model Na 31-2. Proces-verbaal van een gemeentelijk stembureau/stembureau voor het openbaar lichaam
///  in een gemeente/openbaar lichaam waar een centrale stemopneming wordt verricht"
/// "Bijlage 2: uitkomsten per stembureau"
///  <https://wetten.overheid.nl/BWBR0034180/2023-11-01#Bijlage1_DivisieNa31.2
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PollingStationResults {
    /// Recounted ("Is er herteld? - See form for official long description of the checkbox")
    pub recounted: bool,
    /// Voters counts ("1. Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("2. Aantal getelde stembiljetten")
    pub votes_counts: VotesCounts,
    /// Voters recounts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub voters_recounts: Option<VotersRecounts>,
    /// Differences counts ("3. Verschil tussen het aantal toegelaten kiezers en het aantal getelde stembiljetten")
    pub differences_counts: DifferencesCounts,
    /// Vote counts per list and candidate (5. "Aantal stemmen per lijst en kandidaat")
    pub political_group_votes: Vec<PoliticalGroupVotes>,
}

impl Validate for PollingStationResults {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) -> Result<(), DataError> {
        let total_votes_count = self.votes_counts.total_votes_cast_count;
        let total_voters_count: Count;

        self.votes_counts.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.votes_counts"),
        )?;

        if let Some(voters_recounts) = &self.voters_recounts {
            // if recounted = true
            total_voters_count = voters_recounts.total_admitted_voters_recount;
            voters_recounts.validate(
                election,
                polling_station,
                validation_results,
                format!("{field_name}.voters_recounts"),
            )?;

            // W.209 validate that the numbers in voters_recounts and votes_counts are not the same
            if identical_voters_recounts_and_votes_counts(voters_recounts, &self.votes_counts) {
                validation_results.warnings.push(ValidationResult {
                    fields: vec![
                        format!("{field_name}.votes_counts.votes_candidates_counts"),
                        format!("{field_name}.votes_counts.blank_votes_count"),
                        format!("{field_name}.votes_counts.invalid_votes_count"),
                        format!("{field_name}.votes_counts.total_votes_cast_count"),
                        format!("{field_name}.voters_recounts.poll_card_recount"),
                        format!("{field_name}.voters_recounts.proxy_certificate_recount"),
                        format!("{field_name}.voters_recounts.voter_card_recount"),
                        format!("{field_name}.voters_recounts.total_admitted_voters_recount"),
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
                format!("{field_name}.voters_counts"),
            )?;

            // W.208 validate that the numbers in voters_counts and votes_counts are not the same
            if identical_voters_counts_and_votes_counts(&self.voters_counts, &self.votes_counts) {
                validation_results.warnings.push(ValidationResult {
                    fields: vec![
                        format!("{field_name}.voters_counts"),
                        format!("{field_name}.votes_counts"),
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
                    format!("{field_name}.votes_counts.total_votes_cast_count"),
                    if self.recounted {
                        format!("{field_name}.voters_recounts.total_admitted_voters_recount")
                    } else {
                        format!("{field_name}.voters_counts.total_admitted_voters_count")
                    },
                ],
                code: if self.recounted {
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
                fields.append(&mut vec![format!(
                    "{field_name}.votes_counts.total_votes_cast_count"
                )])
            }
            if i64::from(total_voters_count) > number_of_voters {
                fields.append(&mut vec![if self.recounted {
                    format!("{field_name}.voters_recounts.total_admitted_voters_recount")
                } else {
                    format!("{field_name}.voters_counts.total_admitted_voters_count")
                }])
            }
            if !fields.is_empty() {
                validation_results.warnings.push(ValidationResult {
                    fields,
                    code: if self.recounted {
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
                    fields: vec![format!(
                        "{field_name}.differences_counts.more_ballots_count"
                    )],
                    code: ValidationResultCode::F301,
                });
            }
            // F.302 validate that fewer ballots counted is empty
            if self.differences_counts.fewer_ballots_count != 0 {
                validation_results.errors.push(ValidationResult {
                    fields: vec![format!(
                        "{field_name}.differences_counts.fewer_ballots_count"
                    )],
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
                    fields: vec![format!(
                        "{field_name}.differences_counts.fewer_ballots_count"
                    )],
                    code: ValidationResultCode::F303,
                });
            }
            // F.304 validate that more ballots counted is empty
            if self.differences_counts.more_ballots_count != 0 {
                validation_results.errors.push(ValidationResult {
                    fields: vec![format!(
                        "{field_name}.differences_counts.more_ballots_count"
                    )],
                    code: ValidationResultCode::F304,
                });
            }
        }

        // F.305 validate that no differences should be filled in when there is no difference in the totals
        if total_voters_count == total_votes_count {
            let mut fields = vec![];
            if self.differences_counts.more_ballots_count != 0 {
                fields.append(&mut vec![format!(
                    "{field_name}.differences_counts.more_ballots_count"
                )])
            }
            if self.differences_counts.fewer_ballots_count != 0 {
                fields.append(&mut vec![format!(
                    "{field_name}.differences_counts.fewer_ballots_count"
                )])
            }
            if self.differences_counts.unreturned_ballots_count != 0 {
                fields.append(&mut vec![format!(
                    "{field_name}.differences_counts.unreturned_ballots_count"
                )])
            }
            if self.differences_counts.too_few_ballots_handed_out_count != 0 {
                fields.append(&mut vec![format!(
                    "{field_name}.differences_counts.too_few_ballots_handed_out_count"
                )])
            }
            if self.differences_counts.too_many_ballots_handed_out_count != 0 {
                fields.append(&mut vec![format!(
                    "{field_name}.differences_counts.too_many_ballots_handed_out_count"
                )])
            }
            if self.differences_counts.other_explanation_count != 0 {
                fields.append(&mut vec![format!(
                    "{field_name}.differences_counts.other_explanation_count"
                )])
            }
            if self.differences_counts.no_explanation_count != 0 {
                fields.append(&mut vec![format!(
                    "{field_name}.differences_counts.no_explanation_count"
                )])
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
            format!("{field_name}.differences_counts"),
        )?;

        self.political_group_votes.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.political_group_votes"),
        )?;

        // F.204 validate that the total number of valid votes is equal to the sum of all political group totals
        if self.votes_counts.votes_candidates_counts as u64
            != self
                .political_group_votes
                .iter()
                .map(|pgv| pgv.total as u64)
                .sum::<u64>()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.votes_counts.votes_candidates_counts"),
                    format!("{field_name}.political_group_votes"),
                ],
                code: ValidationResultCode::F204,
            });
        }
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PollingStationStatusEntry {
    pub id: u32,
    pub status: PollingStationStatus,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, sqlx::Type, Eq, PartialEq)]
pub enum PollingStationStatus {
    Incomplete,
    Complete,
}

pub type Count = u32;

impl Validate for Count {
    fn validate(
        &self,
        _election: &Election,
        _polling_station: &PollingStation,
        _validation_results: &mut ValidationResults,
        _field_name: String,
    ) -> Result<(), DataError> {
        if self > &999_999_999 {
            return Err(DataError::new("count out of range"));
        }
        Ok(())
    }
}

/// Voters counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotersCounts {
    /// Number of valid poll cards ("Aantal geldige stempassen")
    #[schema(value_type = u32)]
    pub poll_card_count: Count,
    /// Number of valid proxy certificates ("Aantal geldige volmachtbewijzen")
    #[schema(value_type = u32)]
    pub proxy_certificate_count: Count,
    /// Number of valid voter cards ("Aantal geldige kiezerspassen")
    #[schema(value_type = u32)]
    pub voter_card_count: Count,
    /// Total number of admitted voters ("Totaal aantal toegelaten kiezers")
    #[schema(value_type = u32)]
    pub total_admitted_voters_count: Count,
}

impl AddAssign<&VotersCounts> for VotersCounts {
    fn add_assign(&mut self, other: &Self) {
        self.poll_card_count += other.poll_card_count;
        self.proxy_certificate_count += other.proxy_certificate_count;
        self.voter_card_count += other.voter_card_count;
        self.total_admitted_voters_count += other.total_admitted_voters_count;
    }
}

/// Check if all voters counts and votes counts are equal to zero.
/// Used in validations where this is an edge case that needs to be handled.
fn all_zero_voters_counts_and_votes_counts(voters: &VotersCounts, votes: &VotesCounts) -> bool {
    voters.poll_card_count == 0
        && voters.proxy_certificate_count == 0
        && voters.voter_card_count == 0
        && voters.total_admitted_voters_count == 0
        && votes.votes_candidates_counts == 0
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
        && voters.poll_card_count == votes.votes_candidates_counts
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
        field_name: String,
    ) -> Result<(), DataError> {
        // validate all counts
        self.poll_card_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.poll_card_count"),
        )?;
        self.proxy_certificate_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.proxy_certificate_count"),
        )?;
        self.voter_card_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.voter_card_count"),
        )?;
        self.total_admitted_voters_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.total_admitted_voters_count"),
        )?;

        // F.201 validate that total_admitted_voters_count == poll_card_count + proxy_certificate_count + voter_card_count
        if self.poll_card_count + self.proxy_certificate_count + self.voter_card_count
            != self.total_admitted_voters_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.poll_card_count"),
                    format!("{field_name}.proxy_certificate_count"),
                    format!("{field_name}.voter_card_count"),
                    format!("{field_name}.total_admitted_voters_count"),
                ],
                code: ValidationResultCode::F201,
            });
        }
        Ok(())
    }
}

/// Votes counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotesCounts {
    /// Number of valid votes on candidates
    /// ("Aantal stembiljetten met een geldige stem op een kandidaat")
    #[schema(value_type = u32)]
    pub votes_candidates_counts: Count,
    /// Number of blank votes ("Aantal blanco stembiljetten")
    #[schema(value_type = u32)]
    pub blank_votes_count: Count,
    /// Number of invalid votes ("Aantal ongeldige stembiljetten")
    #[schema(value_type = u32)]
    pub invalid_votes_count: Count,
    /// Total number of votes cast ("Totaal aantal getelde stemmen")
    #[schema(value_type = u32)]
    pub total_votes_cast_count: Count,
}

impl AddAssign<&VotesCounts> for VotesCounts {
    fn add_assign(&mut self, other: &Self) {
        self.votes_candidates_counts += other.votes_candidates_counts;
        self.blank_votes_count += other.blank_votes_count;
        self.invalid_votes_count += other.invalid_votes_count;
        self.total_votes_cast_count += other.total_votes_cast_count;
    }
}

impl Validate for VotesCounts {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) -> Result<(), DataError> {
        // validate all counts
        self.votes_candidates_counts.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.votes_candidates_counts"),
        )?;
        self.blank_votes_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.blank_votes_count"),
        )?;
        self.invalid_votes_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.invalid_votes_count"),
        )?;
        self.total_votes_cast_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.total_votes_cast_count"),
        )?;

        // F.202 validate that total_votes_cast_count == votes_candidates_counts + blank_votes_count + invalid_votes_count
        if self.votes_candidates_counts + self.blank_votes_count + self.invalid_votes_count
            != self.total_votes_cast_count
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.votes_candidates_counts"),
                    format!("{field_name}.blank_votes_count"),
                    format!("{field_name}.invalid_votes_count"),
                    format!("{field_name}.total_votes_cast_count"),
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
                fields: vec![format!("{field_name}.blank_votes_count")],
                code: ValidationResultCode::W201,
            });
        }

        // W.202 validate that number of invalid votes is no more than 3%
        if above_percentage_threshold(self.invalid_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![format!("{field_name}.invalid_votes_count")],
                code: ValidationResultCode::W202,
            });
        }

        // W.205 validate that total number of votes cast is not 0
        if self.total_votes_cast_count == 0 {
            validation_results.warnings.push(ValidationResult {
                fields: vec![format!("{field_name}.total_votes_cast_count")],
                code: ValidationResultCode::W205,
            });
        }
        Ok(())
    }
}

/// Voters recounts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotersRecounts {
    /// Number of valid poll cards ("Aantal geldige stempassen")
    #[schema(value_type = u32)]
    pub poll_card_recount: Count,
    /// Number of valid proxy certificates ("Aantal geldige volmachtbewijzen")
    #[schema(value_type = u32)]
    pub proxy_certificate_recount: Count,
    /// Number of valid voter cards ("Aantal geldige kiezerspassen")
    #[schema(value_type = u32)]
    pub voter_card_recount: Count,
    /// Total number of admitted voters ("Totaal aantal toegelaten kiezers")
    #[schema(value_type = u32)]
    pub total_admitted_voters_recount: Count,
}

/// Check if all voters recounts and votes counts are equal to zero.
/// Used in validations where this is an edge case that needs to be handled.
fn all_zero_voters_recounts_and_votes_counts(voters: &VotersRecounts, votes: &VotesCounts) -> bool {
    voters.poll_card_recount == 0
        && voters.proxy_certificate_recount == 0
        && voters.voter_card_recount == 0
        && voters.total_admitted_voters_recount == 0
        && votes.votes_candidates_counts == 0
        && votes.blank_votes_count == 0
        && votes.invalid_votes_count == 0
        && votes.total_votes_cast_count == 0
}

/// Check if the voters recounts and votes counts are identical, which should result in a warning.
///
/// This is not implemented as Eq because there is no true equality relation
/// between these two sets of numbers.
fn identical_voters_recounts_and_votes_counts(
    voters: &VotersRecounts,
    votes: &VotesCounts,
) -> bool {
    !all_zero_voters_recounts_and_votes_counts(voters, votes)
        && voters.poll_card_recount == votes.votes_candidates_counts
        && voters.proxy_certificate_recount == votes.blank_votes_count
        && voters.voter_card_recount == votes.invalid_votes_count
        && voters.total_admitted_voters_recount == votes.total_votes_cast_count
}

impl Validate for VotersRecounts {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) -> Result<(), DataError> {
        // validate all counts
        self.poll_card_recount.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.poll_card_recount"),
        )?;
        self.proxy_certificate_recount.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.proxy_certificate_recount"),
        )?;
        self.voter_card_recount.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.voter_card_recount"),
        )?;
        self.total_admitted_voters_recount.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.total_admitted_voters_recount"),
        )?;

        // F.203 validate that total_admitted_voters_recount == poll_card_recount + proxy_certificate_recount + voter_card_recount
        if self.poll_card_recount + self.proxy_certificate_recount + self.voter_card_recount
            != self.total_admitted_voters_recount
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    format!("{field_name}.poll_card_recount"),
                    format!("{field_name}.proxy_certificate_recount"),
                    format!("{field_name}.voter_card_recount"),
                    format!("{field_name}.total_admitted_voters_recount"),
                ],
                code: ValidationResultCode::F203,
            });
        }
        Ok(())
    }
}

/// Differences counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DifferencesCounts {
    /// Number of more counted ballots ("Er zijn méér stembiljetten geteld. Hoeveel stembiljetten zijn er meer geteld?")
    #[schema(value_type = u32)]
    pub more_ballots_count: Count,
    /// Number of fewer counted ballots ("Er zijn minder stembiljetten geteld. Hoeveel stembiljetten zijn er minder geteld")
    #[schema(value_type = u32)]
    pub fewer_ballots_count: Count,
    /// Number of unreturned ballots ("Hoe vaak heeft een kiezer het stembiljet niet ingeleverd?")
    #[schema(value_type = u32)]
    pub unreturned_ballots_count: Count,
    /// Number of fewer ballots handed out ("Hoe vaak is er een stembiljet te weinig uitgereikt?")
    #[schema(value_type = u32)]
    pub too_few_ballots_handed_out_count: Count,
    /// Number of more ballots handed out ("Hoe vaak is er een stembiljet te veel uitgereikt?")
    #[schema(value_type = u32)]
    pub too_many_ballots_handed_out_count: Count,
    /// Number of other explanations ("Hoe vaak is er een andere verklaring voor het verschil?")
    #[schema(value_type = u32)]
    pub other_explanation_count: Count,
    /// Number of no explanations ("Hoe vaak is er geen verklaring voor het verschil?")
    #[schema(value_type = u32)]
    pub no_explanation_count: Count,
}

impl Validate for DifferencesCounts {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) -> Result<(), DataError> {
        // validate all counts
        self.more_ballots_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.more_ballots_count"),
        )?;
        self.fewer_ballots_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.fewer_ballots_count"),
        )?;
        self.unreturned_ballots_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.unreturned_ballots_count"),
        )?;
        self.too_few_ballots_handed_out_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.too_few_ballots_handed_out_count"),
        )?;
        self.too_many_ballots_handed_out_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.too_many_ballots_handed_out_count"),
        )?;
        self.other_explanation_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.other_explanation_count"),
        )?;
        self.no_explanation_count.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.no_explanation_count"),
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
                    format!("{field_name}.more_ballots_count"),
                    format!("{field_name}.too_many_ballots_handed_out_count"),
                    format!("{field_name}.other_explanation_count"),
                    format!("{field_name}.no_explanation_count"),
                    format!("{field_name}.unreturned_ballots_count"),
                    format!("{field_name}.too_few_ballots_handed_out_count"),
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
                    format!("{field_name}.fewer_ballots_count"),
                    format!("{field_name}.unreturned_ballots_count"),
                    format!("{field_name}.too_few_ballots_handed_out_count"),
                    format!("{field_name}.too_many_ballots_handed_out_count"),
                    format!("{field_name}.other_explanation_count"),
                    format!("{field_name}.no_explanation_count"),
                ],
                code: ValidationResultCode::W302,
            });
        }
        Ok(())
    }
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PoliticalGroupVotes {
    pub number: u8,
    #[schema(value_type = u32)]
    pub total: Count,
    pub candidate_votes: Vec<CandidateVotes>,
}

impl PoliticalGroupVotes {
    pub fn add(&mut self, other: &Self) -> Result<(), APIError> {
        if self.number != other.number {
            return Err(APIError::AddError(format!(
                "Attempted to add votes of group '{}' to '{}'",
                other.number, self.number
            )));
        }

        self.total += other.total;

        for cv in other.candidate_votes.iter() {
            let Some(found_can) = self
                .candidate_votes
                .iter_mut()
                .find(|c| c.number == cv.number)
            else {
                return Err(APIError::AddError(format!("Attempted to add candidate '{}' votes in group '{}', but no such candidate exists", cv.number, self.number)));
            };
            found_can.votes += cv.votes;
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
        field_name: String,
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
                format!("{field_name}[{i}]"),
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
        field_name: String,
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
                format!("{field_name}.candidate_votes[{i}]"),
            )?;
        }

        // validate the total number of votes
        self.total.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.total"),
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
                fields: vec![format!("{field_name}")],
                code: ValidationResultCode::F401,
            });
        }
        Ok(())
    }
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct CandidateVotes {
    pub number: u8,
    #[schema(value_type = u32)]
    pub votes: Count,
}

impl Validate for CandidateVotes {
    fn validate(
        &self,
        election: &Election,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        field_name: String,
    ) -> Result<(), DataError> {
        self.votes.validate(
            election,
            polling_station,
            validation_results,
            format!("{field_name}.votes"),
        )
    }
}

#[cfg(test)]
mod tests {
    use crate::election::tests::election_fixture;

    use super::*;

    /// Create a test polling station.
    pub fn polling_station_fixture(number_of_voters: Option<i64>) -> PollingStation {
        PollingStation {
            id: 1,
            election_id: election_fixture(&[]).id,
            name: "Testplek".to_string(),
            number: 34,
            number_of_voters,
            polling_station_type: PollingStationType::Bijzonder,
            street: "Teststraat".to_string(),
            house_number: "2".to_string(),
            house_number_addition: Some("b".to_string()),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        }
    }

    #[test]
    fn test_polling_station_results_incorrect_total_and_difference_validation() {
        // test F.201 incorrect total, F.202 incorrect total, F.301 incorrect difference & W.203 above threshold in absolute numbers
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 29,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 35, // F.201 incorrect total & W.203 above threshold in absolute numbers
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 44,
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
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 44,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 44,
                }],
            }],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(None);
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
                "polling_station_results.votes_counts.votes_candidates_counts",
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
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 100,
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
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 100,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 100,
                }],
            }],
        };
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
            recounted: true,
            voters_counts: VotersCounts {
                poll_card_count: 1,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 5, // F.201 incorrect total & W.204 above threshold in percentage
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 3,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 6, // F.202 incorrect total & W.204 above threshold in percentage
            },
            voters_recounts: Some(VotersRecounts {
                poll_card_recount: 1,
                proxy_certificate_recount: 2,
                voter_card_recount: 3,
                total_admitted_voters_recount: 5, // F.203 incorrect total
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
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 3,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 3,
                }],
            }],
        };
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
                "polling_station_results.votes_counts.votes_candidates_counts",
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
                "polling_station_results.voters_recounts.poll_card_recount",
                "polling_station_results.voters_recounts.proxy_certificate_recount",
                "polling_station_results.voters_recounts.voter_card_recount",
                "polling_station_results.voters_recounts.total_admitted_voters_recount",
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
                "polling_station_results.voters_recounts.total_admitted_voters_recount"
            ]
        );

        // test F.303 incorrect difference, F.304 should be empty & W.204 above threshold in absolute numbers
        validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: true,
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 105,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 101,
                blank_votes_count: 2,
                invalid_votes_count: 2,
                total_votes_cast_count: 105, // W.204 above threshold in absolute numbers
            },
            voters_recounts: Some(VotersRecounts {
                poll_card_recount: 115,
                proxy_certificate_recount: 2,
                voter_card_recount: 3,
                total_admitted_voters_recount: 120, // W.204 above threshold in absolute numbers
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
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 101,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 101,
                }],
            }],
        };
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
                "polling_station_results.voters_recounts.total_admitted_voters_recount"
            ]
        );
    }

    #[test]
    fn test_polling_station_results_wrong_and_no_difference_validation() {
        // test F.304 should be empty & W.203 above threshold in percentage
        let mut validation_results = ValidationResults::default();
        let polling_station_results = PollingStationResults {
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 50,
                proxy_certificate_count: 2,
                voter_card_count: 4,
                total_admitted_voters_count: 56, // W.203 above threshold in percentage
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 50,
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
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 50,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 50,
                }],
            }],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(None);
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 46,
                proxy_certificate_count: 2,
                voter_card_count: 4,
                total_admitted_voters_count: 52,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 50,
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
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 50,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 50,
                }],
            }],
        };
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
            recounted: true,
            voters_counts: VotersCounts {
                poll_card_count: 50,
                proxy_certificate_count: 2,
                voter_card_count: 4,
                total_admitted_voters_count: 56,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 50,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 52,
            },
            voters_recounts: Some(VotersRecounts {
                poll_card_recount: 46,
                proxy_certificate_recount: 2,
                voter_card_recount: 4,
                total_admitted_voters_recount: 52,
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
                "polling_station_results".to_string(),
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
                "polling_station_results.votes_counts.votes_candidates_counts",
                "polling_station_results.political_group_votes"
            ]
        );
    }

    #[test]
    fn test_polling_station_above_eligible_voters_threshold_validation() {
        let mut validation_results = ValidationResults::default();
        // test W.206 total admitted voters and total votes cast are not exceeding polling stations number of eligible voters
        let mut polling_station_results = PollingStationResults {
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 50,
                proxy_certificate_count: 1,
                voter_card_count: 0,
                total_admitted_voters_count: 51, // W.206 should not exceed polling stations eligible voters
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 51,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 51, // W.206 should not exceed polling stations eligible voters
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 51,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 51,
                }],
            }],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(Some(i64::from(50)));
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
        polling_station_results.recounted = true;
        polling_station_results.voters_recounts = Some(VotersRecounts {
            poll_card_recount: 50,
            proxy_certificate_recount: 0,
            voter_card_recount: 1,
            total_admitted_voters_recount: 51, // W.207 should not exceed polling stations eligible voters
        });
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
                "polling_station_results.voters_recounts.total_admitted_voters_recount"
            ]
        );
    }

    #[test]
    fn test_polling_station_identical_counts_validation() {
        let mut validation_results = ValidationResults::default();
        // test W.208 equal input
        let mut polling_station_results = PollingStationResults {
            recounted: false,
            voters_counts: VotersCounts {
                // W.208 equal input
                poll_card_count: 1000,
                proxy_certificate_count: 1,
                voter_card_count: 1,
                total_admitted_voters_count: 1002,
            },
            votes_counts: VotesCounts {
                // W.208 equal input
                votes_candidates_counts: 1000,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 1002,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 1000,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 1000,
                }],
            }],
        };
        let election = election_fixture(&[1]);
        let polling_station = polling_station_fixture(None);
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
        polling_station_results.recounted = true;
        // voters_counts is not equal to votes_counts
        polling_station_results.voters_counts = VotersCounts {
            poll_card_count: 998,
            proxy_certificate_count: 1,
            voter_card_count: 1,
            total_admitted_voters_count: 1000,
        };
        // voters_recounts is now equal to votes_counts: W.209 equal input
        polling_station_results.voters_recounts = Some(VotersRecounts {
            poll_card_recount: 1000,
            proxy_certificate_recount: 1,
            voter_card_recount: 1,
            total_admitted_voters_recount: 1002,
        });
        polling_station_results
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "polling_station_results".to_string(),
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
                "polling_station_results.votes_counts.votes_candidates_counts",
                "polling_station_results.votes_counts.blank_votes_count",
                "polling_station_results.votes_counts.invalid_votes_count",
                "polling_station_results.votes_counts.total_votes_cast_count",
                "polling_station_results.voters_recounts.poll_card_recount",
                "polling_station_results.voters_recounts.proxy_certificate_recount",
                "polling_station_results.voters_recounts.voter_card_recount",
                "polling_station_results.voters_recounts.total_admitted_voters_recount"
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
            "voters_counts".to_string(),
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
                "voters_counts".to_string(),
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
            votes_candidates_counts: 1_000_000_001, // out of range
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
            "votes_counts".to_string(),
        );
        assert!(res.is_err());

        // test F.202 incorrect total
        validation_results = ValidationResults::default();
        votes_counts = VotesCounts {
            votes_candidates_counts: 5,
            blank_votes_count: 6,
            invalid_votes_count: 7,
            total_votes_cast_count: 20, // F.202 incorrect total
        };
        votes_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "votes_counts".to_string(),
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
                "votes_counts.votes_candidates_counts",
                "votes_counts.blank_votes_count",
                "votes_counts.invalid_votes_count",
                "votes_counts.total_votes_cast_count",
            ]
        );

        // test W.201 high number of blank votes
        validation_results = ValidationResults::default();
        votes_counts = VotesCounts {
            votes_candidates_counts: 100,
            blank_votes_count: 10, // W.201 above threshold
            invalid_votes_count: 1,
            total_votes_cast_count: 111,
        };
        votes_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "votes_counts".to_string(),
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
            votes_candidates_counts: 100,
            blank_votes_count: 1,
            invalid_votes_count: 10, // W.202 above threshold
            total_votes_cast_count: 111,
        };
        votes_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "votes_counts".to_string(),
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
            votes_candidates_counts: 0,
            blank_votes_count: 0,
            invalid_votes_count: 0,
            total_votes_cast_count: 0, // W.205 should not be zero
        };
        votes_counts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "votes_counts".to_string(),
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
        let mut voters_recounts = VotersRecounts {
            poll_card_recount: 1_000_000_001, // out of range
            proxy_certificate_recount: 2,
            voter_card_recount: 3,
            total_admitted_voters_recount: 1_000_000_006, // correct but out of range
        };
        let election = election_fixture(&[]);
        let polling_station = polling_station_fixture(None);
        let res = voters_recounts.validate(
            &election,
            &polling_station,
            &mut validation_results,
            "voters_recounts".to_string(),
        );
        assert!(res.is_err());

        // test F.203 incorrect total
        validation_results = ValidationResults::default();
        voters_recounts = VotersRecounts {
            poll_card_recount: 5,
            proxy_certificate_recount: 6,
            voter_card_recount: 7,
            total_admitted_voters_recount: 20, // F.203 incorrect total
        };
        voters_recounts
            .validate(
                &election,
                &polling_station,
                &mut validation_results,
                "voters_recounts".to_string(),
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
                "voters_recounts.poll_card_recount",
                "voters_recounts.proxy_certificate_recount",
                "voters_recounts.voter_card_recount",
                "voters_recounts.total_admitted_voters_recount",
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
            "differences_counts".to_string(),
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
                "differences_counts".to_string(),
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
                "differences_counts".to_string(),
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
                "differences_counts".to_string(),
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
                "differences_counts".to_string(),
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
            "political_group_votes".to_string(),
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
                "political_group_votes".to_string(),
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
            "political_group_votes".to_string(),
        );
        assert!(res.is_err());

        // validate with incorrect number of political groups
        validation_results = ValidationResults::default();
        election = election_fixture(&[2, 2, 2]);
        let res = political_group_votes.validate(
            &election,
            &polling_station,
            &mut validation_results,
            "political_group_votes".to_string(),
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
            "political_group_votes".to_string(),
        );
        assert!(res.is_err());
    }

    #[test]
    fn test_votes_addition() {
        let mut curr_votes = VotesCounts {
            votes_candidates_counts: 2,
            blank_votes_count: 3,
            invalid_votes_count: 4,
            total_votes_cast_count: 9,
        };

        curr_votes += &VotesCounts {
            votes_candidates_counts: 1,
            blank_votes_count: 2,
            invalid_votes_count: 3,
            total_votes_cast_count: 5,
        };

        assert_eq!(curr_votes.votes_candidates_counts, 3);
        assert_eq!(curr_votes.blank_votes_count, 5);
        assert_eq!(curr_votes.invalid_votes_count, 7);
        assert_eq!(curr_votes.total_votes_cast_count, 14);
    }

    #[test]
    fn test_voters_addition() {
        let mut curr_votes = VotersCounts {
            poll_card_count: 2,
            proxy_certificate_count: 3,
            voter_card_count: 4,
            total_admitted_voters_count: 9,
        };

        curr_votes += &VotersCounts {
            poll_card_count: 1,
            proxy_certificate_count: 2,
            voter_card_count: 3,
            total_admitted_voters_count: 5,
        };

        assert_eq!(curr_votes.poll_card_count, 3);
        assert_eq!(curr_votes.proxy_certificate_count, 5);
        assert_eq!(curr_votes.voter_card_count, 7);
        assert_eq!(curr_votes.total_admitted_voters_count, 14);
    }
}
