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

use crate::{
    APIError, AppState, SqlitePoolExt,
    api::{
        committee_session::CommitteeSessionError,
        middleware::authentication::{Coordinator, Typist, error::AuthenticationError},
    },
    domain::{
        committee_session::CommitteeSession,
        committee_session_status::CommitteeSessionStatus,
        data_entry::{
            CSONextSessionResults, CommonPollingStationResults, DataEntryStatusResponse,
            PollingStationDataEntry, PollingStationResults,
        },
        election::{ElectionId, ElectionWithPoliticalGroups, PoliticalGroup},
        entry_number::EntryNumber,
        polling_station::{PollingStation, PollingStationId},
        role::Role,
        status::{
            ClientState, CurrentDataEntry, DataEntryStatus, DataEntryStatusName,
            DataEntryTransitionError, EntriesDifferent,
        },
        validation::{DataError, ValidateRoot, ValidationResults},
    },
    error::{ErrorReference, ErrorResponse},
    infra::audit_log::{AuditEvent, AuditService},
    repository::{
        committee_session_repo, data_entry_repo,
        data_entry_repo::{
            delete_data_entry, delete_result, get_data_entry, get_result,
            previous_results_for_polling_station,
        },
        election_repo,
        investigation_repo::get_polling_station_investigation,
        polling_station_repo,
        user_repo::{User, UserId},
    },
    service::change_committee_session_status::change_committee_session_status,
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
        .routes(routes!(polling_station_data_entries_and_result_delete))
        .routes(routes!(polling_station_data_entry_get))
        .routes(routes!(polling_station_data_entry_resolve_errors))
        .routes(routes!(polling_station_data_entry_get_differences))
        .routes(routes!(polling_station_data_entry_resolve_differences))
        .routes(routes!(election_status))
}

async fn validate_and_get_data(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    user: &User,
) -> Result<
    (
        PollingStation,
        ElectionWithPoliticalGroups,
        CommitteeSession,
        DataEntryStatus,
    ),
    APIError,
