use axum::extract::Path;
use axum::http::StatusCode;
use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use sqlx::{query, SqlitePool};
use utoipa::ToSchema;

use crate::validation::{Validate, ValidationResults};

pub use self::structs::*;

pub mod structs;

/// Payload structure for data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DataEntryRequest {
    pub data: PollingStationResults,
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct DataEntryResponse {
    pub saved: bool,
    pub message: String,
    pub validation_results: ValidationResults,
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub enum DataEntryStatus {
    Ok,
    ValidationError,
}

#[utoipa::path(
        post,
        path = "/api/polling_stations/{id}/data_entries/{entry_number}",
        request_body = DataEntryRequest,
        responses(
            (status = 200, description = "Data entry saved successfully", body = DataEntryResponse),
            (status = 422, description = "JSON body parsing error (Unprocessable Content)"),
            (status = 500, description = "Internal server error", body = DataEntryResponse)
        ),
        params(
            ("id" = i64, description = "Polling station database id")
        ),
    )]
pub async fn polling_station_data_entry(
    State(pool): State<SqlitePool>,
    Path((id, entry_number)): Path<(u32, u8)>,
    Json(data_entry_request): Json<DataEntryRequest>,
) -> impl IntoResponse {
    let mut validation_results = ValidationResults::default();
    data_entry_request
        .data
        .validate(&mut validation_results, "data".to_string());

    let data = serde_json::to_string(&data_entry_request.data).unwrap();
    // Save the data entry or update it if it already exists
    let result = query!("INSERT INTO polling_station_data_entries (polling_station_id, entry_number, data) VALUES (?, ?, ?)\
              ON CONFLICT(polling_station_id, entry_number) DO UPDATE SET data = excluded.data",
        id, entry_number, data)
        .execute(&pool)
        .await;

    match result {
        Ok(_) => (
            StatusCode::OK,
            Json(DataEntryResponse {
                saved: true,
                message: "Data entry saved successfully".to_string(),
                validation_results,
            }),
        )
            .into_response(),
        Err(_) => {
            println!("Failed to save data entry: {:?}", result);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(DataEntryResponse {
                    saved: false,
                    message: "Failed to save data entry".to_string(),
                    validation_results,
                }),
            )
                .into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[sqlx::test]
    async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
        let mut request_body = DataEntryRequest {
            data: PollingStationResults {
                voters_counts: VotersCounts {
                    poll_card_count: 1,
                    proxy_certificate_count: 2,
                    voter_card_count: 3,
                    total_admitted_voters_count: 4,
                },
                votes_counts: VotesCounts {
                    votes_candidates_counts: 5,
                    blank_votes_count: 6,
                    invalid_votes_count: 7,
                    total_votes_cast_count: 8,
                },
            },
        };

        let response = polling_station_data_entry(
            State(pool.clone()),
            Path((1, 1)),
            Json(request_body.clone()),
        )
        .await
        .into_response();
        assert_eq!(response.status(), 200);

        // Check if a row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Test updating the same row
        let new_value = 10;
        request_body.data.voters_counts.poll_card_count = new_value;
        let response =
            polling_station_data_entry(State(pool.clone()), Path((1, 1)), Json(request_body))
                .await
                .into_response();
        assert_eq!(response.status(), 200);

        // Check if there is still only one row
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check if the data was updated
        let data = query!("SELECT data FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        let data: PollingStationResults = serde_json::from_slice(&data.data.unwrap()).unwrap();
        assert_eq!(data.voters_counts.poll_card_count, new_value);
    }
}
