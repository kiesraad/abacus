use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::{Connection, SqlitePool};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

pub use self::structs::*;
use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService, PollingStationImportDetails},
    authentication::{AdminOrCoordinator, User},
    committee_session::{
        repository::get_election_committee_session,
        status::{CommitteeSessionStatus, change_committee_session_status},
    },
    eml::{EML110, EMLDocument, EMLImportError},
};

pub mod repository;
pub mod structs;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(polling_station_list))
        .routes(routes!(polling_station_create))
        .routes(routes!(polling_station_get))
        .routes(routes!(polling_station_update))
        .routes(routes!(polling_station_delete))
        .routes(routes!(polling_station_validate_import))
        .routes(routes!(polling_station_import))
}

/// Polling station list response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct PollingStationListResponse {
    pub polling_stations: Vec<PollingStation>,
}

impl IntoResponse for PollingStationListResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
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
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn polling_station_list(
    _user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<PollingStationListResponse, APIError> {
    let mut conn = pool.acquire().await?;

    // Check if the election exists, will respond with NOT_FOUND otherwise
    crate::election::repository::get(&mut conn, election_id).await?;

    let committee_session = crate::committee_session::repository::get_election_committee_session(
        &mut conn,
        election_id,
    )
    .await?;

    Ok(PollingStationListResponse {
        polling_stations: crate::polling_station::repository::list(&mut conn, committee_session.id)
            .await?,
    })
}

/// Create a new [PollingStation]
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/polling_stations",
    request_body = PollingStationRequest,
    responses(
        (status = 201, description = "Polling station created successfully", body = PollingStation),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 409, description = "Polling station already exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn polling_station_create(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
    audit_service: AuditService,
    new_polling_station: PollingStationRequest,
) -> Result<(StatusCode, PollingStation), APIError> {
    let mut tx = pool.begin_immediate().await?;

    // Check if the election and a committee session exist, will respond with NOT_FOUND otherwise
    crate::election::repository::get(&mut tx, election_id).await?;
    let committee_session =
        crate::committee_session::repository::get_election_committee_session(&mut tx, election_id)
            .await?;

    let polling_station =
        crate::polling_station::repository::create(&mut tx, election_id, new_polling_station)
            .await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationCreated(polling_station.clone().into()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Created {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryNotStarted,
            audit_service,
        )
        .await?;
    } else if committee_session.status == CommitteeSessionStatus::DataEntryFinished {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryInProgress,
            audit_service,
        )
        .await?;
    };

    tx.commit().await?;

    Ok((StatusCode::CREATED, polling_station))
}

/// Get a [PollingStation]
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    responses(
        (status = 200, description = "Polling station found", body = PollingStation),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_get(
    _user: User,
    State(pool): State<SqlitePool>,
    Path((election_id, polling_station_id)): Path<(u32, u32)>,
) -> Result<(StatusCode, PollingStation), APIError> {
    let mut conn = pool.acquire().await?;
    Ok((
        StatusCode::OK,
        crate::polling_station::repository::get_for_election(
            &mut conn,
            election_id,
            polling_station_id,
        )
        .await?,
    ))
}

/// Update a [PollingStation]
#[utoipa::path(
    put,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    request_body = PollingStationRequest,
    responses(
        (status = 200, description = "Polling station updated successfully", body = PollingStation),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_update(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, polling_station_id)): Path<(u32, u32)>,
    polling_station_update: PollingStationRequest,
) -> Result<(StatusCode, PollingStation), APIError> {
    let mut tx = pool.begin_immediate().await?;

    let polling_station = crate::polling_station::repository::update(
        &mut tx,
        election_id,
        polling_station_id,
        polling_station_update,
    )
    .await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationUpdated(polling_station.clone().into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok((StatusCode::OK, polling_station))
}

/// Delete a [PollingStation]
#[utoipa::path(
    delete,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    responses(
        (status = 200, description = "Polling station deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_delete(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, polling_station_id)): Path<(u32, u32)>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    // Check if the election and a committee session exist, will respond with NOT_FOUND otherwise
    crate::election::repository::get(&mut tx, election_id).await?;
    let committee_session =
        crate::committee_session::repository::get_election_committee_session(&mut tx, election_id)
            .await?;

    let polling_station = crate::polling_station::repository::get_for_election(
        &mut tx,
        election_id,
        polling_station_id,
    )
    .await?;

    crate::polling_station::repository::delete(&mut tx, election_id, polling_station_id).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationDeleted(polling_station.clone().into()),
            None,
        )
        .await?;

    if crate::polling_station::repository::list(&mut tx, committee_session.id)
        .await?
        .is_empty()
    {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::Created,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(StatusCode::OK)
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct PollingStationFileRequest {
    data: String,
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct PollingStationRequestListResponse {
    pub polling_stations: Vec<PollingStationRequest>,
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
)]
async fn polling_station_validate_import(
    _user: AdminOrCoordinator,
    Json(polling_station_request): Json<PollingStationFileRequest>,
) -> Result<(StatusCode, Json<PollingStationRequestListResponse>), APIError> {
    Ok((
        StatusCode::OK,
        Json(PollingStationRequestListResponse {
            polling_stations: EML110::from_str(&polling_station_request.data)?
                .get_polling_stations()?,
        }),
    ))
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct PollingStationsRequest {
    pub file_name: String,
    pub polling_stations: Vec<PollingStationRequest>,
}

pub async fn create_imported_polling_stations(
    conn: &mut sqlx::SqliteConnection,
    audit_service: AuditService,
    election_id: u32,
    polling_stations_request: PollingStationsRequest,
) -> Result<Vec<PollingStation>, APIError> {
    let mut tx = conn.begin().await?;

    let committee_session = get_election_committee_session(&mut tx, election_id).await?;

    // Create new polling stations
    let polling_stations = repository::create_many(
        &mut tx,
        election_id,
        polling_stations_request.polling_stations,
    )
    .await?;

    // Create audit event
    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationsImported(PollingStationImportDetails {
                import_election_id: election_id,
                import_file_name: polling_stations_request.file_name,
                import_number_of_polling_stations: u64::try_from(polling_stations.len())
                    .map_err(|_| EMLImportError::NumberOfPollingStationsNotInRange)?,
            }),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Created {
        // Change committee session status to DataEntryNotStarted
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryNotStarted,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(polling_stations)
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
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn polling_station_import(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
    audit_service: AuditService,
    Json(polling_stations_request): Json<PollingStationsRequest>,
) -> Result<(StatusCode, PollingStationListResponse), APIError> {
    let mut tx = pool.begin_immediate().await?;
    let polling_stations: Vec<PollingStation> = create_imported_polling_stations(
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

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2", "election_3"))))]
    async fn test_polling_station_number_unique_per_election(pool: SqlitePool) {
        query!("DELETE FROM polling_stations")
            .execute(&pool)
            .await
            .unwrap();

        // Insert two unique polling stations
        let _ = query!(r#"
INSERT INTO polling_stations (id, committee_session_id, id_prev_session, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(1, 2, NULL, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag'),
(2, 2, NULL, 'Testplek', 34, NULL, 'bijzonder', 'Teststraat 2b', '1234 QY', 'Testdorp')
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add a polling station with the same number to a different election
        let _ = query!(r#"
INSERT INTO polling_stations (id, committee_session_id, id_prev_session, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(3, 3, NULL, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add a polling station with a duplicate number and assert that it fails
        let result = query!(r#"
INSERT INTO polling_stations (id, committee_session_id, id_prev_session, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(4, 2, NULL, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await;

        assert!(result.is_err());
    }
}
