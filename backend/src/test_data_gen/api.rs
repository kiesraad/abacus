use axum::{Json, extract::State, http::StatusCode};
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{APIError, AppState, ErrorResponse, test_data_gen::GenerateElectionArgs};

/// Router for the test data generation API
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default().routes(routes!(generate_election_handler))
}

#[utoipa::path(
    post,
    path = "/api/generate_test_election",
    description = "Endpoint only available with the dev-database feature",
    responses(
        (status = 200, description = "Created test election"),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    request_body = GenerateElectionArgs,
)]
async fn generate_election_handler(
    State(pool): State<SqlitePool>,
    Json(args): Json<GenerateElectionArgs>,
) -> Result<StatusCode, APIError> {
    let _ = super::create_test_election(args, pool).await?;

    Ok(StatusCode::CREATED)
}
