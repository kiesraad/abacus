use std::fmt;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use super::{
    CSOFirstSessionResults, CandidateVotes, Count, CountingDifferencesPollingStation,
    DifferencesCounts, ExtraInvestigation, PoliticalGroupCandidateVotes, VotersCounts, VotesCounts,
    comparison::Compare,
    status::{DataEntryStatus, FirstEntryInProgress},
};
use crate::{
    data_entry::{PoliticalGroupTotalVotes, PollingStationResults, status::FirstEntryHasErrors},
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
    /// CSO: 'Extra onderzoek B1-1': één van beide vragen is beantwoord, en de andere niet
    F101,
    /// CSO: 'Extra onderzoek B1-1': meerdere antwoorden op 1 van de vragen
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
    F301,
    F302,
    F303,
    F304,
    F305,
    /// CSO: 'Kandidaten en lijsttotalen': Er zijn stemmen op kandidaten, en het totaal aantal stemmen op een lijst = leeg of 0
    F401,
    /// CSO: 'Kandidaten en lijsttotalen': Totaal aantal stemmen op een lijst <> som van aantal stemmen op de kandidaten van die lijst (Als totaal aantal stemmen op een lijst niet leeg of 0 is)
    F402,
    /// CSO: 'Kandidaten en lijsttotalen': Totaal aantal stemmen op een lijst komt niet overeen met het lijsttotaal van corresponderende E.x
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

/// Validate that a value is equal to or above a certain percentage threshold of the total,
/// using only integers to avoid floating point arithmetic issues.
/// The threshold is calculated as the percentage of the total, rounded up.
/// For example, if the total is 101 and the percentage is 10, the threshold is 11.
fn above_percentage_threshold(value: u32, total: u32, percentage: u8) -> bool {
    if value == 0 && total == 0 {
        false
    } else {
        let threshold = (total as u64 * percentage as u64).div_ceil(100);
        value as u64 >= threshold
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
                        context: None,
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
        match self {
            PollingStationResults::CSOFirstSession(results) => {
                results.validate(election, polling_station, validation_results, path)
            }
        }
    }
}

impl Validate for CSOFirstSessionResults {
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

        if difference_admitted_voters_count_and_votes_cast_count_above_threshold(
            total_voters_count,
            total_votes_count,
        ) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![
                    voters_counts_path
                        .field("total_admitted_voters_count")
                        .to_string(),
                    votes_counts_path
                        .field("total_votes_cast_count")
                        .to_string(),
                ],
                code: ValidationResultCode::W203,
                context: None,
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
                    context: None,
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
                    context: None,
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
                    context: None,
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
                    context: None,
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
                    context: None,
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

        for (i, pgcv) in self.political_group_votes.iter().enumerate() {
            let pgtv = self
                .votes_counts
                .political_group_total_votes
                .iter()
                .find(|pgtv| pgtv.number == pgcv.number)
                .expect("political group total votes should exist");

            if pgcv.total != pgtv.total {
                validation_results.errors.push(ValidationResult {
                    fields: vec![
                        path.field("political_group_votes")
                            .index(i)
                            .field("total")
                            .to_string(),
                    ],
                    code: ValidationResultCode::F403,
                    context: Some(ValidationResultContext {
                        political_group_number: Some(pgcv.number),
                    }),
                });
            }
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
                context: None,
            });
        }
        if self.extra_investigation_other_reason.is_invalid()
            || self.ballots_recounted_extra_investigation.is_invalid()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F102,
                context: None,
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
                context: None,
            });
        }
        if self.unexplained_difference_ballots_voters.is_invalid()
            || self.difference_ballots_per_list.is_invalid()
        {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F112,
                context: None,
            });
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

        if self.poll_card_count + self.proxy_certificate_count != self.total_admitted_voters_count {
            validation_results.errors.push(ValidationResult {
                fields: vec![
                    path.field("poll_card_count").to_string(),
                    path.field("proxy_certificate_count").to_string(),
                    path.field("total_admitted_voters_count").to_string(),
                ],
                code: ValidationResultCode::F201,
                context: None,
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

        let political_group_total_votes_sum: u64 = self
            .political_group_total_votes
            .iter()
            .map(|pgv| pgv.total as u64)
            .sum::<u64>();
        if political_group_total_votes_sum != self.total_votes_candidates_count as u64 {
            let mut fields: Vec<String> = self
                .political_group_total_votes
                .iter()
                .enumerate()
                .map(|(i, _)| {
                    path.field("political_group_total_votes")
                        .index(i)
                        .field("total")
                        .to_string()
                })
                .collect();
            fields.push(path.field("total_votes_candidates_count").to_string());

            validation_results.errors.push(ValidationResult {
                fields,
                code: ValidationResultCode::F202,
                context: None,
            });
        }

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
                context: None,
            });
        }

        if above_percentage_threshold(self.blank_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("blank_votes_count").to_string()],
                code: ValidationResultCode::W201,
                context: None,
            });
        }

        if above_percentage_threshold(self.invalid_votes_count, self.total_votes_cast_count, 3) {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("invalid_votes_count").to_string()],
                code: ValidationResultCode::W202,
                context: None,
            });
        }

        if self.total_votes_cast_count == 0 {
            validation_results.warnings.push(ValidationResult {
                fields: vec![path.field("total_votes_cast_count").to_string()],
                code: ValidationResultCode::W204,
                context: None,
            });
        }
        Ok(())
    }
}

