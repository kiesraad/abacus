use axum::{
    Json,
    extract::{FromRequest, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    DataError, PollingStationDataEntry, PollingStationResults, ValidationResults,
    entry_number::EntryNumber,
    repository::PollingStationDataEntries,
    status::{
        ClientState, CurrentDataEntry, DataEntryStatus, DataEntryStatusName,
        DataEntryTransitionError,
    },
    validate_data_entry_status,
};
use crate::{
    APIError, AppState,
    audit_log::{AuditEvent, AuditService},
    authentication::{Coordinator, Typist, User},
    election::repository::Elections,
    error::{ErrorReference, ErrorResponse},
    polling_station::repository::PollingStations,
};

impl From<DataError> for APIError {
    fn from(err: DataError) -> Self {
        APIError::InvalidData(err)
    }
}

impl From<DataEntryTransitionError> for APIError {
    fn from(err: DataEntryTransitionError) -> Self {
        match err {
            DataEntryTransitionError::FirstEntryAlreadyClaimed
            | DataEntryTransitionError::SecondEntryAlreadyClaimed => {
                APIError::Conflict(err.to_string(), ErrorReference::DataEntryAlreadyClaimed)
            }
            DataEntryTransitionError::FirstEntryAlreadyFinalised
            | DataEntryTransitionError::SecondEntryAlreadyFinalised => {
                APIError::Conflict(err.to_string(), ErrorReference::DataEntryAlreadyFinalised)
            }
            _ => APIError::Conflict(err.to_string(), ErrorReference::InvalidStateTransition),
        }
    }
}

/// Response structure for getting data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ClaimDataEntryResponse {
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    pub client_state: Option<serde_json::Value>,
    pub validation_results: ValidationResults,
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(polling_station_data_entry_status))
        .routes(routes!(polling_station_data_entry_claim))
        .routes(routes!(polling_station_data_entry_save))
        .routes(routes!(polling_station_data_entry_delete))
        .routes(routes!(polling_station_data_entry_finalise))
        .routes(routes!(polling_station_data_entry_resolve))
        .routes(routes!(election_status))
}

#[utoipa::path(
    get,
    path = "/api/polling_stations/{polling_station_id}/data_entries",
    responses(
        (status = 200, description = "Get data entries for polling station", body = DataEntryStatus),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn polling_station_data_entry_status(
    _user: Coordinator,
    State(data_entry_repo): State<PollingStationDataEntries>,
    Path(id): Path<u32>,
) -> Result<Json<DataEntryStatus>, APIError> {
    let status = data_entry_repo.get(id).await?;

    Ok(Json(status))
}

#[derive(Debug, Serialize, Deserialize, ToSchema, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
#[serde(rename_all = "snake_case")]
pub enum ResolveAction {
    KeepFirstEntry,
    KeepSecondEntry,
    DiscardBothEntries,
}

impl ResolveAction {
    pub fn audit_event(&self, data_entry: PollingStationDataEntry) -> AuditEvent {
        match self {
            ResolveAction::KeepFirstEntry => AuditEvent::DataEntryKeptFirst(data_entry.into()),
            ResolveAction::KeepSecondEntry => AuditEvent::DataEntryKeptSecond(data_entry.into()),
            ResolveAction::DiscardBothEntries => {
                AuditEvent::DataEntryDiscardedBoth(data_entry.into())
            }
        }
    }
}

/// Claim a data entry for a polling station, returning any existing progress
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/claim",
    responses(
        (status = 200, description = "Data entry claimed successfully", body = ClaimDataEntryResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
)]
async fn polling_station_data_entry_claim(
    user: Typist,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(polling_stations): State<PollingStations>,
    State(elections): State<Elections>,
    audit_service: AuditService,
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
) -> Result<Json<ClaimDataEntryResponse>, APIError> {
    let polling_station = polling_stations.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;
    let state = polling_station_data_entries.get_or_default(id).await?;

    let new_data_entry = CurrentDataEntry {
        progress: None,
        user_id: user.0.id(),
        entry: PollingStationResults {
            recounted: None,
            voters_counts: Default::default(),
            votes_counts: Default::default(),
            voters_recounts: None,
            differences_counts: Default::default(),
            political_group_votes: PollingStationResults::default_political_group_votes(
                election
                    .political_groups
                    .as_ref()
                    .expect("political groups should be present"),
            ),
        },
        client_state: None,
    };

    // Transition to the new state
    let new_state = match entry_number {
        EntryNumber::FirstEntry => state.claim_first_entry(new_data_entry.clone())?,
        EntryNumber::SecondEntry => state.claim_second_entry(new_data_entry.clone())?,
    };

    // Validate the state
    let data = new_state
        .get_data()
        .expect("data should be present because data entry is in progress");
    let validation_results = validate_data_entry_status(&new_state, &polling_station, &election)?;

    // Save the new data entry state
    polling_station_data_entries.upsert(id, &new_state).await?;

    let data_entry = polling_station_data_entries.get_row(id).await?;

    audit_service
        .log(&AuditEvent::DataEntryClaimed(data_entry.into()), None)
        .await?;

    let client_state = new_state.get_client_state().map(|v| v.to_owned());
    Ok(Json(ClaimDataEntryResponse {
        data: data.clone(),
        client_state,
        validation_results,
    }))
}

/// Request structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
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

/// Response structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct SaveDataEntryResponse {
    pub validation_results: ValidationResults,
}

