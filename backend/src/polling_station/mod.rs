use axum::extract::{FromRequest, Path, State};
use serde::{Deserialize, Serialize};
use sqlx::{query, query_as, SqlitePool};
use utoipa::ToSchema;

use crate::validation::{Validate, ValidationResults};
use crate::{APIError, JsonResponse};

pub use self::structs::*;

pub mod structs;

/// Request structure for data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
pub struct DataEntryRequest {
    pub data: PollingStationResults,
}

/// Response structure for data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct DataEntryResponse {
    pub saved: bool,
    pub message: String,
    pub validation_results: ValidationResults,
}

/// Save or update the data entry for a polling station
#[utoipa::path(
        post,
        path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
        request_body = DataEntryRequest,
        responses(
            (status = 200, description = "Data entry saved successfully", body = DataEntryResponse),
            (status = 422, description = "JSON body parsing error (Unprocessable Content)", body = ErrorResponse),
            (status = 500, description = "Internal server error", body = ErrorResponse),
        ),
        params(
            ("polling_station_id" = u32, description = "Polling station database id"),
            ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
        ),
    )]
pub async fn polling_station_data_entry(
    State(pool): State<SqlitePool>,
    Path((id, entry_number)): Path<(u32, u8)>,
    data_entry_request: DataEntryRequest,
) -> Result<JsonResponse<DataEntryResponse>, APIError> {
    let mut validation_results = ValidationResults::default();
    data_entry_request
        .data
        .validate(&mut validation_results, "data".to_string());

    let data = serde_json::to_string(&data_entry_request.data)?;

    // Save the data entry or update it if it already exists
    query!("INSERT INTO polling_station_data_entries (polling_station_id, entry_number, data) VALUES (?, ?, ?)\
              ON CONFLICT(polling_station_id, entry_number) DO UPDATE SET data = excluded.data",
        id, entry_number, data)
        .execute(&pool)
        .await?;

    Ok(JsonResponse(DataEntryResponse {
        saved: true,
        message: "Data entry saved successfully".to_string(),
        validation_results,
    }))
}

/// Polling station list response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct PollingStationListResponse {
    pub polling_stations: Vec<PollingStation>,
}

/// List all polling stations
#[utoipa::path(
    get,
    path = "/api/polling_stations/{election_id}",
    responses(
        (status = 200, description = "Polling station listing successful", body = PollingStationListResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn polling_station_list(
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<JsonResponse<PollingStationListResponse>, APIError> {
    let polling_stations = query_as!(
        PollingStation,
        r#"
SELECT
  id,
  name,
  number,
  number_of_voters,
  polling_station_type,
  street,
  house_number,
  house_number_addition,
  postal_code,
  locality
FROM polling_stations
WHERE election_id = $1;
"#,
        election_id
    )
    .fetch_all(&pool)
    .await?;

    Ok(JsonResponse(PollingStationListResponse {
        polling_stations,
    }))
}

#[cfg(test)]
mod tests {
    use axum::response::IntoResponse;

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

        let response =
            polling_station_data_entry(State(pool.clone()), Path((1, 1)), request_body.clone())
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
        let response = polling_station_data_entry(State(pool.clone()), Path((1, 1)), request_body)
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
            .expect("No data found");
        let data: PollingStationResults = serde_json::from_slice(&data.data.unwrap()).unwrap();
        assert_eq!(data.voters_counts.poll_card_count, new_value);
    }

    #[sqlx::test(fixtures(path = "../../tests/fixtures", scripts("elections")))]
    async fn test_polling_station_number_unique_per_election(pool: SqlitePool) {
        // Insert two unique polling stations
        let _ = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(1, 1, 'Stembureau "Op Rolletjes"', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag'),
(2, 1, 'Testplek', 34, NULL, 'bijzonder', 'Teststraat', '2', 'b', '1234 QY', 'Testdorp')
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add the same polling station, but for a differect election
        let _ = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(3, 2, 'Stembureau "Op Rolletjes"', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await
            .unwrap();

        // Add the same polling station, for the same election and see that it fails
        let result = query!(r#"
INSERT INTO polling_stations (id, election_id, name, number, number_of_voters, polling_station_type, street, house_number, house_number_addition, postal_code, locality)
VALUES
(4, 1, 'Stembureau "Op Rolletjes"', 33, NULL, 'mobiel', 'Rijksweg A12', '1', NULL, '1234 YQ', 'Den Haag');
"#)
            .execute(&pool)
            .await;

        assert!(result.is_err());
    }
}
