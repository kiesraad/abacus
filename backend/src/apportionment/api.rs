use crate::{
    APIError, AppState, ErrorResponse,
    apportionment::{
        ApportionmentError, CandidateNominationResult, SeatAssignmentResult, candidate_nomination,
        get_total_seats_from_apportionment_result, seat_assignment,
    },
    authentication::Coordinator,
    data_entry::{
        repository::{PollingStationDataEntries, PollingStationResultsEntries},
        status::DataEntryStatusName,
    },
    election::repository::Elections,
    polling_station::repository::PollingStations,
    summary::ElectionSummary,
};
use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default().routes(routes!(election_apportionment))
}

/// Election apportionment response, including the seat assignment, candidate nomination and election summary
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionApportionmentResponse {
    pub seat_assignment: SeatAssignmentResult,
    pub candidate_nomination: CandidateNominationResult,
    pub election_summary: ElectionSummary,
}

/// Get the apportionment for an election
#[utoipa::path(
  post,
  path = "/api/elections/{election_id}/apportionment",
  responses(
        (status = 200, description = "Election Apportionment", body = ElectionApportionmentResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 412, description = "Election apportionment is not yet available", body = ErrorResponse),
        (status = 422, description = "Election apportionment is not possible", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
  params(
        ("election_id" = u32, description = "Election database id"),
  ),
)]
async fn election_apportionment(
    _user: Coordinator,
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
        let seat_assignment = seat_assignment(election.number_of_seats, &election_summary)?;
        let candidate_nomination = candidate_nomination(
            &election,
            seat_assignment.quota,
            &election_summary,
            get_total_seats_from_apportionment_result(&seat_assignment),
        )?;
        Ok(Json(ElectionApportionmentResponse {
            seat_assignment,
            candidate_nomination,
            election_summary,
        }))
    } else {
        Err(APIError::Apportionment(
            ApportionmentError::ApportionmentNotAvailableUntilDataEntryFinalised,
        ))
    }
}
