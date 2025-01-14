use crate::data_entry::repository::PollingStationDataEntries;
use crate::election::repository::Elections;
use crate::error::{APIError, ErrorReference, ErrorResponse};
use crate::polling_station::repository::PollingStations;
use crate::polling_station::structs::PollingStation;
use axum::extract::{FromRequest, Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use chrono::{DateTime, Utc};
use entry_number::EntryNumber;
use serde::{Deserialize, Serialize};
use status::{ClientState, DataEntryStatus, DataEntryStatusName};
use utoipa::ToSchema;

pub use self::structs::*;
pub use self::validation::*;

pub mod entry_number;
pub mod repository;
pub mod status;
pub mod structs;
mod validation;

/// Response structure for getting data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct GetDataEntryResponse {
    pub progress: u8,
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    pub client_state: Option<serde_json::Value>,
    pub validation_results: ValidationResults,
    #[schema(value_type = String)]
    pub updated_at: DateTime<Utc>,
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
    Path((id, _entry_number)): Path<(u32, EntryNumber)>, // TODO: remove this when implementing #762
) -> Result<Json<GetDataEntryResponse>, APIError> {
    let polling_station = polling_stations.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;
    let ps_entry = polling_station_data_entries.get_row(id).await?;

    let Some(data) = ps_entry.state.get_data() else {
        return Err(APIError::NotFound(
            "entry has no data".to_string(),
            ErrorReference::EntryNotFound,
        ));
    };

    let client_state = ps_entry.state.get_client_state().map(|v| v.to_owned());

    let validation_results = validate_polling_station_results(data, &polling_station, &election)?;

    Ok(Json(GetDataEntryResponse {
        progress: ps_entry.state.get_progress(),
        data: data.clone(),
        client_state,
        validation_results,
        updated_at: ps_entry.updated_at,
    }))
}

/// Request structure for saving data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, FromRequest)]
#[from_request(via(axum::Json), rejection(APIError))]
pub struct DataEntry {
    /// Data entry progress between 0 and 100
    #[schema(maximum = 100)]
    pub progress: u8,
    /// Data entry for a polling station
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    /// Client state for the data entry (arbitrary JSON)
    pub client_state: ClientState,
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
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
    State(polling_station_data_entries): State<PollingStationDataEntries>,
    State(polling_stations_repo): State<PollingStations>,
    State(elections): State<Elections>,
    data_entry_request: DataEntry,
) -> Result<SaveDataEntryResponse, APIError> {
    // TODO: #657 execute all checks in this function in a single SQL transaction

    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections.get(polling_station.election_id).await?;
    let state = polling_station_data_entries.get_or_default(id).await?;
    let DataEntry {
        progress,
        data,
        client_state,
    } = data_entry_request;

    // transition to the new state
    let new_state = match entry_number {
        EntryNumber::FirstEntry => {
            if let DataEntryStatus::FirstEntryNotStarted = state {
                state.claim_first_entry(progress, data, client_state)?
            } else {
                state.update_first_entry(progress, data, client_state)?
            }
        }
        EntryNumber::SecondEntry => {
            if let DataEntryStatus::SecondEntryNotStarted(_) = state {
                state.claim_second_entry(progress, data, client_state)?
            } else {
                state.update_second_entry(progress, data, client_state)?
            }
        }
    };

    // validate the results
    let validation_results = validate_polling_station_results(
        new_state.get_data().expect("data should never be None"),
        &polling_station,
        &election,
    )?;

    // Save the data entry or update it if it already exists
    polling_station_data_entries.upsert(id, &new_state).await?;

    Ok(SaveDataEntryResponse { validation_results })
}

/// Delete an in-progress (not finalised) data entry for a polling station
#[utoipa::path(
    delete,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}",
    responses(
        (status = 204, description = "Data entry deleted successfully"),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
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
    let state = polling_station_data_entries.get_or_default(id).await?;
    let new_state = match entry_number {
        EntryNumber::FirstEntry => state.delete_first_entry()?,
        EntryNumber::SecondEntry => state.delete_second_entry()?,
    };
    polling_station_data_entries.upsert(id, &new_state).await?;

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
    State(elections_repo): State<Elections>,
    State(polling_stations_repo): State<PollingStations>,
    Path((id, entry_number)): Path<(u32, EntryNumber)>,
) -> Result<(), APIError> {
    let state = polling_station_data_entries.get_or_default(id).await?;

    let polling_station = polling_stations_repo.get(id).await?;
    let election = elections_repo.get(polling_station.election_id).await?;

    match entry_number {
        EntryNumber::FirstEntry => {
            let new_state = state.finalise_first_entry(&polling_station, &election)?;
            polling_station_data_entries.upsert(id, &new_state).await?;
        }
        EntryNumber::SecondEntry => {
            let (new_state, data) = state.finalise_second_entry(&polling_station, &election)?;

            match (&new_state, data) {
                (DataEntryStatus::Definitive(_), Some(data)) => {
                    // Save the data to the database
                    polling_station_data_entries
                        .make_definitive(id, &new_state, &data)
                        .await?;
                }
                (DataEntryStatus::Definitive(_), None) => {
                    unreachable!("Data entry is in definitive state but no data is present");
                }
                (new_state, _) => {
                    polling_station_data_entries.upsert(id, new_state).await?;
                }
            }
        }
    }

    Ok(())
}

/// Election polling stations data entry statuses response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionStatusResponse {
    pub statuses: Vec<ElectionStatusResponseEntry>,
}

