use axum::{
    Json,
    extract::FromRequest,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::{APIError, audit_log::PollingStationDetails, election::domain::ElectionId};

pub type PollingStationNumber = u32;

/// Polling station of a certain [crate::election::Election]
#[derive(Serialize, Deserialize, ToSchema, Debug, FromRow, Clone)]
#[serde(deny_unknown_fields)]
pub struct PollingStation {
    pub id: u32,
    pub election_id: ElectionId,
    pub committee_session_id: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub id_prev_session: Option<u32>,
    pub name: String,
    #[schema(value_type = u32)]
    pub number: PollingStationNumber,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub number_of_voters: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_type: Option<PollingStationType>,
    pub address: String,
    pub postal_code: String,
    pub locality: String,
}

impl PollingStation {
    /// Create a test polling station.
    #[cfg(test)]
    pub fn polling_station_fixture(number_of_voters: Option<u32>) -> PollingStation {
        PollingStation {
            id: 1,
            election_id: ElectionId::from(1),
            committee_session_id: 1,
            id_prev_session: None,
            name: "Testplek".to_string(),
            number: 34,
            number_of_voters,
            polling_station_type: Some(PollingStationType::Special),
            address: "Teststraat 2a".to_string(),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        }
    }
}

impl IntoResponse for PollingStation {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

impl From<PollingStation> for PollingStationDetails {
    fn from(value: PollingStation) -> Self {
        Self {
            polling_station_id: value.id,
            polling_station_election_id: value.election_id,
            polling_station_committee_session_id: value.committee_session_id,
            polling_station_id_prev_session: value.id_prev_session,
            polling_station_name: value.name,
            polling_station_number: value.number,
            polling_station_number_of_voters: value.number_of_voters,
            polling_station_type: value.polling_station_type.map(|t| t.to_string()),
            polling_station_address: value.address,
            polling_station_postal_code: value.postal_code,
            polling_station_locality: value.locality,
        }
    }
}

/// Polling station of a certain [crate::election::Election]
#[derive(Clone, Serialize, Deserialize, ToSchema, Debug, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
#[serde(deny_unknown_fields)]
pub struct PollingStationRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false, value_type = u32)]
    pub number: Option<PollingStationNumber>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub number_of_voters: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_type: Option<PollingStationType>,
    pub address: String,
    pub postal_code: String,
    pub locality: String,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct PollingStationsRequest {
    pub file_name: String,
    pub polling_stations: String,
}

/// Polling station list response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct PollingStationListResponse {
    pub polling_stations: Vec<PollingStation>,
}

impl IntoResponse for PollingStationListResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct PollingStationFileRequest {
    pub data: String,
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct PollingStationRequestListResponse {
    pub polling_stations: Vec<PollingStationRequest>,
}

/// Type of Polling station
#[derive(
    Serialize, Deserialize, strum::Display, ToSchema, Clone, Copy, Debug, PartialEq, Eq, Hash, Type,
)]
#[strum(serialize_all = "lowercase")]
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

#[cfg(test)]
pub(crate) mod tests {}
