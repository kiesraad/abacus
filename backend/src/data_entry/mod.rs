use axum::extract::{FromRequest, Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

pub use self::structs::*;
use crate::data_entry::repository::PollingStationDataEntries;
use crate::election::repository::Elections;
use crate::election::Election;
use crate::polling_station::repository::PollingStations;
use crate::polling_station::structs::PollingStation;
use crate::validation::ValidationResults;
use crate::{APIError, ErrorResponse};

pub mod repository;
pub mod structs;

/// Request structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
pub struct SaveDataEntryRequest {
    /// Data entry for a polling station
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: Option<serde_json::Value>,
}

/// Response structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct SaveDataEntryResponse {
    pub validation_results: ValidationResults,
}

impl IntoResponse for SaveDataEntryResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Save or update a data entry for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    request_body = SaveDataEntryRequest,
    responses(
        (status = 200, description = "Data entry saved successfully", body = SaveDataEntryResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "JSON error or invalid data (Unprocessable Content)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
)]
pub async fn polling_station_data_entry_save(
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(polling_stations_repo): State<PollingStations>,
    State(elections): State<Elections>,
    Path((id, entry_number)): Path<(u32, u8)>,
    data_entry_request: SaveDataEntryRequest,
) -> Result<SaveDataEntryResponse, APIError> {
    // only the first data entry is supported for now
    if entry_number != 1 {
        return Err(APIError::NotFound(
            "Only the first data entry is supported".to_string(),
        ));
    }

    if polling_station_data_entries.exists_finalised(id).await? {
        return Err(APIError::Conflict(
            "Cannot save data entry for a polling station that has already been finalised"
                .to_string(),
        ));
    }

    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;

    let validation_results =
        validate_polling_station_results(&data_entry_request.data, &polling_station, &election)?;
    let data = serde_json::to_string(&data_entry_request.data)?;
    let client_state = serde_json::to_string(&data_entry_request.client_state)?;

    // Save the data entry or update it if it already exists
    polling_station_data_entries
        .upsert(id, entry_number, data, client_state)
        .await?;

    Ok(SaveDataEntryResponse { validation_results })
}

fn validate_polling_station_results(
    polling_station_results: &PollingStationResults,
    polling_station: &PollingStation,
    election: &Election,
) -> Result<ValidationResults, APIError> {
    let mut validation_results = ValidationResults::default();
    polling_station_results.validate(
        election,
        polling_station,
        &mut validation_results,
        "data".to_string(),
    )?;
    validation_results
        .errors
        .sort_by(|a, b| a.code.cmp(&b.code));
    validation_results
        .warnings
        .sort_by(|a, b| a.code.cmp(&b.code));
    Ok(validation_results)
}

/// Response structure for getting data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct GetDataEntryResponse {
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    pub client_state: Option<serde_json::Value>,
    pub validation_results: ValidationResults,
}

/// Get an in-progress (not finalised) data entry for a polling station
#[utoipa::path(
    get,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    responses(
        (status = 200, description = "Data entry retrieved successfully", body = GetDataEntryResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
)]
pub async fn polling_station_data_entry_get(
    State(pool): State<SqlitePool>,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(polling_stations): State<PollingStations>,
    State(elections): State<Elections>,
    Path((id, entry_number)): Path<(u32, u8)>,
) -> Result<Json<GetDataEntryResponse>, APIError> {
    let mut tx = pool.begin().await?;
    let polling_station = polling_stations.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;
    let (data, client_state) = polling_station_data_entries
        .get(&mut tx, id, entry_number)
        .await?;
    let data = serde_json::from_slice(&data)?;

    let client_state = serde_json::from_slice(&client_state)?;

    let validation_results = validate_polling_station_results(&data, &polling_station, &election)?;
    Ok(Json(GetDataEntryResponse {
        data,
        client_state,
        validation_results,
    }))
}

