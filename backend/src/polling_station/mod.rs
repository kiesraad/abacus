use axum::extract::Path;
use axum::http::StatusCode;
use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use sqlx::{query, SqlitePool};
use utoipa::ToSchema;

/// Payload structure for data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DataEntryRequest {
    pub entry_number: u8,
    pub data: PollingStationResults,
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct DataEntryError {
    pub message: String,
}

/// PollingStationResults, following the fields in
/// "Model N 10-1. Proces-verbaal van een stembureau"
/// https://wetten.overheid.nl/BWBR0034180/2023-11-01#Bijlage1_DivisieN10.1
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct PollingStationResults {
    /// Voters counts ("3. Aantal toegelaten kiezers")
    pub voters_counts: VotersCounts,
    /// Votes counts ("4. Aantal uitgebrachte stemmen")
    pub votes_counts: VotesCounts,
}

/// Voters counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotersCounts {
    /// Number of valid poll cards ("Aantal geldige stempassen")
    pub poll_card_count: u32,
    /// Number of valid proxy certificates ("Aantal geldige volmachtbewijzen")
    pub proxy_certificate_count: u32,
    /// Number of valid voter cards ("Aantal geldige kiezerspassen")
    pub voter_card_count: u32,
    /// Total number of admitted voters ("Totaal aantal toegelaten kiezers")
    pub total_admitted_voters_count: u32,
}

/// Votes counts, part of the polling station results.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct VotesCounts {
    /// Number of valid votes on candidates
    /// ("Aantal stembiljetten met een geldige stem op een kandidaat")
    pub votes_candidates_counts: u32,
    /// Number of blank votes ("Aantal blanco stembiljetten")
    pub blank_votes_count: u32,
    /// Number of invalid votes ("Aantal ongeldige stembiljetten")
    pub invalid_votes_count: u32,
    /// Total number of cast votes ("Totaal aantal getelde stemmen")
    pub total_cast_votes_count: u32,
}

#[utoipa::path(
        post,
        path = "/api/polling_stations/{id}/data_entry",
        request_body = DataEntryRequest,
        responses(
            (status = 200, description = "Data entry saved successfully"),
            (status = 500, description = "Data entry error", body = DataEntryError)
        ),
        params(
            ("id" = i64, description = "Polling station database id")
        ),
    )]
pub async fn polling_station_data_entry(
    State(pool): State<SqlitePool>,
    Path(id): Path<i64>,
    Json(first_entry_request): Json<DataEntryRequest>,
) -> impl IntoResponse {
    let data = serde_json::to_string(&first_entry_request.data).unwrap();
    let result = query!("INSERT INTO polling_station_data_entry (polling_station_id, entry_number, data) VALUES (?, ?, ?)",
        id, first_entry_request.entry_number, data)
        .execute(&pool)
        .await;

    match result {
        Ok(_) => StatusCode::OK.into_response(),
        Err(_) => (
            StatusCode::NOT_FOUND,
            Json(DataEntryError {
                message: "Failed to save data entry".to_string(),
            }),
        )
            .into_response(),
    }
}

#[sqlx::test]
async fn test_polling_station_data_entry(pool: SqlitePool) {
    let request_body = DataEntryRequest {
        entry_number: 1,
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
                total_cast_votes_count: 8,
            },
        },
    };

    let response = polling_station_data_entry(State(pool.clone()), Path(1), Json(request_body))
        .await
        .into_response();
    assert_eq!(response.status(), 200);

    // Check if a row was created
    let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entry")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(row_count.count, 1);
}
