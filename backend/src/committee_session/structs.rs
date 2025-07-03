use axum::{
    Json,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use strum::VariantNames;
use utoipa::ToSchema;

use crate::audit_log::CommitteeSessionDetails;

/// Committee session
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
pub struct CommitteeSession {
    pub id: u32,
    pub number: u32,
    pub election_id: u32,
    pub location: String,
    pub start_date: String,
    pub start_time: String,
    pub status: CommitteeSessionStatus,
}

impl From<CommitteeSession> for CommitteeSessionDetails {
    fn from(value: CommitteeSession) -> Self {
        Self {
            session_id: value.id,
            session_number: value.number,
            session_election_id: value.election_id,
            session_location: value.location,
            session_start_date: value.start_date,
            session_start_time: value.start_time,
            session_status: value.status.to_string(),
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
pub struct CommitteeSessionCreateRequest {
    pub number: u32,
    pub election_id: u32,
}

/// Committee session update request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
pub struct CommitteeSessionUpdateRequest {
    pub location: String,
    pub start_date: String,
    pub start_time: String,
}

/// Committee session status change request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
pub struct CommitteeSessionStatusChangeRequest {
    pub status: CommitteeSessionStatus,
}

/// Committee session status
#[derive(
    Serialize,
    Deserialize,
    VariantNames,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    ToSchema,
    Type,
    strum::Display,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum CommitteeSessionStatus {
    Created,
    DataEntryNotStarted,
    DataEntryInProgress,
    DataEntryPaused,
    DataEntryFinished,
}
