use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use self::repository::PollingStations;
pub use self::structs::*;
use crate::{
    authentication::{AdminOrCoordinator, User},
    election::repository::Elections,
    APIError, ErrorResponse,
};

pub mod repository;
pub mod structs;

/// Polling station list response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
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
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn polling_station_list(
    _user: User,
    State(polling_stations): State<PollingStations>,
    State(elections): State<Elections>,
    Path(election_id): Path<u32>,
) -> Result<PollingStationListResponse, APIError> {
    // Check if the election exists, will respond with NOT_FOUND otherwise
    elections.get(election_id).await?;

    Ok(PollingStationListResponse {
        polling_stations: polling_stations.list(election_id).await?,
    })
}

/// Create a new [PollingStation]
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/polling_stations",
    request_body = PollingStationRequest,
    responses(
        (status = 201, description = "Polling station created successfully", body = PollingStation),
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 409, description = "Polling station already exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn polling_station_create(
    _user: AdminOrCoordinator,
    State(polling_stations): State<PollingStations>,
    State(elections): State<Elections>,
    Path(election_id): Path<u32>,
    new_polling_station: PollingStationRequest,
) -> Result<(StatusCode, PollingStation), APIError> {
    // Check if the election exists, will respond with NOT_FOUND otherwise
    elections.get(election_id).await?;

    Ok((
        StatusCode::CREATED,
        polling_stations
            .create(election_id, new_polling_station)
            .await?,
    ))
}

/// Get a [PollingStation]
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    responses(
        (status = 200, description = "Polling station found", body = PollingStation),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
pub async fn polling_station_get(
    _user: User,
    State(polling_stations): State<PollingStations>,
    Path((election_id, polling_station_id)): Path<(u32, u32)>,
) -> Result<(StatusCode, PollingStation), APIError> {
    Ok((
        StatusCode::OK,
        polling_stations
            .get_for_election(election_id, polling_station_id)
            .await?,
    ))
}

/// Update a [PollingStation]
#[utoipa::path(
    put,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    request_body = PollingStationRequest,
    responses(
        (status = 200, description = "Polling station updated successfully"),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
pub async fn polling_station_update(
    _user: AdminOrCoordinator,
    State(polling_stations): State<PollingStations>,
    Path((election_id, polling_station_id)): Path<(u32, u32)>,
    polling_station_update: PollingStationRequest,
) -> Result<StatusCode, APIError> {
    let updated = polling_stations
        .update(election_id, polling_station_id, polling_station_update)
        .await?;

    if updated {
        Ok(StatusCode::OK)
    } else {
        Ok(StatusCode::NOT_FOUND)
    }
}
/// Delete a [PollingStation]
#[utoipa::path(
    delete,
    path = "/api/elections/{election_id}/polling_stations/{polling_station_id}",
    responses(
        (status = 200, description = "Polling station deleted successfully"),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
pub async fn polling_station_delete(
    _user: AdminOrCoordinator,
    State(polling_stations): State<PollingStations>,
    Path((election_id, polling_station_id)): Path<(u32, u32)>,
) -> Result<StatusCode, APIError> {
    let deleted = polling_stations
        .delete(election_id, polling_station_id)
        .await?;

    if deleted {
        Ok(StatusCode::OK)
    } else {
        Ok(StatusCode::NOT_FOUND)
    }
}

#[cfg(test)]
mod tests {
    use sqlx::{query, SqlitePool};
    use test_log::test;

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2", "election_3"))))]
    async fn test_polling_station_number_unique_per_election(pool: SqlitePool) {
        query!("DELETE FROM polling_stations")
            .execute(&pool)
            .await
            .unwrap();

        // Insert two unique polling stations
        let _ = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(1, 2, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag'),
(2, 2, 'Testplek', 34, NULL, 'bijzonder', 'Teststraat 2b', '1234 QY', 'Testdorp')
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add a polling station with the same number to a different election
        let _ = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(3, 3, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add a polling station with a duplicate number and assert that it fails
        let result = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, address, postal_code, locality)
VALUES
(4, 2, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12 1', '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await;

        assert!(result.is_err());
    }
}
