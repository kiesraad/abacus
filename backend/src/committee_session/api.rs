use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionNumberOfVotersChangeRequest,
    CommitteeSessionStatusChangeRequest, CommitteeSessionUpdateRequest,
    repository::CommitteeSessions,
    status::{CommitteeSessionTransitionError, change_committee_session_status},
};
use crate::{
    APIError, AppState, ErrorResponse,
    audit_log::{AuditEvent, AuditService},
    authentication::{AdminOrCoordinator, Coordinator},
    election::repository::Elections,
    error::ErrorReference,
};

impl From<CommitteeSessionTransitionError> for APIError {
    fn from(err: CommitteeSessionTransitionError) -> Self {
        match err {
            CommitteeSessionTransitionError::Invalid => {
                APIError::Conflict(err.to_string(), ErrorReference::InvalidStateTransition)
            }
        }
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(election_committee_session_list))
        .routes(routes!(committee_session_create))
        .routes(routes!(committee_session_update))
        .routes(routes!(committee_session_number_of_voters_change))
        .routes(routes!(committee_session_status_change))
}

/// Committee session list response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct CommitteeSessionListResponse {
    pub committee_sessions: Vec<CommitteeSession>,
}

impl IntoResponse for CommitteeSessionListResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Get a list of all [CommitteeSession]s of an election
#[utoipa::path(
  get,
  path = "/api/elections/{election_id}/committee_sessions",
  responses(
        (status = 200, description = "Committee session list", body = CommitteeSessionListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
  params(
        ("election_id" = u32, description = "Election database id"),
  ),
)]
pub async fn election_committee_session_list(
    _user: AdminOrCoordinator,
    State(committee_sessions_repo): State<CommitteeSessions>,
    State(elections_repo): State<Elections>,
    Path(election_id): Path<u32>,
) -> Result<Json<CommitteeSessionListResponse>, APIError> {
    elections_repo.get(election_id).await?;
    let committee_sessions = committee_sessions_repo
        .get_election_committee_session_list(election_id)
        .await?;
    Ok(Json(CommitteeSessionListResponse { committee_sessions }))
}

/// Create a new [CommitteeSession].
#[utoipa::path(
    post,
    path = "/api/committee_sessions",
    request_body = CommitteeSessionCreateRequest,
    responses(
        (status = 201, description = "Committee session created", body = CommitteeSession),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn committee_session_create(
    _user: Coordinator,
    State(committee_sessions_repo): State<CommitteeSessions>,
    audit_service: AuditService,
    Json(committee_session_request): Json<CommitteeSessionCreateRequest>,
) -> Result<(StatusCode, CommitteeSession), APIError> {
    let committee_session = committee_sessions_repo
        .create(committee_session_request)
        .await?;

    audit_service
        .log(
            &AuditEvent::CommitteeSessionCreated(committee_session.clone().into()),
            None,
        )
        .await?;

    Ok((StatusCode::CREATED, committee_session))
}

/// Update a [CommitteeSession].
#[utoipa::path(
    put,
    path = "/api/committee_sessions/{committee_session_id}",
    request_body = CommitteeSessionUpdateRequest,
    responses(
        (status = 200, description = "Committee session updated successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Committee session not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("committee_session_id" = u32, description = "Committee session database id"),
    ),
)]
pub async fn committee_session_update(
    _user: Coordinator,
    State(committee_sessions_repo): State<CommitteeSessions>,
    audit_service: AuditService,
    Path(committee_session_id): Path<u32>,
    Json(committee_session_request): Json<CommitteeSessionUpdateRequest>,
) -> Result<StatusCode, APIError> {
    let committee_session = committee_sessions_repo
        .update(committee_session_id, committee_session_request)
        .await?;

    audit_service
        .log(
            &AuditEvent::CommitteeSessionUpdated(committee_session.clone().into()),
            None,
        )
        .await?;

    Ok(StatusCode::OK)
}

/// Change the number of voters of a [CommitteeSession].
#[utoipa::path(
    put,
    path = "/api/committee_sessions/{committee_session_id}/voters",
    request_body = CommitteeSessionNumberOfVotersChangeRequest,
    responses(
        (status = 200, description = "Committee session number of voters changed successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Committee session not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("committee_session_id" = u32, description = "Committee session database id"),
    ),
)]
pub async fn committee_session_number_of_voters_change(
    _user: Coordinator,
    State(committee_sessions_repo): State<CommitteeSessions>,
    audit_service: AuditService,
    Path(committee_session_id): Path<u32>,
    Json(committee_session_request): Json<CommitteeSessionNumberOfVotersChangeRequest>,
) -> Result<StatusCode, APIError> {
    let committee_session = committee_sessions_repo
        .change_number_of_voters(
            committee_session_id,
            committee_session_request.number_of_voters,
        )
        .await?;

    audit_service
        .log(
            &AuditEvent::CommitteeSessionUpdated(committee_session.clone().into()),
            None,
        )
        .await?;

    Ok(StatusCode::OK)
}

/// Change the status of a [CommitteeSession].
#[utoipa::path(
    put,
    path = "/api/committee_sessions/{committee_session_id}/status",
    request_body = CommitteeSessionStatusChangeRequest,
    responses(
        (status = 200, description = "Committee session status changed successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Committee session not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("committee_session_id" = u32, description = "Committee session database id"),
    ),
)]
pub async fn committee_session_status_change(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(committee_session_id): Path<u32>,
    Json(committee_session_request): Json<CommitteeSessionStatusChangeRequest>,
) -> Result<StatusCode, APIError> {
    change_committee_session_status(
        committee_session_id,
        committee_session_request.status,
        pool.clone(),
        audit_service,
    )
    .await?;

    Ok(StatusCode::OK)
}

#[cfg(test)]
pub mod tests {
    use crate::committee_session::{
        CommitteeSession, CommitteeSessionCreateRequest, repository::CommitteeSessions,
        status::CommitteeSessionStatus,
    };
    use sqlx::SqlitePool;

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

    pub async fn change_status_committee_session(
        pool: SqlitePool,
        committee_session_id: u32,
        status: CommitteeSessionStatus,
    ) -> CommitteeSession {
        CommitteeSessions::new(pool.clone())
            .change_status(committee_session_id, status)
            .await
            .unwrap()
    }

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
}
