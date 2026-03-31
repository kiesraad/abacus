use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::Serialize;
use sqlx::{Connection, SqliteConnection, SqlitePool};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::{
        data_entry::delete_data_entry_for_polling_station,
        investigation::delete_investigation_for_polling_station,
        middleware::authentication::{RouteAuthorization, error::AuthenticationError},
    },
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
        data_entry::DataEntryId,
        election::{CommitteeCategory, ElectionId},
        polling_station::{
            PollingStationFileRequest, PollingStationId, PollingStationListResponse,
            PollingStationRequest, PollingStationRequestListResponse, PollingStationResponse,
            PollingStationsRequest,
        },
        role::Role,
    },
    eml::{EMLImportError, EmlHash, polling_stations_from_eml_str},
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{
        committee_session_repo::get_election_committee_session,
        data_entry_repo, election_repo, investigation_repo, polling_station_repo,
        polling_station_repo::{
            create, create_many, delete, get_committee_category, get_for_election, has_any, update,
        },
        user_repo::User,
    },
    service::{change_committee_session_status, list_polling_stations_for_session},
};

#[derive(Serialize)]
pub struct PollingStationAuditData {
    pub polling_station_id: PollingStationId,
    pub polling_station_election_id: ElectionId,
    pub polling_station_committee_session_id: CommitteeSessionId,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub polling_station_prev_data_entry_id: Option<DataEntryId>,
    pub polling_station_name: String,
    pub polling_station_number: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub polling_station_number_of_voters: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub polling_station_type: Option<String>,
    pub polling_station_address: String,
    pub polling_station_postal_code: String,
    pub polling_station_locality: String,
}

impl From<PollingStationResponse> for PollingStationAuditData {
    fn from(value: PollingStationResponse) -> Self {
        Self {
            polling_station_id: value.id,
            polling_station_election_id: value.election_id,
            polling_station_committee_session_id: value.committee_session_id,
            polling_station_prev_data_entry_id: value.prev_data_entry_id,
            polling_station_name: value.name,
            polling_station_number: value.number,
            polling_station_number_of_voters: value.number_of_voters,
            polling_station_type: value.polling_station_type.map(|t| t.to_string()),
            polling_station_address: value.address,
            polling_station_postal_code: value.postal_code,
            polling_station_locality: value.locality,
        }
    }
}

#[derive(Serialize)]
pub struct PollingStationImportAuditData {
    pub import_election_id: ElectionId,
    pub import_file_name: String,
    pub import_number_of_polling_stations: u64,
}

#[derive(Serialize)]
struct PollingStationCreatedAuditData(pub PollingStationAuditData);
impl AsAuditEvent for PollingStationCreatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::PollingStationCreated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

#[derive(Serialize)]
struct PollingStationUpdatedAuditData(pub PollingStationAuditData);
impl AsAuditEvent for PollingStationUpdatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::PollingStationUpdated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

#[derive(Serialize)]
struct PollingStationDeletedAuditData(pub PollingStationAuditData);
impl AsAuditEvent for PollingStationDeletedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::PollingStationDeleted;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Info;
}
#[derive(Serialize)]
struct PollingStationsImportedAuditData(pub PollingStationImportAuditData);
impl AsAuditEvent for PollingStationsImportedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::PollingStationsImported;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    const ADMIN_GSB_ALL: &[Role] = &[Administrator, CoordinatorGSB, TypistGSB];
    const ADMIN_GSB_COORDINATOR: &[Role] = &[Administrator, CoordinatorGSB];

    OpenApiRouter::default()
        .routes(routes!(polling_station_list).authorize(ADMIN_GSB_ALL))
        .routes(routes!(polling_station_create).authorize(ADMIN_GSB_COORDINATOR))
        .routes(routes!(polling_station_get).authorize(ADMIN_GSB_ALL))
        .routes(routes!(polling_station_update).authorize(ADMIN_GSB_COORDINATOR))
        .routes(routes!(polling_station_delete).authorize(ADMIN_GSB_COORDINATOR))
        .routes(routes!(polling_station_validate_import).authorize(ADMIN_GSB_COORDINATOR))
        .routes(routes!(polling_station_import).authorize(ADMIN_GSB_COORDINATOR))
}

pub fn authorize_user_and_gsb_election(
    user: &User,
    committee_category: &CommitteeCategory,
) -> Result<(), APIError> {
    user.role().is_authorized(committee_category)?;

    // Only GSB elections have polling stations
    if *committee_category != CommitteeCategory::GSB {
        return Err(AuthenticationError::Forbidden.into());
    }

    Ok(())
}