impl IntoResponse for SaveDataEntryResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Save a data entry for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    request_body = DataEntry,
    responses(
        (status = 200, description = "Data entry saved successfully", body = SaveDataEntryResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "JSON error or invalid data (Unprocessable Content)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
)]
async fn polling_station_data_entry_save(
    user: Typist,
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(polling_stations_repo): State<PollingStations>,
    State(elections): State<Elections>,
    audit_service: AuditService,
    data_entry_request: DataEntry,
) -> Result<SaveDataEntryResponse, APIError> {
    // TODO: execute all checks in this function in a single SQL transaction

    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;
    let state = polling_station_data_entries.get_or_default(id).await?;

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
    let validation_results = validate_data_entry_status(&new_state, &polling_station, &election)?;

    // Save the new data entry state
    polling_station_data_entries.upsert(id, &new_state).await?;

    let data_entry = polling_station_data_entries.get_row(id).await?;

    audit_service
        .log(&AuditEvent::DataEntrySaved(data_entry.into()), None)
        .await?;

    Ok(SaveDataEntryResponse { validation_results })
}

/// Delete an in-progress (not finalised) data entry for a polling station
#[utoipa::path(
    delete,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    responses(
        (status = 204, description = "Data entry deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
)]
async fn polling_station_data_entry_delete(
    user: Typist,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    audit_service: AuditService,
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
) -> Result<StatusCode, APIError> {
    let user_id = user.0.id();
    let state = polling_station_data_entries.get_or_default(id).await?;
    let new_state = match entry_number {
        EntryNumber::FirstEntry => state.delete_first_entry(user_id)?,
        EntryNumber::SecondEntry => state.delete_second_entry(user_id)?,
    };
    polling_station_data_entries.upsert(id, &new_state).await?;

    let data_entry = polling_station_data_entries.get_row(id).await?;

    audit_service
        .log(&AuditEvent::DataEntryDeleted(data_entry.into()), None)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Finalise the data entry for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise",
    responses(
        (status = 200, description = "Data entry finalised successfully", body = DataEntryStatus),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "JSON error or invalid data (Unprocessable Content)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
)]
async fn polling_station_data_entry_finalise(
    user: Typist,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(elections_repo): State<Elections>,
    State(polling_stations_repo): State<PollingStations>,
    audit_service: AuditService,
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
) -> Result<Json<DataEntryStatus>, APIError> {
    let state = polling_station_data_entries.get_or_default(id).await?;

    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections_repo.get(polling_station.election_id).await?;
    let user_id = user.0.id();

    match entry_number {
        EntryNumber::FirstEntry => {
            let new_state = state.finalise_first_entry(&polling_station, &election, user_id)?;
            polling_station_data_entries.upsert(id, &new_state).await?;
        }
        EntryNumber::SecondEntry => {
            let (new_state, data) =
                state.finalise_second_entry(&polling_station, &election, user_id)?;

            match (&new_state, data) {
                (DataEntryStatus::Definitive(_), Some(data)) => {
                    // Save the data to the database
                    polling_station_data_entries
                        .make_definitive(id, &new_state, &data)
                        .await?;
                }
                (DataEntryStatus::Definitive(_), None) => {
                    unreachable!("Data entry is in definitive state but no data is present");
                }
                (new_state, _) => {
                    polling_station_data_entries.upsert(id, new_state).await?;
                }
            }
        }
    }

    let data_entry = polling_station_data_entries.get_row(id).await?;

    audit_service
        .log(
            &AuditEvent::DataEntryFinalised(data_entry.clone().into()),
            None,
        )
        .await?;

    Ok(Json(data_entry.state.0))
}

