#![forbid(unsafe_code)]
#![warn(clippy::unwrap_used)]
#![cfg_attr(test, allow(clippy::unwrap_used))]

use std::error::Error;

use axum::routing::get;
use axum::{routing, Json, Router};
use sqlx::SqlitePool;
use utoipa::OpenApi;

pub mod polling_station;
pub mod validation;

/// Axum router for the application
pub fn router(pool: SqlitePool) -> Result<Router, Box<dyn Error>> {
    let openapi = create_openapi();
    let app = Router::new()
        .route("/api-docs/openapi.json", get(Json(openapi)))
        .route(
            "/api/polling_stations/:id/data_entries/:entry_number",
            routing::post(polling_station::polling_station_data_entry),
        )
        .with_state(pool);
    Ok(app)
}

pub fn create_openapi() -> utoipa::openapi::OpenApi {
    #[derive(OpenApi)]
    #[openapi(
        paths(
            polling_station::polling_station_data_entry,
        ),
        components(
            schemas(
                validation::ValidationResult,
                validation::ValidationResultCode,
                validation::ValidationResults,
                polling_station::DataEntryRequest,
                polling_station::DataEntryResponse,
                polling_station::PollingStationResults,
                polling_station::VotersCounts,
                polling_station::VotesCounts,
            ),
        ),
        tags(
            (name = "polling_station", description = "Polling station API"),
        )
    )]
    struct ApiDoc;
    ApiDoc::openapi()
}
