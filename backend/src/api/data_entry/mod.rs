mod data_entry_abort;
mod data_entry_claim;
mod data_entry_delete;
mod data_entry_finalise;
mod data_entry_get;
mod data_entry_save;
mod election_status;
mod resolve_differences;
mod resolve_errors;

use utoipa_axum::{router::OpenApiRouter, routes};

use crate::infra::app::AppState;

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(data_entry_claim::polling_station_data_entry_claim))
        .routes(routes!(data_entry_save::polling_station_data_entry_save))
        .routes(routes!(data_entry_abort::polling_station_data_entry_delete))
        .routes(routes!(
            data_entry_finalise::polling_station_data_entry_finalise
        ))
        .routes(routes!(
            data_entry_delete::polling_station_data_entries_and_result_delete
        ))
        .routes(routes!(data_entry_get::polling_station_data_entry_get))
        .routes(routes!(
            resolve_errors::polling_station_data_entry_resolve_errors
        ))
        .routes(routes!(
            resolve_differences::polling_station_data_entry_get_differences
        ))
        .routes(routes!(
            resolve_differences::polling_station_data_entry_resolve_differences
        ))
        .routes(routes!(election_status::election_status))
}