/// Resolve data entry differences by providing a `ResolveAction`
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/resolve",
    request_body = ResolveAction,
    responses(
        (status = 200, description = "Differences resolved successfully", body = PollingStationDataEntry),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "JSON error or invalid data (Unprocessable Content)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_data_entry_resolve(
    _user: Coordinator,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    Path(polling_station_id): Path<u32>,
    audit_service: AuditService,
    resolve_action: ResolveAction,
) -> Result<Json<PollingStationDataEntry>, APIError> {
    let state = polling_station_data_entries
        .get_or_default(polling_station_id)
        .await?;

    let new_state = match resolve_action {
        ResolveAction::KeepFirstEntry => state.keep_first_entry()?,
        ResolveAction::KeepSecondEntry => state.keep_second_entry()?,
        ResolveAction::DiscardBothEntries => state.delete_entries()?,
    };

    let data_entry = polling_station_data_entries
        .upsert(polling_station_id, &new_state)
        .await?;

    audit_service
        .log(&resolve_action.audit_event(data_entry.clone()), None)
        .await?;

    Ok(Json(data_entry))
}

/// Election polling stations data entry statuses response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionStatusResponse {
    pub statuses: Vec<ElectionStatusResponseEntry>,
}

/// Election polling stations data entry statuses response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionStatusResponseEntry {
    /// Polling station id
    pub polling_station_id: u32,
    /// Data entry status
    pub status: DataEntryStatusName,
    /// First entry user id
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub first_entry_user_id: Option<u32>,
    /// Second entry user id
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub second_entry_user_id: Option<u32>,
    /// First entry progress as a percentage (0 to 100)
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub first_entry_progress: Option<u8>,
    /// Second entry progress as a percentage (0 to 100)
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub second_entry_progress: Option<u8>,
    /// Time when the data entry was finalised
    #[schema(value_type = String)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<DateTime<Utc>>,
}

