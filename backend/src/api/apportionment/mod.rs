use apportionment::ApportionmentError;
use utoipa_axum::{router::OpenApiRouter, routes};

mod handlers;
mod mapping;
mod structs;

use crate::{
    APIError, AppState, api::middleware::authentication::RouteAuthorization, domain::role::Role,
};

impl From<ApportionmentError> for APIError {
    fn from(err: ApportionmentError) -> Self {
        APIError::Apportionment(err)
    }
}

/// Errors that can occur before apportionment
#[derive(Debug, PartialEq)]
pub enum ApportionmentApiError {
    CommitteeSessionNotCompleted,
}

impl From<ApportionmentApiError> for APIError {
    fn from(err: ApportionmentApiError) -> Self {
        APIError::ApportionmentApi(err)
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    const ALLOWED_ROLES: &[Role] = &[CoordinatorGSB];

    OpenApiRouter::default()
        .routes(routes!(handlers::election_apportionment).authorize(ALLOWED_ROLES))
}
