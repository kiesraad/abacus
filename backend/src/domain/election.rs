use axum::{
    Json,
    response::{IntoResponse, Response},
};
use chrono::NaiveDate;
use eml_nl::csv::NameResolver;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::domain::identifier::id;

id!(ElectionId);

/// Election without political groups
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
#[serde(deny_unknown_fields)]
pub struct Election {
    pub id: ElectionId,
    pub name: String,
    pub committee_category: CommitteeCategory,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub counting_method: Option<VoteCountingMethod>,
    pub election_id: String,
    pub location: String,
    pub domain_id: String,
    pub category: ElectionCategory,
    pub sub_category: ElectionSubCategory,
    pub number_of_seats: u32,
    pub number_of_voters: u32,
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
}

/// Election with political groups
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
#[serde(deny_unknown_fields)]
pub struct ElectionWithPoliticalGroups {
    pub id: ElectionId,
    pub name: String,
    pub committee_category: CommitteeCategory,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub counting_method: Option<VoteCountingMethod>,
    pub election_id: String,
    pub location: String,
    pub domain_id: String,
    pub category: ElectionCategory,
    pub sub_category: ElectionSubCategory,
    pub number_of_seats: u32,
    pub number_of_voters: u32,
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    #[sqlx(json)]
    pub political_groups: Vec<PoliticalGroup>,
}

impl From<ElectionWithPoliticalGroups> for Election {
    fn from(value: ElectionWithPoliticalGroups) -> Self {
        Self {
            id: value.id,
            name: value.name,
            committee_category: value.committee_category,
            counting_method: value.counting_method,
            election_id: value.election_id,
            location: value.location,
            domain_id: value.domain_id,
            category: value.category,
            sub_category: value.sub_category,
            number_of_seats: value.number_of_seats,
            number_of_voters: value.number_of_voters,
            election_date: value.election_date,
            nomination_date: value.nomination_date,
        }
    }
}

impl IntoResponse for Election {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

impl IntoResponse for ElectionWithPoliticalGroups {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

impl NameResolver for ElectionWithPoliticalGroups {
    fn resolve_affiliation_name(
        &self,
        affiliation_id: eml_nl::utils::AffiliationId,
    ) -> Option<String> {
        let aff_id: u32 = affiliation_id.value().get().try_into().ok()?;
        let aff_id = PGNumber::from(aff_id);

        self.political_groups
            .iter()
            .find(|pg| pg.number == aff_id)
            .map(|pg| pg.registered_name.clone())
    }

    fn resolve_candidate_name(
        &self,
        affiliation_id: eml_nl::utils::AffiliationId,
        candidate_id: eml_nl::utils::CandidateId,
    ) -> Option<String> {
        let aff_id: u32 = affiliation_id.value().get().try_into().ok()?;
        let aff_id = PGNumber::from(aff_id);

        let cand_id: u32 = candidate_id.value().get().try_into().ok()?;
        let cand_id = CandidateNumber::from(cand_id);

        self.political_groups
            .iter()
            .find(|pg| pg.number == aff_id)
            .and_then(|pg| pg.candidates.iter().find(|c| c.number == cand_id))
            .map(|c| {
                let last = &c.last_name;
                let prefix = c.last_name_prefix.as_deref();
                let initials = &c.initials;

                let last_part = if let Some(prefix) = prefix {
                    format!("{} {}", prefix, last)
                } else {
                    last.to_string()
                };

                if !initials.is_empty() {
                    format!("{}, {}", last_part, initials)
                } else {
                    last_part
                }
            })
    }
}

/// Election request
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct NewElection {
    pub name: String,
    pub committee_category: CommitteeCategory,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub counting_method: Option<VoteCountingMethod>,
    pub election_id: String,
    pub location: String,
    pub domain_id: String,
    pub category: ElectionCategory,
    pub sub_category: ElectionSubCategory,
    pub number_of_seats: u32,
    pub number_of_voters: u32,
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    #[serde(skip_serializing)]
    pub political_groups: Vec<RegisteredPoliticalGroup>,
}

/// Election number of voters change request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct ElectionNumberOfVotersChangeRequest {
    pub number_of_voters: u32,
}

/// Election category (limited for now)
#[derive(
    Serialize, Deserialize, strum::Display, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash, Type,
)]
#[strum(serialize_all = "lowercase")]
pub enum ElectionCategory {
    /// Gemeenteraadsverkiezing
    Municipal,
    /// Provinciale statenverkiezing
    Provincial,
    /// Waterschapsverkiezing
    WaterAuthority,
}

