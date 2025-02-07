use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

/// Election, optionally with its political groups
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
pub struct Election {
    pub id: u32,
    pub name: String,
    pub location: String,
    pub number_of_voters: u32,
    pub category: ElectionCategory,
    pub number_of_seats: u32,
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    pub status: ElectionStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    #[sqlx(default, json)]
    pub political_groups: Option<Vec<PoliticalGroup>>,
}

/// Election request
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug)]
pub struct ElectionRequest {
    pub name: String,
    pub location: String,
    pub number_of_voters: u32,
    pub category: ElectionCategory,
    pub number_of_seats: u32,
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    pub status: ElectionStatus,
    pub political_groups: Vec<PoliticalGroup>,
}

/// Election category (limited for now)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, Type)]
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

/// Election status (limited for now)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, Type)]
pub enum ElectionStatus {
    DataEntryInProgress,
    DataEntryFinished,
}

/// Political group with its candidates
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PoliticalGroup {
    pub number: u32,
    pub name: String,
    pub candidates: Vec<Candidate>,
}

/// Candidate
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct Candidate {
    pub number: u32,
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
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub enum CandidateGender {
    Male,
    Female,
    X,
}

#[cfg(test)]
pub(crate) mod tests {
    use chrono::NaiveDate;

    use crate::election::{Candidate, CandidateGender::X, ElectionCategory, PoliticalGroup};

    use super::*;

    /// Create a test election with some political groups.
    /// The number of political groups is the length of the `political_groups_candidates` slice.
    /// The number of candidates in each political group is equal to the value in the slice at that index.
    pub fn election_fixture(political_groups_candidates: &[u32]) -> Election {
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
                        first_name: Some("John".to_string()),
                        last_name_prefix: Some("van".to_string()),
                        last_name: "Doe".to_string(),
                        locality: "Juinen".to_string(),
                        country_code: Some("NL".to_string()),
                        gender: Some(X),
                    })
                    .collect(),
            })
            .collect();

        Election {
            id: 1,
            name: "Test".to_string(),
            location: "Test".to_string(),
            number_of_voters: 100,
            category: ElectionCategory::Municipal,
            number_of_seats: 29,
            election_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            nomination_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            status: ElectionStatus::DataEntryInProgress,
            political_groups: Some(political_groups),
        }
    }
}
