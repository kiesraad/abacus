use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::NaiveDateTime;
use serde::Serialize;
use sqlx::{SqliteConnection, SqlitePool};
use tracing::error;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, SqlitePoolExt,
    api::middleware::authentication::RouteAuthorization,
    domain::{
        committee_session::{
            CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionError,
            CommitteeSessionId, CommitteeSessionStatusChangeRequest, CommitteeSessionUpdateRequest,
            InvestigationListResponse,
        },
        committee_session_status::CommitteeSessionStatus,
        election::ElectionId,
        role::Role,
        validate::DataError,
    },
    error::{ApiErrorResponse, ErrorReference, ErrorResponse},
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{
        committee_session_repo::{
            create, delete, get, get_committee_category, get_election_committee_session, update,
        },
        election_repo, investigation_repo,
        user_repo::User,
    },
    service::{
        CommitteeSessionAuditData, CommitteeSessionUpdatedAuditData,
        change_committee_session_status, list_polling_stations_for_session,
    },
};

impl ApiErrorResponse for CommitteeSessionError {
    fn log(&self) {
        error!("Committee session status error: {:?}", self);
    }

    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            CommitteeSessionError::CommitteeSessionPaused => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    "Committee session data entry is paused",
                    ErrorReference::CommitteeSessionPaused,
                    true,
                ),
            ),
            CommitteeSessionError::InvalidCommitteeSessionStatus => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    "Invalid committee session status",
                    ErrorReference::InvalidCommitteeSessionStatus,
                    true,
                ),
            ),
            CommitteeSessionError::InvalidDetails => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new("Invalid details", ErrorReference::InvalidData, false),
            ),
            CommitteeSessionError::InvalidStatusTransition => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    "Invalid committee session state transition",
                    ErrorReference::InvalidStateTransition,
                    true,
                ),
            ),
            CommitteeSessionError::ProviderError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new("Internal server error", ErrorReference::DatabaseError, true),
            ),
        }
    }
}

#[derive(Serialize)]
pub struct CommitteeSessionCreatedAuditData(pub CommitteeSessionAuditData);
impl AsAuditEvent for CommitteeSessionCreatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::CommitteeSessionCreated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

#[derive(Serialize)]
pub struct CommitteeSessionDeletedAuditData(pub CommitteeSessionAuditData);
impl AsAuditEvent for CommitteeSessionDeletedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::CommitteeSessionDeleted;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Info;
}

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    const COORDINATOR: &[Role] = &[CoordinatorCSB, CoordinatorGSB];
    const COORDINATOR_GSB: &[Role] = &[CoordinatorGSB];

    OpenApiRouter::default()
        .routes(routes!(committee_session_create).authorize(COORDINATOR_GSB))
        .routes(routes!(committee_session_delete).authorize(COORDINATOR_GSB))
        .routes(routes!(committee_session_update).authorize(COORDINATOR))
        .routes(routes!(committee_session_status_change).authorize(COORDINATOR))
        .routes(routes!(committee_session_investigations).authorize(COORDINATOR_GSB))
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
            &CommitteeSessionCreatedAuditData(committee_session.clone().into()),
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
)]
pub async fn committee_session_create(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
) -> Result<(StatusCode, CommitteeSession), APIError> {
    let mut tx = pool.begin_immediate().await?;

    let election = election_repo::get(&mut tx, election_id).await?;
    user.role().is_authorized(&election.committee_category)?;

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
        Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into())
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
)]
pub async fn committee_session_delete(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;
    user.role()
        .is_authorized(&get_committee_category(&mut tx, committee_session_id).await?)?;

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
        if investigation_repo::has_investigations_for_committee_session(
            &mut tx,
            committee_session_id,
        )
        .await?
        {
            return Err(APIError::InvalidData(DataError::new(
                "Cannot delete committee session with active investigations",
            )));
        }

        delete(&mut tx, committee_session_id).await?;

        audit_service
            .log(
                &mut tx,
                &CommitteeSessionDeletedAuditData(committee_session.clone().into()),
                None,
            )
            .await?;

        tx.commit().await?;

        Ok(StatusCode::NO_CONTENT)
    } else {
        tx.rollback().await?;

        Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into())
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
)]
pub async fn committee_session_update(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
    Json(request): Json<CommitteeSessionUpdateRequest>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;
    user.role()
        .is_authorized(&get_committee_category(&mut tx, committee_session_id).await?)?;

    if request.location.is_empty() {
        return Err(CommitteeSessionError::InvalidDetails.into());
    }

    let date_time_str = format!("{}T{}", &request.start_date, &request.start_time);
    let date_time = match NaiveDateTime::parse_from_str(&date_time_str, "%Y-%m-%dT%H:%M") {
        Ok(date) => date,
        Err(_) => {
            return Err(CommitteeSessionError::InvalidDetails.into());
        }
    };

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
            &CommitteeSessionUpdatedAuditData(committee_session.clone().into()),
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
)]
pub async fn committee_session_status_change(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
    Json(committee_session_request): Json<CommitteeSessionStatusChangeRequest>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;
    user.role()
        .is_authorized(&get_committee_category(&mut tx, committee_session_id).await?)?;

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

/// Get a list of all [crate::domain::investigation::PollingStationInvestigation]s for a committee session
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
)]
pub async fn committee_session_investigations(
    user: User,
    State(pool): State<SqlitePool>,
    Path((_election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<Json<InvestigationListResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    user.role()
        .is_authorized(&get_committee_category(&mut conn, committee_session_id).await?)?;

    let committee_session = get(&mut conn, committee_session_id).await?;

    let investigations = list_polling_stations_for_session(&mut conn, &committee_session)
        .await?
        .investigations();

    Ok(Json(InvestigationListResponse { investigations }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::response::{IntoResponse, Response};
    use test_log::test;

    use crate::{
        api::tests::{
            assert_committee_category_authorization_err, assert_committee_category_authorization_ok,
        },
        repository::user_repo::UserId,
    };

    async fn call_handlers(
        pool: SqlitePool,
        coordinator_role: Role,
    ) -> Vec<(&'static str, Response)> {
        let user = User::test_user(coordinator_role, UserId::from(1));
        let audit = AuditService::new(Some(user.clone()), None);

        let election_id = ElectionId::from(2);
        let committee_session_id = CommitteeSessionId::from(2);

        #[rustfmt::skip]
        let results = vec![
            ("create",         committee_session_create(user.clone(), State(pool.clone()), audit.clone(), Path(election_id)).await.into_response()),
            ("delete",         committee_session_delete(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
            ("update",         committee_session_update(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id)), Json(CommitteeSessionUpdateRequest { location: "Test".into(), start_date: "2026-04-01".into(), start_time: "09:30".into() })).await.into_response()),
            ("status_change",  committee_session_status_change(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id)), Json(CommitteeSessionStatusChangeRequest { status: CommitteeSessionStatus::DataEntry })).await.into_response()),
            ("investigations", committee_session_investigations(user.clone(), State(pool.clone()), Path((election_id, committee_session_id))).await.into_response()),
        ];
        results
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_committee_category_authorization_err(pool: SqlitePool) {
        let results = call_handlers(pool, Role::CoordinatorCSB).await;
        assert_committee_category_authorization_err(results).await;
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_committee_category_authorization_ok(pool: SqlitePool) {
        let results = call_handlers(pool, Role::CoordinatorGSB).await;
        assert_committee_category_authorization_ok(results);
    }
}
