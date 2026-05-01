use apportionment::ApportionmentError;
use axum::http::StatusCode;
use tracing::error;
use utoipa_axum::{router::OpenApiRouter, routes};

mod handlers;
mod mapping;
mod structs;

pub use self::{
    mapping::{map_candidate_nomination, map_seat_assignment},
    structs::ApportionmentInputData,
};
use crate::{
    APIError, AppState,
    api::middleware::authentication::RouteAuthorization,
    domain::role::Role,
    error::{ApiErrorResponse, ErrorReference, ErrorResponse, error_response},
};

/// Errors that can occur before apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentApiError {
    AllListsExhausted,
    CommitteeSessionNotCompleted,
    DrawingOfLotsNotImplemented,
    ZeroVotesCast,
}

impl ApiErrorResponse for ApportionmentApiError {
    fn log(&self) {
        error!("Apportionment error: {:?}", self);
    }

    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            ApportionmentApiError::AllListsExhausted => (
                StatusCode::UNPROCESSABLE_ENTITY,
                error_response(
                    "All lists are exhausted, not enough candidates to fill all seats",
                    ErrorReference::ApportionmentAllListsExhausted,
                    false,
                ),
            ),
            ApportionmentApiError::CommitteeSessionNotCompleted => (
                StatusCode::PRECONDITION_FAILED,
                error_response(
                    "Committee session not completed",
                    ErrorReference::ApportionmentCommitteeSessionNotCompleted,
                    false,
                ),
            ),
            ApportionmentApiError::DrawingOfLotsNotImplemented => (
                StatusCode::UNPROCESSABLE_ENTITY,
                error_response(
                    "Drawing of lots is required",
                    ErrorReference::ApportionmentDrawingOfLotsRequired,
                    false,
                ),
            ),
            ApportionmentApiError::ZeroVotesCast => (
                StatusCode::UNPROCESSABLE_ENTITY,
                error_response(
                    "No votes on candidates cast",
                    ErrorReference::ApportionmentZeroVotesCast,
                    false,
                ),
            ),
        }
    }
}

impl From<ApportionmentError> for ApportionmentApiError {
    fn from(err: ApportionmentError) -> Self {
        match err {
            ApportionmentError::AllListsExhausted => Self::AllListsExhausted,
            ApportionmentError::DrawingOfLotsNotImplemented => Self::DrawingOfLotsNotImplemented,
            ApportionmentError::ZeroVotesCast => Self::ZeroVotesCast,
        }
    }
}

impl From<ApportionmentError> for APIError {
    fn from(err: ApportionmentError) -> Self {
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

    const ALLOWED_ROLES: &[Role] = &[CoordinatorCSB];

    OpenApiRouter::default()
        .routes(routes!(handlers::election_apportionment).authorize(ALLOWED_ROLES))
}
