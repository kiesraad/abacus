use axum::{Json, extract::State, http::StatusCode};
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, ErrorResponse,
    infra::{
        app::AppState,
        generate_test_data::{GenerateElectionArgs, generators::create_test_election},
    },
};

/// Router for the test data generation API
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default().routes(routes!(generate_election_handler))
}

#[utoipa::path(
    post,
    path = "/api/generate_test_election",
    responses(
        (status = 201, description = "Created test election"),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    request_body = GenerateElectionArgs,
)]
async fn generate_election_handler(
    State(pool): State<SqlitePool>,
    Json(args): Json<GenerateElectionArgs>,
) -> Result<StatusCode, APIError> {
    create_test_election(args, pool).await?;

    Ok(StatusCode::CREATED)
}
