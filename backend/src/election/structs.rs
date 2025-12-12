use axum::{
    Json,
    response::{IntoResponse, Response},
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::audit_log::ElectionDetails;

crate::util::id!(ElectionId);

/// Election without political groups
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
#[serde(deny_unknown_fields)]
pub struct Election {
    pub id: ElectionId,
    pub name: String,
    pub counting_method: VoteCountingMethod,
    pub election_id: String,
    pub location: String,
    pub domain_id: String,
    pub category: ElectionCategory,
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
    pub counting_method: VoteCountingMethod,
    pub election_id: String,
    pub location: String,
    pub domain_id: String,
    pub category: ElectionCategory,
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
            counting_method: value.counting_method,
            election_id: value.election_id,
            location: value.location,
            domain_id: value.domain_id,
            category: value.category,
            number_of_seats: value.number_of_seats,
            number_of_voters: value.number_of_voters,
            election_date: value.election_date,
            nomination_date: value.nomination_date,
        }
    }
}

impl From<Election> for ElectionDetails {
    fn from(value: Election) -> Self {
        Self {
            election_id: value.id,
            election_name: value.name,
            election_counting_method: value.counting_method.to_string(),
            election_election_id: value.election_id,
            election_location: value.location,
            election_domain_id: value.domain_id,
            election_category: value.category.to_string(),
            election_number_of_seats: value.number_of_seats,
            election_number_of_voters: value.number_of_voters,
            election_election_date: value.election_date,
            election_nomination_date: value.nomination_date,
        }
    }
}

impl From<ElectionWithPoliticalGroups> for ElectionDetails {
    fn from(value: ElectionWithPoliticalGroups) -> Self {
        Self {
            election_id: value.id,
            election_name: value.name,
            election_counting_method: value.counting_method.to_string(),
            election_election_id: value.election_id,
            election_location: value.location,
            election_domain_id: value.domain_id,
            election_category: value.category.to_string(),
            election_number_of_seats: value.number_of_seats,
            election_number_of_voters: value.number_of_voters,
            election_election_date: value.election_date,
            election_nomination_date: value.nomination_date,
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

/// Election request
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct NewElection {
    pub name: String,
    pub counting_method: VoteCountingMethod,
    pub election_id: String,
    pub location: String,
    pub domain_id: String,
    pub category: ElectionCategory,
    pub number_of_seats: u32,
    pub number_of_voters: u32,
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    pub political_groups: Vec<PoliticalGroup>,
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
    Municipal,
}

impl ElectionCategory {
    pub fn to_eml_code(&self) -> &'static str {
        match self {
            ElectionCategory::Municipal => "GR",
        }
    }
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

pub type PGNumber = u32;

/// Political group with its candidates
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroup {
    #[schema(value_type = u32)]
    pub number: PGNumber,
    pub name: String,
    pub candidates: Vec<Candidate>,
}

pub type CandidateNumber = u32;

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
    use crate::election::{Candidate, CandidateGender::X, ElectionCategory, PoliticalGroup};

    /// Create a test election with some political groups and a given number of seats.
    /// The number of political groups is the length of the `political_groups_candidates` slice.
    /// The number of candidates in each political group is equal to the value in the slice at that index.
    pub fn election_fixture_with_given_number_of_seats(
        political_groups_candidates: &[u32],
        number_of_seats: u32,
    ) -> ElectionWithPoliticalGroups {
        let political_groups = political_groups_candidates
            .iter()
            .enumerate()
            .map(|(i, &candidates)| PoliticalGroup {
                number: u32::try_from(i + 1).unwrap(),
                name: format!("Political group {}", i + 1),
                candidates: (0..candidates)
                    .map(|j| Candidate {
                        number: j + 1,
                        initials: "A.B.".to_string(),
                        first_name: Some(format!("Candidate {}", j + 1)),
                        last_name_prefix: Some("van".to_string()),
                        last_name: format!("PG {}", i + 1),
                        locality: "Juinen".to_string(),
                        country_code: Some("NL".to_string()),
                        gender: Some(X),
                    })
                    .collect(),
            })
            .collect();

        ElectionWithPoliticalGroups {
            id: ElectionId::from(1),
            name: "Test".to_string(),
            counting_method: VoteCountingMethod::CSO,
            election_id: "Test_2023".to_string(),
            location: "Test".to_string(),
            domain_id: "0000".to_string(),
            category: ElectionCategory::Municipal,
            number_of_seats,
            number_of_voters: 1000,
            election_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            nomination_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            political_groups,
        }
    }

    /// Create a test election with some political groups.
    /// The number of political groups is the length of the `political_groups_candidates` slice.
    /// The number of candidates in each political group is equal to the value in the slice at that index.
    pub fn election_fixture(political_groups_candidates: &[u32]) -> ElectionWithPoliticalGroups {
        election_fixture_with_given_number_of_seats(political_groups_candidates, 29)
    }
}
