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
    pub number_of_voters: u32,
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
            session_number_of_voters: value.number_of_voters,
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

/// Committee session number of voters change request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
pub struct CommitteeSessionNumberOfVotersChangeRequest {
    pub number_of_voters: u32,
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

#[cfg(test)]
pub(crate) mod tests {
    use crate::committee_session::{
        CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionStatus,
        repository::CommitteeSessions,
    };
    use sqlx::SqlitePool;

    /// Create a test committee session.
    pub fn committee_session_fixture(election_id: u32) -> CommitteeSession {
        CommitteeSession {
            id: 1,
            number: 1,
            election_id,
            location: "Test location".to_string(),
            start_date: "22-10-2025".to_string(),
            start_time: "09:15".to_string(),
            status: CommitteeSessionStatus::DataEntryFinished,
            number_of_voters: 100,
        }
    }

    pub async fn create_committee_session(
        pool: SqlitePool,
        number: u32,
        election_id: u32,
    ) -> CommitteeSession {
        CommitteeSessions::new(pool.clone())
            .create(CommitteeSessionCreateRequest {
                number,
                election_id,
            })
            .await
            .unwrap()
    }
}
