use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    ApportionmentError, CandidateNominationResult, SeatAssignmentResult, candidate_nomination,
    get_total_seats_from_apportionment_result, seat_assignment,
};
use crate::{
    APIError, AppState, ErrorResponse,
    audit_log::{AuditEvent, AuditService},
    authentication::Coordinator,
    data_entry::status::DataEntryStatusName,
    summary::ElectionSummary,
};

impl From<ApportionmentError> for APIError {
    fn from(err: ApportionmentError) -> Self {
        APIError::Apportionment(err)
    }
}
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
        (status = 403, description = "Forbidden", body = ErrorResponse),
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
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(id): Path<u32>,
) -> Result<Json<ElectionApportionmentResponse>, APIError> {
    let election = crate::election::repository::get(&pool, id).await?;
    let statuses = crate::data_entry::repository::statuses(&pool, id).await?;
    if !statuses.is_empty()
        && statuses
            .iter()
            .all(|s| s.status == DataEntryStatusName::Definitive)
    {
        let results =
            crate::data_entry::repository::list_entries_with_polling_stations(&pool, election.id)
                .await?;
        let election_summary = ElectionSummary::from_results(&election, &results)?;
        let seat_assignment = seat_assignment(election.number_of_seats, &election_summary)?;
        let candidate_nomination = candidate_nomination(
            &election,
            seat_assignment.quota,
            &election_summary,
            get_total_seats_from_apportionment_result(&seat_assignment),
        )?;

        audit_service
            .log(
                &AuditEvent::ApportionmentCreated(election.clone().into()),
                None,
            )
            .await?;

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
