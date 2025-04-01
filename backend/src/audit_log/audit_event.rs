use chrono::{DateTime, NaiveDate, Utc};
use serde::{self, Deserialize, Serialize};
use strum::VariantNames;
use utoipa::ToSchema;

use crate::{
    authentication::LoginResponse,
    data_entry::PollingStationDataEntry,
    election::{Election, ElectionCategory, ElectionStatus},
    error::ErrorReference,
    polling_station::{PollingStation, PollingStationType},
};

use super::AuditEventLevel;

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserLoggedInDetails {
    pub user_agent: String,
    pub logged_in_users_count: u32,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserLoggedOutDetails {
    pub session_duration: u64,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ElectionDetails {
    pub election_id: u32,
    pub election_name: String,
    pub election_location: String,
    pub election_number_of_voters: u32,
    pub election_category: ElectionCategory,
    pub election_number_of_seats: u32,
    #[schema(value_type = String, format = "date")]
    pub election_election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub election_nomination_date: NaiveDate,
    pub election_status: ElectionStatus,
}

impl From<Election> for ElectionDetails {
    fn from(value: Election) -> Self {
        Self {
            election_id: value.id,
            election_name: value.name,
            election_location: value.location,
            election_number_of_voters: value.number_of_voters,
            election_category: value.category,
            election_number_of_seats: value.number_of_seats,
            election_election_date: value.election_date,
            election_nomination_date: value.nomination_date,
            election_status: value.status,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct PollingStationDetails {
    pub polling_station_id: u32,
    pub polling_station_election_id: u32,
    pub polling_station_name: String,
    pub polling_station_number: i64,
    pub polling_station_number_of_voters: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_type: Option<PollingStationType>,
    pub polling_station_address: String,
    pub polling_station_postal_code: String,
    pub polling_station_locality: String,
}

impl From<PollingStation> for PollingStationDetails {
    fn from(value: PollingStation) -> Self {
        Self {
            polling_station_id: value.id,
            polling_station_election_id: value.election_id,
            polling_station_name: value.name,
            polling_station_number: value.number,
            polling_station_number_of_voters: value.number_of_voters,
            polling_station_type: value.polling_station_type,
            polling_station_address: value.address,
            polling_station_postal_code: value.postal_code,
            polling_station_locality: value.locality,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DataEntryDetails {
    pub polling_station_id: u32,
    pub data_entry_progress: u8,
    #[schema(value_type = Option<String>)]
    pub finished_at: Option<DateTime<Utc>>,
    pub first_entry_user_id: Option<u32>,
    pub second_entry_user_id: Option<u32>,
}

impl From<PollingStationDataEntry> for DataEntryDetails {
    fn from(value: PollingStationDataEntry) -> Self {
        let state = value.state.0;

        Self {
            polling_station_id: value.polling_station_id,
            data_entry_progress: state.get_progress(),
            finished_at: state.finished_at().cloned(),
            first_entry_user_id: state.get_first_entry_user_id(),
            second_entry_user_id: state.get_second_entry_user_id(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
pub struct ErrorDetails {
    pub reference: ErrorReference,
    pub path: String,
    pub level: AuditEventLevel,
}

#[derive(
    Serialize, Deserialize, strum::Display, VariantNames, Debug, PartialEq, Eq, ToSchema, Default,
)]
#[serde(rename_all = "PascalCase", tag = "eventType")]
pub enum AuditEvent {
    // authentication and account events
    UserLoggedIn(UserLoggedInDetails),
    UserLoggedOut(UserLoggedOutDetails),
    UserAccountUpdated(LoginResponse),
    UserSessionExtended,
    // user managament events
    UserCreated(LoginResponse),
    UserUpdated(LoginResponse),
    UserDeleted(LoginResponse),
    // election events
    ElectionCreated(ElectionDetails),
    // apportionment
    ApportionmentCreated(ElectionDetails),
    // polling station events
    PollingStationCreated(PollingStationDetails),
    PollingStationUpdated(PollingStationDetails),
    PollingStationDeleted(PollingStationDetails),
    // data entry events
    DataEntryClaimed(DataEntryDetails),
    DataEntrySaved(DataEntryDetails),
    DataEntryDeleted(DataEntryDetails),
    DataEntryFinalized(DataEntryDetails),
    // api errors
    Error(ErrorDetails),
    #[default]
    UnknownEvent,
}

impl From<serde_json::Value> for AuditEvent {
    fn from(value: serde_json::Value) -> Self {
        serde_json::from_value(value).unwrap_or_default()
    }
}

impl AuditEvent {
    pub fn level(&self) -> AuditEventLevel {
        match self {
            AuditEvent::UserLoggedIn(_) => AuditEventLevel::Success,
            AuditEvent::UserLoggedOut(_) => AuditEventLevel::Success,
            AuditEvent::UserSessionExtended => AuditEventLevel::Info,
            AuditEvent::UserAccountUpdated(_) => AuditEventLevel::Success,
            AuditEvent::UserCreated(_) => AuditEventLevel::Success,
            AuditEvent::UserUpdated(_) => AuditEventLevel::Success,
            AuditEvent::UserDeleted(_) => AuditEventLevel::Info,
            AuditEvent::ElectionCreated(_) => AuditEventLevel::Success,
            AuditEvent::ApportionmentCreated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationCreated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationUpdated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationDeleted(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryClaimed(_) => AuditEventLevel::Success,
            AuditEvent::DataEntrySaved(_) => AuditEventLevel::Success,
            AuditEvent::DataEntryDeleted(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryFinalized(_) => AuditEventLevel::Success,
            AuditEvent::Error(ErrorDetails { level, .. }) => *level,
            AuditEvent::UnknownEvent => AuditEventLevel::Warning,
        }
    }
}
