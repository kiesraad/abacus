use axum::{Json, extract::State, http::StatusCode};
use chrono::NaiveDate;
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::middleware::authentication::RouteAuthorization,
    domain::{
        election::{CommitteeCategory, NewElection, PGNumber, PoliticalGroup},
        results::{
            cso_first_session_results::CSOFirstSessionResults,
            political_group_candidate_votes::PoliticalGroupCandidateVotes,
        },
    },
    repository::election_repo,
    test_data_gen::GenerateElectionArgs,
};

/// Router for the test data generation API
pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(generate_election_handler).public())
        .routes(routes!(generate_p22_2_variants).public())
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
    let _ = super::create_test_election(args, pool).await?;
    Ok(StatusCode::CREATED)
}

#[utoipa::path(
    get,
    path = "/api/generate_p22_2_variants",
    responses(
        (status = 201, description = "Created test elections"),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    )
    //request_body = GenerateElectionArgs,
)]
async fn generate_p22_2_variants(
    State(pool): State<SqlitePool>,
    //Json(args): Json<GenerateElectionArgs>,
) -> Result<StatusCode, APIError> {
    //let input = seat_assignment_fixture_with_default_50_candidates(23, vec![600, 302, 98, 99, 101]);
    let votes = [600, 302, 98, 99, 101];
    let new_election = NewElection {
        name: "asdf".to_string(),
        committee_category: CommitteeCategory::CSB,
        counting_method: None,
        election_id: "1".to_string(),
        location: "location".to_string(),
        domain_id: "2".to_string(),
        category: crate::domain::election::ElectionCategory::Municipal,
        number_of_seats: 23,
        number_of_voters: votes.iter().sum(),
        election_date: NaiveDate::default(),
        nomination_date: NaiveDate::default(),
        political_groups: vec![
            PoliticalGroup {
                number: PGNumber::from(1),
                name: "Lijst 1".to_string(),
                candidates: Vec::new(),
            },
            PoliticalGroup {
                number: PGNumber::from(2),
                name: "Lijst 2".to_string(),
                candidates: Vec::new(),
            },
            PoliticalGroup {
                number: PGNumber::from(3),
                name: "Lijst 3".to_string(),
                candidates: Vec::new(),
            },
            PoliticalGroup {
                number: PGNumber::from(4),
                name: "Lijst 4".to_string(),
                candidates: Vec::new(),
            },
            PoliticalGroup {
                number: PGNumber::from(5),
                name: "Lijst 5".to_string(),
                candidates: Vec::new(),
            },
        ],
    };
    let mut results = CSOFirstSessionResults::default();
    results.political_group_votes = [600, 302, 98, 99, 101]
        .iter()
        .enumerate()
        .map(|(i, v)| PoliticalGroupCandidateVotes {
            number: PGNumber::from(i as u32),
            total: *v,
            candidate_votes: Default::default(),
        })
        .collect();

    let mut conn = pool.acquire().await?;
    let _ = election_repo::create(&mut conn, new_election).await?;

    Ok(StatusCode::CREATED)
}