/// Get election polling stations data entry statuses
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/status",
    responses(
        (status = 200, description = "Election", body = ElectionStatusResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn election_status(
    _user: User,
    State(data_entry_repo): State<PollingStationDataEntries>,
    Path(id): Path<u32>,
) -> Result<Json<ElectionStatusResponse>, APIError> {
    let statuses = data_entry_repo.statuses(id).await?;
    Ok(Json(ElectionStatusResponse { statuses }))
}

#[cfg(test)]
pub mod tests {
    use axum::http::StatusCode;
    use http_body_util::BodyExt;
    use sqlx::{SqlitePool, query};
    use test_log::test;

    use super::*;
    use crate::{
        audit_log::AuditLog,
        authentication::Role,
        data_entry::{DifferencesCounts, PoliticalGroupVotes, VotersCounts, VotesCounts},
    };

    pub fn example_data_entry() -> DataEntry {
        DataEntry {
            progress: 100,
            data: PollingStationResults {
                recounted: Some(false),
                voters_counts: VotersCounts {
                    poll_card_count: 98,
                    proxy_certificate_count: 1,
                    voter_card_count: 1,
                    total_admitted_voters_count: 100,
                },
                votes_counts: VotesCounts {
                    votes_candidates_count: 96,
                    blank_votes_count: 2,
                    invalid_votes_count: 2,
                    total_votes_cast_count: 100,
                },
                voters_recounts: None,
                differences_counts: DifferencesCounts::zero(),
                political_group_votes: vec![
                    PoliticalGroupVotes::from_test_data_auto(1, &[36, 20]),
                    PoliticalGroupVotes::from_test_data_auto(2, &[30, 10]),
                ],
            },
            client_state: ClientState(None),
        }
    }

    async fn get_data_entry_status(pool: SqlitePool, polling_station_id: u32) -> DataEntryStatus {
        PollingStationDataEntries::new(pool.clone())
            .get(polling_station_id)
            .await
            .unwrap()
    }

    async fn claim(pool: SqlitePool, entry_number: EntryNumber) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_claim(
            Typist(user.clone()),
            State(PollingStationDataEntries::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            State(Elections::new(pool.clone())),
            AuditService::new(AuditLog(pool), user, None),
            Path((1, entry_number)),
        )
        .await
        .into_response()
    }

    async fn save(
        pool: SqlitePool,
        request_body: DataEntry,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_save(
            Typist(user.clone()),
            Path((1, entry_number)),
            State(PollingStationDataEntries::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            State(Elections::new(pool.clone())),
            AuditService::new(AuditLog(pool), user, None),
            request_body.clone(),
        )
        .await
        .into_response()
    }

    async fn delete(pool: SqlitePool, entry_number: EntryNumber) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_delete(
            Typist(user.clone()),
            State(PollingStationDataEntries::new(pool.clone())),
            AuditService::new(AuditLog(pool), user, None),
            Path((1, entry_number)),
        )
        .await
        .into_response()
    }

    async fn finalise(pool: SqlitePool, entry_number: EntryNumber) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_finalise(
            Typist(user.clone()),
            State(PollingStationDataEntries::new(pool.clone())),
            State(Elections::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            AuditService::new(AuditLog(pool), user, None),
            Path((1, entry_number)),
        )
        .await
        .into_response()
    }

    async fn resolve(pool: SqlitePool, resolve_action: ResolveAction) -> Response {
        let user = User::test_user(Role::Coordinator, 1);
        polling_station_data_entry_resolve(
            Coordinator(user.clone()),
            State(PollingStationDataEntries::new(pool.clone())),
            Path(1),
            AuditService::new(AuditLog(pool), user, None),
            resolve_action,
        )
        .await
        .into_response()
    }

    async fn finalise_different_entries(pool: SqlitePool) {
        // Save and finalise the first data entry
        let request_body = example_data_entry();
        let response = claim(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save and finalise a different second data entry
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 99;
        request_body.data.voters_counts.proxy_certificate_count = 0;
        let response = claim(pool.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_status(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;
        let response = polling_station_data_entry_status(
            Coordinator(User::test_user(Role::Coordinator, 1)),
            State(PollingStationDataEntries::new(pool.clone())),
            Path(1),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let status: DataEntryStatus = serde_json::from_slice(&body).unwrap();

        assert!(matches!(status, DataEntryStatus::EntriesDifferent(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry(pool: SqlitePool) {
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 100; // incorrect value

        let response = claim(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if a row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_first_entry_finalise_with_errors(pool: SqlitePool) {
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 100; // incorrect value

        let response = claim(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that finalise with errors results in FirstEntryHasErrors
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let status: DataEntryStatus = serde_json::from_slice(&body).unwrap();

        assert!(matches!(status, DataEntryStatus::FirstEntryHasErrors(_)));

        // Check that it has been logged in the audit log
        let audit_log_row = query!("SELECT * FROM audit_log ORDER BY id DESC LIMIT 1")
            .fetch_one(&pool)
            .await
            .expect("should have audit log row");
        assert_eq!(audit_log_row.event_name, "DataEntryFinalised");

        let event: serde_json::Value = serde_json::from_str(&audit_log_row.event).unwrap();
        assert_eq!(event["dataEntryStatus"], "first_entry_has_errors");
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_update_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        let response = claim(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if there is still only one row
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check if the data was updated
        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("No data found");
        let data: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        let DataEntryStatus::FirstEntryInProgress(state) = data else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_eq!(
            state.first_entry.voters_counts.poll_card_count,
            request_body.data.voters_counts.poll_card_count
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        let response = claim(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_save_second_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        // Save the first data entry and finalise it
        let response = claim(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save a second data entry
        let response = claim(pool.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if entry is now in SecondEntryInProgress state
        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        assert!(matches!(status, DataEntryStatus::SecondEntryInProgress(_)));

        // Check that nothing is added to polling_station_results yet
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_second_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        // Save and finalise the first data entry
        let response = claim(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save and finalise the second data entry
        let response = claim(pool.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that polling_station_results contains the finalised result and that the data entries are deleted
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check that the status is 'Definitive'
        let status = get_data_entry_status(pool.clone(), 1).await;
        assert!(matches!(status, DataEntryStatus::Definitive(_)));

        // Check that we can't save a new data entry after finalising
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    // test creating first and different second data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_first_second_data_entry_different(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;

        // Check if entry is now in EntriesDifferent state
        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        assert!(matches!(status, DataEntryStatus::EntriesDifferent(_)));

        // Check that no result has been created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete(pool: SqlitePool) {
        // create data entry
        let request_body = example_data_entry();
        let response = claim(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // delete data entry
        let response = delete(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        let status = get_data_entry_status(pool.clone(), 1).await;
        assert_eq!(status, DataEntryStatus::FirstEntryNotStarted);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_nonexistent(pool: SqlitePool) {
        let user = User::test_user(Role::Typist, 1);
        // check that deleting a non-existing data entry returns 404
        let response = polling_station_data_entry_delete(
            Typist(User::test_user(Role::Typist, 1)),
            State(PollingStationDataEntries::new(pool.clone())),
            AuditService::new(AuditLog(pool), user, None),
            Path((1, EntryNumber::FirstEntry)),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_delete_finalised_not_possible(pool: SqlitePool) {
        for entry_number in 1..=2 {
            let entry_number = EntryNumber::try_from(entry_number).unwrap();
            // create and finalise the first data entry
            let request_body = example_data_entry();
            let response = claim(pool.clone(), entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = save(pool.clone(), request_body.clone(), entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = finalise(pool.clone(), entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);

            // check that deleting finalised or non-existent data entry returns 404
            for _entry_number in 1..=2 {
                let response = delete(pool.clone(), entry_number).await;
                assert_eq!(response.status(), StatusCode::CONFLICT);
            }

            // after the first data entry, check if it is still in the database
            // (after the second data entry, the results are finalised so we do not expect rows)
            if entry_number == EntryNumber::FirstEntry {
                let row_count =
                    query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
                        .fetch_one(&pool)
                        .await
                        .unwrap();
                assert_eq!(row_count.count, 1);
            }
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_keep_first(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;
        resolve(pool.clone(), ResolveAction::KeepFirstEntry).await;

        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        if let DataEntryStatus::SecondEntryNotStarted(entry) = status {
            assert_eq!(
                entry.finalised_first_entry.voters_counts.poll_card_count,
                98
            )
        } else {
            panic!("invalid state")
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_keep_second(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;
        resolve(pool.clone(), ResolveAction::KeepSecondEntry).await;

        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        if let DataEntryStatus::SecondEntryNotStarted(entry) = status {
            assert_eq!(
                entry.finalised_first_entry.voters_counts.poll_card_count,
                99
            )
        } else {
            panic!("invalid state")
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_discard_both(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;
        resolve(pool.clone(), ResolveAction::DiscardBothEntries).await;

        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        assert!(matches!(status, DataEntryStatus::FirstEntryNotStarted));
    }
}
