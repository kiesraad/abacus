use axum::extract::Path;
use axum::http::StatusCode;
use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use sqlx::{query, SqlitePool};
use utoipa::ToSchema;

pub use self::structs::*;

pub mod structs;

/// Payload structure for data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DataEntryRequest {
    pub data: PollingStationResults,
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DataEntryError {
    pub message: String,
}

#[utoipa::path(
        post,
        path = "/api/polling_stations/{id}/data_entries/{entry_number}",
        request_body = DataEntryRequest,
        responses(
            (status = 200, description = "Data entry saved successfully"),
            (status = 422, description = "JSON body parsing error (Unprocessable Content)"),
            (status = 500, description = "Data entry error", body = DataEntryError)
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
    let data = serde_json::to_string(&data_entry_request.data).unwrap();
    let result = query!("INSERT INTO polling_station_data_entries (polling_station_id, entry_number, data) VALUES (?, ?, ?)",
        id, entry_number, data)
        .execute(&pool)
        .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(DataEntryError {
                message: "Failed to save data entry".to_string(),
            }),
        )
            .into_response(),
    }
}

#[sqlx::test]
async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
    let request_body = DataEntryRequest {
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

    let response =
        polling_station_data_entry(State(pool.clone()), Path((1, 1)), Json(request_body))
            .await
            .into_response();
    assert_eq!(response.status(), 200);

    // Check if a row was created
    let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(row_count.count, 1);
}
