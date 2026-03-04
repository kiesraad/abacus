use std::fmt;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    comparison::Compare,
    data_entry::{
        CandidateVotes, PoliticalGroupCandidateVotes, PoliticalGroupTotalVotes,
        PollingStationResults, VotersCounts, VotesCounts,
    },
    data_entry_status::{
        DataEntryStatus, FirstEntryFinalised, FirstEntryHasErrors, FirstEntryInProgress,
    },
    election::{CandidateNumber, ElectionWithPoliticalGroups, PGNumber},
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
            .push_str(&format!(".{index}"));
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

impl ValidateRoot for DataEntryStatus {}

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
            })
            | DataEntryStatus::FirstEntryFinalised(FirstEntryFinalised {
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

impl ValidateRoot for PollingStationResults {}

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
                results.extra_investigation.validate(
                    election,
                    polling_station,
                    validation_results,
                    &path.field("extra_investigation"),
                )?;

                results.counting_differences_polling_station.validate(
                    election,
                    polling_station,
                    validation_results,
                    &path.field("counting_differences_polling_station"),
                )?;

                self.as_common()
                    .validate(election, polling_station, validation_results, path)
            }
            PollingStationResults::CSONextSession(_) => {
                self.as_common()
                    .validate(election, polling_station, validation_results, path)
            }
        }
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

impl VotesCounts {
    fn validate_votes_counts_errors(
        &self,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
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
    }

    fn validate_votes_counts_warnings(
        &self,
        validation_results: &mut ValidationResults,
        path: &FieldPath,
    ) {
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

        self.validate_votes_counts_errors(validation_results, path);

        self.validate_votes_counts_warnings(validation_results, path);

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
        let mut previous_number = PGNumber::from(0);
        for (i, pgv) in self.iter().enumerate() {
            let number = pgv.number;
            if number <= previous_number {
                return Err(DataError::new(
                    "political group total votes numbers are not increasing",
                ));
            }
            previous_number = number;

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
        let mut previous_number = PGNumber::from(0);
        for (i, pgv) in self.iter().enumerate() {
            let number = pgv.number;
            if number <= previous_number {
                return Err(DataError::new("political group numbers are not increasing"));
            }
            previous_number = number;

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
            .iter()
            .find(|pg| pg.number == self.number)
            .ok_or(DataError::new("political group should exist"))?;

        // check if the number of candidates is correct
        if pg.candidates.len() != self.candidate_votes.len() {
            return Err(DataError::new("incorrect number of candidates"));
        }

        // validate all candidates
        let mut prev_number = CandidateNumber::from(0);
        for (i, cv) in self.candidate_votes.iter().enumerate() {
            let number = cv.number;
            if number <= prev_number {
                return Err(DataError::new("candidate numbers are not increasing"));
            }
            prev_number = number;

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

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::domain::{
        election::tests::election_fixture, polling_station::test_helpers::polling_station_fixture,
    };

    mod voters_counts {
        use test_log::test;

        use super::*;

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
        use test_log::test;

        use super::*;

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
                        number: PGNumber::try_from(i + 1).unwrap(),
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
                        "votes_counts.political_group_total_votes.0.total".into(),
                        "votes_counts.political_group_total_votes.1.total".into(),
                        "votes_counts.political_group_total_votes.2.total".into(),
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
                            "votes_counts.political_group_total_votes.0.total".into(),
                            "votes_counts.political_group_total_votes.1.total".into(),
                            "votes_counts.political_group_total_votes.2.total".into(),
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
        use test_log::test;

        use super::*;

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
        fn test_ok_political_group_numbers_not_consecutive() {
            let (mut political_group_votes, mut election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Change number of the last list
            political_group_votes[1].number = PGNumber::from(3);
            election.political_groups[1].number = PGNumber::from(3);

            let mut validation_results = ValidationResults::default();
            let result: Result<(), DataError> = political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            );

            assert!(result.is_ok());
        }

        #[test]
        fn test_err_political_group_numbers_not_increasing() {
            let (mut political_group_votes, mut election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Change number of the first list
            political_group_votes[0].number = PGNumber::from(3);
            election.political_groups[0].number = PGNumber::from(3);

            let mut validation_results = ValidationResults::default();
            let result: Result<(), DataError> = political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            );

            assert!(result.is_err());
        }

        #[test]
        fn test_err_incorrect_number_of_candidates() {
            let (mut political_group_votes, election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Add one extra candidate to the first list
            political_group_votes[0]
                .candidate_votes
                .push(CandidateVotes {
                    number: CandidateNumber::from(4),
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
        fn test_ok_candidate_numbers_not_consecutive() {
            let (mut political_group_votes, election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Change number of the last candidate on the first list
            political_group_votes[0].candidate_votes[2].number = CandidateNumber::from(5);

            let mut validation_results = ValidationResults::default();
            let result = political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            );

            assert!(result.is_ok());
        }

        #[test]
        fn test_err_candidate_numbers_not_increasing() {
            let (mut political_group_votes, election) =
                create_test_data(&[(&[10, 20, 30], 60), (&[5, 10, 15], 30)]);

            // Change number of the second candidate on the first list to a non-increasing number
            political_group_votes[0].candidate_votes[1].number = CandidateNumber::from(1);

            let mut validation_results = ValidationResults::default();
            let result = political_group_votes.validate(
                &election,
                &polling_station_fixture(None),
                &mut validation_results,
                &"political_group_votes".into(),
            );

            assert!(result.is_err());
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
