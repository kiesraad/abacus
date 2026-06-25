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
    domain::role::Role,
    error::{ApiErrorResponse, ErrorReference, ErrorResponse},
};

/// Errors that can occur before apportionment
#[derive(Debug, Clone, PartialEq)]
pub enum ApportionmentApiError {
    ApportionmentNotCompleted,
    CommitteeSessionNotCompleted,
    InvalidLotDrawing(String),
    InvalidState(String),
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
            ApportionmentApiError::InvalidLotDrawing(message) => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    format!("Drawn lot is invalid: {}", message),
                    ErrorReference::ApportionmentInvalidLotDrawing,
                    true,
                ),
            ),
            ApportionmentApiError::InvalidState(message) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(
                    format!("Apportionment invalid state: {}", message),
                    ErrorReference::InternalServerError,
                    true,
                ),
            ),
        }
    }
}

impl From<apportionment::ApportionmentError> for APIError {
    fn from(error: apportionment::ApportionmentError) -> Self {
        match error {
            apportionment::ApportionmentError::InvalidLotDrawing(message) => {
                ApportionmentApiError::InvalidLotDrawing(message).into()
            }
            apportionment::ApportionmentError::InvalidState(message) => {
                ApportionmentApiError::InvalidState(message).into()
            }
        }
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
