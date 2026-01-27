use axum::http::Uri;
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use serde::{self, Deserialize, Serialize};
use strum::VariantNames;
use utoipa::ToSchema;

use super::AuditEventLevel;
use crate::{
    ErrorResponse, authentication::user::UserId, committee_session::CommitteeSessionId,
    election::ElectionId, error::ErrorReference, files::FileId,
    polling_station::PollingStationId,
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
pub struct CommitteeSessionDetails {
    pub session_id: CommitteeSessionId,
    pub session_number: u32,
    pub session_election_id: ElectionId,
    pub session_location: String,
    #[schema(value_type = Option<String>, format = "date-time")]
    pub session_start_date_time: Option<NaiveDateTime>,
    pub session_status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub session_results_eml: Option<FileId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub session_results_pdf: Option<FileId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub session_overview_pdf: Option<FileId>,
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
    #[schema(value_type = Option<String>)]
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

#[derive(
    Serialize, Deserialize, strum::Display, VariantNames, Debug, PartialEq, Eq, ToSchema, Default,
)]
#[serde(rename_all = "PascalCase", tag = "event_type")]
pub enum AuditEvent {
    // authentication and account events
    UserLoggedIn(serde_json::Value),
    UserLoginFailed(serde_json::Value),
    UserLoggedOut(serde_json::Value),
    UserAccountUpdated(serde_json::Value),
    UserSessionExtended,
    // user management events
    UserCreated(serde_json::Value),
    UserUpdated(serde_json::Value),
    UserDeleted(serde_json::Value),
    // election events
    ElectionCreated(serde_json::Value),
    ElectionUpdated(serde_json::Value),
    // committee session events
    CommitteeSessionCreated(serde_json::Value),
    CommitteeSessionDeleted(serde_json::Value),
    CommitteeSessionUpdated(serde_json::Value),
    // investigation events
    PollingStationInvestigationCreated(serde_json::Value),
    PollingStationInvestigationConcluded(serde_json::Value),
    PollingStationInvestigationUpdated(serde_json::Value),
    PollingStationInvestigationDeleted(serde_json::Value),
    // file events
    FileCreated(serde_json::Value),
    FileDeleted(serde_json::Value),
    // polling station events
    PollingStationCreated(serde_json::Value),
    PollingStationUpdated(serde_json::Value),
    PollingStationDeleted(serde_json::Value),
    PollingStationsImported(serde_json::Value),
    // data entry events
    DataEntryStarted(serde_json::Value),
    DataEntrySaved(serde_json::Value),
    DataEntryResumed(serde_json::Value),
    DataEntryDeleted(serde_json::Value),
    DataEntryFinalised(serde_json::Value),
    ResultDeleted(serde_json::Value),
    // data entry resolving events
    DataEntryDiscardedFirst(serde_json::Value),
    DataEntryReturnedFirst(serde_json::Value),
    DataEntryKeptFirst(DataEntryDetails),
    DataEntryKeptSecond(DataEntryDetails),
    DataEntryDiscardedBoth(DataEntryDetails),
    // airgap detection events
    AirGapViolationDetected,
    AirGapViolationResolved,
    // system events
    ApplicationStarted(serde_json::Value),
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
            AuditEvent::ElectionUpdated(_) => AuditEventLevel::Success,
            AuditEvent::CommitteeSessionCreated(_) => AuditEventLevel::Success,
            AuditEvent::CommitteeSessionDeleted(_) => AuditEventLevel::Info,
            AuditEvent::CommitteeSessionUpdated(_) => AuditEventLevel::Success,
            AuditEvent::FileCreated(_) => AuditEventLevel::Success,
            AuditEvent::FileDeleted(_) => AuditEventLevel::Info,
            AuditEvent::PollingStationCreated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationUpdated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationDeleted(_) => AuditEventLevel::Info,
            AuditEvent::PollingStationsImported(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationInvestigationCreated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationInvestigationConcluded(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationInvestigationUpdated(_) => AuditEventLevel::Success,
            AuditEvent::PollingStationInvestigationDeleted(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryStarted(_) => AuditEventLevel::Success,
            AuditEvent::DataEntrySaved(_) => AuditEventLevel::Success,
            AuditEvent::DataEntryResumed(_) => AuditEventLevel::Success,
            AuditEvent::DataEntryDeleted(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryFinalised(_) => AuditEventLevel::Success,
            AuditEvent::ResultDeleted(_) => AuditEventLevel::Success,
            AuditEvent::ApplicationStarted(_) => AuditEventLevel::Info,
            AuditEvent::Error(ErrorDetails { level, .. }) => *level,
            AuditEvent::UnknownEvent => AuditEventLevel::Warning,
            AuditEvent::DataEntryDiscardedFirst(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryReturnedFirst(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryKeptFirst(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryKeptSecond(_) => AuditEventLevel::Info,
            AuditEvent::DataEntryDiscardedBoth(_) => AuditEventLevel::Info,
            AuditEvent::AirGapViolationDetected => AuditEventLevel::Error,
            AuditEvent::AirGapViolationResolved => AuditEventLevel::Info,
        }
    }
}