/// Delete an in-progress (not finalised) data entry for a polling station
#[utoipa::path(
    delete,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    responses(
        (status = 204, description = "Data entry deleted successfully"),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
)]
pub async fn polling_station_data_entry_delete(
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    Path((id, entry_number)): Path<(u32, u8)>,
) -> Result<StatusCode, APIError> {
    // only the first data entry is supported for now
    if entry_number != 1 {
        return Err(APIError::NotFound(
            "Only the first data entry is supported".to_string(),
        ));
    }

    polling_station_data_entries
        .delete(id, entry_number)
        .await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Finalise the data entry for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise",
    responses(
        (status = 200, description = "Data entry finalised successfully"),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "JSON error or invalid data (Unprocessable Content)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
)]
pub async fn polling_station_data_entry_finalise(
    State(pool): State<SqlitePool>,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(polling_stations_repo): State<PollingStations>,
    State(elections): State<Elections>,
    Path((id, entry_number)): Path<(u32, u8)>,
) -> Result<(), APIError> {
    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;

    let mut tx = pool.begin().await?;

    // TODO: #129 support for second data entry
    // TODO: #129 validate whether first and second data entries are equal

    let (data, _) = polling_station_data_entries
        .get(&mut tx, id, entry_number)
        .await?;
    let results = serde_json::from_slice::<PollingStationResults>(&data)?;

    let mut validation_results = ValidationResults::default();
    results.validate(
        &election,
        &polling_station,
        &mut validation_results,
        "data".to_string(),
    )?;

    if validation_results.has_errors() {
        return Err(APIError::Conflict(
            "Cannot finalise data entry with validation errors".to_string(),
        ));
    }

    polling_station_data_entries.finalise(&mut tx, id).await?;

    tx.commit().await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use sqlx::{query, SqlitePool};

    use super::*;

    fn example_data_entry() -> SaveDataEntryRequest {
        SaveDataEntryRequest {
            data: PollingStationResults {
                recounted: Some(false),
                voters_counts: VotersCounts {
                    poll_card_count: 100, // incorrect
                    proxy_certificate_count: 1,
                    voter_card_count: 1,
                    total_admitted_voters_count: 100,
                },
                votes_counts: VotesCounts {
                    votes_candidates_count: 96,
                    blank_votes_count: 2,
                    invalid_votes_count: 2,
                    total_votes_cast_count: 100,
                },
                voters_recounts: None,
                differences_counts: DifferencesCounts {
                    more_ballots_count: 0,
                    fewer_ballots_count: 0,
                    unreturned_ballots_count: 0,
                    too_few_ballots_handed_out_count: 0,
                    too_many_ballots_handed_out_count: 0,
                    other_explanation_count: 0,
                    no_explanation_count: 0,
                },
                political_group_votes: vec![PoliticalGroupVotes {
                    number: 1,
                    total: 96,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 54,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 42,
                        },
                    ],
                }],
            },
            client_state: Some(serde_json::Value::Null),
        }
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
        let mut request_body = example_data_entry();

        async fn save(pool: SqlitePool, request_body: SaveDataEntryRequest) -> Response {
            polling_station_data_entry_save(
                State(PollingStationDataEntries::new(pool.clone())),
                State(PollingStations::new(pool.clone())),
                State(Elections::new(pool.clone())),
                Path((1, 1)),
                request_body.clone(),
            )
            .await
            .into_response()
        }

        async fn finalise(pool: SqlitePool) -> Response {
            polling_station_data_entry_finalise(
                State(pool.clone()),
                State(PollingStationDataEntries::new(pool.clone())),
                State(PollingStations::new(pool.clone())),
                State(Elections::new(pool.clone())),
                Path((1, 1)),
            )
            .await
            .into_response()
        }

        let response = save(pool.clone(), request_body.clone()).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if a row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check that we cannot finalise with errors
        let response = save(pool.clone(), request_body.clone()).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone()).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);

        // Test updating the data entry
        let poll_card_count = 98;
        request_body.data.voters_counts.poll_card_count = poll_card_count; // correct value
        let response = save(pool.clone(), request_body.clone()).await;
        assert_eq!(response.status(), StatusCode::OK);

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
        assert_eq!(data.voters_counts.poll_card_count, poll_card_count);

        // Finalise data entry after correcting the error
        let response = save(pool.clone(), request_body.clone()).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone()).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if the data entry was finalised:
        // removed from polling_station_data_entries...
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
        // ...and added to polling_station_results
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check that we can't save a new data entry after finalising
        let response = save(pool.clone(), request_body.clone()).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_polling_station_data_entry_delete(pool: SqlitePool) {
        // create data entry
        let response = polling_station_data_entry_save(
            State(PollingStationDataEntries::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            State(Elections::new(pool.clone())),
            Path((1, 1)),
            example_data_entry(),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::OK);

        // delete data entry
        let response = polling_station_data_entry_delete(
            State(PollingStationDataEntries::new(pool.clone())),
            Path((1, 1)),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // check if data entry was deleted
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);

        // check that deleting a non-existing data entry returns 404
        let response = polling_station_data_entry_delete(
            State(PollingStationDataEntries::new(pool.clone())),
            Path((1, 1)),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }
}
