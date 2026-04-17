use apportionment::ApportionmentError;
use utoipa_axum::{router::OpenApiRouter, routes};

mod handlers;
mod mapping;
mod structs;

use crate::{
    APIError, AppState, api::middleware::authentication::RouteAuthorization, domain::role::Role,
};

/// Errors that can occur before apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentApiError {
    AllListsExhausted,
    CommitteeSessionNotCompleted,
    DrawingOfLotsNotImplemented,
    ZeroVotesCast,
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
        APIError::Apportionment(err.into())
    }
}

impl From<ApportionmentApiError> for APIError {
    fn from(err: ApportionmentApiError) -> Self {
        APIError::Apportionment(err)
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    const ALLOWED_ROLES: &[Role] = &[CoordinatorCSB];

    OpenApiRouter::default()
        .routes(routes!(handlers::election_apportionment).authorize(ALLOWED_ROLES))
}
