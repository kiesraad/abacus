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
    pub data: serde_json::Value,
}

pub trait AsAuditEvent {
    fn as_audit_event(&self) -> AuditEvent;
}

impl AsAuditEvent for AuditEvent {
    fn as_audit_event(&self) -> AuditEvent {
        self.clone()
    }
}

macro_rules! as_audit_event {
    ($identifier:ident, $audit_event_type:path) => {
        impl AsAuditEvent for $identifier {
            fn as_audit_event(&self) -> crate::audit_log::AuditEvent {
                AuditEvent {
                    event_type: $audit_event_type,
                    data: serde_json::to_value(self).expect("could not serialize to JSON"),
                }
            }
        }
    };
}

pub(crate) use as_audit_event;

/// Generic error type
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

impl AsAuditEvent for ErrorDetails {
    fn as_audit_event(&self) -> AuditEvent {
        AuditEvent {
            event_type: AuditEventType::Error,
            data: json!({
                "reference": self.reference,
                "path": self.path,
                "level": self.level,
            }),
        }
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
    // investigation events
    PollingStationInvestigationCreated,
    PollingStationInvestigationConcluded,
    PollingStationInvestigationUpdated,
    PollingStationInvestigationDeleted,
    // file events
    FileCreated,
    FileDeleted,
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
    ResultDeleted,
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
    // generic errors (one for each severity level)
    Error,

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

impl AuditEventType {
    pub fn level(&self) -> AuditEventLevel {
        match self {
            AuditEventType::UserLoggedIn => AuditEventLevel::Success,
            AuditEventType::UserLoginFailed => AuditEventLevel::Warning,
            AuditEventType::UserLoggedOut => AuditEventLevel::Success,
            AuditEventType::UserSessionExtended => AuditEventLevel::Info,
            AuditEventType::UserAccountUpdated => AuditEventLevel::Success,
            AuditEventType::UserCreated => AuditEventLevel::Success,
            AuditEventType::UserUpdated => AuditEventLevel::Success,
            AuditEventType::UserDeleted => AuditEventLevel::Info,
            AuditEventType::ElectionCreated => AuditEventLevel::Success,
            AuditEventType::ElectionUpdated => AuditEventLevel::Success,
            AuditEventType::CommitteeSessionCreated => AuditEventLevel::Success,
            AuditEventType::CommitteeSessionDeleted => AuditEventLevel::Info,
            AuditEventType::CommitteeSessionUpdated => AuditEventLevel::Success,
            AuditEventType::FileCreated => AuditEventLevel::Success,
            AuditEventType::FileDeleted => AuditEventLevel::Info,
            AuditEventType::PollingStationCreated => AuditEventLevel::Success,
            AuditEventType::PollingStationUpdated => AuditEventLevel::Success,
            AuditEventType::PollingStationDeleted => AuditEventLevel::Info,
            AuditEventType::PollingStationsImported => AuditEventLevel::Success,
            AuditEventType::PollingStationInvestigationCreated => AuditEventLevel::Success,
            AuditEventType::PollingStationInvestigationConcluded => AuditEventLevel::Success,
            AuditEventType::PollingStationInvestigationUpdated => AuditEventLevel::Success,
            AuditEventType::PollingStationInvestigationDeleted => AuditEventLevel::Info,
            AuditEventType::DataEntryStarted => AuditEventLevel::Success,
            AuditEventType::DataEntrySaved => AuditEventLevel::Success,
            AuditEventType::DataEntryResumed => AuditEventLevel::Success,
            AuditEventType::DataEntryDeleted => AuditEventLevel::Info,
            AuditEventType::DataEntryFinalised => AuditEventLevel::Success,
            AuditEventType::ResultDeleted => AuditEventLevel::Success,
            AuditEventType::ApplicationStarted => AuditEventLevel::Info,
            AuditEventType::UnknownEvent => AuditEventLevel::Warning,
            AuditEventType::DataEntryDiscardedFirst => AuditEventLevel::Info,
            AuditEventType::DataEntryReturnedFirst => AuditEventLevel::Info,
            AuditEventType::DataEntryKeptFirst => AuditEventLevel::Info,
            AuditEventType::DataEntryKeptSecond => AuditEventLevel::Info,
            AuditEventType::DataEntryDiscardedBoth => AuditEventLevel::Info,
            AuditEventType::AirGapViolationDetected => AuditEventLevel::Error,
            AuditEventType::AirGapViolationResolved => AuditEventLevel::Info,
            AuditEventType::Error => AuditEventLevel::Error,
        }
    }
}
