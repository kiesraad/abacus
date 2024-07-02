use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

/// Election, optionally with its political groups
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
pub struct Election {
    pub id: u32,
    pub name: String,
    pub category: ElectionCategory,
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[sqlx(default, json)]
    pub political_groups: Option<Vec<PoliticalGroup>>,
}

/// Election category (limited for now)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, Type)]
pub enum ElectionCategory {
    Municipal,
}

/// Political group with its candidates
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PoliticalGroup {
    pub number: u8,
    pub name: String,
    pub candidates: Vec<Candidate>,
}

/// Candidate
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct Candidate {
    pub number: u8,
    pub initials: String,
    pub first_name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_name_prefix: Option<String>,
    pub last_name: String,
    pub locality: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
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

    use crate::election::CandidateGender::X;
    use crate::election::{Candidate, ElectionCategory, PoliticalGroup};

    use super::*;

    /// Create a test election with some political groups.
    /// The number of political groups is the length of the `political_groups_candidates` slice.
    /// The number of candidates in each political group is equal to the value in the slice at that index.
    pub fn election_fixture(political_groups_candidates: &[u8]) -> Election {
        let political_groups = political_groups_candidates
            .iter()
            .enumerate()
            .map(|(i, &candidates)| PoliticalGroup {
                number: (i + 1) as u8,
                name: format!("Political group {}", i + 1),
                candidates: (0..candidates)
                    .map(|j| Candidate {
                        number: j + 1,
                        initials: "A.B.".to_string(),
                        first_name: "Test".to_string(),
                        last_name_prefix: Some("van".to_string()),
                        last_name: "Test".to_string(),
                        locality: "Test".to_string(),
                        country_code: Some("NL".to_string()),
                        gender: Some(X),
                    })
                    .collect(),
            })
            .collect();

        Election {
            id: 1,
            name: "Test".to_string(),
            category: ElectionCategory::Municipal,
            election_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            nomination_date: NaiveDate::from_ymd_opt(2023, 11, 1).unwrap(),
            political_groups: Some(political_groups),
        }
    }
}