impl ElectionCategory {
    pub fn to_eml_code(&self) -> &'static str {
        match self {
            ElectionCategory::Municipal => "GR",
            ElectionCategory::Provincial => "PS",
            ElectionCategory::WaterAuthority => "AB",
        }
    }
}

/// Election sub category (limited for now)
#[derive(
    Serialize, Deserialize, strum::Display, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash, Type,
)]
#[strum(serialize_all = "lowercase")]
pub enum ElectionSubCategory {
    /// Waterschapsverkiezing < 19 seats
    AB1,
    /// Waterschapsverkiezing >= 19 seats
    AB2,
    /// Gemeenteraadsverkiezing < 19 seats
    GR1,
    /// Gemeenteraadsverkiezing >= 19 seats
    GR2,
    /// Provinciale statenverkiezing single district
    PS1,
    /// Provinciale statenverkiezing multiple districts
    PS2,
}

impl From<String> for ElectionSubCategory {
    fn from(value: String) -> Self {
        match value.as_str() {
            "AB1" => Self::AB1,
            "AB2" => Self::AB2,
            "GR1" => Self::GR1,
            "GR2" => Self::GR2,
            "PS1" => Self::PS1,
            "PS2" => Self::PS2,
            _ => panic!("invalid ElectionSubCategory `{value}`"),
        }
    }
}

impl ElectionSubCategory {
    pub fn to_eml_code(&self) -> &'static str {
        match self {
            ElectionSubCategory::AB1 => "AB1",
            ElectionSubCategory::AB2 => "AB2",
            ElectionSubCategory::GR1 => "GR1",
            ElectionSubCategory::GR2 => "GR2",
            ElectionSubCategory::PS1 => "PS1",
            ElectionSubCategory::PS2 => "PS2",
        }
    }
}

/// Committee category
#[derive(
    Serialize,
    Deserialize,
    strum::Display,
    strum::EnumString,
    strum::VariantArray,
    ToSchema,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    Type,
)]
pub enum CommitteeCategory {
    /// Gemeentelijk stembureau
    GSB,
    /// Centraal stembureau
    CSB,
}

#[derive(
    Serialize, Deserialize, strum::Display, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash, Type,
)]
#[strum(serialize_all = "lowercase")]
pub enum VoteCountingMethod {
    /// centralized vote counting method
    CSO,
    /// decentralized vote counting method
    DSO,
}

id!(PGNumber);

/// Political group and its candidates (with registered name as imported from the EML)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct RegisteredPoliticalGroup {
    /// Political group number
    #[schema(value_type = u32)]
    pub number: PGNumber,
    /// Registered political group name as imported from the candidates list EML (230)
    pub registered_name: String,
    /// List of candidates of the political group
    pub candidates: Vec<Candidate>,
}

/// Political group and its candidates (with name as used for display purposes)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroup {
    /// Political group number
    #[schema(value_type = u32)]
    pub number: PGNumber,
    /// Political group name as used for display purposes (with 'Blanco' in case of empty registered name)
    pub name: String,
    /// Registered political group name as imported from the candidates list EML (230)
    #[serde(skip_serializing)]
    pub registered_name: String,
    /// List of candidates of the political group
    pub candidates: Vec<Candidate>,
}

impl From<RegisteredPoliticalGroup> for PoliticalGroup {
    fn from(row: RegisteredPoliticalGroup) -> Self {
        Self {
            number: row.number,
            name: political_group_name(&row.registered_name, &row.candidates),
            registered_name: row.registered_name,
            candidates: row.candidates,
        }
    }
}

