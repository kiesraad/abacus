use axum::{
    Json,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

// use crate::audit_log::CommitteeSessionDetails;

/// Session
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
pub struct CommitteeSession {
    pub id: u32,
    pub number: u32,
    pub election_id: u32,
    #[schema(value_type = String)]
    pub started_at: DateTime<Utc>,
    pub status: CommitteeSessionStatus,
}

// impl From<CommitteeSession> for CommitteeSessionDetails {
//     fn from(value: CommitteeSession) -> Self {
//         Self {
//             session_id: value.id,
//             session_number: value.number,
//             session_election_id: value.election_id,
//             session_started_at: value.started_at,
//             session_status: value.status.to_string(),
//         }
//     }
// }

impl IntoResponse for CommitteeSession {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Session request
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
pub struct NewCommitteeSession {
    pub election_id: String,
    #[schema(value_type = String)]
    pub started_at: DateTime<Utc>,
    pub status: CommitteeSessionStatus,
}

/// Session status
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

#[cfg(test)]
pub(crate) mod tests {
    use super::*;

    /// Create a test session.
    pub fn session_fixture() -> CommitteeSession {
        CommitteeSession {
            id: 1,
            number: 1,
            election_id: 1,
            started_at: Utc::now(),
            status: CommitteeSessionStatus::DataEntryInProgress,
        }
    }
}
