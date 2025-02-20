use axum::{
    extract::{Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{
    apportionment::{apportionment, ApportionmentError, ApportionmentResult},
    data_entry::{
        repository::{PollingStationDataEntries, PollingStationResultsEntries},
        status::DataEntryStatusName,
    },
    election::repository::Elections,
    polling_station::repository::PollingStations,
    summary::ElectionSummary,
    APIError, ErrorResponse,
};

/// Election details response, including the election's candidate list (political groups) and its polling stations
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionApportionmentResponse {
    pub apportionment: ApportionmentResult,
    pub election_summary: ElectionSummary,
}

/// Get the seat allocation for an election
#[utoipa::path(
  post,
  path = "/api/elections/{election_id}/apportionment",
  responses(
        (status = 200, description = "Election Apportionment", body = ElectionApportionmentResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 422, description = "Drawing of lots is required", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
  params(
        ("election_id" = u32, description = "Election database id"),
  ),
)]
pub async fn election_apportionment(
    State(elections_repo): State<Elections>,
    State(data_entry_repo): State<PollingStationDataEntries>,
    State(polling_stations_repo): State<PollingStations>,
    State(polling_station_results_entries_repo): State<PollingStationResultsEntries>,
    Path(id): Path<u32>,
) -> Result<Json<ElectionApportionmentResponse>, APIError> {
    let election = elections_repo.get(id).await?;
    let statuses = data_entry_repo.statuses(id).await?;
    if !statuses.is_empty()
        && statuses
            .iter()
            .all(|s| s.status == DataEntryStatusName::Definitive)
    {
        let results = polling_station_results_entries_repo
            .list_with_polling_stations(polling_stations_repo, election.id)
            .await?;
        let election_summary = ElectionSummary::from_results(&election, &results)?;
        let apportionment = apportionment(election.number_of_seats.into(), &election_summary)?;
        Ok(Json(ElectionApportionmentResponse {
            apportionment,
            election_summary,
        }))
    } else {
        Err(APIError::Apportionment(
            ApportionmentError::ApportionmentNotAvailableUntilDataEntryFinalised,
        ))
    }
}
