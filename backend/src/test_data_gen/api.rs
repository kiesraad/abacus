use axum::{Json, extract::State, http::StatusCode};
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, api::middleware::authentication::RouteAuthorization,
    test_data_gen::{GenerateElectionArgs, RandomRange},
};

/// Router for the test data generation API
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default().routes(routes!(generate_election_handler).public())
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

    if args.generate_p22_2_variants {
	let mut common_args = args.clone();
	common_args.candidates_per_group = RandomRange(1..2);

	// Test Election >= 19 seats
	let mut args1 = common_args.clone();
	args1.seats = RandomRange(19..46);
	let votes = &[600, 302, 98, 99, 101];
	let total_votes = votes.iter().sum();
	args1.voters = RandomRange(total_votes..total_votes + 1);
	args1.political_groups = RandomRange((votes.len() as u32)..(votes.len() as u32) + 1);
	let _ = super::create_test_election(args1, pool.clone(), Some(votes)).await?;

    } else {
	let _ = super::create_test_election(args.clone(), pool.clone(), None).await?;
    }
    
    Ok(StatusCode::CREATED)
}
