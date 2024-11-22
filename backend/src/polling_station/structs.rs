use axum::{
    extract::FromRequest,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::APIError;

/// Polling station of a certain [crate::election::Election]
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

impl IntoResponse for PollingStation {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Polling station of a certain [crate::election::Election]
#[derive(Serialize, Deserialize, ToSchema, Debug, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
pub struct PollingStationRequest {
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
    FixedLocation,
    Special,
    Mobile,
}

impl From<String> for PollingStationType {
    fn from(value: String) -> Self {
        match value.as_str() {
            "FixedLocation" => Self::FixedLocation,
            "Special" => Self::Special,
            "Mobile" => Self::Mobile,
            _ => panic!("invalid PollingStationType `{value}`"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct PollingStationStatusEntry {
    pub id: u32,
    pub status: PollingStationStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    #[schema(maximum = 100)]
    /// Data entry progress between 0 and 100
    pub data_entry_progress: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub finished_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema, sqlx::Type, Eq, PartialEq, Clone)]
#[serde(rename_all = "snake_case")]
pub enum PollingStationStatus {
    NotStarted,            // First entry has not started yet
    FirstEntryInProgress,  // First entry is currently in progress
    FirstEntryUnfinished,  // First entry has been aborted and the data has been saved
    SecondEntry,           // Ready for second entry
    SecondEntryInProgress, // Second entry is currently in progress
    SecondEntryUnfinished, // Second entry has been aborted and the data has been saved
    Definitive,            // First and second entry are finished
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
            polling_station_type: PollingStationType::Special,
            street: "Teststraat".to_string(),
            house_number: "2".to_string(),
            house_number_addition: Some("b".to_string()),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        }
    }
}
