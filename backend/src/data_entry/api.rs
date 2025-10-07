use axum::{
    Json,
    extract::{FromRequest, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{SqliteConnection, SqlitePool};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    CSONextSessionResults, CommonPollingStationResults, DataEntryStatusResponse, DataError,
    PollingStationDataEntry, PollingStationResults, ValidationResults,
    entry_number::EntryNumber,
    repository::{
        delete_data_entry, delete_result, get_data_entry, most_recent_results_for_polling_station,
    },
    status::{
        ClientState, CurrentDataEntry, DataEntryStatus, DataEntryStatusName,
        DataEntryTransitionError, EntriesDifferent, FirstEntryHasErrors,
    },
    validate_data_entry_status,
};
use crate::{
    APIError, AppState, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::{Coordinator, Role, Typist, User},
    committee_session::{CommitteeSession, CommitteeSessionError, status::CommitteeSessionStatus},
    election::{ElectionWithPoliticalGroups, PoliticalGroup},
    error::{ErrorReference, ErrorResponse},
    investigation::get_polling_station_investigation,
    polling_station::PollingStation,
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
#[serde(deny_unknown_fields)]
pub struct ClaimDataEntryResponse {
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    pub client_state: Option<serde_json::Value>,
    pub validation_results: ValidationResults,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    #[schema(nullable = false)]
    pub previous_results: Option<CommonPollingStationResults>,
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(polling_station_data_entry_claim))
        .routes(routes!(polling_station_data_entry_save))
        .routes(routes!(polling_station_data_entry_delete))
        .routes(routes!(polling_station_data_entry_finalise))
        .routes(routes!(polling_station_data_entry_get_errors))
        .routes(routes!(polling_station_data_entry_resolve_errors))
        .routes(routes!(polling_station_data_entry_get_differences))
        .routes(routes!(polling_station_data_entry_resolve_differences))
        .routes(routes!(election_status))
}

async fn validate_and_get_data(
    polling_station_id: u32,
    user: &User,
    conn: &mut SqliteConnection,
) -> Result<
    (
        PollingStation,
        ElectionWithPoliticalGroups,
        CommitteeSession,
        DataEntryStatus,
    ),
    APIError,
> {
    let polling_station = crate::polling_station::repository::get(conn, polling_station_id).await?;
    let committee_session =
        crate::committee_session::repository::get(conn, polling_station.committee_session_id)
            .await?;
    let election = crate::election::repository::get(conn, committee_session.election_id).await?;

    let data_entry_status = crate::data_entry::repository::get_or_default(
        conn,
        polling_station_id,
        committee_session.id,
    )
    .await?;

    // Validate polling station
    if committee_session.is_next_session() {
        let investigation = get_polling_station_investigation(conn, polling_station.id).await?;
        if investigation.corrected_results != Some(true) {
            return Err(APIError::Conflict(
                "Data entry not allowed, no investigation with corrected results.".to_string(),
                ErrorReference::DataEntryNotAllowed,
            ));
        }
    }

    // Validate state based on user role
    match user.role() {
        Role::Typist => {
            if committee_session.status == CommitteeSessionStatus::DataEntryPaused {
                return Err(APIError::CommitteeSession(
                    CommitteeSessionError::CommitteeSessionPaused,
                ));
            } else if committee_session.status != CommitteeSessionStatus::DataEntryInProgress {
                return Err(APIError::CommitteeSession(
                    CommitteeSessionError::InvalidCommitteeSessionStatus,
                ));
            }
        }
        Role::Coordinator => {
            if committee_session.status != CommitteeSessionStatus::DataEntryInProgress
                && committee_session.status != CommitteeSessionStatus::DataEntryPaused
            {
                return Err(APIError::CommitteeSession(
                    CommitteeSessionError::InvalidCommitteeSessionStatus,
                ));
            }
        }
        _ => {}
    }

    Ok((
        polling_station,
        election,
        committee_session,
        data_entry_status,
    ))
}

pub async fn delete_data_entry_and_result_for_polling_station(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    polling_station: &PollingStation,
) -> Result<(), APIError> {
    if let Some(data_entry) = delete_data_entry(conn, polling_station.id).await? {
        audit_service
            .log(conn, &AuditEvent::DataEntryDeleted(data_entry.into()), None)
            .await?;
    }
    if let Some(result) = delete_result(conn, polling_station.id).await? {
        audit_service
            .log(conn, &AuditEvent::ResultDeleted(result.into()), None)
            .await?;
    }
    Ok(())
}

fn initial_current_data_entry(
    user_id: u32,
    political_groups: &[PoliticalGroup],
    committee_session: &CommitteeSession,
    previous_results: Option<&PollingStationResults>,
) -> CurrentDataEntry {
    let entry = if committee_session.is_next_session() {
        if let Some(prev) = previous_results {
            let mut copy = CSONextSessionResults {
                voters_counts: prev.voters_counts().clone(),
                votes_counts: prev.votes_counts().clone(),
                differences_counts: prev.differences_counts().clone(),
                political_group_votes: prev.political_group_votes().to_vec(),
            };

            // clear checkboxes in differences because they always need to be re-entered
            copy.differences_counts
                .compare_votes_cast_admitted_voters
                .admitted_voters_equal_votes_cast = false;
            copy.differences_counts
                .compare_votes_cast_admitted_voters
                .votes_cast_greater_than_admitted_voters = false;
            copy.differences_counts
                .compare_votes_cast_admitted_voters
                .votes_cast_smaller_than_admitted_voters = false;
            copy.differences_counts
                .difference_completely_accounted_for
                .yes = false;
            copy.differences_counts
                .difference_completely_accounted_for
                .no = false;

            PollingStationResults::CSONextSession(copy)
        } else {
            PollingStationResults::empty_cso_next_session(political_groups)
        }
    } else {
        PollingStationResults::empty_cso_first_session(political_groups)
    };

    CurrentDataEntry {
        progress: None,
        user_id,
        entry,
        client_state: None,
    }
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

/// Claim a data entry for a polling station, returning any existing progress
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/claim",
    responses(
        (status = 200, description = "Data entry claimed successfully", body = ClaimDataEntryResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
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
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(u32, EntryNumber)>,
    audit_service: AuditService,
) -> Result<Json<ClaimDataEntryResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(polling_station_id, &user.0, &mut tx).await?;

    let previous_results = if let Some(id) = polling_station.id_prev_session {
        most_recent_results_for_polling_station(&mut tx, id).await?
    } else {
        None
    };

    let new_data_entry = initial_current_data_entry(
        user.0.id(),
        &election.political_groups,
        &committee_session,
        previous_results.as_ref(),
    );

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
    crate::data_entry::repository::upsert(
        &mut tx,
        polling_station_id,
        committee_session.id,
        &new_state,
    )
    .await?;

    let data_entry = get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::DataEntryClaimed(data_entry.into()),
            None,
        )
        .await?;

    let client_state = new_state.get_client_state().map(|v| v.to_owned());

    tx.commit().await?;

    Ok(Json(ClaimDataEntryResponse {
        data: data.clone(),
        client_state,
        validation_results,
        previous_results: previous_results.map(|r| r.as_common()),
    }))
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
)]
async fn polling_station_data_entry_save(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(u32, EntryNumber)>,
    audit_service: AuditService,
    data_entry_request: DataEntry,
) -> Result<SaveDataEntryResponse, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(polling_station_id, &user.0, &mut tx).await?;

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
    crate::data_entry::repository::upsert(
        &mut tx,
        polling_station_id,
        committee_session.id,
        &new_state,
    )
    .await?;

    let data_entry = get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

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

