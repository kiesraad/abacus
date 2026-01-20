use axum::{
    Json,
    extract::{FromRequest, Path, State},
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse,
    domain::{
        data_entry_status::{ClientState, CurrentDataEntry},
        entry_number::EntryNumber,
        polling_station_results::PollingStationResults,
        validate::{ValidateRoot, ValidationResults},
    },
    infra::{
        audit_log::{AuditEvent, AuditService},
        authentication::Typist,
        db::SqlitePoolExt,
    },
    repository::data_entry_repo,
    service::data_entry::validate_and_get_data,
};

/// Save a data entry for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    request_body = DataEntry,
    responses(
        (status = 200, description = "Data entry saved successfully", body = SaveDataEntryResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "JSON error or invalid data (Unprocessable Content)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
    security(("cookie_auth" = ["typist"])),
)]
pub async fn polling_station_data_entry_save(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(u32, EntryNumber)>,
    audit_service: AuditService,
    data_entry_request: DataEntry,
) -> Result<SaveDataEntryResponse, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let current_data_entry = CurrentDataEntry {
        progress: Some(data_entry_request.progress),
        user_id: user.0.id(),
        entry: data_entry_request.data,
        client_state: Some(data_entry_request.client_state),
    };

    // Transition to the new state
    let new_state = match entry_number {
        EntryNumber::FirstEntry => state.update_first_entry(current_data_entry)?,
        EntryNumber::SecondEntry => state.update_second_entry(current_data_entry)?,
    };

    // Validate the state
    let validation_results = new_state.start_validate(&polling_station, &election)?;

    // Save the new data entry state
    data_entry_repo::upsert(
        &mut tx,
        polling_station_id,
        committee_session.id,
        &new_state,
    )
    .await?;

    let data_entry =
        data_entry_repo::get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::DataEntrySaved(data_entry.into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(SaveDataEntryResponse { validation_results })
}

/// Request structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
#[serde(deny_unknown_fields)]
pub struct DataEntry {
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// Data entry for a polling station
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
}

impl DataEntry {
    #[cfg(test)]
    pub fn example_data_entry() -> DataEntry {
        DataEntry {
            progress: 100,
            data: PollingStationResults::example_polling_station_results(),
            client_state: ClientState(None),
        }
    }

    #[cfg(test)]
    pub fn example_data_entry_with_warning() -> DataEntry {
        DataEntry {
            progress: 100,
            data: PollingStationResults::example_polling_station_results().with_warning(),
            client_state: ClientState(None),
        }
    }
}

/// Response structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct SaveDataEntryResponse {
    pub validation_results: ValidationResults,
}

impl IntoResponse for SaveDataEntryResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}
#[cfg(test)]
pub mod tests {
    use axum::http::StatusCode;
    use http_body_util::BodyExt;
    use test_log::test;

    use super::*;
    use crate::{
        api::{
            data_entry::{data_entry_claim::tests::claim, data_entry_finalise::tests::finalise},
            election::committee_session::tests::change_status_committee_session,
        },
        domain::{
            committee_session_status::CommitteeSessionStatus, data_entry_status::DataEntryStatus,
        },
        error::ErrorReference,
        infra::authentication::{Role, User},
        repository::polling_station_result_repo,
    };

    pub async fn save(
        pool: SqlitePool,
        request_body: DataEntry,
        polling_station_id: u32,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_save(
            Typist(user.clone()),
            State(pool.clone()),
            Path((polling_station_id, entry_number)),
            AuditService::new(Some(user), None),
            request_body.clone(),
        )
        .await
        .into_response()
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry(pool: SqlitePool) {
        let request_body = DataEntry::example_data_entry();

        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if a row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        //FIXME row was created by claim, what does this test?
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry_committee_session_status_is_data_entry_paused(
        pool: SqlitePool,
    ) {
        let request_body = DataEntry::example_data_entry();

        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryPaused)
            .await;

        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);

        // Check that the row was not updated
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        let DataEntryStatus::FirstEntryInProgress(state) = status else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_ne!(state.first_entry, request_body.data);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry_committee_session_status_not_data_entry_paused_or_in_progress(
        pool: SqlitePool,
    ) {
        let request_body = DataEntry::example_data_entry();

        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryFinished)
            .await;

        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );

        // Check that the row was not updated
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        let DataEntryStatus::FirstEntryInProgress(state) = status else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_ne!(state.first_entry, request_body.data);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_update_data_entry(pool: SqlitePool) {
        let request_body = DataEntry::example_data_entry();

        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if the row is there
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );

        // Check if the data was updated
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        let DataEntryStatus::FirstEntryInProgress(state) = status else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_eq!(
            state
                .first_entry
                .as_cso_first_session()
                .map(|r| r.voters_counts.poll_card_count)
                .unwrap(),
            request_body
                .data
                .as_cso_first_session()
                .map(|r| r.voters_counts.poll_card_count)
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_save_second_data_entry(pool: SqlitePool) {
        let request_body = DataEntry::example_data_entry();

        // Save the first data entry and finalise it
        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save a second data entry
        let response = claim(pool.clone(), 1, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if entry is now in SecondEntryInProgress state
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = data_entry_repo::get_data_entry(&mut conn, 1, 2)
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::SecondEntryInProgress(_)));

        // Check that nothing is added to polling_station_results yet
        assert!(
            !polling_station_result_repo::result_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }
}
