use axum::{
    Json,
    extract::{FromRequest, Path, State},
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::Coordinator,
    data_entry::{
        domain::{
            data_entry_status::DataEntryStatus,
            data_entry_status_response::DataEntryStatusResponse,
            polling_station_data_entry::PollingStationDataEntry,
        },
        repository::data_entry_repo,
        service::{delete_data_entry_and_result_for_polling_station, validate_and_get_data},
    },
};

/// Resolve accepted data entry errors by providing a `ResolveErrorsAction`
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/resolve_errors",
    request_body = ResolveErrorsAction,
    responses(
        (status = 200, description = "Errors resolved successfully", body = DataEntryStatusResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "JSON error or invalid data (Unprocessable Content)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_data_entry_resolve_errors(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
    audit_service: AuditService,
    action: ResolveErrorsAction,
) -> Result<Json<DataEntryStatusResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (_, _, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let new_state = match action {
        ResolveErrorsAction::DiscardFirstEntry => state.discard_first_entry()?,
        ResolveErrorsAction::ResumeFirstEntry => state.resume_first_entry()?,
    };

    if new_state == DataEntryStatus::FirstEntryNotStarted {
        // The database entry of the data entry is fully deleted when the first entry is discarded
        delete_data_entry_and_result_for_polling_station(
            &mut tx,
            &audit_service,
            &committee_session,
            polling_station_id,
        )
        .await?;
    } else {
        // The status of the data entry is updated when the first entry is resumed
        let data_entry = data_entry_repo::upsert(
            &mut tx,
            polling_station_id,
            committee_session.id,
            &new_state,
        )
        .await?;
        audit_service
            .log(&mut tx, &action.audit_event(data_entry.clone()), None)
            .await?;
    }

    tx.commit().await?;

    Ok(Json(new_state.into()))
}

#[derive(Debug, Serialize, Deserialize, ToSchema, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
#[serde(deny_unknown_fields, rename_all = "snake_case")]
pub enum ResolveErrorsAction {
    DiscardFirstEntry,
    ResumeFirstEntry,
}

impl ResolveErrorsAction {
    pub fn audit_event(&self, data_entry: PollingStationDataEntry) -> AuditEvent {
        match self {
            ResolveErrorsAction::DiscardFirstEntry => {
                AuditEvent::DataEntryDiscardedFirst(data_entry.into())
            }
            ResolveErrorsAction::ResumeFirstEntry => {
                AuditEvent::DataEntryReturnedFirst(data_entry.into())
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use axum::{
        http::StatusCode,
        response::{IntoResponse, Response},
    };
    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{
        authentication::{Role, User},
        committee_session::{
            status::CommitteeSessionStatus, tests::change_status_committee_session,
        },
        data_entry::api::{data_entry_finalise::tests::finalise_with_errors, resolve_errors},
        error::ErrorReference,
    };

    async fn resolve_errors(
        pool: SqlitePool,
        polling_station_id: u32,
        action: ResolveErrorsAction,
    ) -> Response {
        let user = User::test_user(Role::Coordinator, 1);
        resolve_errors::polling_station_data_entry_resolve_errors(
            Coordinator(user.clone()),
            State(pool.clone()),
            Path(polling_station_id),
            AuditService::new(Some(user), None),
            action,
        )
        .await
        .into_response()
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_errors_resume_first(pool: SqlitePool) {
        finalise_with_errors(pool.clone()).await;

        let response = resolve_errors(pool.clone(), 1, ResolveErrorsAction::ResumeFirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryInProgress(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_errors_discard_first(pool: SqlitePool) {
        finalise_with_errors(pool.clone()).await;

        // Check that the data entry is created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        let response =
            resolve_errors(pool.clone(), 1, ResolveErrorsAction::DiscardFirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that the data entry is deleted
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_errors_committee_session_status_not_ok(pool: SqlitePool) {
        finalise_with_errors(pool.clone()).await;

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryFinished)
            .await;

        let response =
            resolve_errors(pool.clone(), 1, ResolveErrorsAction::DiscardFirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );

        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryHasErrors(_)));
    }
}
