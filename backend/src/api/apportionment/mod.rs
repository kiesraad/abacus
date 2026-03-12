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

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    const ALLOWED_ROLES: &[Role] = &[CoordinatorGSB];

    OpenApiRouter::default()
        .routes(routes!(handlers::election_apportionment).authorize(ALLOWED_ROLES))
}
