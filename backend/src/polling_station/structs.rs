use axum::{
    Json,
    extract::FromRequest,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::{APIError, audit_log::PollingStationDetails};

/// Polling station of a certain [crate::election::Election]
#[derive(Serialize, Deserialize, ToSchema, Debug, FromRow, Clone)]
#[serde(deny_unknown_fields)]
pub struct PollingStation {
    pub id: u32,
    pub election_id: u32,
    pub committee_session_id: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub id_prev_session: Option<u32>,
    pub name: String,
    pub number: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub number_of_voters: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_type: Option<PollingStationType>,
    pub address: String,
    pub postal_code: String,
    pub locality: String,
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
    pub number: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub number_of_voters: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_type: Option<PollingStationType>,
    pub address: String,
    pub postal_code: String,
    pub locality: String,
}

/// Type of Polling station
#[derive(
    Serialize, Deserialize, strum::Display, ToSchema, Clone, Debug, PartialEq, Eq, Hash, Type,
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
pub(crate) mod tests {
    use super::*;
    use crate::{
        committee_session::tests::committee_session_fixture, election::tests::election_fixture,
    };

    /// Create a test polling station.
    pub fn polling_station_fixture(number_of_voters: Option<i64>) -> PollingStation {
        let election = election_fixture(&[]);
        let committee_session = committee_session_fixture(election.id);

        PollingStation {
            id: 1,
            election_id: election.id,
            committee_session_id: committee_session.id,
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
