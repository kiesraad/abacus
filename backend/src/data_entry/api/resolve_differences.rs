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
            data_entry_status::{DataEntryStatus, EntriesDifferent},
            data_entry_status_response::DataEntryStatusResponse,
            polling_station_data_entry::PollingStationDataEntry,
            polling_station_results::PollingStationResults,
        },
        repository::data_entry_repo,
        service::{delete_data_entry_and_result_for_polling_station, validate_and_get_data},
    },
    error::ErrorReference,
};

/// Get data entry differences to be resolved
#[utoipa::path(
    get,
    path = "/api/polling_stations/{polling_station_id}/data_entries/resolve_differences",
    responses(
        (status = 200, description = "Data entry differences to be resolved", body = DataEntryGetDifferencesResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "No data entry with differences found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_data_entry_get_differences(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
) -> Result<Json<DataEntryGetDifferencesResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let (_, _, _, state) = validate_and_get_data(&mut conn, polling_station_id, &user.0).await?;

    match state {
        DataEntryStatus::EntriesDifferent(EntriesDifferent {
            first_entry_user_id,
            first_entry,
            second_entry_user_id,
            second_entry,
            ..
        }) => Ok(Json(DataEntryGetDifferencesResponse {
            first_entry_user_id,
            first_entry,
            second_entry_user_id,
            second_entry,
        })),
        _ => Err(APIError::NotFound(
            "No data entry with differences found".to_string(),
            ErrorReference::EntryNotFound,
        )),
    }
}

/// Resolve data entry differences by providing a `ResolveDifferencesAction`
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/resolve_differences",
    request_body = ResolveDifferencesAction,
    responses(
        (status = 200, description = "Differences resolved successfully", body = DataEntryStatusResponse),
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
pub async fn polling_station_data_entry_resolve_differences(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
    audit_service: AuditService,
    action: ResolveDifferencesAction,
) -> Result<Json<DataEntryStatusResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let new_state = match action {
        ResolveDifferencesAction::KeepFirstEntry => {
            state.keep_first_entry(&polling_station, &election)?
        }
        ResolveDifferencesAction::KeepSecondEntry => {
            state.keep_second_entry(&polling_station, &election)?
        }
        ResolveDifferencesAction::DiscardBothEntries => state.delete_entries()?,
    };

    if new_state == DataEntryStatus::FirstEntryNotStarted {
        // The database entry of the data entry is fully deleted when the entries are discarded
        delete_data_entry_and_result_for_polling_station(
            &mut tx,
            &audit_service,
            &committee_session,
            polling_station_id,
        )
        .await?;
    } else {
        // The status of the data entry is updated when the first or second entry is kept
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
pub enum ResolveDifferencesAction {
    KeepFirstEntry,
    KeepSecondEntry,
    DiscardBothEntries,
}

impl ResolveDifferencesAction {
    pub fn audit_event(&self, data_entry: PollingStationDataEntry) -> AuditEvent {
        match self {
            ResolveDifferencesAction::KeepFirstEntry => {
                AuditEvent::DataEntryKeptFirst(data_entry.into())
            }
            ResolveDifferencesAction::KeepSecondEntry => {
                AuditEvent::DataEntryKeptSecond(data_entry.into())
            }
            ResolveDifferencesAction::DiscardBothEntries => {
                AuditEvent::DataEntryDiscardedBoth(data_entry.into())
            }
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryGetDifferencesResponse {
    pub first_entry_user_id: u32,
    pub first_entry: PollingStationResults,
    pub second_entry_user_id: u32,
    pub second_entry: PollingStationResults,
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
        data_entry::{
            api::{data_entry_finalise::tests::finalise_different_entries, resolve_differences},
            repository::polling_station_result_repo,
        },
    };

    async fn resolve_differences(
        pool: SqlitePool,
        polling_station_id: u32,
        action: ResolveDifferencesAction,
    ) -> Response {
        let user = User::test_user(Role::Coordinator, 1);
        resolve_differences::polling_station_data_entry_resolve_differences(
            Coordinator(user.clone()),
            State(pool.clone()),
            Path(polling_station_id),
            AuditService::new(Some(user), None),
            action,
        )
        .await
        .into_response()
    }

    // test creating first and different second data entry
    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_first_second_data_entry_different(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;

        // Check if entry is now in EntriesDifferent state
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::EntriesDifferent(_)));

        // Check that no result has been created
        assert!(
            !polling_station_result_repo::result_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_differences_keep_first(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;
        let response =
            resolve_differences(pool.clone(), 1, ResolveDifferencesAction::KeepFirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        if let DataEntryStatus::SecondEntryNotStarted(entry) = status {
            assert_eq!(
                entry
                    .finalised_first_entry
                    .as_cso_first_session()
                    .unwrap()
                    .voters_counts
                    .poll_card_count,
                99
            )
        } else {
            panic!("invalid state")
        }
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_differences_keep_second(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryPaused)
            .await;

        let response =
            resolve_differences(pool.clone(), 1, ResolveDifferencesAction::KeepSecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        if let DataEntryStatus::SecondEntryNotStarted(entry) = status {
            assert_eq!(
                entry
                    .finalised_first_entry
                    .as_cso_first_session()
                    .unwrap()
                    .voters_counts
                    .poll_card_count,
                100
            )
        } else {
            panic!("invalid state: {status:?}")
        }
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_differences_discard_both(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;

        // Check that the data entry is created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        let response = resolve_differences(
            pool.clone(),
            1,
            ResolveDifferencesAction::DiscardBothEntries,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that the data entry is deleted
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_differences_committee_session_status_not_ok(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryFinished)
            .await;

        let response = resolve_differences(
            pool.clone(),
            1,
            ResolveDifferencesAction::DiscardBothEntries,
        )
        .await;
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
        assert!(matches!(status, DataEntryStatus::EntriesDifferent(_)));
    }
}
