#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;
use abacus::committee_session::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionListResponse,
    CommitteeSessionNumberOfVotersChangeRequest, CommitteeSessionStatusChangeRequest,
    CommitteeSessionUpdateRequest, status::CommitteeSessionStatus,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5", "users"))))]
async fn test_election_committee_session_list_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: CommitteeSessionListResponse = response.json().await.unwrap();
    assert_eq!(body.committee_sessions.len(), 2);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_committee_session_list_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url: String = format!("http://{addr}/api/elections/1/committee_sessions");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_create_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionCreateRequest {
            number: 2,
            election_id: 2,
            number_of_voters: 0,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: CommitteeSession = response.json().await.unwrap();
    assert_eq!(body.id, 3);
    assert_eq!(body.number, 2);
    assert_eq!(body.election_id, 2);
    assert_eq!(body.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_update_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions/2");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "Juinen".to_string(),
            start_date: "25-10-2025".to_string(),
            start_time: "10:45".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_committee_session_update_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions/1");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "Juinen".to_string(),
            start_date: "25-10-2025".to_string(),
            start_time: "10:45".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_status_change_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions/2/status");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryFinished,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_status_change_invalid_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions/2/status");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryNotStarted,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_committee_session_status_change_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions/1/status");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryPaused,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_number_of_voters_change_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions/2/voters");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_committee_session_number_of_voters_change_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions/1/voters");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionNumberOfVotersChangeRequest {
            number_of_voters: 0,
        })
        .send()
        .await
        .unwrap();
    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