> {
    let polling_station = polling_station_repo::get(conn, polling_station_id).await?;
    let committee_session =
        committee_session_repo::get(conn, polling_station.committee_session_id).await?;
    let election = election_repo::get(conn, committee_session.election_id).await?;

    let data_entry_status =
        data_entry_repo::get_or_default(conn, polling_station_id, committee_session.id).await?;

    // Validate polling station
    if committee_session.is_next_session() {
        match get_polling_station_investigation(conn, polling_station.id).await {
            Ok(investigation) if investigation.corrected_results == Some(true) => {}
            _ => {
                return Err(APIError::Conflict(
                    "Data entry not allowed, no investigation with corrected results.".to_string(),
                    ErrorReference::DataEntryNotAllowed,
                ));
            }
        }
    }

    // Validate state based on user role
    match user.role() {
        Role::Typist => {
            if committee_session.status == CommitteeSessionStatus::Paused {
                return Err(CommitteeSessionError::CommitteeSessionPaused.into());
            } else if committee_session.status != CommitteeSessionStatus::DataEntry {
                return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
            }
        }
        Role::Coordinator => {
            if committee_session.status != CommitteeSessionStatus::DataEntry
                && committee_session.status != CommitteeSessionStatus::Paused
            {
                return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
            }
        }
        _ => {
            return Err(AuthenticationError::Forbidden.into());
        }
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
    committee_session: &CommitteeSession,
    polling_station_id: PollingStationId,
) -> Result<(), APIError> {
    if let Some(data_entry) = delete_data_entry(conn, polling_station_id).await? {
        audit_service
            .log(conn, &AuditEvent::DataEntryDeleted(data_entry.into()), None)
            .await?;
    }
    if let Some(result) = delete_result(conn, polling_station_id).await? {
        audit_service
            .log(conn, &AuditEvent::ResultDeleted(result.into()), None)
            .await?;
        if committee_session.status == CommitteeSessionStatus::Completed {
            change_committee_session_status(
                conn,
                committee_session.id,
                CommitteeSessionStatus::DataEntry,
                audit_service.clone(),
            )
            .await?;
        }
    }
    Ok(())
}

fn initial_current_data_entry(
    user_id: UserId,
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
            copy.differences_counts.compare_votes_cast_admitted_voters = Default::default();
            copy.differences_counts.difference_completely_accounted_for = Default::default();

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
        (status = 422, description = "Invalid data", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
    security(("cookie_auth" = ["typist"])),
)]
async fn polling_station_data_entry_claim(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(PollingStationId, EntryNumber)>,
    audit_service: AuditService,
) -> Result<Json<ClaimDataEntryResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let previous_results = if polling_station.id_prev_session.is_some() {
        Some(previous_results_for_polling_station(&mut tx, polling_station_id).await?)
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
        EntryNumber::FirstEntry => state.clone().claim_first_entry(new_data_entry.clone())?,
        EntryNumber::SecondEntry => state.clone().claim_second_entry(new_data_entry.clone())?,
    };

    // Validate the state
    let data = new_state
        .get_data()
        .expect("data should be present because data entry is in progress");
    let validation_results = new_state.start_validate(&polling_station, &election)?;

    // Save the new data entry state
    data_entry_repo::upsert(
        &mut tx,
        polling_station_id,
        committee_session.id,
        &new_state,
    )
    .await?;

    let data_entry = get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    match state {
        DataEntryStatus::Empty | DataEntryStatus::FirstEntryFinalised(_) => {
            audit_service
                .log(
                    &mut tx,
                    &AuditEvent::DataEntryStarted(data_entry.into()),
                    None,
                )
                .await?;
        }
        _ => {
            audit_service
                .log(
                    &mut tx,
                    &AuditEvent::DataEntryResumed(data_entry.into()),
                    None,
                )
                .await?;
        }
    }

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
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
    security(("cookie_auth" = ["typist"])),
)]
async fn polling_station_data_entry_save(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(PollingStationId, EntryNumber)>,
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
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
    security(("cookie_auth" = ["typist"])),
)]
async fn polling_station_data_entry_delete(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(PollingStationId, EntryNumber)>,
    audit_service: AuditService,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let user_id = user.0.id();
    let new_state = match entry_number {
        EntryNumber::FirstEntry => state.delete_first_entry(user_id)?,
        EntryNumber::SecondEntry => {
            state.delete_second_entry(user_id, &polling_station, &election)?
        }
    };

    let mut data_entry = get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    if new_state == DataEntryStatus::Empty {
        // The database entry of the data entry is fully deleted when the first entry is deleted
        delete_data_entry(&mut tx, polling_station_id).await?;
    } else {
        // The status of the data entry is updated when the second entry is deleted
        data_entry = data_entry_repo::upsert(
            &mut tx,
            polling_station_id,
            committee_session.id,
            &new_state,
        )
        .await?;
    }

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
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
    security(("cookie_auth" = ["typist"])),
)]
async fn polling_station_data_entry_finalise(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(PollingStationId, EntryNumber)>,
    audit_service: AuditService,
) -> Result<Json<DataEntryStatusResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let user_id = user.0.id();
    match entry_number {
        EntryNumber::FirstEntry => {
            let new_state = state.finalise_first_entry(&polling_station, &election, user_id)?;
            data_entry_repo::upsert(
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
                    data_entry_repo::make_definitive(
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
                    data_entry_repo::upsert(
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
                AuditEvent::DataEntryReturnedFirst(data_entry.into())
            }
        }
    }
}

/// Delete data entries and result for a polling station
#[utoipa::path(
    delete,
    path = "/api/polling_stations/{polling_station_id}/data_entries",
    responses(
        (status = 204, description = "Data entries deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_data_entries_and_result_delete(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<PollingStationId>,
    audit_service: AuditService,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let polling_station = polling_station_repo::get(&mut tx, polling_station_id).await?;
    let committee_session =
        committee_session_repo::get(&mut tx, polling_station.committee_session_id).await?;

    let data_entry = get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    if data_entry.state.status_name() == DataEntryStatusName::FirstEntryHasErrors
        || data_entry.state.status_name() == DataEntryStatusName::EntriesDifferent
    {
        tx.rollback().await?;

        Err(APIError::Conflict(
            "Data entry cannot be deleted.".to_string(),
            ErrorReference::DataEntryCannotBeDeleted,
        ))
    } else {
        // The database entries of the data entry (and optional result) are fully deleted
        delete_data_entry_and_result_for_polling_station(
            &mut tx,
            &audit_service,
            &committee_session,
            polling_station_id,
        )
        .await?;

        tx.commit().await?;

        Ok(StatusCode::NO_CONTENT)
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryGetResponse {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub user_id: Option<UserId>,
    pub data: PollingStationResults,
    pub status: DataEntryStatusName,
    pub validation_results: ValidationResults,
}

/// Get data entry with validation results
#[utoipa::path(
    get,
    path = "/api/polling_stations/{polling_station_id}/data_entries/get",
    responses(
        (status = 200, description = "Data entry with validation results", body = DataEntryGetResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Data entry not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_data_entry_get(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<PollingStationId>,
) -> Result<Json<DataEntryGetResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut conn, polling_station_id, &user.0).await?;

    match state.clone() {
        DataEntryStatus::FirstEntryInProgress(first_entry_in_progress_state) => {
            Ok(Json(DataEntryGetResponse {
                user_id: Some(first_entry_in_progress_state.first_entry_user_id),
                data: first_entry_in_progress_state.first_entry,
                status: state.status_name(),
                validation_results: ValidationResults::default(),
            }))
        }
        DataEntryStatus::FirstEntryHasErrors(first_entry_has_errors_state) => {
            Ok(Json(DataEntryGetResponse {
                user_id: Some(first_entry_has_errors_state.first_entry_user_id),
                data: first_entry_has_errors_state.finalised_first_entry,
                status: state.status_name(),
                validation_results: state.start_validate(&polling_station, &election)?,
            }))
        }
        DataEntryStatus::FirstEntryFinalised(first_entry_finalised_state) => {
            Ok(Json(DataEntryGetResponse {
                user_id: Some(first_entry_finalised_state.first_entry_user_id),
                data: first_entry_finalised_state.finalised_first_entry,
                status: state.status_name(),
                validation_results: state.start_validate(&polling_station, &election)?,
            }))
        }
        DataEntryStatus::SecondEntryInProgress(second_entry_in_progress_state) => {
            Ok(Json(DataEntryGetResponse {
                user_id: Some(second_entry_in_progress_state.second_entry_user_id),
                data: second_entry_in_progress_state.second_entry,
                status: state.status_name(),
                validation_results: ValidationResults::default(),
            }))
        }
        DataEntryStatus::Definitive(_) => {
            let result = get_result(&mut conn, polling_station_id, committee_session.id).await?;
            let data_entry = result.data.0;

            let validation_results = data_entry.start_validate(&polling_station, &election)?;

            Ok(Json(DataEntryGetResponse {
                user_id: None,
                data: data_entry,
                status: state.status_name(),
                validation_results,
            }))
        }
        _ => Err(APIError::Conflict(
            "Data entry is in the wrong state".to_string(),
            ErrorReference::DataEntryGetNotAllowed,
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
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_data_entry_resolve_errors(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<PollingStationId>,
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

    if new_state == DataEntryStatus::Empty {
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

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryGetDifferencesResponse {
    pub first_entry_user_id: UserId,
    pub first_entry: PollingStationResults,
    pub second_entry_user_id: UserId,
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
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_data_entry_get_differences(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<PollingStationId>,
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
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_data_entry_resolve_differences(
    user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<PollingStationId>,
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

    if new_state == DataEntryStatus::Empty {
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
    pub polling_station_id: PollingStationId,
    /// Data entry status
    pub status: DataEntryStatusName,
    /// First entry user id
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub first_entry_user_id: Option<UserId>,
    /// Second entry user id
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub second_entry_user_id: Option<UserId>,
    /// First entry progress as a percentage (0 to 100)
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub first_entry_progress: Option<u8>,
    /// Second entry progress as a percentage (0 to 100)
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub second_entry_progress: Option<u8>,
    /// Time when the data entry was finalised
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String)]
    pub finished_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    /// Whether the finalised first or second data entry has warnings
    pub finalised_with_warnings: Option<bool>,
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
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
async fn election_status(
    _user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<ElectionStatusResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election_id).await?;

    let statuses = data_entry_repo::statuses(&mut conn, current_committee_session.id).await?;
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
        domain::{
            committee_session::CommitteeSessionId,
            data_entry::tests::example_polling_station_results,
            validation::{ValidationResult, ValidationResultCode},
        },
        repository::{
            committee_session_repo::change_status,
            data_entry_repo::{data_entry_exists, result_exists},
            investigation_repo::insert_test_investigation,
            polling_station_repo::insert_test_polling_station,
        },
    };

    fn example_data_entry() -> DataEntry {
        DataEntry {
            progress: 100,
            data: example_polling_station_results(),
            client_state: ClientState(None),
        }
    }

    fn example_data_entry_with_warning() -> DataEntry {
        DataEntry {
            progress: 100,
            data: example_polling_station_results().with_warning(),
            client_state: ClientState(None),
        }
    }

    async fn get_data_entry_status(
        pool: SqlitePool,
        polling_station_id: PollingStationId,
        committee_session_id: CommitteeSessionId,
    ) -> DataEntryStatus {
        let mut conn = pool.acquire().await.unwrap();
        data_entry_repo::get(&mut conn, polling_station_id, committee_session_id)
            .await
            .unwrap()
    }

    async fn claim(
        pool: SqlitePool,
        polling_station_id: PollingStationId,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, UserId::from(1)),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, UserId::from(2)),
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
        polling_station_id: PollingStationId,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, UserId::from(1)),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, UserId::from(2)),
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
        polling_station_id: PollingStationId,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, UserId::from(1)),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, UserId::from(2)),
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

    async fn delete_data_entries_and_result(
        pool: SqlitePool,
        polling_station_id: PollingStationId,
    ) -> Response {
        let user = User::test_user(Role::Coordinator, UserId::from(1));
        polling_station_data_entries_and_result_delete(
            Coordinator(user.clone()),
            State(pool.clone()),
            Path(polling_station_id),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response()
    }

    async fn finalise(
        pool: SqlitePool,
        polling_station_id: PollingStationId,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, UserId::from(1)),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, UserId::from(2)),
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
        polling_station_id: PollingStationId,
        action: ResolveDifferencesAction,
    ) -> Response {
        let user = User::test_user(Role::Coordinator, UserId::from(1));
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

    async fn resolve_errors(
        pool: SqlitePool,
        polling_station_id: PollingStationId,
        action: ResolveErrorsAction,
    ) -> Response {
        let user = User::test_user(Role::Coordinator, UserId::from(1));
        polling_station_data_entry_resolve_errors(
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
        let polling_station_id = PollingStationId::from(1);
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
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
        let response = claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let DataEntryStatusResponse { status } = serde_json::from_slice(&body).unwrap();

        assert_eq!(status, DataEntryStatusName::EntriesDifferent);
    }

    async fn finalise_with_errors(pool: SqlitePool) {
        let mut request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        request_body
            .data
            .as_cso_first_session_mut()
            .unwrap()
            .voters_counts
            .poll_card_count = 100; // incorrect value

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that finalise with errors results in FirstEntryHasErrors
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let DataEntryStatusResponse { status } = serde_json::from_slice(&body).unwrap();

        assert_eq!(status, DataEntryStatusName::FirstEntryHasErrors);
    }

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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_ok(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(1);
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_committee_session_status_is_paused(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(1);
        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Paused,
        )
        .await;

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);

        // Check that no row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_committee_session_status_not_paused_or_data_entry(
        pool: SqlitePool,
    ) {
        let polling_station_id = PollingStationId::from(1);
        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Completed,
        )
        .await;

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );

        // Check that no row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_err_no_investigation(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(742);
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::DataEntryNotAllowed);

        // Check that no row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_err_investigation_no_corrected_results(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = PollingStationId::from(742);
        // Insert investigation
        insert_test_investigation(&mut conn, polling_station_id, Some(false))
            .await
            .unwrap();

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::DataEntryNotAllowed);

        // Check that no row was created
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_ok(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = PollingStationId::from(742);
        // Insert investigation
        insert_test_investigation(&mut conn, polling_station_id, Some(true))
            .await
            .unwrap();

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(704),
            CommitteeSessionStatus::DataEntry,
        )
        .await;

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that row was created
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if a row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry_committee_session_status_is_paused(pool: SqlitePool) {
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Paused,
        )
        .await;

        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);

        // Check that the row was not updated
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        let DataEntryStatus::FirstEntryInProgress(state) = status else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_ne!(state.first_entry, request_body.data);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_create_data_entry_committee_session_status_not_paused_or_data_entry(
        pool: SqlitePool,
    ) {
        let polling_station_id = PollingStationId::from(1);
        let request_body = example_data_entry();

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Completed,
        )
        .await;

        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
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
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        let DataEntryStatus::FirstEntryInProgress(state) = status else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_ne!(state.first_entry, request_body.data);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_create_data_entry_uniqueness(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let polling_station_id = PollingStationId::from(9);

        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(
            &mut pool.acquire().await.unwrap(),
            polling_station_id,
            Some(true),
        )
        .await
        .unwrap();

        // Claim a polling station that had entries/a result in the previous committee session
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that a new row was created
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        // Check that the new data entry is linked to the new committee session
        let data = query_as!(
            PollingStationDataEntry,
            r#"
            SELECT
                polling_station_id AS "polling_station_id: PollingStationId",
                committee_session_id AS "committee_session_id: CommitteeSessionId",
                state AS "state: _",
                updated_at AS "updated_at: _"
            FROM polling_station_data_entries
            WHERE polling_station_id = ?
            "#,
            polling_station_id,
        )
        .fetch_all(&pool)
        .await
        .expect("No data found");
        assert_eq!(data.len(), 1);
        assert_eq!(data[0].committee_session_id, CommitteeSessionId::from(6));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_update_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if the row is there
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        // Check if the data was updated
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry_committee_session_status_is_paused(pool: SqlitePool) {
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Paused,
        )
        .await;

        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_data_entry_committee_session_status_not_paused_or_data_entry(
        pool: SqlitePool,
    ) {
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Completed,
        )
        .await;

        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
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
        finalise_with_errors(pool.clone()).await;

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
        let polling_station_id = PollingStationId::from(1);

        // Save the first data entry and finalise it
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save a second data entry
        let response = claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if entry is now in SecondEntryInProgress state
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::SecondEntryInProgress(_)));

        // Check that nothing is added to polling_station_results yet
        assert!(!result_exists(&mut conn, polling_station_id).await.unwrap());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_finalise_second_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        // Save and finalise the first data entry
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save and finalise the second data entry
        let response = claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that polling_station_results contains the finalised result and that the data entries are deleted
        let mut conn = pool.acquire().await.unwrap();
        assert!(result_exists(&mut conn, polling_station_id).await.unwrap());

        // Check that the status is 'Definitive'
        let status = get_data_entry_status(
            pool.clone(),
            polling_station_id,
            CommitteeSessionId::from(2),
        )
        .await;
        assert!(matches!(status, DataEntryStatus::Definitive(_)));

        // Check that we can't save a new data entry after finalising
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    // test creating first and different second data entry
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_first_second_data_entry_different(pool: SqlitePool) {
        finalise_different_entries(pool.clone()).await;
        let polling_station_id = PollingStationId::from(1);

        // Check if entry is now in EntriesDifferent state
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::EntriesDifferent(_)));

        // Check that no result has been created
        assert!(!result_exists(&mut conn, polling_station_id).await.unwrap());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_first_entry(pool: SqlitePool) {
        // create data entry
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        // delete data entry
        let response = delete(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // Check that the data entry is deleted
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_second_entry(pool: SqlitePool) {
        // create data entry with warning
        let request_body = example_data_entry_with_warning();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let user = User::test_user(Role::Coordinator, UserId::from(1));
        let response = polling_station_data_entry_get(
            Coordinator(user),
            State(pool.clone()),
            Path(polling_station_id),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: DataEntryGetResponse = serde_json::from_slice(&body).unwrap();

        let warnings = result.validation_results.warnings;
        assert_eq!(warnings.len(), 1);
        assert_eq!(warnings[0].code, ValidationResultCode::W201);
        assert_eq!(
            warnings[0].fields,
            vec!["data.votes_counts.blank_votes_count",]
        );
        let errors = result.validation_results.errors;
        assert_eq!(errors.len(), 0);

        // Check that the data entry is created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        let response = claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that the data entry is in SecondEntryInProgress state
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::SecondEntryInProgress(_)));

        // delete second data entry
        let response = delete(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // Check that the second data entry is deleted
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryFinalised(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_committee_session_status_is_paused(
        pool: SqlitePool,
    ) {
        // create data entry
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Paused,
        )
        .await;

        // delete data entry
        let response = delete(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);

        // Check if entry is still in FirstEntryInProgress state
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryInProgress(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_committee_session_status_not_paused_or_data_entry(
        pool: SqlitePool,
    ) {
        // create data entry
        let request_body = example_data_entry();
        let polling_station_id = PollingStationId::from(1);

        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Completed,
        )
        .await;

        // delete data entry
        let response = delete(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );

        // Check if entry is still in FirstEntryInProgress state
        let mut conn = pool.acquire().await.unwrap();
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryInProgress(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entry_delete_nonexistent(pool: SqlitePool) {
        let user = User::test_user(Role::Typist, UserId::from(1));
        // check that deleting a non-existing data entry returns 404
        let response = polling_station_data_entry_delete(
            Typist(User::test_user(Role::Typist, UserId::from(1))),
            State(pool.clone()),
            Path((PollingStationId::from(1), EntryNumber::FirstEntry)),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_delete_finalised_not_possible(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = PollingStationId::from(1);

        for entry_number in 1..=2 {
            let entry_number = EntryNumber::try_from(entry_number).unwrap();
            // create and finalise the first data entry
            let request_body = example_data_entry();
            let response = claim(pool.clone(), polling_station_id, entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = save(
                pool.clone(),
                request_body.clone(),
                polling_station_id,
                entry_number,
            )
            .await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = finalise(pool.clone(), polling_station_id, entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);

            // check that deleting finalised or non-existent data entry returns 404
            for _entry_number in 1..=2 {
                let response = delete(pool.clone(), polling_station_id, entry_number).await;
                assert_eq!(response.status(), StatusCode::CONFLICT);
            }

            // after the first data entry, check if it is still in the database
            // (after the second data entry, the results are finalised so we do not expect rows)
            if entry_number == EntryNumber::FirstEntry {
                assert!(
                    data_entry_exists(&mut conn, polling_station_id)
                        .await
                        .unwrap()
                );
            }
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entries_and_result_delete_first_entry_in_progress(
        pool: SqlitePool,
    ) {
        // create data entry
        let polling_station_id = PollingStationId::from(1);
        let request_body = example_data_entry();
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        // delete data entry with status FirstEntryInProgress
        let response = delete_data_entries_and_result(pool.clone(), polling_station_id).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // Check that the data entry is deleted
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_3"))))]
    async fn test_polling_station_data_entries_and_result_delete_definitive(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(3);

        // create data entry
        let request_body = example_data_entry();
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::FirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = save(
            pool.clone(),
            request_body.clone(),
            polling_station_id,
            EntryNumber::SecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
        assert!(result_exists(&mut conn, polling_station_id).await.unwrap());

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(3),
            CommitteeSessionStatus::Completed,
        )
        .await;

        // delete data entry with status Definitive
        let response = delete_data_entries_and_result(pool.clone(), polling_station_id).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // Check that the data entry and result are deleted
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
        assert!(!result_exists(&mut conn, polling_station_id).await.unwrap());

        // Check that the committee session status is changed to DataEntry
        let committee_session = committee_session_repo::get(&mut conn, CommitteeSessionId::from(3))
            .await
            .unwrap();

        assert_eq!(committee_session.status, CommitteeSessionStatus::DataEntry);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entries_and_result_delete_fails_entries_different(
        pool: SqlitePool,
    ) {
        let polling_station_id = PollingStationId::from(1);
        finalise_different_entries(pool.clone()).await;

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        // delete data entry with status EntriesDifferent fails
        let response = delete_data_entries_and_result(pool.clone(), polling_station_id).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::DataEntryCannotBeDeleted);

        // Check that the data entry is not deleted
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_polling_station_data_entries_and_result_delete_fails_first_entry_has_errors(
        pool: SqlitePool,
    ) {
        let polling_station_id = PollingStationId::from(1);
        finalise_with_errors(pool.clone()).await;

        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        // delete data entry with status FirstEntryHasErrors fails
        let response = delete_data_entries_and_result(pool.clone(), polling_station_id).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::DataEntryCannotBeDeleted);

        // Check that the data entry is not deleted
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_differences_keep_first(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(1);
        finalise_different_entries(pool.clone()).await;
        let response = resolve_differences(
            pool.clone(),
            polling_station_id,
            ResolveDifferencesAction::KeepFirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        if let DataEntryStatus::FirstEntryFinalised(entry) = status {
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
        let polling_station_id = PollingStationId::from(1);
        finalise_different_entries(pool.clone()).await;

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Paused,
        )
        .await;

        let response = resolve_differences(
            pool.clone(),
            polling_station_id,
            ResolveDifferencesAction::KeepSecondEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        if let DataEntryStatus::FirstEntryFinalised(entry) = status {
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
        let polling_station_id = PollingStationId::from(1);
        finalise_different_entries(pool.clone()).await;

        // Check that the data entry is created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        let response = resolve_differences(
            pool.clone(),
            polling_station_id,
            ResolveDifferencesAction::DiscardBothEntries,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that the data entry is deleted
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_differences_committee_session_status_not_ok(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(1);
        finalise_different_entries(pool.clone()).await;

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Completed,
        )
        .await;

        let response = resolve_differences(
            pool.clone(),
            polling_station_id,
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
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::EntriesDifferent(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_errors_resume_first(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(1);
        finalise_with_errors(pool.clone()).await;

        let response = resolve_errors(
            pool.clone(),
            polling_station_id,
            ResolveErrorsAction::ResumeFirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        let mut conn = pool.acquire().await.unwrap();
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryInProgress(_)));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_errors_discard_first(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(1);
        finalise_with_errors(pool.clone()).await;

        // Check that the data entry is created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );

        let response = resolve_errors(
            pool.clone(),
            polling_station_id,
            ResolveErrorsAction::DiscardFirstEntry,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that the data entry is deleted
        assert!(
            !data_entry_exists(&mut conn, polling_station_id)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_data_entry_resolve_errors_committee_session_status_not_ok(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(1);
        finalise_with_errors(pool.clone()).await;

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(2),
            CommitteeSessionStatus::Completed,
        )
        .await;

        let response = resolve_errors(
            pool.clone(),
            polling_station_id,
            ResolveErrorsAction::DiscardFirstEntry,
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
        let data_entry = get_data_entry(&mut conn, polling_station_id, CommitteeSessionId::from(2))
            .await
            .unwrap();
        let status: DataEntryStatus = data_entry.state.0;
        assert!(matches!(status, DataEntryStatus::FirstEntryHasErrors(_)));
    }

    async fn claim_previous_results(
        pool: SqlitePool,
        polling_station_id: PollingStationId,
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
        let committee_session_id = CommitteeSessionId::from(704);
        let polling_station_id = PollingStationId::from(743);
        // Add new polling station
        insert_test_polling_station(
            &mut pool.acquire().await.unwrap(),
            polling_station_id,
            committee_session_id,
            None,
            123,
        )
        .await
        .unwrap();

        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(
            &mut pool.acquire().await.unwrap(),
            polling_station_id,
            Some(true),
        )
        .await
        .unwrap();

        change_status_committee_session(
            pool.clone(),
            committee_session_id,
            CommitteeSessionStatus::DataEntry,
        )
        .await;

        assert!(
            claim_previous_results(pool.clone(), polling_station_id)
                .await
                .is_none()
        );
    }

    /// Should get result from third session, even though there were also results in the first session
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results(pool: SqlitePool) {
        let polling_station_id = PollingStationId::from(742);
        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(
            &mut pool.acquire().await.unwrap(),
            polling_station_id,
            Some(true),
        )
        .await
        .unwrap();

        change_status_committee_session(
            pool.clone(),
            CommitteeSessionId::from(704),
            CommitteeSessionStatus::DataEntry,
        )
        .await;

        let previous_results = claim_previous_results(pool.clone(), polling_station_id)
            .await
            .unwrap();
        // Check by difference in fixture results data
        assert_eq!(previous_results.voters_counts.proxy_certificate_count, 4);
    }

    /// First committee session, should return all polling station statuses
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_statuses_first_session_all_polling_stations(pool: SqlitePool) {
        let user = User::test_user(Role::Coordinator, UserId::from(1));
        let response =
            election_status(user.clone(), State(pool.clone()), Path(ElectionId::from(2)))
                .await
                .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 2);
    }

    /// New committee session without investigations, should return no polling station statuses
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_statuses_second_session_no_polling_stations(pool: SqlitePool) {
        let user = User::test_user(Role::Coordinator, UserId::from(1));
        let response =
            election_status(user.clone(), State(pool.clone()), Path(ElectionId::from(7)))
                .await
                .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 0);
    }

    /// Second committee session with 1 investigation, should return 1 polling station status
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_statuses_second_session_with_investigation(pool: SqlitePool) {
        let user = User::test_user(Role::Coordinator, UserId::from(1));

        let response =
            election_status(user.clone(), State(pool.clone()), Path(ElectionId::from(5)))
                .await
                .into_response();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ElectionStatusResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.statuses.len(), 1);
    }

    mod polling_station_data_entry_get {
        use test_log::test;

        use super::*;

        async fn call_polling_station_data_entry_get(
            pool: SqlitePool,
            polling_station_id: PollingStationId,
        ) -> Result<DataEntryGetResponse, ErrorResponse> {
            let user = User::test_user(Role::Coordinator, UserId::from(1));
            let response = polling_station_data_entry_get(
                Coordinator(user),
                State(pool),
                Path(polling_station_id),
            )
            .await
            .into_response();

            let is_success = response.status().is_success();
            let body = response.into_body().collect().await.unwrap().to_bytes();

            if is_success {
                Ok(serde_json::from_slice(&body).unwrap())
            } else {
                Err(serde_json::from_slice(&body).unwrap())
            }
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_status_empty(pool: SqlitePool) {
            let result =
                call_polling_station_data_entry_get(pool.clone(), PollingStationId::from(1))
                    .await
                    .err()
                    .unwrap();

            assert_eq!(result.reference, ErrorReference::DataEntryGetNotAllowed);
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_status_first_entry_in_progress(pool: SqlitePool) {
            claim(
                pool.clone(),
                PollingStationId::from(1),
                EntryNumber::FirstEntry,
            )
            .await;

            let result =
                call_polling_station_data_entry_get(pool.clone(), PollingStationId::from(1))
                    .await
                    .unwrap();

            assert_eq!(result.status, DataEntryStatusName::FirstEntryInProgress);
            assert_eq!(result.user_id, Some(UserId::from(1)));
            assert_eq!(result.data.as_common().voters_counts.poll_card_count, 0);
            assert!(!result.validation_results.has_errors());
            assert!(!result.validation_results.has_warnings());
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_status_first_entry_has_errors(pool: SqlitePool) {
            let mut data_entry_body = example_data_entry();
            let polling_station_id = PollingStationId::from(1);

            data_entry_body.data.voters_counts_mut().poll_card_count = 1234; // incorrect value

            claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
            save(
                pool.clone(),
                data_entry_body,
                polling_station_id,
                EntryNumber::FirstEntry,
            )
            .await;
            finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;

            let result = call_polling_station_data_entry_get(pool.clone(), polling_station_id)
                .await
                .unwrap();

            assert_eq!(result.status, DataEntryStatusName::FirstEntryHasErrors);
            assert_eq!(result.user_id, Some(UserId::from(1)));
            assert_eq!(result.data.as_common().voters_counts.poll_card_count, 1234);
            assert_eq!(
                result.validation_results.errors,
                [ValidationResult {
                    code: ValidationResultCode::F201,
                    fields: vec![
                        "data.voters_counts.poll_card_count".into(),
                        "data.voters_counts.proxy_certificate_count".into(),
                        "data.voters_counts.total_admitted_voters_count".into()
                    ],
                    context: None,
                },]
            );
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_status_first_entry_finalised(pool: SqlitePool) {
            let polling_station_id = PollingStationId::from(1);
            claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
            save(
                pool.clone(),
                example_data_entry_with_warning(),
                polling_station_id,
                EntryNumber::FirstEntry,
            )
            .await;
            finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;

            let result = call_polling_station_data_entry_get(pool.clone(), polling_station_id)
                .await
                .unwrap();

            assert_eq!(result.status, DataEntryStatusName::FirstEntryFinalised);
            assert_eq!(result.user_id, Some(UserId::from(1)));
            assert_eq!(result.data.as_common().voters_counts.poll_card_count, 199);
            assert!(!result.validation_results.has_errors());
            assert!(result.validation_results.has_warnings());
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_status_second_entry_in_progress(pool: SqlitePool) {
            // Complete first entry
            let data_entry_body = example_data_entry_with_warning();
            let polling_station_id = PollingStationId::from(1);

            claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
            save(
                pool.clone(),
                data_entry_body,
                polling_station_id,
                EntryNumber::FirstEntry,
            )
            .await;
            finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;

            // Start second entry
            claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;

            let result = call_polling_station_data_entry_get(pool.clone(), polling_station_id)
                .await
                .unwrap();

            assert_eq!(result.status, DataEntryStatusName::SecondEntryInProgress);
            assert_eq!(result.user_id, Some(UserId::from(2)));
            assert_eq!(result.data.as_common().voters_counts.poll_card_count, 0);
            assert!(!result.validation_results.has_errors());
            assert!(!result.validation_results.has_warnings());
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_status_entries_different(pool: SqlitePool) {
            let polling_station_id = PollingStationId::from(1);

            // Complete first entry
            let data_entry_body = example_data_entry();
            claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
            save(
                pool.clone(),
                data_entry_body,
                polling_station_id,
                EntryNumber::FirstEntry,
            )
            .await;
            finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;

            // Start and complete second entry with different values
            let mut data_entry_body = example_data_entry();
            data_entry_body.data.voters_counts_mut().poll_card_count = 80;
            data_entry_body
                .data
                .voters_counts_mut()
                .proxy_certificate_count = 20;

            claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
            save(
                pool.clone(),
                data_entry_body,
                polling_station_id,
                EntryNumber::SecondEntry,
            )
            .await;
            finalise(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;

            let result = call_polling_station_data_entry_get(pool.clone(), polling_station_id)
                .await
                .err()
                .unwrap();

            assert_eq!(result.reference, ErrorReference::DataEntryGetNotAllowed);
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_status_definitive(pool: SqlitePool) {
            // Complete first entry
            let data_entry_body = example_data_entry_with_warning();
            let polling_station_id = PollingStationId::from(1);

            claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
            save(
                pool.clone(),
                data_entry_body,
                polling_station_id,
                EntryNumber::FirstEntry,
            )
            .await;
            finalise(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;

            // Complete second entry
            let data_entry_body = example_data_entry_with_warning();
            claim(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;
            save(
                pool.clone(),
                data_entry_body,
                polling_station_id,
                EntryNumber::SecondEntry,
            )
            .await;
            finalise(pool.clone(), polling_station_id, EntryNumber::SecondEntry).await;

            let result = call_polling_station_data_entry_get(pool.clone(), polling_station_id)
                .await
                .unwrap();

            assert_eq!(result.status, DataEntryStatusName::Definitive);
            assert_eq!(result.user_id, None);
            assert!(!result.validation_results.has_errors());
            assert!(result.validation_results.has_warnings());
        }
    }
}
