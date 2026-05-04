use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{AppState, api::middleware::authentication::RouteAuthorization, domain::role::Role};

mod files;
mod handlers;
mod structs;

/// Default date time format for reports
pub const DEFAULT_DATE_TIME_FORMAT: &str = "%d-%m-%Y %H:%M:%S %Z";

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    OpenApiRouter::default()
        .routes(routes!(handlers::election_download_zip_results_gsb).authorize(&[CoordinatorGSB]))
        .routes(routes!(handlers::election_download_zip_results_csb).authorize(&[CoordinatorCSB]))
        .routes(
            routes!(handlers::election_download_zip_attachment_csb).authorize(&[CoordinatorCSB]),
        )
        .routes(
            routes!(handlers::election_download_zip_total_counts_csb).authorize(&[CoordinatorCSB]),
        )
}
