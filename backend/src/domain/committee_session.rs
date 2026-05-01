use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use tracing::error;
use utoipa::ToSchema;

use crate::{
    domain::{
        committee_session_status::CommitteeSessionStatus, election::ElectionId, identifier::id,
        investigation::PollingStationInvestigation,
    },
    error::{ApiErrorResponse, ErrorReference, ErrorResponse, error_response},
};

#[derive(Debug, PartialEq, Eq)]
pub enum CommitteeSessionError {
    CommitteeSessionPaused,
    InvalidCommitteeSessionStatus,
    InvalidDetails,
    InvalidStatusTransition,
    ProviderError,
}

impl ApiErrorResponse for CommitteeSessionError {
    fn log(&self) {
        error!("Committee session status error: {:?}", self);
    }

    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            CommitteeSessionError::CommitteeSessionPaused => (
                StatusCode::CONFLICT,
                error_response(
                    "Committee session data entry is paused",
                    ErrorReference::CommitteeSessionPaused,
                    true,
                ),
            ),
            CommitteeSessionError::InvalidCommitteeSessionStatus => (
                StatusCode::CONFLICT,
                error_response(
                    "Invalid committee session status",
                    ErrorReference::InvalidCommitteeSessionStatus,
                    true,
                ),
            ),
            CommitteeSessionError::InvalidDetails => (
                StatusCode::BAD_REQUEST,
                error_response("Invalid details", ErrorReference::InvalidData, false),
            ),
            CommitteeSessionError::InvalidStatusTransition => (
                StatusCode::CONFLICT,
                error_response(
                    "Invalid committee session state transition",
                    ErrorReference::InvalidStateTransition,
                    true,
                ),
            ),
            CommitteeSessionError::ProviderError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response("Internal server error", ErrorReference::DatabaseError, true),
            ),
        }
    }
}

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
}

impl CommitteeSession {
    /// Check if this session is the next session to be held
    pub fn is_next_session(&self) -> bool {
        self.number > 1
    }

    #[cfg(test)]
    pub fn first_session() -> Self {
        CommitteeSession {
            number: 1,
            id: CommitteeSessionId::from(0),
            election_id: ElectionId::from(0),
            location: "".to_string(),
            start_date_time: None,
            status: CommitteeSessionStatus::Created,
        }
    }

    #[cfg(test)]
    pub fn next_session() -> Self {
        CommitteeSession {
            number: 2,
            ..CommitteeSession::first_session()
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

/// Create a test committee session.
#[cfg(test)]
pub fn committee_session_fixture(election_id: ElectionId) -> CommitteeSession {
    CommitteeSession {
        id: CommitteeSessionId::from(1),
        number: 1,
        election_id,
        location: "Test location".to_string(),
        start_date_time: chrono::NaiveDate::from_ymd_opt(2025, 10, 22)
            .and_then(|d| d.and_hms_opt(9, 15, 0)),
        status: CommitteeSessionStatus::Completed,
    }
}
