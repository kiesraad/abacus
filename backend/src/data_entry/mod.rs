use axum::extract::{FromRequest, Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use entry_number::EntryNumber;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::data_entry::repository::{PollingStationDataEntries, PollingStationResultsEntries};
use crate::election::repository::Elections;
use crate::error::{APIError, ErrorReference, ErrorResponse};
use crate::polling_station::repository::PollingStations;
use crate::polling_station::structs::PollingStation;

pub use self::structs::*;
pub use self::validation::*;

mod entry_number;
pub mod repository;
mod structs;
mod validation;

/// Request structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
pub struct SaveDataEntryRequest {
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
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
    State(polling_station_results_entries): State<PollingStationResultsEntries>,
    State(polling_stations_repo): State<PollingStations>,
    State(elections): State<Elections>,
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
    data_entry_request: SaveDataEntryRequest,
) -> Result<SaveDataEntryResponse, APIError> {
    // Check if it is valid to save the data entry
    // TODO: #657 execute all checks in this function in a single SQL transaction
    if polling_station_results_entries.exists(id).await? {
        return Err(APIError::Conflict(
            "Cannot save a data entry for a polling station that already has finalised results"
                .to_string(),
            ErrorReference::PollingStationResultsAlreadyFinalised,
        ));
    }

    match entry_number {
        EntryNumber::FirstEntry => {
            if polling_station_data_entries
                .exists_finalised_entry(id, 1)
                .await?
            {
                return Err(APIError::Conflict(
                    "Cannot save a first data entry for a polling station that already has a finalised first entry"
                        .to_string(),
                    ErrorReference::PollingStationFirstEntryAlreadyFinalised,
                ));
            }
        }
        EntryNumber::SecondEntry => {
            if !polling_station_data_entries
                .exists_finalised_entry(id, 1)
                .await?
            {
                return Err(APIError::Conflict(
                    "Cannot save a second data entry for a polling station that doesn't have a finalised first entry"
                        .to_string(),
                    ErrorReference::PollingStationFirstEntryNotFinalised,
                ));
            }

            if polling_station_data_entries
                .exists_finalised_entry(id, 2)
                .await?
            {
                return Err(APIError::Conflict(
                    "Cannot save a second data entry for a polling station that already has a finalised second entry"
                        .to_string(),
                    ErrorReference::PollingStationSecondEntryAlreadyFinalised,
                ));
            }
        }
    };

    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;

    let validation_results =
        validate_polling_station_results(&data_entry_request.data, &polling_station, &election)?;
    let data = serde_json::to_string(&data_entry_request.data)?;
    let client_state = serde_json::to_string(&data_entry_request.client_state)?;

    // Save the data entry or update it if it already exists
    polling_station_data_entries
        .upsert(
            id,
            entry_number,
            data_entry_request.progress,
            data,
            client_state,
        )
        .await?;

    Ok(SaveDataEntryResponse { validation_results })
}

/// Response structure for getting data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct GetDataEntryResponse {
    pub progress: u8,
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    pub client_state: Option<serde_json::Value>,
    pub validation_results: ValidationResults,
    pub updated_at: i64,
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
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
) -> Result<Json<GetDataEntryResponse>, APIError> {
    let mut tx = pool.begin().await?;
    let polling_station = polling_stations.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;
    let (progress, data, client_state, updated_at) = polling_station_data_entries
        .get(&mut tx, id, entry_number)
        .await?;
    let data = serde_json::from_slice(&data)?;

    let client_state = serde_json::from_slice(&client_state)?;

    let validation_results = validate_polling_station_results(&data, &polling_station, &election)?;
    Ok(Json(GetDataEntryResponse {
        progress,
        data,
        client_state,
        validation_results,
        updated_at,
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
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
) -> Result<StatusCode, APIError> {
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
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
) -> Result<(), APIError> {
    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;

    let mut tx = pool.begin().await?;

    let (_, data, _, _) = polling_station_data_entries
        .get(&mut tx, id, entry_number)
        .await?;
    let results = serde_json::from_slice::<PollingStationResults>(&data)?;

    // check that this data entry does not have errors
    if validate_polling_station_results(&results, &polling_station, &election)?.has_errors() {
        return Err(APIError::Conflict(
            "Cannot finalise data entry with validation errors".to_string(),
            ErrorReference::PollingStationDataValidation,
        ));
    }

    // finalise data entry, but do not create a result yet
    polling_station_data_entries
        .finalise_data_entry(&mut tx, id, entry_number)
        .await?;

    if entry_number == EntryNumber::SecondEntry {
        // get first data entry from database
        let (_, first_data, _, _) = polling_station_data_entries
            .get(&mut tx, id, EntryNumber::FirstEntry)
            .await?;
        let first_results = serde_json::from_slice::<PollingStationResults>(&first_data)?;

        // only convert to result the first and second data entries are equal
        if first_results == results {
            polling_station_data_entries.to_result(&mut tx, id).await?
        }
    }

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
            progress: 100,
            data: PollingStationResults {
                recounted: Some(false),
                voters_counts: VotersCounts {
                    poll_card_count: 98,
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

    async fn save(
        pool: SqlitePool,
        request_body: SaveDataEntryRequest,
        entry_number: u8,
    ) -> Response {
        polling_station_data_entry_save(
            State(PollingStationDataEntries::new(pool.clone())),
            State(PollingStationResultsEntries::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            State(Elections::new(pool.clone())),
            Path((1, EntryNumber::try_from(entry_number).unwrap())),
            request_body.clone(),
        )
        .await
        .into_response()
    }

    async fn delete(pool: SqlitePool, entry_number: u8) -> Response {
        polling_station_data_entry_delete(
            State(PollingStationDataEntries::new(pool.clone())),
            Path((1, EntryNumber::try_from(entry_number).unwrap())),
        )
        .await
        .into_response()
    }

    async fn finalise(pool: SqlitePool, entry_number: u8) -> Response {
        polling_station_data_entry_finalise(
            State(pool.clone()),
            State(PollingStationDataEntries::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            State(Elections::new(pool.clone())),
            Path((1, EntryNumber::try_from(entry_number).unwrap())),
        )
        .await
        .into_response()
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_create_data_entry(pool: SqlitePool) {
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 100; // incorrect value

        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if a row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_cannot_finalise_with_errors(pool: SqlitePool) {
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 100; // incorrect value

        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);

        let response = finalise(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_update_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        let response = save(pool.clone(), request_body.clone(), 1).await;
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
        assert_eq!(
            data.voters_counts.poll_card_count,
            request_body.data.voters_counts.poll_card_count
        );
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_finalise_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_save_second_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        // Save a first data entry and finalise it
        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save a second data entry
        let response = save(pool.clone(), request_body.clone(), 2).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if the first data entry was finalised and that a second entry was created
        let rows = query!("SELECT * FROM polling_station_data_entries")
            .fetch_all(&pool)
            .await
            .unwrap();
        assert_eq!(rows.len(), 2);
        let first_entry = rows.iter().find(|row| row.entry_number == 1).unwrap();
        let second_entry = rows.iter().find(|row| row.entry_number == 2).unwrap();
        assert!(first_entry.finalised_at.is_some());
        assert!(second_entry.finalised_at.is_none());

        // Check that nothing is added to polling_station_results yet
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_finalise_second_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        // Save and finalise the first data entry
        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save and finalise the second data entry
        let response = save(pool.clone(), request_body.clone(), 2).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), 2).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that polling_station_results contains the finalised result and that the data entries are deleted
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);

        // Check that we can't save a new data entry after finalising
        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let response = save(pool.clone(), request_body.clone(), 2).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    // test creating first and different second data entry
    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_first_second_data_entry_different(pool: SqlitePool) {
        let request_body = example_data_entry();

        // Save and finalise the first data entry
        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save and finalise a different second data entry
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 99;
        request_body.data.voters_counts.proxy_certificate_count = 0;
        let response = save(pool.clone(), request_body.clone(), 2).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), 2).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that the finalised first and second data entries are still in the database
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries WHERE finalised_at IS NOT NULL")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 2);

        // Check that no result has been created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_polling_station_data_entry_delete(pool: SqlitePool) {
        // create data entry
        let request_body = example_data_entry();
        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);

        // delete data entry
        let response = delete(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        // check if data entry was deleted
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_polling_station_data_entry_delete_nonexistent(pool: SqlitePool) {
        // check that deleting a non-existing data entry returns 404
        let response = polling_station_data_entry_delete(
            State(PollingStationDataEntries::new(pool.clone())),
            Path((1, EntryNumber::try_from(1).unwrap())),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("elections", "polling_stations")))]
    async fn test_data_entry_delete_finalised_not_possible(pool: SqlitePool) {
        for entry_number in 1..=2 {
            // create and finalise data entry
            let request_body = example_data_entry();
            let response = save(pool.clone(), request_body.clone(), entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = finalise(pool.clone(), entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);

            // check that deleting finalised or non-existent data entry returns 404
            for entry_number in 1..=2 {
                let response = delete(pool.clone(), entry_number).await;
                assert_eq!(response.status(), StatusCode::NOT_FOUND);
            }

            // after the first data entry, check if it is still in the database
            // (after the second data entry, the results are finalised so we do not expect rows)
            if entry_number == 1 {
                let row_count =
                    query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
                        .fetch_one(&pool)
                        .await
                        .unwrap();
                assert_eq!(row_count.count, 1);
            }
        }
    }
}