fn political_group_name(registered_name: &str, candidates: &[Candidate]) -> String {
    if registered_name.is_empty() {
        let mut name = String::new();
        let first_candidate = candidates
            .first()
            .expect("At least 1 candidate should be present");

        let mut last_name = String::new();

        if let Some(last_name_prefix) = &first_candidate.last_name_prefix {
            last_name.push_str(&format!(
                "{} {}",
                last_name_prefix, first_candidate.last_name
            ));
        } else {
            last_name.push_str(&first_candidate.last_name.to_string());
        }

        name.push_str(&format!(
            "Blanco ({}, {})",
            last_name, first_candidate.initials
        ));
        name
    } else {
        registered_name.to_string()
    }
}

id!(CandidateNumber);

/// Candidate
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct Candidate {
    #[schema(value_type = u32)]
    pub number: CandidateNumber,
    pub initials: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub first_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub last_name_prefix: Option<String>,
    pub last_name: String,
    pub locality: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub country_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub gender: Option<CandidateGender>,
}

/// Candidate gender
#[derive(Serialize, Deserialize, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub enum CandidateGender {
    Male,
    Female,
    X,
}

#[cfg(test)]
pub(crate) mod tests {
    use chrono::NaiveDate;

    use super::*;

    /// Creates a vector of political groups with candidates, where the number of candidates in each
    /// political group is equal to the value in the slice at that index.
    pub fn political_groups_with_candidates(
        political_groups_candidates: &[u32],
    ) -> Vec<PoliticalGroup> {
        political_groups_candidates
            .iter()
            .enumerate()
            .map(|(i, &candidates)| PoliticalGroup {
                number: PGNumber::try_from(i + 1).unwrap(),
                name: format!("Political group {}", i + 1),
                registered_name: format!("Political group {}", i + 1),
                candidates: (0..candidates)
                    .map(|j| Candidate {
                        number: CandidateNumber::from(j + 1),
                        initials: "A.B.".to_string(),
                        first_name: Some(format!("Candidate {}", j + 1)),
                        last_name_prefix: Some("van".to_string()),
                        last_name: format!("PG {}", i + 1),
                        locality: "Juinen".to_string(),
                        country_code: Some("NL".to_string()),
                        gender: Some(CandidateGender::X),
                    })
                    .collect(),
            })
            .collect()
    }

    /// Create a test election with some political groups and a given number of seats.
    /// The number of political groups is the length of the `political_groups_candidates` slice.
    /// The number of candidates in each political group is equal to the value in the slice at that index.
    pub fn election_fixture_with_given_number_of_seats(
        committee_category: CommitteeCategory,
        political_groups_candidates: &[u32],
        number_of_seats: u32,
    ) -> ElectionWithPoliticalGroups {
        ElectionWithPoliticalGroups {
            id: ElectionId::from(1),
            name: "Test".to_string(),
            committee_category,
            counting_method: Some(VoteCountingMethod::CSO),
            election_id: "GR2023_Test".to_string(),
            location: "Test".to_string(),
            domain_id: "0000".to_string(),
            category: ElectionCategory::Municipal,
            sub_category: if number_of_seats < 19 {
                ElectionSubCategory::GR1
            } else {
                ElectionSubCategory::GR2
            },
            number_of_seats,
            number_of_voters: 1000,
            election_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            nomination_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            political_groups: political_groups_with_candidates(political_groups_candidates),
        }
    }

    /// Create a test election with some political groups.
    /// The number of political groups is the length of the `political_groups_candidates` slice.
    /// The number of candidates in each political group is equal to the value in the slice at that index.
    pub fn election_fixture(
        committee_category: CommitteeCategory,
        political_groups_candidates: &[u32],
    ) -> ElectionWithPoliticalGroups {
        election_fixture_with_given_number_of_seats(
            committee_category,
            political_groups_candidates,
            29,
        )
    }
}
