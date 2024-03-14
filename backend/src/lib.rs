use std::error::Error;

use axum::extract::State;
use axum::routing::get;
use axum::{routing, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::{query, SqlitePool};
use utoipa::{OpenApi, ToSchema};

pub fn router(pool: SqlitePool) -> Result<Router, Box<dyn Error>> {
    let openapi = create_openapi();
    let app = Router::new()
        .route("/api-docs/openapi.json", get(Json(openapi)))
        .route("/hello_world", routing::get(hello_world))
        .with_state(pool);
    Ok(app)
}

pub fn create_openapi() -> utoipa::openapi::OpenApi {
    #[derive(OpenApi)]
    #[openapi(paths(hello_world), components(schemas(HelloWorld)), tags())]
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
