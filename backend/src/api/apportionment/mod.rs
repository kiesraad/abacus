use apportionment;
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
#[derive(Debug, Clone, PartialEq)]
pub enum ApportionmentApiError {
    ApportionmentNotCompleted,
    CommitteeSessionNotCompleted,
    InvalidLotDrawing,
}

impl ApiErrorResponse for ApportionmentApiError {
    fn log(&self) {
        error!("Apportionment error: {:?}", self);
    }

    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            ApportionmentApiError::ApportionmentNotCompleted => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorResponse::new(
                    "Apportionment not completed",
                    ErrorReference::ApportionmentNotCompleted,
                    false,
                ),
            ),
            ApportionmentApiError::CommitteeSessionNotCompleted => (
                StatusCode::PRECONDITION_FAILED,
                ErrorResponse::new(
                    "Committee session not completed",
                    ErrorReference::ApportionmentCommitteeSessionNotCompleted,
                    false,
                ),
            ),
            ApportionmentApiError::InvalidLotDrawing => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    "Drawn lot is invalid",
                    ErrorReference::ApportionmentInvalidLotDrawing,
                    true,
                ),
            ),
        }
    }
}

// Needed for report generation
impl From<apportionment::ApportionmentError<PGNumber, CandidateNumber>> for APIError {
    fn from(_err: apportionment::ApportionmentError<PGNumber, CandidateNumber>) -> Self {
        ApportionmentApiError::ApportionmentNotCompleted.into()
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
        .routes(routes!(add_candidate_drawn::add_candidate_drawn).authorize(ALLOWED_ROLES))
        .routes(routes!(add_deceased_candidate::add_deceased_candidate).authorize(ALLOWED_ROLES))
        .routes(routes!(add_list_drawn::add_list_drawn).authorize(ALLOWED_ROLES))
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
