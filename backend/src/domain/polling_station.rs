use axum::{
    Json,
    extract::FromRequest,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

use crate::{
    APIError,
    domain::{
        committee_session::CommitteeSessionId,
        election::ElectionId,
        identifier::id,
        investigation::{InvestigationStatus, PollingStationInvestigation},
        polling_station_data_entry::DataEntryId,
    },
};

pub type PollingStationNumber = u32;
id!(PollingStationId);

/// Polling station base entity, linked to an election but
/// independent of the committee session or data entry.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
pub struct PollingStation {
    pub id: PollingStationId,
    pub election_id: ElectionId,
    pub name: String,
    pub number: PollingStationNumber,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub number_of_voters: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub polling_station_type: Option<PollingStationType>,
    pub address: String,
    pub postal_code: String,
    pub locality: String,
}

/// Polling station linked to an election, committee session and (previous) data entry.
#[derive(Serialize, Deserialize, ToSchema, Debug, Clone)]
#[schema(as = PollingStation)]
#[serde(deny_unknown_fields)]
pub struct PollingStationResponse {
    pub id: PollingStationId,
    pub election_id: ElectionId,
    pub committee_session_id: CommitteeSessionId,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub prev_data_entry_id: Option<DataEntryId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub data_entry_id: Option<DataEntryId>,
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

impl IntoResponse for PollingStationResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Polling station of a certain [crate::domain::election::Election]
#[derive(Clone, Serialize, Deserialize, ToSchema, Debug, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
#[serde(deny_unknown_fields)]
pub struct PollingStationRequest {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u32, nullable = false)]
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
    pub polling_stations: Vec<PollingStationResponse>,
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

/// Polling station in a first committee session.
/// No investigations, no previous data entries.
#[derive(Debug, Clone)]
pub struct PollingStationFirstSession {
    pub committee_session_id: CommitteeSessionId,
    pub polling_station: PollingStation,
    pub data_entry_id: Option<DataEntryId>,
}

/// Polling station in a next committee session.
/// May have previous data entries and investigation state.
#[derive(Debug, Clone)]
pub struct PollingStationNextSession {
    pub committee_session_id: CommitteeSessionId,
    pub polling_station: PollingStation,
    pub prev_data_entry_id: Option<DataEntryId>,
    pub data_entry_id: Option<DataEntryId>,
    pub investigation_status: Option<InvestigationStatus>,
}

impl PollingStationNextSession {
    /// Returns true if this polling station was newly added in this session.
    pub fn is_new_polling_station(&self) -> bool {
        self.prev_data_entry_id.is_none()
    }
}

impl From<PollingStationFirstSession> for PollingStationResponse {
    fn from(ps: PollingStationFirstSession) -> Self {
        Self {
            id: ps.polling_station.id,
            election_id: ps.polling_station.election_id,
            committee_session_id: ps.committee_session_id,
            prev_data_entry_id: None,
            data_entry_id: ps.data_entry_id,
            name: ps.polling_station.name,
            number: ps.polling_station.number,
            number_of_voters: ps.polling_station.number_of_voters,
            polling_station_type: ps.polling_station.polling_station_type,
            address: ps.polling_station.address,
            postal_code: ps.polling_station.postal_code,
            locality: ps.polling_station.locality,
        }
    }
}

impl From<PollingStationNextSession> for PollingStationResponse {
    fn from(ps: PollingStationNextSession) -> Self {
        Self {
            id: ps.polling_station.id,
            election_id: ps.polling_station.election_id,
            committee_session_id: ps.committee_session_id,
            prev_data_entry_id: ps.prev_data_entry_id,
            data_entry_id: ps.data_entry_id,
            name: ps.polling_station.name,
            number: ps.polling_station.number,
            number_of_voters: ps.polling_station.number_of_voters,
            polling_station_type: ps.polling_station.polling_station_type,
            address: ps.polling_station.address,
            postal_code: ps.polling_station.postal_code,
            locality: ps.polling_station.locality,
        }
    }
}

/// A single polling station for either a first or next committee session
#[derive(Debug, Clone)]
pub enum PollingStationForSession {
    First(PollingStationFirstSession),
    Next(PollingStationNextSession),
}

impl PollingStationForSession {
    pub fn polling_station(&self) -> &PollingStation {
        match self {
            Self::First(ps) => &ps.polling_station,
            Self::Next(ps) => &ps.polling_station,
        }
    }

    pub fn id(&self) -> PollingStationId {
        self.polling_station().id
    }

    pub fn election_id(&self) -> ElectionId {
        self.polling_station().election_id
    }

    pub fn committee_session_id(&self) -> CommitteeSessionId {
        match self {
            Self::First(ps) => ps.committee_session_id,
            Self::Next(ps) => ps.committee_session_id,
        }
    }

    pub fn data_entry_id(&self) -> Option<DataEntryId> {
        match self {
            Self::First(ps) => ps.data_entry_id,
            Self::Next(ps) => ps.data_entry_id,
        }
    }

    pub fn prev_data_entry_id(&self) -> Option<DataEntryId> {
        match self {
            Self::First(_) => None,
            Self::Next(ps) => ps.prev_data_entry_id,
        }
    }

    pub fn into_response(self) -> PollingStationResponse {
        match self {
            Self::First(ps) => ps.into(),
            Self::Next(ps) => ps.into(),
        }
    }

    pub fn into_polling_station(self) -> PollingStation {
        match self {
            Self::First(ps) => ps.polling_station,
            Self::Next(ps) => ps.polling_station,
        }
    }
}

/// Polling stations for either a first or next committee session
pub enum PollingStationsForSession {
    First(Vec<PollingStationFirstSession>),
    Next(Vec<PollingStationNextSession>),
}

impl PollingStationsForSession {
    /// Returns investigations derived from investigation_status.
    /// Empty for first sessions (no investigations can exist).
    pub fn investigations(&self) -> Vec<PollingStationInvestigation> {
        match self {
            Self::First(_) => vec![],
            Self::Next(pss) => pss
                .iter()
                .filter_map(|ps| {
                    ps.investigation_status.as_ref().map(|status| {
                        PollingStationInvestigation::from((ps.polling_station.id, status))
                    })
                })
                .collect(),
        }
    }

    /// Returns true if any investigation concluded with new (corrected) results.
    /// Always false for first sessions.
    pub fn has_corrections(&self) -> bool {
        match self {
            Self::First(_) => false,
            Self::Next(pss) => pss.iter().any(|ps| {
                matches!(
                    ps.investigation_status,
                    Some(InvestigationStatus::ConcludedWithNewResults(_))
                )
            }),
        }
    }

    /// Convert into polling station API responses.
    pub fn into_responses(self) -> Vec<PollingStationResponse> {
        match self {
            Self::First(pss) => pss.into_iter().map(PollingStationResponse::from).collect(),
            Self::Next(pss) => pss.into_iter().map(PollingStationResponse::from).collect(),
        }
    }

    /// Extract the inner polling stations, discarding session metadata.
    pub fn into_polling_stations(self) -> Vec<PollingStation> {
        match self {
            Self::First(pss) => pss.into_iter().map(|ps| ps.polling_station).collect(),
            Self::Next(pss) => pss.into_iter().map(|ps| ps.polling_station).collect(),
        }
    }
}

#[cfg(test)]
pub(crate) mod test_helpers {
    use super::*;
    use crate::domain::election::{ElectionWithPoliticalGroups, tests::election_fixture};

    /// Create a test polling station.
    pub fn polling_station_fixture(number_of_voters: Option<u32>) -> PollingStation {
        let election = election_fixture(&[]);

        PollingStation {
            id: PollingStationId::from(1),
            election_id: election.id,
            name: "Testplek".to_string(),
            number: 34,
            number_of_voters,
            polling_station_type: Some(PollingStationType::Special),
            address: "Teststraat 2a".to_string(),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        }
    }

    /// Fixture for a vector of polling stations. The number of polling stations returned depends
    /// on the length of the `polling_station_voter_count` slice parameter.
    pub fn polling_stations_fixture(
        election: &ElectionWithPoliticalGroups,
        polling_station_voter_count: &[u32],
    ) -> Vec<PollingStation> {
        let mut polling_stations = Vec::new();
        for (i, voter_count) in polling_station_voter_count.iter().enumerate() {
            let idx = i + 1;
            polling_stations.push(PollingStation {
                id: PollingStationId::from(u32::try_from(idx).unwrap()),
                election_id: election.id,
                name: format!("Testplek {idx}"),
                number: u32::try_from(idx).unwrap() + 30,
                number_of_voters: Some(*voter_count),
                polling_station_type: Some(PollingStationType::Special),
                address: "Teststraat 2a".to_string(),
                postal_code: "1234 QY".to_string(),
                locality: "Testdorp".to_string(),
            });
        }
        polling_stations
    }
}