/// Get a list of all [PollingStation]s for an election
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/polling_stations",
    responses(
        (status = 200, description = "Polling station listing successful", body = PollingStationListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn polling_station_list(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<PollingStationListResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let election = election_repo::get(&mut conn, election_id).await?;
    authorize_user_and_gsb_election(&user, &election.committee_category)?;

    let committee_session = get_election_committee_session(&mut conn, election_id).await?;

    Ok(PollingStationListResponse {
        polling_stations: list_polling_stations_for_session(&mut conn, &committee_session)
            .await?
            .into_responses(election_id),
    })
}

pub fn validate_user_is_allowed_to_perform_action(
    user: User,
    committee_session: &CommitteeSession,
) -> Result<(), APIError> {
    // Check if the user is allowed to perform the action in this committee session status,
    // respond with FORBIDDEN otherwise
    if user.role().is_coordinator()
        || (user.role().is_administrator()
            && (committee_session.status == CommitteeSessionStatus::Created
                || committee_session.status == CommitteeSessionStatus::InPreparation))
    {
        Ok(())
    } else {
        Err(AuthenticationError::Forbidden.into())
    }
}

/// Create a new [PollingStation]
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/polling_stations",
    request_body = PollingStationRequest,
    responses(
        (status = 201, description = "Polling station created successfully", body = PollingStationResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 409, description = "Polling station already exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn polling_station_create(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    audit_service: AuditService,
    new_polling_station: PollingStationRequest,
) -> Result<(StatusCode, PollingStationResponse), APIError> {
    let mut tx = pool.begin_immediate().await?;

    let election = election_repo::get(&mut tx, election_id).await?;
    authorize_user_and_gsb_election(&user, &election.committee_category)?;

    let committee_session = get_election_committee_session(&mut tx, election_id).await?;
    validate_user_is_allowed_to_perform_action(user, &committee_session)?;

    let ps_id = create(&mut tx, election_id, new_polling_station).await?;
    if !committee_session.is_next_session() {
        polling_station_repo::create_data_entry(&mut tx, ps_id).await?;
    }
    let polling_station = polling_station_repo::get(&mut tx, ps_id).await?;
    let response: PollingStationResponse = polling_station.into_response(election_id);

    audit_service
        .log(
            &mut tx,
            &PollingStationCreatedAuditData(response.clone().into()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Created
        && !committee_session.is_next_session()
    {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::InPreparation,
            audit_service,
        )
        .await?;
    } else if committee_session.status == CommitteeSessionStatus::Completed {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntry,
            audit_service,
        )
        .await?;
    };

    tx.commit().await?;

    Ok((StatusCode::CREATED, response))
}

/// Get a [PollingStation]
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    responses(
        (status = 200, description = "Polling station found", body = PollingStationResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
)]
async fn polling_station_get(
    user: User,
    State(pool): State<SqlitePool>,
    Path((election_id, polling_station_id)): Path<(ElectionId, PollingStationId)>,
) -> Result<(StatusCode, PollingStationResponse), APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category = get_committee_category(&mut conn, polling_station_id).await?;
    authorize_user_and_gsb_election(&user, &committee_category)?;

    let polling_station = get_for_election(&mut conn, election_id, polling_station_id).await?;
    Ok((StatusCode::OK, polling_station.into_response(election_id)))
}

/// Update a [PollingStation]
#[utoipa::path(
    put,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    request_body = PollingStationRequest,
    responses(
        (status = 200, description = "Polling station updated successfully", body = PollingStationResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
)]
async fn polling_station_update(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, polling_station_id)): Path<(ElectionId, PollingStationId)>,
    polling_station_update: PollingStationRequest,
) -> Result<(StatusCode, PollingStationResponse), APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_category = get_committee_category(&mut tx, polling_station_id).await?;
    authorize_user_and_gsb_election(&user, &committee_category)?;

    let committee_session = get_election_committee_session(&mut tx, election_id).await?;
    validate_user_is_allowed_to_perform_action(user, &committee_session)?;

    let polling_station = update(
        &mut tx,
        election_id,
        polling_station_id,
        polling_station_update,
    )
    .await?;

    let response: PollingStationResponse = polling_station.into_response(election_id);

    audit_service
        .log(
            &mut tx,
            &PollingStationUpdatedAuditData(response.clone().into()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Completed {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntry,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok((StatusCode::OK, response))
}

/// Delete a [PollingStation]
#[utoipa::path(
    delete,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    responses(
        (status = 204, description = "Polling station deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
)]
async fn polling_station_delete(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, polling_station_id)): Path<(ElectionId, PollingStationId)>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_category = get_committee_category(&mut tx, polling_station_id).await?;
    authorize_user_and_gsb_election(&user, &committee_category)?;

    let committee_session = get_election_committee_session(&mut tx, election_id).await?;
    validate_user_is_allowed_to_perform_action(user, &committee_session)?;

    let polling_station = get_for_election(&mut tx, election_id, polling_station_id).await?;

    delete_data_entry_for_polling_station(
        &mut tx,
        &audit_service,
        &committee_session,
        polling_station.id(),
    )
    .await?;

    delete_investigation_for_polling_station(
        &mut tx,
        &audit_service,
        &committee_session,
        polling_station.id(),
    )
    .await?;

    delete(&mut tx, election_id, polling_station_id).await?;

    let response: PollingStationResponse = polling_station.into_response(election_id);
    audit_service
        .log(
            &mut tx,
            &PollingStationDeletedAuditData(response.into()),
            None,
        )
        .await?;

    let has_items = if committee_session.is_next_session() {
        investigation_repo::has_investigations_for_committee_session(&mut tx, committee_session.id)
            .await?
    } else {
        data_entry_repo::has_any(&mut tx, committee_session.id).await?
    };

    if !has_items {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::Created,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Validate a file with Polling Stations
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/polling_stations/validate-import",
    request_body = PollingStationFileRequest,
    responses(
        (status = 200, description = "Polling stations validated", body = PollingStationRequestListResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn polling_station_validate_import(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    Json(polling_station_request): Json<PollingStationFileRequest>,
) -> Result<(StatusCode, Json<PollingStationRequestListResponse>), APIError> {
    let mut conn = pool.acquire().await?;

    let election = election_repo::get(&mut conn, election_id).await?;
    authorize_user_and_gsb_election(&user, &election.committee_category)?;

    Ok((
        StatusCode::OK,
        Json(PollingStationRequestListResponse {
            polling_stations: polling_stations_from_eml_str(&polling_station_request.data)?,
        }),
    ))
}

pub async fn create_imported_polling_stations(
    conn: &mut SqliteConnection,
    audit_service: AuditService,
    election_id: ElectionId,
    polling_stations_request: PollingStationsRequest,
) -> Result<Vec<PollingStationResponse>, APIError> {
    let mut tx = conn.begin().await?;

    let committee_session = get_election_committee_session(&mut tx, election_id).await?;
    let polling_stations =
        polling_stations_from_eml_str(&polling_stations_request.polling_stations)?;
    let file_hash = EmlHash::from(polling_stations_request.polling_stations.as_bytes()).chunks;

    // Create new polling stations
    let ps_ids = create_many(&mut tx, election_id, polling_stations).await?;
    let mut polling_station_list: Vec<_> = Vec::with_capacity(ps_ids.len());
    for id in ps_ids {
        if !committee_session.is_next_session() {
            polling_station_repo::create_data_entry(&mut tx, id).await?;
        }
        polling_station_list.push(polling_station_repo::get(&mut tx, id).await?);
    }

    // Create audit event
    audit_service
        .log(
            &mut tx,
            &PollingStationsImportedAuditData(PollingStationImportAuditData {
                import_election_id: election_id,
                import_file_name: polling_stations_request.file_name,
                import_number_of_polling_stations: u64::try_from(polling_station_list.len())
                    .map_err(|_| EMLImportError::NumberOfPollingStationsNotInRange)?,
            }),
            Some(format!(
                "Polling stations file hash: {}",
                file_hash.join(" ")
            )),
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Created {
        // Change committee session status to InPreparation
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::InPreparation,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(polling_station_list
        .into_iter()
        .map(|ps| ps.into_response(election_id))
        .collect())
}

/// Import file with Polling Stations
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/polling_stations/import",
    request_body = PollingStationsRequest,
    responses(
        (status = 200, description = "Polling stations imported", body = PollingStationListResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
async fn polling_station_import(
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    audit_service: AuditService,
    Json(polling_stations_request): Json<PollingStationsRequest>,
) -> Result<(StatusCode, PollingStationListResponse), APIError> {
    let mut tx = pool.begin_immediate().await?;

    let election = election_repo::get(&mut tx, election_id).await?;
    authorize_user_and_gsb_election(&user, &election.committee_category)?;

    let committee_session = get_election_committee_session(&mut tx, election_id).await?;

    if has_any(&mut tx, committee_session.id).await? {
        return Err(AuthenticationError::Forbidden.into());
    }

    let polling_stations = create_imported_polling_stations(
        &mut tx,
        audit_service,
        election_id,
        polling_stations_request,
    )
    .await?;
    tx.commit().await?;

    Ok((
        StatusCode::OK,
        PollingStationListResponse { polling_stations },
    ))
}

#[cfg(test)]
mod tests {
    use sqlx::{SqlitePool, query};
    use test_log::test;

    use super::{PollingStationRequest, create, create_many, update};
    use crate::domain::{election::ElectionId, polling_station::PollingStationId};

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2", "election_3"))))]
    async fn test_polling_station_number_unique_per_election(pool: SqlitePool) {
        query!("DELETE FROM polling_stations")
            .execute(&pool)
            .await
            .unwrap();

        // Insert two unique polling stations
        let _ = query!(r#"
INSERT INTO polling_stations (id, committee_session_id, prev_data_entry_id, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(1, 2, NULL, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag'),
(2, 2, NULL, 'Testplek', 34, NULL, 'bijzonder', 'Teststraat 2b', '1234 QY', 'Testdorp')
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add a polling station with the same number to a different election
        let _ = query!(r#"
INSERT INTO polling_stations (id, committee_session_id, prev_data_entry_id, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(3, 3, NULL, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add a polling station with a duplicate number and assert that it fails
        let result = query!(r#"
INSERT INTO polling_stations (id, committee_session_id, prev_data_entry_id, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(4, 2, NULL, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await;

        assert!(result.is_err());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_create_number_required(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let mut data = PollingStationRequest {
            name: "Name".to_string(),
            number: None,
            number_of_voters: None,
            polling_station_type: None,
            address: "Address".to_string(),
            postal_code: "1234 AB".to_string(),
            locality: "Locality".to_string(),
        };
        let result = create(&mut conn, ElectionId::from(7), data.clone()).await;
        assert!(result.is_err());

        data.number = Some(123);
        let result = create(&mut conn, ElectionId::from(7), data).await;
        assert!(result.is_ok());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_create_many_number_required(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let mut data = PollingStationRequest {
            name: "Name".to_string(),
            number: None,
            number_of_voters: None,
            polling_station_type: None,
            address: "Address".to_string(),
            postal_code: "1234 AB".to_string(),
            locality: "Locality".to_string(),
        };
        let result = create_many(&mut conn, ElectionId::from(7), vec![data.clone()]).await;
        assert!(result.is_err());

        data.number = Some(123);
        let result = create_many(&mut conn, ElectionId::from(7), vec![data]).await;
        assert!(result.is_ok());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_update_number_allowed_when_no_prev_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let mut data = PollingStationRequest {
            name: "Name".to_string(),
            number: Some(123),
            number_of_voters: None,
            polling_station_type: None,
            address: "Address".to_string(),
            postal_code: "1234 AB".to_string(),
            locality: "Locality".to_string(),
        };

        // Add a new polling station
        let polling_station_id = create(&mut conn, ElectionId::from(7), data.clone())
            .await
            .unwrap();

        // Update number
        data.number = Some(456);
        let result = update(
            &mut conn,
            ElectionId::from(7),
            polling_station_id,
            data.clone(),
        )
        .await;

        assert!(result.is_ok());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_update_number_restricted_when_prev_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let mut data = PollingStationRequest {
            name: "Name".to_string(),
            number: None,
            number_of_voters: None,
            polling_station_type: None,
            address: "Address".to_string(),
            postal_code: "1234 AB".to_string(),
            locality: "Locality".to_string(),
        };

        let election_id = ElectionId::from(7);
        let polling_station_id = PollingStationId::from(741);

        // Update a polling station that has a prev_data_entry_id reference
        // ... without number change
        let result = update(&mut conn, election_id, polling_station_id, data.clone()).await;
        assert!(result.is_ok());

        // ... with number change
        data.number = Some(123);
        let result = update(&mut conn, election_id, polling_station_id, data).await;
        assert!(result.is_err());
    }
}
