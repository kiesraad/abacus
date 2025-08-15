use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionNumberOfVotersChangeRequest,
    CommitteeSessionStatusChangeRequest, CommitteeSessionUpdateRequest,
    status::change_committee_session_status,
};
use crate::committee_session::status::CommitteeSessionStatus::DataEntryFinished;
use crate::{
    APIError, AppState, ErrorResponse,
    audit_log::{AuditEvent, AuditService},
    authentication::{AdminOrCoordinator, Coordinator},
};

#[derive(Debug, PartialEq, Eq)]
pub enum CommitteeSessionError {
    CommitteeSessionPaused,
    InvalidCommitteeSessionStatus,
    InvalidDetails,
    InvalidStatusTransition,
}

impl From<CommitteeSessionError> for APIError {
    fn from(err: CommitteeSessionError) -> Self {
        APIError::CommitteeSession(err)
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
#[serde(deny_unknown_fields)]
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
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<Json<CommitteeSessionListResponse>, APIError> {
    crate::election::repository::get(&pool, election_id).await?;
    let committee_sessions =
        crate::committee_session::repository::get_election_committee_session_list(
            &pool,
            election_id,
        )
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
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn committee_session_create(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(committee_session_request): Json<CommitteeSessionCreateRequest>,
) -> Result<(StatusCode, CommitteeSession), APIError> {
    let committee_session = crate::committee_session::repository::get_election_committee_session(
        &pool,
        committee_session_request.election_id,
    )
    .await?;
    if committee_session.status == DataEntryFinished {
        let committee_session =
            crate::committee_session::repository::create(&pool, committee_session_request).await?;

        audit_service
            .log(
                &AuditEvent::CommitteeSessionCreated(committee_session.clone().into()),
                None,
            )
            .await?;

        Ok((StatusCode::CREATED, committee_session))
    } else {
        Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ))
    }
}

/// Update a [CommitteeSession].
#[utoipa::path(
    put,
    path = "/api/committee_sessions/{committee_session_id}",
    request_body = CommitteeSessionUpdateRequest,
    responses(
        (status = 200, description = "Committee session updated successfully"),
        (status = 400, description = "Bad request", body = ErrorResponse),
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
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(committee_session_id): Path<u32>,
    Json(request): Json<CommitteeSessionUpdateRequest>,
) -> Result<StatusCode, APIError> {
    let date_time = format!("{0} {1}", &request.start_date, &request.start_time);
    if request.location.is_empty()
        || NaiveDateTime::parse_from_str(&date_time, "%Y-%m-%d %H:%M").is_err()
    {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidDetails,
        ));
    };

    let committee_session =
        crate::committee_session::repository::update(&pool, committee_session_id, request).await?;

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
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(committee_session_id): Path<u32>,
    Json(committee_session_request): Json<CommitteeSessionNumberOfVotersChangeRequest>,
) -> Result<StatusCode, APIError> {
    let committee_session = crate::committee_session::repository::change_number_of_voters(
        &pool,
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
        CommitteeSession, CommitteeSessionCreateRequest, status::CommitteeSessionStatus,
    };
    use sqlx::SqlitePool;

    pub async fn create_committee_session(
        pool: SqlitePool,
        number: u32,
        election_id: u32,
        number_of_voters: u32,
    ) -> CommitteeSession {
        crate::committee_session::repository::create(
            &pool,
            CommitteeSessionCreateRequest {
                number,
                election_id,
                number_of_voters,
            },
        )
        .await
        .unwrap()
    }

    pub async fn change_status_committee_session(
        pool: SqlitePool,
        committee_session_id: u32,
        status: CommitteeSessionStatus,
    ) -> CommitteeSession {
        crate::committee_session::repository::change_status(&pool, committee_session_id, status)
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
