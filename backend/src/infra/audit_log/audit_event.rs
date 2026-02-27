use axum::http::Uri;
use serde::{self, Deserialize, Serialize};
use serde_json::json;
use strum::VariantNames;
use utoipa::ToSchema;

use super::AuditEventLevel;
use crate::{ErrorResponse, error::ErrorReference};

#[derive(Debug, Serialize, Clone)]
pub struct AuditEvent {
    pub event_type: AuditEventType,
    pub event_level: AuditEventLevel,
    pub data: serde_json::Value,
}

pub trait AsAuditEvent: serde::Serialize {
    const EVENT_TYPE: AuditEventType;
    const EVENT_LEVEL: AuditEventLevel;

    fn as_audit_event(&self) -> Result<AuditEvent, serde_json::Error> {
        Ok(AuditEvent {
            event_type: Self::EVENT_TYPE,
            event_level: Self::EVENT_LEVEL,
            data: serde_json::to_value(self)?,
        })
    }
}

impl AsAuditEvent for AuditEvent {
    const EVENT_TYPE: AuditEventType = AuditEventType::UnknownEvent;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Info;

    fn as_audit_event(&self) -> Result<AuditEvent, serde_json::Error> {
        Ok(self.clone())
    }
}

/// Generic error type
#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ErrorDetails {
    pub error_reference: ErrorReference,
    pub path: String,
    pub fatal: bool,
}

impl ErrorDetails {
    pub fn from_error_response(error_response: &ErrorResponse, original_uri: Uri) -> Option<Self> {
        match error_response.reference {
            // ignore common user errors
            ErrorReference::InvalidSession | ErrorReference::UserNotFound => None,
            _ => Some(Self {
                error_reference: error_response.reference,
                path: original_uri.path().to_string(),
                fatal: error_response.fatal,
            }),
        }
    }
}

impl AsAuditEvent for ErrorDetails {
    const EVENT_TYPE: AuditEventType = AuditEventType::UnknownEvent;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Error;

    fn as_audit_event(&self) -> Result<AuditEvent, serde_json::Error> {
        let (event_type, event_level) = if self.fatal {
            (AuditEventType::ApiError, AuditEventLevel::Error)
        } else {
            (AuditEventType::ApiWarning, AuditEventLevel::Warning)
        };

        Ok(AuditEvent {
            event_type,
            event_level,
            data: json!({
                "error_reference": self.error_reference,
                "path": self.path,
            }),
        })
    }
}

#[derive(
    Clone,
    Serialize,
    Deserialize,
    strum::Display,
    sqlx::Type,
    VariantNames,
    Debug,
    PartialEq,
    Eq,
    ToSchema,
    Default,
)]
#[serde(rename_all = "PascalCase")]
pub enum AuditEventType {
    // authentication and account events
    UserLoggedIn,
    UserLoginFailed,
    UserLoggedOut,
    UserAccountUpdated,
    UserSessionExtended,
    // user management events
    UserCreated,
    UserUpdated,
    UserDeleted,
    // election events
    ElectionCreated,
    ElectionUpdated,
    // committee session events
    CommitteeSessionCreated,
    CommitteeSessionDeleted,
    CommitteeSessionUpdated,
    // file events
    FileCreated,
    FileDeleted,
    // apportionment
    ApportionmentCreated,
    // investigation events
    InvestigationCreated,
    InvestigationConcluded,
    InvestigationUpdated,
    InvestigationDeleted,
    // polling station events
    PollingStationCreated,
    PollingStationUpdated,
    PollingStationDeleted,
    PollingStationsImported,
    // data entry events
    DataEntryStarted,
    DataEntrySaved,
    DataEntryResumed,
    DataEntryDeleted,
    DataEntryFinalised,
    // data entry resolving events
    DataEntryDiscardedFirst,
    DataEntryReturnedFirst,
    DataEntryKeptFirst,
    DataEntryKeptSecond,
    DataEntryDiscardedBoth,
    // airgap detection events
    AirGapViolationDetected,
    AirGapViolationResolved,
    // system events
    ApplicationStarted,
    // API events (one for each severity level)
    ApiError,
    ApiWarning,

    #[default]
    UnknownEvent,
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