/// Delete an in-progress (not finalised) data entry for a polling station
#[utoipa::path(
    delete,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    responses(
        (status = 204, description = "Data entry deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
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
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(u32, EntryNumber)>,
    audit_service: AuditService,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (_, _, committee_session, state) =
        validate_and_get_data(polling_station_id, &user.0, &mut tx).await?;

    let user_id = user.0.id();
    let new_state = match entry_number {
        EntryNumber::FirstEntry => state.delete_first_entry(user_id)?,
        EntryNumber::SecondEntry => state.delete_second_entry(user_id)?,
    };
    crate::data_entry::repository::upsert(
        &mut tx,
        polling_station_id,
        committee_session.id,
        &new_state,
    )
    .await?;

    let data_entry = get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::DataEntryDeleted(data_entry.into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Finalise the data entry for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise",
    responses(
        (status = 200, description = "Data entry finalised successfully", body = DataEntryStatusResponse),
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
)]
async fn polling_station_data_entry_finalise(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(u32, EntryNumber)>,
    audit_service: AuditService,
) -> Result<Json<DataEntryStatusResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(polling_station_id, &user.0, &mut tx).await?;

    let user_id = user.0.id();
    match entry_number {
        EntryNumber::FirstEntry => {
            let new_state = state.finalise_first_entry(&polling_station, &election, user_id)?;
            crate::data_entry::repository::upsert(
                &mut tx,
                polling_station_id,
                committee_session.id,
                &new_state,
            )
            .await?;
        }
        EntryNumber::SecondEntry => {
            let (new_state, data) =
                state.finalise_second_entry(&polling_station, &election, user_id)?;

            match (&new_state, data) {
                (DataEntryStatus::Definitive(_), Some(data)) => {
                    // Save the data to the database
                    crate::data_entry::repository::make_definitive(
                        &mut tx,
                        polling_station_id,
                        committee_session.id,
                        &new_state,
                        &data,
                    )
                    .await?;
                }
                (DataEntryStatus::Definitive(_), None) => {
                    unreachable!("Data entry is in definitive state but no data is present");
                }
                (new_state, _) => {
                    crate::data_entry::repository::upsert(
                        &mut tx,
                        polling_station_id,
                        committee_session.id,
                        new_state,
                    )
                    .await?;
                }
            }
        }
    }

    let data_entry = get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::DataEntryFinalised(data_entry.clone().into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(Json(data_entry.into()))
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
                AuditEvent::DataEntryResumedFirst(data_entry.into())
            }
        }
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryGetErrorsResponse {
    pub first_entry_user_id: u32,
    pub finalised_first_entry: PollingStationResults,
    #[schema(value_type = String)]
    pub first_entry_finished_at: DateTime<Utc>,
    pub validation_results: ValidationResults,
}

/// Get accepted data entry errors to be resolved
#[utoipa::path(
    get,
    path = "/api/polling_stations/{polling_station_id}/data_entries/resolve_errors",
    responses(
        (status = 200, description = "Data entry with errors and warnings to be resolved", body = DataEntryGetErrorsResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "No data entry with accepted errors found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_data_entry_get_errors(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
) -> Result<Json<DataEntryGetErrorsResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let (polling_station, election, _, state) =
        validate_and_get_data(polling_station_id, &user.0, &mut conn).await?;

    match state.clone() {
        DataEntryStatus::FirstEntryHasErrors(FirstEntryHasErrors {
            first_entry_user_id,
            finalised_first_entry,
            first_entry_finished_at,
        }) => {
            let validation_results =
                validate_data_entry_status(&state, &polling_station, &election)?;

            Ok(Json(DataEntryGetErrorsResponse {
                first_entry_user_id,
                finalised_first_entry,
                first_entry_finished_at,
                validation_results,
            }))
        }
        _ => Err(APIError::NotFound(
            "No data entry with accepted errors found".to_string(),
            ErrorReference::EntryNotFound,
        )),
    }
}

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
)]
async fn polling_station_data_entry_resolve_errors(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
    audit_service: AuditService,
    action: ResolveErrorsAction,
) -> Result<Json<DataEntryStatusResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (_, _, committee_session, state) =
        validate_and_get_data(polling_station_id, &user.0, &mut tx).await?;

    let new_state = match action {
        ResolveErrorsAction::DiscardFirstEntry => state.discard_first_entry()?,
        ResolveErrorsAction::ResumeFirstEntry => state.resume_first_entry()?,
    };

    let data_entry = crate::data_entry::repository::upsert(
        &mut tx,
        polling_station_id,
        committee_session.id,
        &new_state,
    )
    .await?;

    audit_service
        .log(&mut tx, &action.audit_event(data_entry.clone()), None)
        .await?;

    tx.commit().await?;

    Ok(Json(data_entry.into()))
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryGetDifferencesResponse {
    pub first_entry_user_id: u32,
    pub first_entry: PollingStationResults,
    pub second_entry_user_id: u32,
    pub second_entry: PollingStationResults,
}

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
)]
async fn polling_station_data_entry_get_differences(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
) -> Result<Json<DataEntryGetDifferencesResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let (_, _, _, state) = validate_and_get_data(polling_station_id, &user.0, &mut conn).await?;

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
)]
async fn polling_station_data_entry_resolve_differences(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
    audit_service: AuditService,
    action: ResolveDifferencesAction,
) -> Result<Json<DataEntryStatusResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(polling_station_id, &user.0, &mut tx).await?;

    let new_state = match action {
        ResolveDifferencesAction::KeepFirstEntry => state.keep_first_entry()?,
        ResolveDifferencesAction::KeepSecondEntry => {
            state.keep_second_entry(&polling_station, &election)?
        }
        ResolveDifferencesAction::DiscardBothEntries => state.delete_entries()?,
    };

    let data_entry = crate::data_entry::repository::upsert(
        &mut tx,
        polling_station_id,
        committee_session.id,
        &new_state,
    )
    .await?;

    audit_service
        .log(&mut tx, &action.audit_event(data_entry.clone()), None)
        .await?;

    tx.commit().await?;

    Ok(Json(data_entry.into()))
}

