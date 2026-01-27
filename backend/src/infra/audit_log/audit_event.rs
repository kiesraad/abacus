use axum::http::Uri;
use chrono::{DateTime, NaiveDate, Utc};
use serde::{self, Deserialize, Serialize};
use strum::VariantNames;
use utoipa::ToSchema;

use super::AuditEventLevel;
use crate::{
    ErrorResponse,
    domain::{
        committee_session::CommitteeSessionId, election::ElectionId, file::FileId,
        investigation::PollingStationInvestigation, polling_station::PollingStationId,
    },
    error::ErrorReference,
    repository::user_repo::UserId,
};

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserLoggedInDetails {
    pub user_agent: String,
    pub logged_in_users_count: u32,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserLoginFailedDetails {
    pub username: String,
    pub user_agent: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserLoggedOutDetails {
    pub session_duration: u64,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserDetails {
    pub user_id: UserId,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
    pub fullname: Option<String>,
    pub username: String,
    pub role: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ElectionDetails {
    pub election_id: ElectionId,
    pub election_name: String,
    pub election_counting_method: String,
    pub election_election_id: String,
    pub election_location: String,
    pub election_domain_id: String,
    pub election_category: String,
    pub election_number_of_seats: u32,
    pub election_number_of_voters: u32,
    #[schema(value_type = String, format = "date")]
    pub election_election_date: NaiveDate,
    #[schema(value_type = String, format = "date")]
    pub election_nomination_date: NaiveDate,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct FileDetails {
    pub file_id: FileId,
    pub file_name: String,
    pub file_mime_type: String,
    pub file_size_bytes: u64,
    #[schema(value_type = String)]
    pub file_created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct PollingStationDetails {
    pub polling_station_id: PollingStationId,
    pub polling_station_election_id: ElectionId,
    pub polling_station_committee_session_id: CommitteeSessionId,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_id_prev_session: Option<PollingStationId>,
    pub polling_station_name: String,
    pub polling_station_number: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_number_of_voters: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_type: Option<String>,
    pub polling_station_address: String,
    pub polling_station_postal_code: String,
    pub polling_station_locality: String,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
pub struct PollingStationImportDetails {
    pub import_election_id: ElectionId,
    pub import_file_name: String,
    pub import_number_of_polling_stations: u64,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct DataEntryDetails {
    pub polling_station_id: PollingStationId,
    pub committee_session_id: CommitteeSessionId,
    pub data_entry_status: String,
    pub data_entry_progress: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String)]
    pub finished_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub first_entry_user_id: Option<UserId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub second_entry_user_id: Option<UserId>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ResultDetails {
    pub polling_station_id: PollingStationId,
    pub committee_session_id: CommitteeSessionId,
    #[schema(value_type = String)]
    pub created_at: DateTime<Utc>,
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

pub struct AuditEvent {
    pub event_type: AuditEventType,
    pub data: serde_json::Value,
}

pub trait AsAuditEvent {
    fn as_audit_event(&self) -> AuditEvent;
}

#[derive(
    Serialize, Deserialize, strum::Display, VariantNames, Debug, PartialEq, Eq, ToSchema, Default,
)]
#[serde(rename_all = "PascalCase", tag = "event_type")]
pub enum AuditEventType {
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
    ElectionUpdated(ElectionDetails),
    // committee session events
    CommitteeSessionCreated,
    CommitteeSessionDeleted,
    CommitteeSessionUpdated,
    // investigation events
    PollingStationInvestigationCreated(PollingStationInvestigation),
    PollingStationInvestigationConcluded(PollingStationInvestigation),
    PollingStationInvestigationUpdated(PollingStationInvestigation),
    PollingStationInvestigationDeleted(PollingStationInvestigation),
    // file events
    FileCreated(FileDetails),
    FileDeleted(FileDetails),
    // polling station events
    PollingStationCreated(PollingStationDetails),
    PollingStationUpdated(PollingStationDetails),
    PollingStationDeleted(PollingStationDetails),
    PollingStationsImported(PollingStationImportDetails),
    // data entry events
    DataEntryStarted(DataEntryDetails),
    DataEntrySaved(DataEntryDetails),
    DataEntryResumed(DataEntryDetails),
    DataEntryDeleted(DataEntryDetails),
    DataEntryFinalised(DataEntryDetails),
    ResultDeleted(ResultDetails),
    // data entry resolving events
    DataEntryDiscardedFirst(DataEntryDetails),
    DataEntryReturnedFirst(DataEntryDetails),
    DataEntryKeptFirst(DataEntryDetails),
    DataEntryKeptSecond(DataEntryDetails),
    DataEntryDiscardedBoth(DataEntryDetails),
    // airgap detection events
    AirGapViolationDetected,
    AirGapViolationResolved,
    // system events
    ApplicationStarted(ApplicationStartedDetails),
    // api errors
    Error(ErrorDetails),
    #[default]
    UnknownEvent,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
pub struct ApplicationStartedDetails {
    pub version: String,
    pub commit: String,
}

impl From<serde_json::Value> for AuditEventType {
    fn from(value: serde_json::Value) -> Self {
        serde_json::from_value(value).unwrap_or_default()
    }
}

impl From<sqlx::types::Json<AuditEventType>> for AuditEventType {
    fn from(value: sqlx::types::Json<AuditEventType>) -> Self {
        value.0
    }
}

impl AuditEventType {
    pub fn level(&self) -> AuditEventLevel {
        match self {
            AuditEventType::UserLoggedIn(_) => AuditEventLevel::Success,
            AuditEventType::UserLoginFailed(_) => AuditEventLevel::Warning,
            AuditEventType::UserLoggedOut(_) => AuditEventLevel::Success,
            AuditEventType::UserSessionExtended => AuditEventLevel::Info,
            AuditEventType::UserAccountUpdated(_) => AuditEventLevel::Success,
            AuditEventType::UserCreated(_) => AuditEventLevel::Success,
            AuditEventType::UserUpdated(_) => AuditEventLevel::Success,
            AuditEventType::UserDeleted(_) => AuditEventLevel::Info,
            AuditEventType::ElectionCreated(_) => AuditEventLevel::Success,
            AuditEventType::ElectionUpdated(_) => AuditEventLevel::Success,
            AuditEventType::CommitteeSessionCreated => AuditEventLevel::Success,
            AuditEventType::CommitteeSessionDeleted => AuditEventLevel::Info,
            AuditEventType::CommitteeSessionUpdated => AuditEventLevel::Success,
            AuditEventType::FileCreated(_) => AuditEventLevel::Success,
            AuditEventType::FileDeleted(_) => AuditEventLevel::Info,
            AuditEventType::PollingStationCreated(_) => AuditEventLevel::Success,
            AuditEventType::PollingStationUpdated(_) => AuditEventLevel::Success,
            AuditEventType::PollingStationDeleted(_) => AuditEventLevel::Info,
            AuditEventType::PollingStationsImported(_) => AuditEventLevel::Success,
            AuditEventType::PollingStationInvestigationCreated(_) => AuditEventLevel::Success,
            AuditEventType::PollingStationInvestigationConcluded(_) => AuditEventLevel::Success,
            AuditEventType::PollingStationInvestigationUpdated(_) => AuditEventLevel::Success,
            AuditEventType::PollingStationInvestigationDeleted(_) => AuditEventLevel::Info,
            AuditEventType::DataEntryStarted(_) => AuditEventLevel::Success,
            AuditEventType::DataEntrySaved(_) => AuditEventLevel::Success,
            AuditEventType::DataEntryResumed(_) => AuditEventLevel::Success,
            AuditEventType::DataEntryDeleted(_) => AuditEventLevel::Info,
            AuditEventType::DataEntryFinalised(_) => AuditEventLevel::Success,
            AuditEventType::ResultDeleted(_) => AuditEventLevel::Success,
            AuditEventType::ApplicationStarted(_) => AuditEventLevel::Info,
            AuditEventType::Error(ErrorDetails { level, .. }) => *level,
            AuditEventType::UnknownEvent => AuditEventLevel::Warning,
            AuditEventType::DataEntryDiscardedFirst(_) => AuditEventLevel::Info,
            AuditEventType::DataEntryReturnedFirst(_) => AuditEventLevel::Info,
            AuditEventType::DataEntryKeptFirst(_) => AuditEventLevel::Info,
            AuditEventType::DataEntryKeptSecond(_) => AuditEventLevel::Info,
            AuditEventType::DataEntryDiscardedBoth(_) => AuditEventLevel::Info,
            AuditEventType::AirGapViolationDetected => AuditEventLevel::Error,
            AuditEventType::AirGapViolationResolved => AuditEventLevel::Info,
        }
    }
}
