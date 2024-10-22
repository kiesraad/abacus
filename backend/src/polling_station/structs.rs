use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

/// Polling station of a certain [Election]
#[derive(Serialize, Deserialize, ToSchema, Debug, FromRow, Clone)]
pub struct PollingStation {
    pub id: u32,
    pub election_id: u32,
    pub name: String,
    pub number: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub number_of_voters: Option<i64>,
    pub polling_station_type: PollingStationType,
    pub street: String,
    pub house_number: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
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

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PollingStationStatusEntry {
    pub id: u32,
    pub status: PollingStationStatus,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, sqlx::Type, Eq, PartialEq, Clone)]
#[serde(rename_all = "snake_case")]
pub enum PollingStationStatus {
    FirstEntry,           // First entry has not started yet
    FirstEntryInProgress, // First entry is currently in progress
    FirstEntryUnfinished, // First entry has been aborted and the data has been saved
    Definitive, // First entry is finished (TODO: will become `First and second entry are finished`)
}

#[cfg(test)]
pub(crate) mod tests {
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
}
