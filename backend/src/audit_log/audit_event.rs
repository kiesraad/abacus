use axum::http::Uri;
use chrono::{DateTime, NaiveDate, Utc};
use serde::{self, Deserialize, Serialize};
use strum::VariantNames;
use utoipa::ToSchema;

use super::AuditEventLevel;
use crate::{ErrorResponse, error::ErrorReference};

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct UserLoggedInDetails {
    pub user_agent: String,
    pub logged_in_users_count: u32,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct UserLoginFailedDetails {
    pub username: String,
    pub user_agent: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct UserLoggedOutDetails {
    pub session_duration: u64,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct UserDetails {
    pub user_id: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
    pub fullname: Option<String>,
    pub username: String,
    pub role: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct ElectionDetails {
    pub election_id: u32,
    pub election_name: String,
    pub election_counting_method: String,
    pub election_election_id: String,
    pub election_location: String,
    pub election_domain_id: String,
    pub election_category: String,
    pub election_number_of_seats: u32,
    #[schema(value_type = String, format = "date")]
    pub election_election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub election_nomination_date: NaiveDate,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct CommitteeSessionDetails {
    pub session_id: u32,
    pub session_number: u32,
    pub session_election_id: u32,
    pub session_location: String,
    pub session_start_date: String,
    pub session_start_time: String,
    pub session_status: String,
    pub session_number_of_voters: u32,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct PollingStationDetails {
    pub polling_station_id: u32,
    pub polling_station_election_id: u32,
    pub polling_station_name: String,
    pub polling_station_number: i64,
    pub polling_station_number_of_voters: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_type: Option<String>,
    pub polling_station_address: String,
    pub polling_station_postal_code: String,
    pub polling_station_locality: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
pub struct DataEntryDetails {
    pub polling_station_id: u32,
    pub data_entry_status: String,
    pub data_entry_progress: u8,
    #[schema(value_type = Option<String>)]
    pub finished_at: Option<DateTime<Utc>>,
    pub first_entry_user_id: Option<u32>,
    pub second_entry_user_id: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ErrorDetails {
    pub reference: ErrorReference,
    pub path: String,
    pub level: AuditEventLevel,
}

impl ErrorDetails {
    pub fn from_error_response(error_response: &ErrorResponse, original_uri: Uri) -> Option<Self> {
        match error_response.reference {
            // ignore common user errors
            ErrorReference::InvalidSession | ErrorReference::UserNotFound => None,
            _ => Some(Self {
                reference: error_response.reference,
                path: original_uri.path().to_string(),
                level: if error_response.fatal {
                    AuditEventLevel::Error
                } else {
                    AuditEventLevel::Warning
                },
            }),
        }
    }
}

#[derive(
    Serialize, Deserialize, strum::Display, VariantNames, Debug, PartialEq, Eq, ToSchema, Default,
)]
#[serde(rename_all = "PascalCase", tag = "eventType")]
pub enum AuditEvent {
    // authentication and account events
    UserLoggedIn(UserLoggedInDetails),
    UserLoginFailed(UserLoginFailedDetails),
    UserLoggedOut(UserLoggedOutDetails),
    UserAccountUpdated(UserDetails),
    UserSessionExtended,
    // user management events
    UserCreated(UserDetails),
    UserUpdated(UserDetails),
    UserDeleted(UserDetails),
    // election events
    ElectionCreated(ElectionDetails),
    // committee session events
    CommitteeSessionCreated(CommitteeSessionDetails),
    CommitteeSessionUpdated(CommitteeSessionDetails),
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
    DataEntryFinalised(DataEntryDetails),
    // data entry resolving events
    DataEntryDiscardedFirst(DataEntryDetails),
    DataEntryResumedFirst(DataEntryDetails),
    DataEntryKeptFirst(DataEntryDetails),
    DataEntryKeptSecond(DataEntryDetails),
    DataEntryDiscardedBoth(DataEntryDetails),
    // airgap detection events
    AirGapViolationDetected,
    AirGapViolationResolved,
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

impl From<sqlx::types::Json<AuditEvent>> for AuditEvent {
    fn from(value: sqlx::types::Json<AuditEvent>) -> Self {
        value.0
    }
}

impl AuditEvent {
    pub fn level(&self) -> AuditEventLevel {
        match self {
            AuditEvent::UserLoggedIn(_) => AuditEventLevel::Success,
            AuditEvent::UserLoginFailed(_) => AuditEventLevel::Warning,
            AuditEvent::UserLoggedOut(_) => AuditEventLevel::Success,
            AuditEvent::UserSessionExtended => AuditEventLevel::Info,
            AuditEvent::UserAccountUpdated(_) => AuditEventLevel::Success,
            AuditEvent::UserCreated(_) => AuditEventLevel::Success,
            AuditEvent::UserUpdated(_) => AuditEventLevel::Success,
            AuditEvent::UserDeleted(_) => AuditEventLevel::Info,
            AuditEvent::ElectionCreated(_) => AuditEventLevel::Success,
            AuditEvent::CommitteeSessionCreated(_) => AuditEventLevel::Success,
            AuditEvent::CommitteeSessionUpdated(_) => AuditEventLevel::Success,
            AuditEvent::ApportionmentCreated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationCreated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationUpdated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationDeleted(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryClaimed(_) => AuditEventLevel::Success,
            AuditEvent::DataEntrySaved(_) => AuditEventLevel::Success,
            AuditEvent::DataEntryDeleted(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryFinalised(_) => AuditEventLevel::Success,
            AuditEvent::Error(ErrorDetails { level, .. }) => *level,
            AuditEvent::UnknownEvent => AuditEventLevel::Warning,
            AuditEvent::DataEntryDiscardedFirst(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryResumedFirst(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryKeptFirst(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryKeptSecond(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryDiscardedBoth(_) => AuditEventLevel::Info,
            AuditEvent::AirGapViolationDetected => AuditEventLevel::Error,
            AuditEvent::AirGapViolationResolved => AuditEventLevel::Info,
        }
    }
}
