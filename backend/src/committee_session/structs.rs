use axum::{
    Json,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
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
    pub election_id: u32,
    pub number: u32,
    pub status: CommitteeSessionStatus,
}

/// Committee session update request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
pub struct CommitteeSessionUpdateRequest {
    pub location: String,
    pub start_date: String,
    pub start_time: String,
}

/// Committee session status
#[derive(
    Serialize, Deserialize, strum::Display, ToSchema, Clone, Debug, PartialEq, Eq, Hash, Type,
)]
#[strum(serialize_all = "lowercase")]
pub enum CommitteeSessionStatus {
    Created,
    DataEntryInProgress,
    DataEntryPaused,
    DataEntryFinished,
}

// #[cfg(test)]
// pub(crate) mod tests {
//     use super::*;
//
//     Create a test committee session.
//     pub fn committee_session_fixture() -> CommitteeSession {
//         CommitteeSession {
//             id: 1,
//             number: 1,
//             election_id: 1,
//             location: "Heemdamsebrug".to_string(),
//             start_date: "25-10-2025".to_string(),
//             start_time: "10:45".to_string(),
//             status: CommitteeSessionStatus::DataEntryInProgress,
//         }
//     }
// }
