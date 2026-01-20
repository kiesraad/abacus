use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use sqlx::{Connection, SqliteConnection, SqlitePool};

use crate::{
    APIError, SqlitePoolExt,
    api::election::investigation::delete_investigation_for_polling_station,
    domain::{
        committee_session::CommitteeSession,
        committee_session_status::{CommitteeSessionStatus, change_committee_session_status},
        election::ElectionId,
        polling_station::{
            PollingStation, PollingStationFileRequest, PollingStationListResponse,
            PollingStationRequest, PollingStationRequestListResponse, PollingStationsRequest,
        },
    },
    eml::{EML110, EMLDocument, EMLImportError, EmlHash},
    error::ErrorResponse,
    infra::authentication::{AdminOrCoordinator, User, error::AuthenticationError},
    repository::{
        committee_session_repo::get_election_committee_session,
        election_repo, polling_station_repo,
        polling_station_repo::{create_many, delete, get_for_election, update},
    },
    service::{
        audit_log::{AuditEvent, AuditService, PollingStationImportDetails},
        data_entry::delete_data_entry_and_result_for_polling_station,
    },
};

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
    security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
pub async fn polling_station_list(
    _user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<PollingStationListResponse, APIError> {
    let mut conn = pool.acquire().await?;

    // Check if the election exists, will respond with NOT_FOUND otherwise
    election_repo::get(&mut conn, election_id).await?;

    let committee_session = get_election_committee_session(&mut conn, election_id).await?;

    Ok(PollingStationListResponse {
        polling_stations: polling_station_repo::list(&mut conn, committee_session.id).await?,
    })
}

pub async fn validate_user_is_allowed_to_perform_action(
    user: AdminOrCoordinator,
    committee_session: &CommitteeSession,
) -> Result<(), APIError> {
    // Check if the user is allowed to perform the action in this committee session status,
    // respond with FORBIDDEN otherwise
    if user.is_coordinator()
        || (user.is_administrator()
            && (committee_session.status == CommitteeSessionStatus::Created
                || committee_session.status == CommitteeSessionStatus::DataEntryNotStarted))
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
        (status = 201, description = "Polling station created successfully", body = PollingStation),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 409, description = "Polling station already exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
pub async fn polling_station_create(
    user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    audit_service: AuditService,
    new_polling_station: PollingStationRequest,
) -> Result<(StatusCode, PollingStation), APIError> {
    let mut tx = pool.begin_immediate().await?;

    // Check if the election and a committee session exist, will respond with NOT_FOUND otherwise
    election_repo::get(&mut tx, election_id).await?;
    let committee_session = get_election_committee_session(&mut tx, election_id).await?;

    validate_user_is_allowed_to_perform_action(user, &committee_session).await?;

    let polling_station =
        polling_station_repo::create(&mut tx, election_id, new_polling_station).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationCreated(polling_station.clone().into()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Created
        && !committee_session.is_next_session()
    {
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
        ("election_id" = ElectionId, description = "Election database id"),
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
pub async fn polling_station_get(
    _user: User,
    State(pool): State<SqlitePool>,
    Path((election_id, polling_station_id)): Path<(ElectionId, u32)>,
) -> Result<(StatusCode, PollingStation), APIError> {
    let mut conn = pool.acquire().await?;
    Ok((
        StatusCode::OK,
        get_for_election(&mut conn, election_id, polling_station_id).await?,
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
        ("election_id" = ElectionId, description = "Election database id"),
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
pub async fn polling_station_update(
    user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, polling_station_id)): Path<(ElectionId, u32)>,
    polling_station_update: PollingStationRequest,
) -> Result<(StatusCode, PollingStation), APIError> {
    let mut tx = pool.begin_immediate().await?;

    // Check if the election and a committee session exist, will respond with NOT_FOUND otherwise
    election_repo::get(&mut tx, election_id).await?;
    let committee_session = get_election_committee_session(&mut tx, election_id).await?;

    validate_user_is_allowed_to_perform_action(user, &committee_session).await?;

    let polling_station = update(
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

    if committee_session.status == CommitteeSessionStatus::DataEntryFinished {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryInProgress,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok((StatusCode::OK, polling_station))
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
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
pub async fn polling_station_delete(
    user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, polling_station_id)): Path<(ElectionId, u32)>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    // Check if the election and a committee session exist, will respond with NOT_FOUND otherwise
    election_repo::get(&mut tx, election_id).await?;
    let committee_session = get_election_committee_session(&mut tx, election_id).await?;

    validate_user_is_allowed_to_perform_action(user, &committee_session).await?;

    let polling_station = get_for_election(&mut tx, election_id, polling_station_id).await?;

    delete_data_entry_and_result_for_polling_station(
        &mut tx,
        &audit_service,
        &committee_session,
        polling_station.id,
    )
    .await?;

    delete_investigation_for_polling_station(
        &mut tx,
        &audit_service,
        &committee_session,
        polling_station.id,
    )
    .await?;

    delete(&mut tx, election_id, polling_station_id).await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationDeleted(polling_station.clone().into()),
            None,
        )
        .await?;

    if polling_station_repo::list(&mut tx, committee_session.id)
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
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
pub async fn polling_station_validate_import(
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

pub async fn create_imported_polling_stations(
    conn: &mut SqliteConnection,
    audit_service: AuditService,
    election_id: ElectionId,
    polling_stations_request: PollingStationsRequest,
) -> Result<Vec<PollingStation>, APIError> {
    let mut tx = conn.begin().await?;

    let committee_session = get_election_committee_session(&mut tx, election_id).await?;
    let polling_stations =
        EML110::from_str(&polling_stations_request.polling_stations)?.get_polling_stations()?;
    let file_hash = EmlHash::from(polling_stations_request.polling_stations.as_bytes()).chunks;

    // Create new polling stations
    let polling_stations = create_many(&mut tx, election_id, polling_stations).await?;

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
            Some(format!(
                "Polling stations file hash: {}",
                file_hash.join(" ")
            )),
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
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
pub async fn polling_station_import(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    audit_service: AuditService,
    Json(polling_stations_request): Json<PollingStationsRequest>,
) -> Result<(StatusCode, PollingStationListResponse), APIError> {
    let mut tx = pool.begin_immediate().await?;

    // Check if the election and a committee session exist, will respond with NOT_FOUND otherwise
    election_repo::get(&mut tx, election_id).await?;
    let committee_session = get_election_committee_session(&mut tx, election_id).await?;

    if !polling_station_repo::list(&mut tx, committee_session.id)
        .await?
        .is_empty()
    {
        return Err(AuthenticationError::Forbidden.into());
    }

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

    use crate::{
        domain::{election::ElectionId, polling_station::PollingStationRequest},
        repository::polling_station_repo::{create, create_many, update},
    };

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2", "election_3"))))]
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

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
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

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
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

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
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
        let polling_station = create(&mut conn, ElectionId::from(7), data.clone())
            .await
            .unwrap();

        // Update number
        data.number = Some(456);
        let result = update(
            &mut conn,
            ElectionId::from(7),
            polling_station.id,
            data.clone(),
        )
        .await;

        assert!(result.is_ok());
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
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

        // Update a polling station that has an id_prev_session reference
        // ... without number change
        let result = update(&mut conn, ElectionId::from(7), 741, data.clone()).await;
        assert!(result.is_ok());

        // ... with number change
        data.number = Some(123);
        let result = update(&mut conn, ElectionId::from(7), 741, data).await;
        assert!(result.is_err());
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_delete_restricted_when_prev_session(pool: SqlitePool) {
        // Try to delete a polling station that has an id_prev_session reference
        let result = query!("DELETE FROM polling_stations WHERE id = 721")
            .execute(&pool)
            .await;

        assert!(result.is_err());
    }
}
