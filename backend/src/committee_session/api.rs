use axum::response::{IntoResponse, Response};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionUpdateRequest,
    repository::CommitteeSessions,
};
use crate::audit_log::{AuditEvent, AuditService};
use crate::{
    APIError, AppState, ErrorResponse,
    authentication::{Admin, User},
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(committee_session_list))
        .routes(routes!(committee_session_details))
        .routes(routes!(committee_session_create))
        .routes(routes!(committee_session_update))
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

/// Get a list of all [CommitteeSession]s
#[utoipa::path(
  get,
  path = "/api/committee_sessions",
  responses(
        (status = 200, description = "Committee session list", body = CommitteeSessionListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
pub async fn committee_session_list(
    _user: User,
    State(committee_sessions_repo): State<CommitteeSessions>,
) -> Result<Json<CommitteeSessionListResponse>, APIError> {
    let committee_sessions = committee_sessions_repo.list().await?;
    Ok(Json(CommitteeSessionListResponse { committee_sessions }))
}

/// Get [CommitteeSession] details
#[utoipa::path(
  get,
  path = "/api/committee_sessions/{committee_session_id}",
  responses(
        (status = 200, description = "Committee session", body = CommitteeSession),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
  params(
        ("committee_session_id" = u32, description = "Committee session database id"),
  ),
)]
pub async fn committee_session_details(
    _user: User,
    State(committee_sessions_repo): State<CommitteeSessions>,
    Path(id): Path<u32>,
) -> Result<Json<CommitteeSession>, APIError> {
    let committee_session = committee_sessions_repo.get(id).await?;
    Ok(Json(committee_session))
}

/// Create a new [CommitteeSession]
#[utoipa::path(
    post,
    path = "/api/committee_sessions",
    request_body = CommitteeSessionCreateRequest,
    responses(
        (status = 201, description = "Committee session created", body = CommitteeSession),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn committee_session_create(
    _user: Admin,
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
        (status = 404, description = "Committee session not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn committee_session_update(
    _user: Admin,
    State(committee_sessions_repo): State<CommitteeSessions>,
    audit_service: AuditService,
    Path(id): Path<u32>,
    Json(committee_session_request): Json<CommitteeSessionUpdateRequest>,
) -> Result<StatusCode, APIError> {
    let updated = committee_sessions_repo
        .update(id, committee_session_request)
        .await?;

    if updated {
        let committee_session = committee_sessions_repo.get(id).await?;

        audit_service
            .log(
                &AuditEvent::CommitteeSessionUpdated(committee_session.clone().into()),
                None,
            )
            .await?;

        Ok(StatusCode::OK)
    } else {
        Ok(StatusCode::NOT_FOUND)
    }
}
