use axum::{
    Json,
    response::{IntoResponse, Response},
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::{
    domain::{
        committee_session_status::CommitteeSessionStatus, election::ElectionId, file::FileId,
        id::id, investigation::PollingStationInvestigation,
    },
    infra::audit_log,
};

id!(CommitteeSessionId);

/// Committee session
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSession {
    pub id: CommitteeSessionId,
    pub number: u32,
    pub election_id: ElectionId,
    pub location: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, format = "date-time", nullable = false)]
    pub start_date_time: Option<NaiveDateTime>,
    pub status: CommitteeSessionStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub results_eml: Option<FileId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub results_pdf: Option<FileId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub overview_pdf: Option<FileId>,
}

impl CommitteeSession {
    /// Check if this session is the next session to be held
    pub fn is_next_session(&self) -> bool {
        self.number > 1
    }
}

pub struct CommitteeSessionCreated<'a>(pub &'a CommitteeSession);
pub struct CommitteeSessionUpdated<'a>(pub &'a CommitteeSession);
pub struct CommitteeSessionDeleted<'a>(pub &'a CommitteeSession);

impl<'a> AsAuditEvent for CommitteeSessionCreated<'a> {
    fn as_audit_event(&self) -> AuditEvent {
        AuditEvent {
            event_type: audit_log::AuditEventType::CommitteeSessionCreated,
            data: serde_json::json!({
                "session_id": self.0.id,
                "session_number": self.0.number,
                "session_election_id": self.0.election_id,
                "session_location": self.0.location,
                "session_start_date_time": self.0.start_date_time,
                "session_status": self.0.status.to_string(),
                "session_results_eml": self.0.results_eml,
                "session_results_pdf": self.0.results_pdf,
                "session_overview_pdf": self.0.overview_pdf,
            }),
        }
    }
}

impl<'a> AsAuditEvent for CommitteeSessionUpdated<'a> {
    fn as_audit_event(&self) -> AuditEvent {
        AuditEvent {
            event_type: audit_log::AuditEventType::CommitteeSessionUpdated,
            data: serde_json::json!({
                "session_id": self.0.id,
                "session_number": self.0.number,
                "session_election_id": self.0.election_id,
                "session_location": self.0.location,
                "session_start_date_time": self.0.start_date_time,
                "session_status": self.0.status.to_string(),
                "session_results_eml": self.0.results_eml,
                "session_results_pdf": self.0.results_pdf,
                "session_overview_pdf": self.0.overview_pdf,
            }),
        }
    }
}

impl<'a> AsAuditEvent for CommitteeSessionDeleted<'a> {
    fn as_audit_event(&self) -> AuditEvent {
        AuditEvent {
            event_type: audit_log::AuditEventType::CommitteeSessionDeleted,
            data: serde_json::json!({
                "session_id": self.0.id,
                "session_number": self.0.number,
                "session_election_id": self.0.election_id,
                "session_location": self.0.location,
                "session_start_date_time": self.0.start_date_time,
                "session_status": self.0.status.to_string(),
                "session_results_eml": self.0.results_eml,
                "session_results_pdf": self.0.results_pdf,
                "session_overview_pdf": self.0.overview_pdf,
            }),
        }
    }
}

impl IntoResponse for CommitteeSession {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Committee session create request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSessionCreateRequest {
    pub number: u32,
    pub election_id: ElectionId,
}

/// Committee session update request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSessionUpdateRequest {
    pub location: String,
    pub start_date: String,
    pub start_time: String,
}

/// Committee session status change request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSessionStatusChangeRequest {
    pub status: CommitteeSessionStatus,
}

/// Committee session files update request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct CommitteeSessionFilesUpdateRequest {
    pub results_eml: Option<FileId>,
    pub results_pdf: Option<FileId>,
    pub overview_pdf: Option<FileId>,
}

/// Investigation list response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct InvestigationListResponse {
    pub investigations: Vec<PollingStationInvestigation>,
}

impl IntoResponse for InvestigationListResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}