/// Election polling stations data entry statuses response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct ElectionStatusResponse {
    pub statuses: Vec<ElectionStatusResponseEntry>,
}

/// Election polling stations data entry statuses response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
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
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<Json<ElectionStatusResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let current_committee_session =
        crate::committee_session::repository::get_election_committee_session(
            &mut conn,
            election_id,
        )
        .await?;

    let statuses =
        crate::data_entry::repository::statuses(&mut conn, current_committee_session.id).await?;
    Ok(Json(ElectionStatusResponse { statuses }))
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use http_body_util::BodyExt;
    use sqlx::{SqlitePool, query, query_as};
    use test_log::test;

    use super::*;
    use crate::{
        authentication::Role,
        committee_session::{
            status::CommitteeSessionStatus,
            tests::{change_status_committee_session, create_committee_session},
        },
        data_entry::{
            CSOFirstSessionResults, CountingDifferencesPollingStation,
            DifferenceCountsCompareVotesCastAdmittedVoters, DifferencesCounts, ExtraInvestigation,
            PoliticalGroupCandidateVotes, PoliticalGroupTotalVotes, VotersCounts, VotesCounts,
            YesNo, repository::insert_test_result, structs::tests::ValidDefault,
        },
        investigation::insert_test_investigation,
    };

    fn example_data_entry() -> DataEntry {
        DataEntry {
            progress: 100,
            data: PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
                extra_investigation: ValidDefault::valid_default(),
                counting_differences_polling_station: ValidDefault::valid_default(),
                voters_counts: VotersCounts {
                    poll_card_count: 99,
                    proxy_certificate_count: 1,
                    total_admitted_voters_count: 100,
                },
                votes_counts: VotesCounts {
                    political_group_total_votes: vec![
                        PoliticalGroupTotalVotes {
                            number: 1,
                            total: 56,
                        },
                        PoliticalGroupTotalVotes {
                            number: 2,
                            total: 40,
                        },
                    ],
                    total_votes_candidates_count: 96,
                    blank_votes_count: 2,
                    invalid_votes_count: 2,
                    total_votes_cast_count: 100,
                },
                differences_counts: DifferencesCounts {
                    more_ballots_count: 0,
                    fewer_ballots_count: 0,
                    compare_votes_cast_admitted_voters:
                        DifferenceCountsCompareVotesCastAdmittedVoters {
                            admitted_voters_equal_votes_cast: true,
                            votes_cast_greater_than_admitted_voters: false,
                            votes_cast_smaller_than_admitted_voters: false,
                        },
                    difference_completely_accounted_for: YesNo {
                        yes: true,
                        no: false,
                    },
                },
                political_group_votes: vec![
                    PoliticalGroupCandidateVotes::from_test_data_auto(1, &[36, 20]),
                    PoliticalGroupCandidateVotes::from_test_data_auto(2, &[30, 10]),
                ],
            }),
            client_state: ClientState(None),
        }
    }

    async fn get_data_entry_status(
        pool: SqlitePool,
        polling_station_id: u32,
        committee_session_id: u32,
    ) -> DataEntryStatus {
        let mut conn = pool.acquire().await.unwrap();
        crate::data_entry::repository::get(&mut conn, polling_station_id, committee_session_id)
            .await
            .unwrap()
    }

    async fn claim(
        pool: SqlitePool,
        polling_station_id: u32,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_claim(
            Typist(user.clone()),
            State(pool.clone()),
            Path((polling_station_id, entry_number)),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response()
    }

    async fn save(
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

    async fn delete(
        pool: SqlitePool,
        polling_station_id: u32,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_delete(
            Typist(user.clone()),
            State(pool.clone()),
            Path((polling_station_id, entry_number)),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response()
    }

    async fn finalise(
        pool: SqlitePool,
        polling_station_id: u32,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_finalise(
            Typist(user.clone()),
            State(pool.clone()),
            Path((polling_station_id, entry_number)),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response()
    }

    async fn resolve_differences(
        pool: SqlitePool,
        polling_station_id: u32,
        action: ResolveDifferencesAction,
    ) -> Response {
        let user = User::test_user(Role::Coordinator, 1);
        polling_station_data_entry_resolve_differences(
            Coordinator(user.clone()),
            State(pool.clone()),
            Path(polling_station_id),
            AuditService::new(Some(user), None),
            action,
        )
        .await
        .into_response()
    }

    async fn finalise_different_entries(pool: SqlitePool) {
        // Save and finalise the first data entry
        let request_body = example_data_entry();
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

        // Save and finalise a different second data entry
        let mut request_body = example_data_entry();
        request_body
            .data
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .poll_card_count = 100;
        request_body
            .data
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .proxy_certificate_count = 0;
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
        let response = finalise(pool.clone(), 1, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_ok(pool: SqlitePool) {
        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_committee_session_status_is_data_entry_paused(pool: SqlitePool) {
        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryPaused)
            .await;

        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);

        // Check that no row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_committee_session_status_not_data_entry_paused_or_in_progress(
        pool: SqlitePool,
    ) {
        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryFinished)
            .await;

        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );

        // Check that no row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_err_no_investigation(pool: SqlitePool) {
        let response = claim(pool.clone(), 742, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        // Check that no row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_err_investigation_no_corrected_results(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        // Insert investigation
        insert_test_investigation(
            &mut conn,
            742,
            "Test".into(),
            Some("Test".into()),
            Some(false),
        )
        .await
        .unwrap();

        let response = claim(pool.clone(), 742, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);

        // Check that no row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_ok(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        // Insert investigation
        insert_test_investigation(
            &mut conn,
            742,
            "Test".into(),
            Some("Test".into()),
            Some(true),
        )
        .await
        .unwrap();

        let response = claim(pool.clone(), 742, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

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
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry_committee_session_status_is_data_entry_paused(
        pool: SqlitePool,
    ) {
        let request_body = example_data_entry();

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
        let data_entry = get_data_entry(&mut conn, 1, 2).await.unwrap();
        let data: DataEntryStatus = data_entry.state.0;
        let DataEntryStatus::FirstEntryInProgress(state) = data else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_ne!(state.first_entry, request_body.data);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry_committee_session_status_not_data_entry_paused_or_in_progress(
        pool: SqlitePool,
    ) {
        let request_body = example_data_entry();

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
        let data_entry = get_data_entry(&mut conn, 1, 2).await.unwrap();
        let data: DataEntryStatus = data_entry.state.0;
        let DataEntryStatus::FirstEntryInProgress(state) = data else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_ne!(state.first_entry, request_body.data);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry_uniqueness(pool: SqlitePool) {
        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if a row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Create a new committee session and set status to DataEntryInProgress
        let committee_session: CommitteeSession =
            create_committee_session(pool.clone(), 2, 2, 2).await;
        change_status_committee_session(
            pool.clone(),
            committee_session.id,
            CommitteeSessionStatus::DataEntryInProgress,
        )
        .await;

        // Claim the same polling station again
        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::NOT_FOUND);

        let mut conn = pool.acquire().await.unwrap();
        let new_ps = crate::polling_station::repository::get_by_previous_id(&mut conn, 1)
            .await
            .unwrap();

        // Insert investigation for the new polling station
        insert_test_investigation(
            &mut conn,
            new_ps.id,
            "Test".into(),
            Some("Test".into()),
            Some(true),
        )
        .await
        .unwrap();

        // Claim the same polling station again
        let response = claim(pool.clone(), new_ps.id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that a new row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 2);

        // Check that the new data entry is linked to the new committee session
        let data = query_as!(
            PollingStationDataEntry,
            r#"
            SELECT
                polling_station_id AS "polling_station_id: u32",
                committee_session_id AS "committee_session_id: u32",
                state AS "state: _",
                updated_at AS "updated_at: _"
            FROM polling_station_data_entries
            "#
        )
        .fetch_all(&pool)
        .await
        .expect("No data found");
        assert_eq!(data[0].committee_session_id, 2);
        assert_eq!(data[1].committee_session_id, committee_session.id);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_update_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

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

        // Check if there is still only one row
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check if the data was updated
        let row = query!(
            "SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries"
        )
        .fetch_one(&pool)
        .await
        .expect("No data found");
        let data: DataEntryStatus = row.state.0;
        let DataEntryStatus::FirstEntryInProgress(state) = data else {
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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

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
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry_committee_session_status_is_data_entry_paused(
        pool: SqlitePool,
    ) {
        let request_body = example_data_entry();

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

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryPaused)
            .await;

        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry_committee_session_status_not_data_entry_paused_or_in_progress(
        pool: SqlitePool,
    ) {
        let request_body = example_data_entry();

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

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryFinished)
            .await;

        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_first_entry_finalise_with_errors(pool: SqlitePool) {
        let mut request_body = example_data_entry();
        request_body
            .data
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .poll_card_count = 100; // incorrect value

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

        // Check that finalise with errors results in FirstEntryHasErrors
        let response = finalise(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let DataEntryStatusResponse { status } = serde_json::from_slice(&body).unwrap();

        assert_eq!(status, DataEntryStatusName::FirstEntryHasErrors);

        // Check that it has been logged in the audit log
        let audit_log_row =
          query!(r#"SELECT event_name, json(event) as "event: serde_json::Value" FROM audit_log ORDER BY id DESC LIMIT 1"#)
            .fetch_one(&pool)
            .await
            .expect("should have audit log row");
        assert_eq!(audit_log_row.event_name, "DataEntryFinalised");

        let event: serde_json::Value = serde_json::to_value(&audit_log_row.event).unwrap();
        assert_eq!(event["data_entry_status"], "first_entry_has_errors");
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_save_second_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

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
        let row = query!("SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = row.state.0;
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

        // Save and finalise the second data entry
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
        let response = finalise(pool.clone(), 1, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that polling_station_results contains the finalised result and that the data entries are deleted
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check that the status is 'Definitive'
        let status = get_data_entry_status(pool.clone(), 1, 2).await;
        assert!(matches!(status, DataEntryStatus::Definitive(_)));

        // Check that we can't save a new data entry after finalising
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let response = save(
            pool.clone(),
            request_body.clone(),
            1,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    // test creating first and different second data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_first_second_data_entry_different(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;

        // Check if entry is now in EntriesDifferent state
        let row = query!("SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = row.state.0;
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

        // delete data entry
        let response = delete(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        let status = get_data_entry_status(pool.clone(), 1, 2).await;
        assert_eq!(status, DataEntryStatus::FirstEntryNotStarted);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_committee_session_status_is_data_entry_paused(
        pool: SqlitePool,
    ) {
        // create data entry
        let request_body = example_data_entry();
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

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryPaused)
            .await;

        // delete data entry
        let response = delete(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);

        // Check if entry is still in FirstEntryInProgress state
        let row = query!("SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = row.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryInProgress(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_committee_session_status_not_data_entry_paused_or_in_progress(
        pool: SqlitePool,
    ) {
        // create data entry
        let request_body = example_data_entry();
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

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryFinished)
            .await;

        // delete data entry
        let response = delete(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );

        // Check if entry is still in FirstEntryInProgress state
        let row = query!("SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = row.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryInProgress(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_nonexistent(pool: SqlitePool) {
        let user = User::test_user(Role::Typist, 1);
        // check that deleting a non-existing data entry returns 404
        let response = polling_station_data_entry_delete(
            Typist(User::test_user(Role::Typist, 1)),
            State(pool.clone()),
            Path((1, EntryNumber::FirstEntry)),
            AuditService::new(Some(user), None),
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
            let response = claim(pool.clone(), 1, entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = save(pool.clone(), request_body.clone(), 1, entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = finalise(pool.clone(), 1, entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);

            // check that deleting finalised or non-existent data entry returns 404
            for _entry_number in 1..=2 {
                let response = delete(pool.clone(), 1, entry_number).await;
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
    async fn test_data_entry_resolve_differences_keep_first(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;
        let response =
            resolve_differences(pool.clone(), 1, ResolveDifferencesAction::KeepFirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let row = query!("SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = row.state.0;
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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_differences_keep_second(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;

        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryPaused)
            .await;

        let response =
            resolve_differences(pool.clone(), 1, ResolveDifferencesAction::KeepSecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let row = query!("SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = row.state.0;
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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_differences_discard_both(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;
        let response = resolve_differences(
            pool.clone(),
            1,
            ResolveDifferencesAction::DiscardBothEntries,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        let row = query!("SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = row.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryNotStarted));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
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

        let row = query!("SELECT state AS 'state: sqlx::types::Json<DataEntryStatus>' FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = row.state.0;
        assert!(matches!(status, DataEntryStatus::EntriesDifferent(_)));
    }

    async fn add_results(
        pool: &SqlitePool,
        polling_station_id: u32,
        committee_session_id: u32,
        political_groups: &[PoliticalGroup],
        is_first_session: bool,
    ) {
        let mut results = if is_first_session {
            PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
                extra_investigation: ExtraInvestigation::default(),
                counting_differences_polling_station: CountingDifferencesPollingStation::default(),
                voters_counts: VotersCounts::default(),
                votes_counts: VotesCounts {
                    political_group_total_votes:
                        PollingStationResults::default_political_group_total_votes(political_groups),
                    ..VotesCounts::default()
                },
                differences_counts: DifferencesCounts::default(),
                political_group_votes: PollingStationResults::default_political_group_votes(
                    political_groups,
                ),
            })
        } else {
            PollingStationResults::CSONextSession(CSONextSessionResults {
                voters_counts: VotersCounts::default(),
                votes_counts: VotesCounts {
                    political_group_total_votes:
                        PollingStationResults::default_political_group_total_votes(political_groups),
                    ..VotesCounts::default()
                },
                differences_counts: DifferencesCounts::default(),
                political_group_votes: PollingStationResults::default_political_group_votes(
                    political_groups,
                ),
            })
        };
        results.voters_counts_mut().poll_card_count = polling_station_id;

        let mut conn = pool.acquire().await.unwrap();
        insert_test_result(
            &mut conn,
            polling_station_id,
            committee_session_id,
            &results,
        )
        .await
        .unwrap()
    }

    async fn claim_previous_results(
        pool: SqlitePool,
        polling_station_id: u32,
    ) -> Option<CommonPollingStationResults> {
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ClaimDataEntryResponse = serde_json::from_slice(&body).unwrap();
        result.previous_results
    }

    /// No previous results, should return none
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_none(pool: SqlitePool) {
        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(
            &mut pool.acquire().await.unwrap(),
            741,
            "Test".into(),
            Some("Test".into()),
            Some(true),
        )
        .await
        .unwrap();

        assert!(claim_previous_results(pool.clone(), 741).await.is_none());
    }

    /// Only a result from committee session 1, should return 1
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_from_first_session(pool: SqlitePool) {
        let election = crate::election::repository::get(&mut pool.acquire().await.unwrap(), 7)
            .await
            .unwrap();
        add_results(&pool, 711, 701, &election.political_groups, true).await;

        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(
            &mut pool.acquire().await.unwrap(),
            741,
            "Test".into(),
            Some("Test".into()),
            Some(true),
        )
        .await
        .unwrap();

        let previous_results = claim_previous_results(pool.clone(), 741).await.unwrap();
        assert_eq!(previous_results.voters_counts.poll_card_count, 711);
    }

    /// Results from committee session 1 and 3, with a gap in between, should return 3
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_with_session_gap(pool: SqlitePool) {
        let election = crate::election::repository::get(&mut pool.acquire().await.unwrap(), 7)
            .await
            .unwrap();
        add_results(&pool, 711, 701, &election.political_groups, true).await;
        add_results(&pool, 731, 703, &election.political_groups, false).await;

        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(
            &mut pool.acquire().await.unwrap(),
            741,
            "Test".into(),
            Some("Test".into()),
            Some(true),
        )
        .await
        .unwrap();

        let previous_results = claim_previous_results(pool.clone(), 741).await.unwrap();
        assert_eq!(previous_results.voters_counts.poll_card_count, 731);
    }

    /// Results with only one in committee session 2, should return 2
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_from_second_session(pool: SqlitePool) {
        let election = crate::election::repository::get(&mut pool.acquire().await.unwrap(), 7)
            .await
            .unwrap();
        add_results(&pool, 722, 702, &election.political_groups, false).await;

        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(
            &mut pool.acquire().await.unwrap(),
            742,
            "Test".into(),
            Some("Test".into()),
            Some(true),
        )
        .await
        .unwrap();

        let previous_results = claim_previous_results(pool.clone(), 742).await.unwrap();
        assert_eq!(previous_results.voters_counts.poll_card_count, 722);
    }

    /// Two subsequent results from committee sessions 2 and 3, should return 3rd
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_from_last_two_sessions(pool: SqlitePool) {
        let election = crate::election::repository::get(&mut pool.acquire().await.unwrap(), 7)
            .await
            .unwrap();
        add_results(&pool, 732, 703, &election.political_groups, false).await;

        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(
            &mut pool.acquire().await.unwrap(),
            742,
            "Test".into(),
            Some("Test".into()),
            Some(true),
        )
        .await
        .unwrap();

        let previous_results = claim_previous_results(pool.clone(), 742).await.unwrap();
        assert_eq!(previous_results.voters_counts.poll_card_count, 732);
    }

    /// First committee session, should return all polling station statuses
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_statuses_first_session_all_polling_stations(pool: SqlitePool) {
        let user = User::test_user(Role::Coordinator, 1);
        let response = election_status(user.clone(), State(pool.clone()), Path(2))
            .await
            .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 2);
    }

    /// Second committee session without investigations, should return no polling station statuses
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_statuses_second_session_no_polling_stations(pool: SqlitePool) {
        let user = User::test_user(Role::Coordinator, 1);
        let response = election_status(user.clone(), State(pool.clone()), Path(5))
            .await
            .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 0);
    }

    /// Second committee session with 1 investigations, should return 1 polling station status
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_statuses_second_session_with_investigation(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = User::test_user(Role::Coordinator, 1);

        // Add investigation to polling station in second committee session
        insert_test_investigation(&mut conn, 9, "Test".into(), Some("Test".into()), Some(true))
            .await
            .unwrap();

        let response = election_status(user.clone(), State(pool.clone()), Path(5))
            .await
            .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 1);
    }
}