impl Validate for Vec<PoliticalGroupTotalVotes> {
    fn validate(
        &self,
        election: &ElectionWithPoliticalGroups,
        polling_station: &PollingStation,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
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

            pgv.total.validate(
                election,
                polling_station,
                validation_results,
                &path.index(i).field("total"),
            )?;
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
            validation_results.errors.push(ValidationResult {
                fields: vec![path.field("total").to_string()],
                code: ValidationResultCode::F401,
                context: Some(ValidationResultContext {
                    political_group_number: Some(self.number),
                }),
            });
        }

        if self.total != 0 && self.total as u64 != candidate_votes_sum {
            validation_results.errors.push(ValidationResult {
                fields: vec![path.to_string()],
                code: ValidationResultCode::F402,
                context: Some(ValidationResultContext {
                    political_group_number: Some(self.number),
                }),
            });
        }
        Ok(())
    }
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

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::{
        data_entry::{
            DifferenceCountsCompareVotesCastAdmittedVoters, PoliticalGroupTotalVotes, YesNo,
            tests::ValidDefault,
        },
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
                    context: None,
                }]
            );

            let validation_results = validate(false, false, false, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F101,
                    fields: vec!["extra_investigation".into()],
                    context: None,
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
                    context: None,
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
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F102,
                        fields: vec!["extra_investigation".into()],
                        context: None,
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
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F102,
                        fields: vec!["extra_investigation".into()],
                        context: None,
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
                    context: None,
                }]
            );

            let validation_results = validate(false, false, false, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F111,
                    fields: vec!["counting_differences_polling_station".into()],
                    context: None,
                }]
            );

            let validation_results = validate(false, false, false, false)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F111,
                    fields: vec!["counting_differences_polling_station".into()],
                    context: None,
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
                    context: None,
                }]
            );

            let validation_results = validate(false, true, true, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F112,
                    fields: vec!["counting_differences_polling_station".into()],
                    context: None,
                }]
            );

            let validation_results = validate(true, true, true, true)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F112,
                    fields: vec!["counting_differences_polling_station".into()],
                    context: None,
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
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F112,
                        fields: vec!["counting_differences_polling_station".into()],
                        context: None,
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

    mod voters_counts {
        use crate::{
            data_entry::{
                DataError, Validate, ValidationResult, ValidationResultCode, ValidationResults,
                VotersCounts,
            },
            election::tests::election_fixture,
            polling_station::structs::tests::polling_station_fixture,
        };

        fn validate(
            poll_card_count: u32,
            proxy_certificate_count: u32,
            total_admitted_voters_count: u32,
        ) -> Result<ValidationResults, DataError> {
            let voters_counts = VotersCounts {
                poll_card_count,
                proxy_certificate_count,
                total_admitted_voters_count,
            };

            let mut validation_results = ValidationResults::default();
            voters_counts.validate(
                &election_fixture(&[]),
                &polling_station_fixture(None),
                &mut validation_results,
                &"voters_counts".into(),
            )?;

            Ok(validation_results)
        }

        /// CSO/DSO | F.201: 'Aantal kiezers en stemmen': stempassen + volmachten <> totaal toegelaten kiezers
        #[test]
        fn test_f201() -> Result<(), DataError> {
            let validation_results = validate(100, 50, 150)?;
            assert!(validation_results.errors.is_empty());

            let validation_results = validate(100, 150, 151)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F201,
                    fields: vec![
                        "voters_counts.poll_card_count".into(),
                        "voters_counts.proxy_certificate_count".into(),
                        "voters_counts.total_admitted_voters_count".into()
                    ],
                    context: None,
                }]
            );

            Ok(())
        }
    }

    mod votes_counts {
        use crate::{
            data_entry::{
                DataError, PoliticalGroupTotalVotes, Validate, ValidationResult,
                ValidationResultCode, ValidationResults, VotesCounts,
            },
            election::tests::election_fixture,
            polling_station::structs::tests::polling_station_fixture,
        };

        fn validate(
            political_group_total_votes: &[u32],
            total_votes_candidates_count: u32,
            blank_votes_count: u32,
            invalid_votes_count: u32,
            total_votes_cast_count: u32,
        ) -> Result<ValidationResults, DataError> {
            let votes_counts = VotesCounts {
                political_group_total_votes: political_group_total_votes
                    .iter()
                    .enumerate()
                    .map(|(i, &total)| PoliticalGroupTotalVotes {
                        number: u32::try_from(i + 1).unwrap(),
                        total,
                    })
                    .collect(),
                total_votes_candidates_count,
                blank_votes_count,
                invalid_votes_count,
                total_votes_cast_count,
            };

            let mut validation_results = ValidationResults::default();
            votes_counts.validate(
                &election_fixture(&[1, 1, 1]),
                &polling_station_fixture(None),
                &mut validation_results,
                &"votes_counts".into(),
            )?;

            Ok(validation_results)
        }

        /// CSO/DSO | F.202: 'Aantal kiezers en stemmen': E.1 t/m E.n tellen niet op naar E
        #[test]
        fn test_f202() -> Result<(), DataError> {
            let validation_results = validate(&[50, 30, 20], 100, 0, 0, 100)?;
            assert!(validation_results.errors.is_empty());

            let validation_results = validate(&[49, 30, 20], 100, 0, 0, 100)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F202,
                    fields: vec![
                        "votes_counts.political_group_total_votes[0].total".into(),
                        "votes_counts.political_group_total_votes[1].total".into(),
                        "votes_counts.political_group_total_votes[2].total".into(),
                        "votes_counts.total_votes_candidates_count".into(),
                    ],
                    context: None,
                }]
            );

            Ok(())
        }

        /// CSO/DSO | F.203: 'Aantal kiezers en stemmen': stemmen op kandidaten + blanco stemmen + ongeldige stemmen <> totaal aantal uitgebrachte stemmen
        #[test]
        fn test_f203() -> Result<(), DataError> {
            let validation_results = validate(&[50, 30, 20], 100, 1, 2, 103)?;
            assert!(validation_results.errors.is_empty());

            let validation_results = validate(&[50, 30, 20], 100, 1, 2, 104)?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F203,
                    fields: vec![
                        "votes_counts.total_votes_candidates_count".into(),
                        "votes_counts.blank_votes_count".into(),
                        "votes_counts.invalid_votes_count".into(),
                        "votes_counts.total_votes_cast_count".into(),
                    ],
                    context: None,
                }],
            );

            Ok(())
        }

        /// CSO/DSO | W.201: 'Aantal kiezers en stemmen': Aantal blanco stemmen is groter dan of gelijk aan 3% van het totaal aantal uitgebrachte stemmen
        #[test]
        fn test_w201() -> Result<(), DataError> {
            // < 3% of blank votes
            let validation_results = validate(&[40, 20, 11], 71, 29, 0, 100)?;
            assert!(validation_results.errors.is_empty());

            // == 3% of blank votes
            let validation_results = validate(&[40, 20, 10], 70, 30, 0, 100)?;
            assert_eq!(
                validation_results.warnings,
                [ValidationResult {
                    code: ValidationResultCode::W201,
                    fields: vec!["votes_counts.blank_votes_count".into()],
                    context: None,
                }],
            );

            // > 3% of blank votes
            let validation_results = validate(&[40, 20, 9], 69, 31, 0, 100)?;
            assert_eq!(
                validation_results.warnings,
                [ValidationResult {
                    code: ValidationResultCode::W201,
                    fields: vec!["votes_counts.blank_votes_count".into()],
                    context: None,
                }],
            );

            Ok(())
        }

        /// CSO/DSO | W.202: 'Aantal kiezers en stemmen': Aantal ongeldige stemmen is groter dan of gelijk aan 3% van het totaal aantal uitgebrachte stemmen
        #[test]
        fn test_w202() -> Result<(), DataError> {
            // < 3% of invalid votes
            let validation_results = validate(&[40, 20, 11], 71, 0, 29, 100)?;
            assert!(validation_results.errors.is_empty());

            // == 3% of invalid votes
            let validation_results = validate(&[40, 20, 10], 70, 0, 30, 100)?;
            assert_eq!(
                validation_results.warnings,
                [ValidationResult {
                    code: ValidationResultCode::W202,
                    fields: vec!["votes_counts.invalid_votes_count".into()],
                    context: None,
                }],
            );

            // > 3% of invalid votes
            let validation_results = validate(&[40, 20, 9], 69, 0, 31, 100)?;
            assert_eq!(
                validation_results.warnings,
                [ValidationResult {
                    code: ValidationResultCode::W202,
                    fields: vec!["votes_counts.invalid_votes_count".into()],
                    context: None,
                }],
            );

            Ok(())
        }

        /// CSO/DSO | W.204: 'Aantal kiezers en stemmen': Totaal aantal uitgebrachte stemmen leeg of 0
        #[test]
        fn test_w204() -> Result<(), DataError> {
            let validation_results = validate(&[50, 30, 20], 100, 0, 0, 100)?;
            assert!(validation_results.errors.is_empty());

            let validation_results = validate(&[0, 0, 0], 0, 0, 0, 0)?;
            assert_eq!(
                validation_results.warnings,
                [ValidationResult {
                    code: ValidationResultCode::W204,
                    fields: vec!["votes_counts.total_votes_cast_count".into()],
                    context: None,
                }],
            );

            Ok(())
        }

        #[test]
        fn test_multiple() -> Result<(), DataError> {
            let validation_results = validate(&[50, 30, 20], 99, 10, 10, 0)?;
            assert_eq!(
                validation_results.errors,
                [
                    ValidationResult {
                        code: ValidationResultCode::F202,
                        fields: vec![
                            "votes_counts.political_group_total_votes[0].total".into(),
                            "votes_counts.political_group_total_votes[1].total".into(),
                            "votes_counts.political_group_total_votes[2].total".into(),
                            "votes_counts.total_votes_candidates_count".into(),
                        ],
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::F203,
                        fields: vec![
                            "votes_counts.total_votes_candidates_count".into(),
                            "votes_counts.blank_votes_count".into(),
                            "votes_counts.invalid_votes_count".into(),
                            "votes_counts.total_votes_cast_count".into(),
                        ],
                        context: None,
                    }
                ],
            );
            assert_eq!(
                validation_results.warnings,
                [
                    ValidationResult {
                        code: ValidationResultCode::W201,
                        fields: vec!["votes_counts.blank_votes_count".into()],
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::W202,
                        fields: vec!["votes_counts.invalid_votes_count".into()],
                        context: None,
                    },
                    ValidationResult {
                        code: ValidationResultCode::W204,
                        fields: vec!["votes_counts.total_votes_cast_count".into()],
                        context: None,
                    }
                ],
            );

            Ok(())
        }
    }

    mod political_group_votes {
        use crate::{
            data_entry::{
                CandidateVotes, DataError, PoliticalGroupCandidateVotes, Validate,
                ValidationResult, ValidationResultCode, ValidationResultContext, ValidationResults,
            },
            election::{ElectionWithPoliticalGroups, PGNumber, tests::election_fixture},
            polling_station::structs::tests::polling_station_fixture,
        };

        /// Takes a list of tuples where each tuple contains:
        /// - Candidate vote counts for the political group
        /// - The total votes for that political group (could be different for test purposes)
        fn create_test_data(
            candidate_votes_and_totals: &[(&[u32], u32)],
        ) -> (
            Vec<PoliticalGroupCandidateVotes>,
            ElectionWithPoliticalGroups,
        ) {
            let political_group_votes = candidate_votes_and_totals
                .iter()
                .enumerate()
                .map(|(index, (candidate_votes, list_total))| {
                    let mut pg = PoliticalGroupCandidateVotes::from_test_data_auto(
                        PGNumber::try_from(index + 1).unwrap(),
                        candidate_votes,
                    );

                    // Set given total instead of summing votes
                    pg.total = *list_total;
                    pg
                })
                .collect();

            let election = election_fixture(
                &candidate_votes_and_totals
                    .iter()
                    .map(|(votes, _)| u32::try_from(votes.len()).unwrap())
                    .collect::<Vec<_>>(),
            );

            (political_group_votes, election)
        }

        fn validate(
            candidate_votes_totals: &[(&[u32], u32)],
        ) -> Result<ValidationResults, DataError> {
            let (political_group_votes, election) = create_test_data(candidate_votes_totals);

            let mut validation_results = ValidationResults::default();
            political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            )?;

            Ok(validation_results)
        }

        /// CSO | F.401: 'Kandidaten en lijsttotalen': Er zijn stemmen op kandidaten, en het totaal aantal stemmen op een lijst = leeg of 0
        #[test]
        fn test_f401() -> Result<(), DataError> {
            let validation_results = validate(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)])?;
            assert!(validation_results.errors.is_empty());

            let validation_results = validate(&[(&[10, 20, 30], 60), (&[5, 10, 15], 0)])?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F401,
                    fields: vec!["political_group_votes[1].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(2),
                    }),
                }]
            );

            Ok(())
        }

        /// CSO | F.402: 'Kandidaten en lijsttotalen': Totaal aantal stemmen op een lijst <> som van aantal stemmen op de kandidaten van die lijst (Als totaal aantal stemmen op een lijst niet leeg of 0 is)
        #[test]
        fn test_f402() -> Result<(), DataError> {
            let validation_results = validate(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)])?;
            assert!(validation_results.errors.is_empty());

            // When list total is empty, don't expect F.402, but F.401
            let validation_results = validate(&[(&[10, 20, 30], 60), (&[5, 10, 15], 0)])?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F401,
                    fields: vec!["political_group_votes[1].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(2),
                    }),
                }]
            );

            // Expect F.402 when list total doesn't match candidate votes
            let validation_results = validate(&[(&[10, 20, 30], 60), (&[5, 10, 15], 29)])?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F402,
                    fields: vec!["political_group_votes[1]".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(2),
                    }),
                }]
            );

            Ok(())
        }

        #[test]
        fn test_err_list_incorrect_length() {
            let (political_group_votes, mut election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Remove first political group from election
            election.political_groups.remove(0);

            let mut validation_results = ValidationResults::default();
            let result = political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            );

            assert!(result.is_err());
            assert!(
                result
                    .unwrap_err()
                    .message
                    .eq("list of political groups does not have correct length"),
            );
        }

        #[test]
        fn test_err_political_group_numbers_not_consecutive() {
            let (mut political_group_votes, election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Change number of the first list
            political_group_votes[0].number = 3;

            let mut validation_results = ValidationResults::default();
            let result: Result<(), DataError> = political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            );

            assert!(result.is_err());
            assert!(
                result
                    .unwrap_err()
                    .message
                    .eq("political group numbers are not consecutive"),
            );
        }

        #[test]
        fn test_err_incorrect_number_of_candidates() {
            let (mut political_group_votes, election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Add one extra candidate to the first list
            political_group_votes[0]
                .candidate_votes
                .push(CandidateVotes {
                    number: 4,
                    votes: 0,
                });

            let mut validation_results = ValidationResults::default();
            let result = political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            );

            assert!(result.is_err());
            assert!(
                result
                    .unwrap_err()
                    .message
                    .eq("incorrect number of candidates"),
            );
        }

        #[test]
        fn test_err_candidate_numbers_not_consecutive() {
            let (mut political_group_votes, election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Change number of the second candidate on the first list
            political_group_votes[0].candidate_votes[1].number = 5;

            let mut validation_results = ValidationResults::default();
            let result = political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            );

            assert!(result.is_err());
            assert!(
                result
                    .unwrap_err()
                    .message
                    .eq("candidate numbers are not consecutive"),
            );
        }
    }

    mod cso_first_session_results {
        use crate::{
            data_entry::{
                CSOFirstSessionResults, DataError, PoliticalGroupCandidateVotes,
                PoliticalGroupTotalVotes, Validate, ValidationResult, ValidationResultCode,
                ValidationResultContext, ValidationResults, tests::ValidDefault,
            },
            election::tests::election_fixture,
            polling_station::structs::tests::polling_station_fixture,
        };

        fn create_test_data() -> CSOFirstSessionResults {
            CSOFirstSessionResults {
                extra_investigation: ValidDefault::valid_default(),
                counting_differences_polling_station: ValidDefault::valid_default(),
                voters_counts: Default::default(),
                votes_counts: Default::default(),
                differences_counts: Default::default(),
                political_group_votes: Default::default(),
            }
        }

        fn validate(data: CSOFirstSessionResults) -> Result<ValidationResults, DataError> {
            let mut validation_results = ValidationResults::default();

            data.validate(
                // Adjust election political group list to the given test data
                &election_fixture(
                    &data
                        .political_group_votes
                        .iter()
                        .map(|pg| u32::try_from(pg.candidate_votes.len()).unwrap())
                        .collect::<Vec<_>>(),
                ),
                &polling_station_fixture(None),
                &mut validation_results,
                &"data".into(),
            )?;

            Ok(validation_results)
        }

        #[test]
        fn test_default() -> Result<(), DataError> {
            let validation_results = validate(create_test_data())?;
            assert_eq!(validation_results.errors.len(), 0);
            assert_eq!(validation_results.warnings.len(), 1);
            assert_eq!(
                validation_results.warnings[0].code,
                ValidationResultCode::W204
            );

            Ok(())
        }

        /// CSO/DSO | W.203: 'Aantal kiezers en stemmen': Verschil tussen totaal aantal toegelaten kiezers en totaal aantal uitgebrachte stemmen is groter dan of gelijk aan 2% en groter dan of gelijk aan 15
        #[test]
        fn test_w203() -> Result<(), DataError> {
            let cases = [
                (101, 100, false),   // < 2%
                (102, 100, true),    // == 2%
                (103, 100, true),    // > 2%
                (1000, 1014, false), // < 15
                (1000, 1015, true),  // == 15
                (1000, 1016, true),  // > 15
                (1016, 1000, true),  // > 15 (reversed)
            ];

            for (admitted_voters, votes_cast, expected) in cases {
                let mut data = create_test_data();
                data.voters_counts.total_admitted_voters_count = admitted_voters;
                data.votes_counts.total_votes_cast_count = votes_cast;

                let validation_results = validate(data)?;

                if expected {
                    assert_eq!(
                        validation_results.warnings,
                        [ValidationResult {
                            code: ValidationResultCode::W203,
                            fields: vec![
                                "data.voters_counts.total_admitted_voters_count".into(),
                                "data.votes_counts.total_votes_cast_count".into(),
                            ],
                            context: None,
                        }],
                        "Warning not found for admitted_voters={admitted_voters}, votes_cast={votes_cast}",
                    );
                } else {
                    assert!(validation_results.warnings.is_empty());
                }
            }

            Ok(())
        }

        /// CSO | F.403: 'Kandidaten en lijsttotalen': Totaal aantal stemmen op een lijst komt niet overeen met het lijsttotaal van corresponderende E.x
        #[test]
        fn test_f403() -> Result<(), DataError> {
            let mut data = create_test_data();

            data.votes_counts.political_group_total_votes = vec![
                PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                },
                PoliticalGroupTotalVotes {
                    number: 2,
                    total: 200,
                },
            ];
            data.votes_counts.total_votes_candidates_count = 300;
            data.votes_counts.total_votes_cast_count = 300;

            data.voters_counts.poll_card_count = 300;
            data.voters_counts.total_admitted_voters_count = 300;

            data.political_group_votes = vec![
                PoliticalGroupCandidateVotes::from_test_data_auto(1, &[100]),
                PoliticalGroupCandidateVotes::from_test_data_auto(2, &[200]),
            ];

            // Valid case
            let validation_results = validate(data.clone())?;
            assert!(validation_results.errors.is_empty());
            assert!(validation_results.warnings.is_empty());

            // Invalid case
            data.political_group_votes[1].candidate_votes[0].votes = 199;
            data.political_group_votes[1].total = 199;
            let validation_results = validate(data.clone())?;
            assert_eq!(
                validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F403,
                    fields: vec!["data.political_group_votes[1].total".into()],
                    context: Some(ValidationResultContext {
                        political_group_number: Some(2),
                    }),
                }],
            );

            // Multiple invalid case
            data.political_group_votes[0].candidate_votes[0].votes = 99;
            data.political_group_votes[0].total = 99;
            let validation_results = validate(data)?;
            assert_eq!(
                validation_results.errors,
                [
                    ValidationResult {
                        code: ValidationResultCode::F403,
                        fields: vec!["data.political_group_votes[0].total".into()],
                        context: Some(ValidationResultContext {
                            political_group_number: Some(1),
                        }),
                    },
                    ValidationResult {
                        code: ValidationResultCode::F403,
                        fields: vec!["data.political_group_votes[1].total".into()],
                        context: Some(ValidationResultContext {
                            political_group_number: Some(2),
                        }),
                    }
                ],
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

    #[test]
    fn test_count_err_out_of_range() {
        let mut validation_results = ValidationResults::default();
        let count = 1_000_000_000;

        let result = count.validate(
            &election_fixture(&[]),
            &polling_station_fixture(None),
            &mut validation_results,
            &"".into(),
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().message.eq("count out of range"),);
    }

    /// Tests the above_percentage_threshold function with various input combinations.
    #[test]
    fn test_above_percentage_threshold() {
        // Below
        assert!(!above_percentage_threshold(10, 101, 10));
        assert!(!above_percentage_threshold(9, 100, 10));
        assert!(!above_percentage_threshold(0, 0, 10));

        // Equal
        assert!(above_percentage_threshold(10, 100, 10));

        // Above
        assert!(above_percentage_threshold(11, 101, 10));
        assert!(above_percentage_threshold(10, 0, 10));
    }

    /// Tests the difference_equal_or_above function with various input combinations.
    #[test]
    fn test_difference_admitted_voters_count_and_votes_cast_count_above_threshold() {
        let cases = [
            // Percentage
            (101, 100, false), // < 2%
            (102, 100, true),  // == 2%
            (103, 100, true),  // > 2%
            // Absolute amount
            (1014, 1000, false), // < 15
            (1015, 1000, true),  // == 15
            (1016, 1000, true),  // > 15
            // Absolute amount (reversed)
            (1000, 1014, false), // < 15
            (1000, 1015, true),  // == 15
            (1000, 1016, true),  // > 15
        ];

        for (admitted_voters, votes_cast, expected) in cases {
            assert_eq!(
                difference_admitted_voters_count_and_votes_cast_count_above_threshold(
                    admitted_voters,
                    votes_cast
                ),
                expected,
                "Failed for admitted_voters={admitted_voters}, votes_cast={votes_cast}, expected={expected}"
            );
        }
    }

    /// Tests validation of polling station results with incorrect totals and differences.
    /// Covers F.301-F.305 (difference errors).
    #[test]
    fn test_incorrect_total_and_difference() {
        let mut validation_results = ValidationResults::default();
        let polling_station_results = CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 99,
                proxy_certificate_count: 0,
                total_admitted_voters_count: 99,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 100,
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
                &[100],
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
        assert_eq!(validation_results.warnings.len(), 0);

        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F301
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count"]
        );

        // test F.303 incorrect difference & F.304 should be empty
        validation_results = ValidationResults::default();
        let polling_station_results = CSOFirstSessionResults {
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

        // test F.301 incorrect difference, F.302 should be empty
        validation_results = ValidationResults::default();
        let polling_station_results = CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 98,
                proxy_certificate_count: 1,
                total_admitted_voters_count: 99,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 100,
                }],
                total_votes_candidates_count: 100,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 100,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 2,  // F.301 incorrect difference
                fewer_ballots_count: 2, // F.302 should be empty
                compare_votes_cast_admitted_voters:
                    DifferenceCountsCompareVotesCastAdmittedVoters {
                        admitted_voters_equal_votes_cast: true,
                        votes_cast_greater_than_admitted_voters: false,
                        votes_cast_smaller_than_admitted_voters: false,
                    },
                difference_completely_accounted_for: YesNo::yes(),
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
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F301
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count",]
        );
        assert_eq!(
            validation_results.errors[1].code,
            ValidationResultCode::F302
        );
        assert_eq!(
            validation_results.errors[1].fields,
            vec!["polling_station_results.differences_counts.fewer_ballots_count"]
        );

        // test F.303 incorrect difference, F.304 should be empty
        validation_results = ValidationResults::default();
        let polling_station_results = CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 99,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 101,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 97,
                }],
                total_votes_candidates_count: 97,
                blank_votes_count: 1,
                invalid_votes_count: 2,
                total_votes_cast_count: 100,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 15, // F.304 should be empty
                fewer_ballots_count: 3, // F.303 incorrect difference
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
                &[97],
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
            vec!["polling_station_results.differences_counts.more_ballots_count",]
        );
    }

    /// Tests validation when differences are incorrectly specified (F.304)
    #[test]
    fn test_differences() {
        let polling_station_results = CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: VotersCounts {
                poll_card_count: 99,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 101,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![PoliticalGroupTotalVotes {
                    number: 1,
                    total: 98,
                }],
                total_votes_candidates_count: 98,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 100,
            },
            differences_counts: DifferencesCounts {
                more_ballots_count: 4, // F.304 should be empty
                fewer_ballots_count: 1,
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
                &[98],
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
            ValidationResultCode::F304
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.more_ballots_count",]
        );
    }

    /// Tests validation when no differences are expected (F.305)
    #[test]
    fn test_no_differences_expected() {
        let polling_station_results = CSOFirstSessionResults {
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
    #[test]
    fn test_no_differences_expected_and_incorrect_total() {
        let polling_station_results = CSOFirstSessionResults {
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
                total: 50,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 50,
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
        assert_eq!(validation_results.errors.len(), 1);
        assert_eq!(validation_results.warnings.len(), 0);
        assert_eq!(
            validation_results.errors[0].code,
            ValidationResultCode::F305
        );
        assert_eq!(
            validation_results.errors[0].fields,
            vec!["polling_station_results.differences_counts.fewer_ballots_count"]
        );
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