/// Election polling stations data entry statuses response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionStatusResponseEntry {
    pub polling_station_id: u32,
    pub status: DataEntryStatusName,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub first_data_entry_progress: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = u8)]
    pub second_data_entry_progress: Option<u8>,
    #[schema(value_type = String)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<DateTime<Utc>>,
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
pub mod tests {
    use axum::http::StatusCode;
    use sqlx::{query, SqlitePool};

    use super::*;

    pub fn example_data_entry() -> DataEntry {
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
            client_state: ClientState(None),
        }
    }

    async fn get_data_entry_status(pool: SqlitePool, polling_station_id: u32) -> DataEntryStatus {
        PollingStationDataEntries::new(pool.clone())
            .get(polling_station_id)
            .await
            .unwrap()
    }

    async fn save(
        pool: SqlitePool,
        request_body: DataEntry,
        entry_number: EntryNumber,
    ) -> Response {
        polling_station_data_entry_save(
            Path((1, entry_number)),
            State(PollingStationDataEntries::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            State(Elections::new(pool.clone())),
            request_body.clone(),
        )
        .await
        .into_response()
    }

    async fn delete(pool: SqlitePool, entry_number: EntryNumber) -> Response {
        polling_station_data_entry_delete(
            State(PollingStationDataEntries::new(pool.clone())),
            Path((1, entry_number)),
        )
        .await
        .into_response()
    }

    async fn finalise(pool: SqlitePool, entry_number: EntryNumber) -> Response {
        polling_station_data_entry_finalise(
            State(PollingStationDataEntries::new(pool.clone())),
            State(Elections::new(pool.clone())),
            State(PollingStations::new(pool.clone())),
            Path((1, entry_number)),
        )
        .await
        .into_response()
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_create_data_entry(pool: SqlitePool) {
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 100; // incorrect value

        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if a row was created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_cannot_finalise_with_errors(pool: SqlitePool) {
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 100; // incorrect value

        // Check that we cannot finalise with errors
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_update_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if there is still only one row
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check if the data was updated
        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("No data found");
        let data: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        let DataEntryStatus::FirstEntryInProgress(state) = data else {
            panic!("Expected entry to be in FirstEntryInProgress state");
        };
        assert_eq!(
            state.first_entry.voters_counts.poll_card_count,
            request_body.data.voters_counts.poll_card_count
        );
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_finalise_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_save_second_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        // Save a first data entry and finalise it
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save a second data entry
        let response = save(pool.clone(), request_body.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if entry is now in SecondEntryInProgress state
        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        assert!(matches!(status, DataEntryStatus::SecondEntryInProgress(_)));

        // Check that nothing is added to polling_station_results yet
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_finalise_second_data_entry(pool: SqlitePool) {
        let request_body = example_data_entry();

        // Save and finalise the first data entry
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save and finalise the second data entry
        let response = save(pool.clone(), request_body.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that polling_station_results contains the finalised result and that the data entries are deleted
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 1);

        // Check that the status is 'Definitive'
        let status = get_data_entry_status(pool.clone(), 1).await;
        assert!(matches!(status, DataEntryStatus::Definitive(_)));

        // Check that we can't save a new data entry after finalising
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let response = save(pool.clone(), request_body.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    // test creating first and different second data entry
    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_first_second_data_entry_different(pool: SqlitePool) {
        // Save and finalise the first data entry
        let request_body = example_data_entry();
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Save and finalise a different second data entry
        let mut request_body = example_data_entry();
        request_body.data.voters_counts.poll_card_count = 99;
        request_body.data.voters_counts.proxy_certificate_count = 0;
        let response = save(pool.clone(), request_body.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = finalise(pool.clone(), EntryNumber::SecondEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check if entry is now in EntriesDifferent state
        let data = query!("SELECT state FROM polling_station_data_entries")
            .fetch_one(&pool)
            .await
            .expect("One row should exist");
        let status: DataEntryStatus = serde_json::from_slice(&data.state).unwrap();
        assert!(matches!(status, DataEntryStatus::EntriesDifferent(_)));

        // Check that no result has been created
        let row_count = query!("SELECT COUNT(*) AS count FROM polling_station_results")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(row_count.count, 0);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_polling_station_data_entry_delete(pool: SqlitePool) {
        // create data entry
        let request_body = example_data_entry();
        let response = save(pool.clone(), request_body.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // delete data entry
        let response = delete(pool.clone(), EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::NO_CONTENT);

        let status = get_data_entry_status(pool.clone(), 1).await;
        assert_eq!(status, DataEntryStatus::FirstEntryNotStarted);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_polling_station_data_entry_delete_nonexistent(pool: SqlitePool) {
        // check that deleting a non-existing data entry returns 404
        let response = polling_station_data_entry_delete(
            State(PollingStationDataEntries::new(pool.clone())),
            Path((1, EntryNumber::FirstEntry)),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[sqlx::test(fixtures(path = "../../fixtures", scripts("election_1")))]
    async fn test_data_entry_delete_finalised_not_possible(pool: SqlitePool) {
        for entry_number in 1..=2 {
            let entry_number = EntryNumber::try_from(entry_number).unwrap();
            // create and finalise data entry
            let request_body = example_data_entry();
            let response = save(pool.clone(), request_body.clone(), entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);
            let response = finalise(pool.clone(), entry_number).await;
            assert_eq!(response.status(), StatusCode::OK);

            // check that deleting finalised or non-existent data entry returns 404
            for _entry_number in 1..=2 {
                let response = delete(pool.clone(), entry_number).await;
                assert_eq!(response.status(), StatusCode::CONFLICT);
            }

            // after the first data entry, check if it is still in the database
            // (after the second data entry, the results are finalised so we do not expect rows)
            if entry_number == EntryNumber::FirstEntry {
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
