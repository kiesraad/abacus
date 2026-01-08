use utoipa_axum::{router::OpenApiRouter, routes};

use crate::AppState;

// TODO niet pub?
pub mod committee_session;
pub mod election;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(election::election_import_validate))
        .routes(routes!(election::election_import))
        .routes(routes!(election::election_list))
        .routes(routes!(election::election_details))
        .routes(routes!(election::election_number_of_voters_change))
        .routes(routes!(committee_session::committee_session_create))
        .routes(routes!(committee_session::committee_session_delete))
        .routes(routes!(committee_session::committee_session_update))
        .routes(routes!(committee_session::committee_session_status_change))
        .routes(routes!(committee_session::committee_session_investigations))
}
