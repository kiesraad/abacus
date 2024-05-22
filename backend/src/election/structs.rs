use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// Election with its political groups
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct Election {
    pub id: i64,
    pub name: String,
    pub category: ElectionCategory,
    #[schema(value_type = String, format = "date")]
    pub election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub nomination_date: NaiveDate,
    pub political_groups: Vec<PoliticalGroup>,
}

/// Election category (limited for now)
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
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
    pub last_name: String,
    pub locality: String,
    pub gender: Option<CandidateGender>,
}

/// Candidate gender
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub enum CandidateGender {
    Male,
    Female,
    X,
}
