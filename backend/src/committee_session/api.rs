use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::NaiveDateTime;
use sqlx::{SqliteConnection, SqlitePool};
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionStatusChangeRequest,
    CommitteeSessionUpdateRequest, InvestigationListResponse,
    repository::{create, delete, get, get_election_committee_session, update},
    status::{CommitteeSessionStatus, change_committee_session_status},
};
use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::Coordinator,
    committee_session::CommitteeSessionId,
    election::ElectionId,
    error::ErrorReference,
    investigation::list_investigations_for_committee_session,
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
        .routes(routes!(committee_session_create))
        .routes(routes!(committee_session_delete))
        .routes(routes!(committee_session_update))
        .routes(routes!(committee_session_status_change))
        .routes(routes!(committee_session_investigations))
}

pub async fn validate_committee_session_is_current_committee_session(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    committee_session_id: CommitteeSessionId,
) -> Result<CommitteeSession, APIError> {
    // Get current committee session and check if the committee session id given
    // matches the current committee session id, return NOT_FOUND otherwise
    let current_committee_session = get_election_committee_session(conn, election_id).await?;
    if committee_session_id != current_committee_session.id {
        Err(APIError::NotFound(
            "Committee session is not current committee session".to_string(),
            ErrorReference::EntryNotFound,
        ))
    } else {
        Ok(current_committee_session)
    }
}

pub async fn create_committee_session(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session_create_request: CommitteeSessionCreateRequest,
) -> Result<CommitteeSession, APIError> {
    let committee_session = create(conn, committee_session_create_request).await?;
    audit_service
        .log(
            conn,
            &AuditEvent::CommitteeSessionCreated(serde_json::to_value(&committee_session)?),
            None,
        )
        .await?;
    Ok(committee_session)
}

/// Create a new [CommitteeSession].
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/committee_sessions",
    responses(
        (status = 201, description = "Committee session created", body = CommitteeSession),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn committee_session_create(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<(StatusCode, CommitteeSession), APIError> {
    let mut tx = pool.begin_immediate().await?;

    let current_committee_session = get_election_committee_session(&mut tx, election_id).await?;

    if current_committee_session.status == CommitteeSessionStatus::Completed {
        let next_committee_session = create_committee_session(&mut tx, &audit_service, {
            CommitteeSessionCreateRequest {
                election_id,
                number: current_committee_session.number + 1,
            }
        })
        .await?;

        tx.commit().await?;

        Ok((StatusCode::CREATED, next_committee_session))
    } else {
        tx.rollback().await?;
        Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ))
    }
}

/// Delete a [CommitteeSession].
#[utoipa::path(
    delete,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}",
    responses(
        (status = 204, description = "Committee session deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Committee session not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn committee_session_delete(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_committee_session_is_current_committee_session(
        &mut tx,
        election_id,
        committee_session_id,
    )
    .await?;

    if committee_session.is_next_session()
        && (committee_session.status == CommitteeSessionStatus::Created
            || committee_session.status == CommitteeSessionStatus::InPreparation)
    {
        delete(&mut tx, committee_session_id).await?;

        audit_service
            .log(
                &mut tx,
                &AuditEvent::CommitteeSessionDeleted(serde_json::to_value(&committee_session)?),
                None,
            )
            .await?;

        tx.commit().await?;

        Ok(StatusCode::NO_CONTENT)
    } else {
        tx.rollback().await?;

        Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ))
    }
}

/// Update a [CommitteeSession].
#[utoipa::path(
    put,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}",
    request_body = CommitteeSessionUpdateRequest,
    responses(
        (status = 204, description = "Committee session updated successfully"),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Committee session not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn committee_session_update(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
    Json(request): Json<CommitteeSessionUpdateRequest>,
) -> Result<StatusCode, APIError> {
    if request.location.is_empty() {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidDetails,
        ));
    }

    let date_time_str = format!("{}T{}", &request.start_date, &request.start_time);
    let date_time = match NaiveDateTime::parse_from_str(&date_time_str, "%Y-%m-%dT%H:%M") {
        Ok(date) => date,
        Err(_) => {
            return Err(APIError::CommitteeSession(
                CommitteeSessionError::InvalidDetails,
            ));
        }
    };

    let mut tx = pool.begin_immediate().await?;

    validate_committee_session_is_current_committee_session(
        &mut tx,
        election_id,
        committee_session_id,
    )
    .await?;

    let committee_session =
        update(&mut tx, committee_session_id, request.location, date_time).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::CommitteeSessionUpdated(serde_json::to_value(&committee_session)?),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Change the status of a [CommitteeSession].
#[utoipa::path(
    put,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/status",
    request_body = CommitteeSessionStatusChangeRequest,
    responses(
        (status = 204, description = "Committee session status changed successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Committee session not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn committee_session_status_change(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
    Json(committee_session_request): Json<CommitteeSessionStatusChangeRequest>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    validate_committee_session_is_current_committee_session(
        &mut tx,
        election_id,
        committee_session_id,
    )
    .await?;

    change_committee_session_status(
        &mut tx,
        committee_session_id,
        committee_session_request.status,
        audit_service,
    )
    .await?;
    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Get a list of all [Investigation]s for a committee session
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/investigations",
    responses(
        (status = 200, description = "Investigation listing successful", body = InvestigationListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Committee session not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn committee_session_investigations(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<Json<InvestigationListResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    // Check if the election exists, will respond with NOT_FOUND otherwise
    crate::election::repository::get(&mut conn, election_id).await?;

    let committee_session = get(&mut conn, committee_session_id).await?;

    Ok(Json(InvestigationListResponse {
        investigations: list_investigations_for_committee_session(&mut conn, committee_session.id)
            .await?,
    }))
}

#[cfg(test)]
pub mod tests {
    use chrono::NaiveDate;
    use sqlx::SqlitePool;

    use super::{CommitteeSession, CommitteeSessionId, CommitteeSessionStatus};
    use crate::{committee_session::repository::change_status, election::ElectionId};

    pub async fn change_status_committee_session(
        pool: SqlitePool,
        committee_session_id: CommitteeSessionId,
        status: CommitteeSessionStatus,
    ) -> CommitteeSession {
        let mut conn = pool.acquire().await.unwrap();
        change_status(&mut conn, committee_session_id, status)
            .await
            .unwrap()
    }

    /// Create a test committee session.
    pub fn committee_session_fixture(election_id: ElectionId) -> CommitteeSession {
        CommitteeSession {
            id: CommitteeSessionId::from(1),
            number: 1,
            election_id,
            location: "Test location".to_string(),
            start_date_time: NaiveDate::from_ymd_opt(2025, 10, 22)
                .and_then(|d| d.and_hms_opt(9, 15, 0)),
            status: CommitteeSessionStatus::Completed,
            results_eml: None,
            results_pdf: None,
            overview_pdf: None,
        }
    }
}
