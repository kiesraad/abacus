use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use self::repository::PollingStations;
pub use self::structs::*;
use crate::election::repository::Elections;
use crate::{APIError, ErrorResponse};

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
    request_body = NewPollingStationRequest,
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
    State(polling_stations): State<PollingStations>,
    State(elections): State<Elections>,
    Path(election_id): Path<u32>,
    new_polling_station: NewPollingStationRequest,
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

#[cfg(test)]
mod tests {
    use sqlx::{query, SqlitePool};

    #[sqlx::test(fixtures("../../fixtures/elections.sql"))]
    async fn test_polling_station_number_unique_per_election(pool: SqlitePool) {
        // Insert two unique polling stations
        let _ = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(1, 1, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag'),
(2, 1, 'Testplek', 34, NULL, 'bijzonder', 'Teststraat', '2', 'b', '1234 QY', 'Testdorp')
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add a polling station with the same number to a different election
        let _ = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(3, 2, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add a polling station with a duplicate number and assert that it fails
        let result = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(4, 1, 'Op Rolletjes', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await;

        assert!(result.is_err());
    }
}
