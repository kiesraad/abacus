use std::error::Error;

use axum::extract::State;
use axum::routing::get;
use axum::{routing, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{query, SqlitePool};
use utoipa::{OpenApi, ToSchema};

pub mod polling_station;
pub mod validation;

/// Axum router for the application
pub fn router(pool: SqlitePool) -> Result<Router, Box<dyn Error>> {
    let openapi = create_openapi();
    let app = Router::new()
        .route("/api-docs/openapi.json", get(Json(openapi)))
        .route("/hello_world", get(hello_world))
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

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
pub struct HelloWorld {
    pub message: String,
}

#[utoipa::path(
    get,
    path = "/hello_world",
    responses(
        (status = 200, description = "Hello World", body = [HelloWorld])
    )
)]
pub async fn hello_world(State(pool): State<SqlitePool>) -> Json<HelloWorld> {
    query!("SELECT * FROM hello_world LIMIT 0")
        .fetch_optional(&pool)
        .await
        .unwrap();

    Json(HelloWorld {
        message: "Hello World".to_string(),
    })
}
