use apportionment::ApportionmentError;
use axum::http::StatusCode;
use tracing::error;
use utoipa_axum::{router::OpenApiRouter, routes};

mod handlers;
mod mapping;
mod structs;

pub use self::{
    mapping::{map_candidate_nomination, map_seat_assignment},
    structs::{ApportionmentInputData, ElectionApportionmentResponse},
};
pub use crate::domain::apportionment_state::{
    CandidateDrawingLotsRequired, ListDrawingLotsRequired,
};
use crate::{
    APIError, AppState,
    api::middleware::authentication::RouteAuthorization,
    domain::{
        election::{CandidateNumber, PGNumber},
        role::Role,
    },
    error::{ApiErrorResponse, ErrorReference, ErrorResponse},
};

/// Errors that can occur before apportionment
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ApportionmentApiError {
    CommitteeSessionNotCompleted,
    DrawingLotsRequired,
}

impl ApiErrorResponse for ApportionmentApiError {
    fn log(&self) {
        error!("Apportionment error: {:?}", self);
    }

    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            ApportionmentApiError::CommitteeSessionNotCompleted => (
                StatusCode::PRECONDITION_FAILED,
                ErrorResponse::new(
                    "Committee session not completed",
                    ErrorReference::ApportionmentCommitteeSessionNotCompleted,
                    false,
                ),
            ),
            ApportionmentApiError::DrawingLotsRequired => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorResponse::new(
                    "Drawing of lots is required",
                    ErrorReference::ApportionmentDrawingOfLotsRequired,
                    false,
                ),
            ),
        }
    }
}

impl From<ApportionmentError<PGNumber, CandidateNumber>> for ApportionmentApiError {
    fn from(_err: ApportionmentError<PGNumber, CandidateNumber>) -> Self {
        Self::DrawingLotsRequired
    }
}

impl From<ApportionmentError<PGNumber, CandidateNumber>> for APIError {
    fn from(err: ApportionmentError<PGNumber, CandidateNumber>) -> Self {
        ApportionmentApiError::from(err).into()
    }
}

impl From<ApportionmentApiError> for APIError {
    fn from(err: ApportionmentApiError) -> Self {
        APIError::Delegated(Box::new(err))
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;
    use handlers::*;

    const ALLOWED_ROLES: &[Role] = &[CoordinatorCSB];

    OpenApiRouter::default()
        .routes(routes!(add_deceased_candidate::add_deceased_candidate).authorize(ALLOWED_ROLES))
        .routes(
            routes!(delete_deceased_candidate::delete_deceased_candidate).authorize(ALLOWED_ROLES),
        )
        .routes(
            routes!(finalise_deceased_candidates::finalise_deceased_candidates)
                .authorize(ALLOWED_ROLES),
        )
        .routes(routes!(get_apportionment_state::get_apportionment_state).authorize(ALLOWED_ROLES))
        .routes(routes!(process_apportionment::process_apportionment).authorize(ALLOWED_ROLES))
        .routes(
            routes!(register_deceased_candidates::register_deceased_candidates)
                .authorize(ALLOWED_ROLES),
        )
        .routes(
            routes!(reset_apportionment_state::reset_apportionment_state).authorize(ALLOWED_ROLES),
        )
        .routes(
            routes!(skip_deceased_candidates::skip_deceased_candidates).authorize(ALLOWED_ROLES),
        )
}
