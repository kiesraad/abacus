use axum::{Json, extract::Path};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{ApportionmentError, CandidateNominationResult, SeatAssignmentResult};
use crate::{
    APIError, AppState, ErrorResponse, authentication::Coordinator, summary::ElectionSummary,
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
#[serde(deny_unknown_fields)]
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
    Path(_id): Path<u32>,
) -> Result<Json<ElectionApportionmentResponse>, APIError> {
    // Apportionment is not available for GSB, and we don't have a HSB or CSB version yet.
    Err(ApportionmentError::InvalidCommitteeRole.into())
}
