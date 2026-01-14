use utoipa_axum::{router::OpenApiRouter, routes};

use crate::AppState;

// TODO niet pub?
pub mod committee_session;
#[allow(clippy::module_inception)]
pub mod election;
pub mod investigation;
pub mod polling_station;

#[allow(clippy::cognitive_complexity)]
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
        .routes(routes!(polling_station::polling_station_list))
        .routes(routes!(polling_station::polling_station_create))
        .routes(routes!(polling_station::polling_station_get))
        .routes(routes!(polling_station::polling_station_update))
        .routes(routes!(polling_station::polling_station_delete))
        .routes(routes!(polling_station::polling_station_validate_import))
        .routes(routes!(polling_station::polling_station_import))
        .routes(routes!(investigation::polling_station_investigation_create))
        .routes(routes!(
            investigation::polling_station_investigation_conclude
        ))
        .routes(routes!(investigation::polling_station_investigation_update))
        .routes(routes!(investigation::polling_station_investigation_delete))
}
