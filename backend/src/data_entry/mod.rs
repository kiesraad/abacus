use axum::extract::{FromRequest, Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Deserialize, Serialize};
use status::DataEntryStatus;
use utoipa::ToSchema;

pub use self::structs::*;
use crate::data_entry::repository::PollingStationDataEntries;
use crate::election::repository::Elections;
use crate::election::{Election, ElectionStatusResponse};
use crate::error::{APIError, ErrorResponse};
use crate::polling_station::repository::PollingStations;
use crate::polling_station::structs::PollingStation;
use crate::validation::ValidationResults;

pub mod entry_number;
pub mod repository;
pub mod status;
pub mod structs;

/// Request structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
pub struct DataEntry {
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

pub async fn polling_station_data_entry_claim(
    Path(id): Path<u32>,
    State(polling_stations_repo): State<PollingStations>,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(elections): State<Elections>,
    data_entry_request: DataEntry,
) -> Result<SaveDataEntryResponse, APIError> {
    let polling_station_data_entry: DataEntryStatus =
        polling_station_data_entries.get_or_new(id).await?;

    let new_state = polling_station_data_entry.claim_entry(
        data_entry_request.progress,
        data_entry_request.data,
        data_entry_request.client_state,
    )?;

    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;

    let validation_results =
        validate_polling_station_results(new_state.get_data()?, &polling_station, &election)?;

    polling_station_data_entries.upsert(id, new_state).await?;

    Ok(SaveDataEntryResponse { validation_results })
}

/// Save or update a data entry for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    request_body = DataEntry,
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
    Path(id): Path<u32>,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(polling_stations_repo): State<PollingStations>,
    State(elections): State<Elections>,
    data_entry_request: DataEntry,
) -> Result<SaveDataEntryResponse, APIError> {
    // TODO: #657 execute all checks in this function in a single SQL transaction

    let polling_station_status_entry = polling_station_data_entries.get_or_new(id).await?;

    let new_state: DataEntryStatus = polling_station_status_entry.save_entry(
        data_entry_request.progress,
        data_entry_request.data,
        data_entry_request.client_state,
    )?;

    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;

    let validation_results = validate_polling_station_results(
        &new_state.get_data().unwrap(),
        &polling_station,
        &election,
    )?;

    // Save the data entry or update it if it already exists
    polling_station_data_entries.upsert(id, new_state).await?;

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
        &"data".into(),
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
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(polling_stations): State<PollingStations>,
    State(elections): State<Elections>,
    Path(id): Path<u32>,
) -> Result<Json<GetDataEntryResponse>, APIError> {
    let polling_station = polling_stations.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;
    let polling_station_data_entry = polling_station_data_entries.get(id).await?;

    let data = polling_station_data_entry.state.get_data()?.clone();

    let client_state = polling_station_data_entry.state.get_client_state().cloned();

    let validation_results = validate_polling_station_results(&data, &polling_station, &election)?;
    Ok(Json(GetDataEntryResponse {
        progress: polling_station_data_entry.state.get_progress(),
        data,
        client_state,
        validation_results,
        updated_at: polling_station_data_entry.updated_at,
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
    Path(id): Path<u32>,
) -> Result<StatusCode, APIError> {
    polling_station_data_entries.delete(id).await?;

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
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    Path(id): Path<u32>,
) -> Result<(), APIError> {
    let polling_station_data_entry = polling_station_data_entries.get(id).await?;

    let new_state = polling_station_data_entry.state.0.finalise_entry()?;

    polling_station_data_entries.upsert(id, new_state).await?;

    Ok(())
}

/// Get election polling stations data entry statuses
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/status",
    responses(
        (status = 200, description = "Election", body = ElectionStatusResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn election_status(
    State(data_entry_repo): State<PollingStationDataEntries>,
    Path(id): Path<u32>,
) -> Result<Json<ElectionStatusResponse>, APIError> {
    let statuses = data_entry_repo.statuses(id).await?;
    Ok(Json(ElectionStatusResponse { statuses }))
}

#[cfg(test)]
mod tests {
    use axum::http::StatusCode;
    use sqlx::{query, SqlitePool};

    use super::*;

    fn example_data_entry() -> DataEntry {
        DataEntry {
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

    async fn save(pool: SqlitePool, request_body: DataEntry, entry_number: u8) -> Response {
        polling_station_data_entry_save(
            Path((1, EntryNumber::try_from(entry_number).unwrap())),
            State(PollingStationDataEntries::new(pool.clone())),
            State(PollingStationResultsEntries::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            State(Elections::new(pool.clone())),
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
    async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
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

        // Check that we cannot finalise with errors
        let response = save(pool.clone(), request_body.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), 1).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);

        // Test updating the data entry to correct the error
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

        // Finalise data entry after correcting the error
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

        // Finalise second data entry
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
