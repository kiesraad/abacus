use axum::{Json, extract::State, http::StatusCode};
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::middleware::authentication::RouteAuthorization,
    test_data_gen::{GenerateElectionArgs, RandomRange, generators::CreateTestElectionResult},
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
        // 1. Test Election >= 19 seats
        //    based on test `gte_19_seats::test_with_remainder_seats`
        let _ = create_test_election_with_votes(
            &args,
            &pool,
            23,
            default_50_candidates(&[600, 302, 98, 99, 101]),
        )
        .await;

        // 2. Test Election >= 19 seats & Absolute Majority Change
        //    based on test `gte_19_seats::test_with_absolute_majority_of_votes_but_not_seats`
        let _ = create_test_election_with_votes(
            &args,
            &pool,
            24,
            default_50_candidates(&[7501, 1249, 1249, 1249, 1249, 1249, 1248, 7]),
        )
        .await;

        // 3. Test Election < 19 seats
        //    based on test `lt_19_seats::test_with_1_list_that_meets_threshold`
        let _ = create_test_election_with_votes(
            &args,
            &pool,
            15,
            default_50_candidates(&[808, 59, 58, 57, 56, 55, 54, 53]),
        )
        .await;

        // 4. Test Election < 19 seats & Absolute Majority Change & List Exhaustion
        //    based on test `lt_19_seats::test_with_absolute_majority_of_votes_but_not_seats_and_list_exhaustion`
        let _ = create_test_election_with_votes(
            &args,
            &pool,
            15,
            vec![
                vec![2571, 0, 0, 0, 0, 0, 0],
                vec![977, 0, 0, 0],
                vec![567, 0],
                vec![536, 0],
                vec![453, 0],
            ],
        )
        .await;

        // 5. Test Election < 19 seats & List Exhaustion
        //    based on test `lt_19_seats::test_with_list_exhaustion_triggering_2nd_round_highest_average_assignment_with_different_averages`
        let _ =
            create_test_election_with_votes(&args, &pool, 6, vec![vec![3, 3], vec![2, 2], vec![25, 25]]).await;
    } else {
        let _ = super::create_test_election(args.clone(), pool.clone(), None).await?;
    }

    Ok(StatusCode::CREATED)
}

async fn create_test_election_with_votes(
    common_args: &GenerateElectionArgs,
    pool: &SqlitePool,
    seats: u32,
    votes: Vec<Vec<u32>>,
) -> Result<CreateTestElectionResult, Box<dyn std::error::Error>> {
    let mut args = common_args.clone();

    let total_votes = votes.iter().flatten().sum();
    let policital_groups = u32::try_from(votes.len())?;
    args.voters = RandomRange(total_votes..total_votes + 1);
    args.political_groups = RandomRange(policital_groups..policital_groups + 1);
    args.seats = RandomRange(seats..seats + 1);
    super::create_test_election(args, pool.clone(), Some(votes)).await
}

/// Fill a `Vec` with political groups of 50 candidates. The first candidate gets the specified votes
fn default_50_candidates(votes: &[u32]) -> Vec<Vec<u32>> {
    votes
        .iter()
        .map(|v| {
            let mut vec = vec![0; 50];
            vec[0] = *v;
            vec
        })
        .collect()
}
