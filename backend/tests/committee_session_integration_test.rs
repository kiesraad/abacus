#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;
use abacus::committee_session::{
    CommitteeSession, CommitteeSessionNumberOfVotersChangeRequest,
    CommitteeSessionStatusChangeRequest, CommitteeSessionUpdateRequest, NewCommitteeSessionRequest,
    status::CommitteeSessionStatus,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_create_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 2;

    shared::change_status_committee_session(
        &addr,
        &cookie,
        election_id,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    let url = format!("http://{addr}/api/committee_sessions");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &cookie)
        .json(&NewCommitteeSessionRequest { election_id })
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
    assert_eq!(body.election_id, election_id);
    assert_eq!(body.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_create_current_committee_session_not_finalised(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .json(&NewCommitteeSessionRequest { election_id: 2 })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5", "users"))))]
async fn test_committee_session_delete_ok_status_created(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 5;
    let committee_session_id = 6;

    shared::change_status_committee_session(
        &addr,
        &cookie,
        committee_session_id,
        CommitteeSessionStatus::Created,
    )
    .await;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created,);

    let url = format!("http://{addr}/api/committee_sessions/{committee_session_id}");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5", "users"))))]
async fn test_committee_session_delete_ok_status_data_entry_not_started(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 5;
    let committee_session_id = 6;

    shared::change_status_committee_session(
        &addr,
        &cookie,
        committee_session_id,
        CommitteeSessionStatus::Created,
    )
    .await;
    shared::change_status_committee_session(
        &addr,
        &cookie,
        committee_session_id,
        CommitteeSessionStatus::DataEntryNotStarted,
    )
    .await;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted,
    );

    let url = format!("http://{addr}/api/committee_sessions/{committee_session_id}");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5", "users"))))]
async fn test_committee_session_delete_not_ok_wrong_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 5;
    let committee_session_id = 6;

    // Set status to DataEntryInProgress
    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress,
    );

    let url = format!("http://{addr}/api/committee_sessions/{committee_session_id}");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    // Set status to DataEntryPaused
    shared::change_status_committee_session(
        &addr,
        &cookie,
        committee_session_id,
        CommitteeSessionStatus::DataEntryPaused,
    )
    .await;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryPaused,
    );

    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    // Set status to DataEntryFinished
    shared::change_status_committee_session(
        &addr,
        &cookie,
        committee_session_id,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished,
    );

    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_delete_first_committee_session(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 2;
    let committee_session_id = 2;

    shared::change_status_committee_session(
        &addr,
        &cookie,
        committee_session_id,
        CommitteeSessionStatus::Created,
    )
    .await;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created,);

    let url = format!("http://{addr}/api/committee_sessions/{committee_session_id}");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created,);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5", "users"))))]
async fn test_committee_session_delete_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/committee_sessions/40404");

    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
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
            start_date: "2026-03-18".to_string(),
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_update_bad_request(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/committee_sessions/2");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "".to_string(),
            start_date: "".to_string(),
            start_time: "".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "Juinen".to_string(),
            start_date: "25-10-2025".to_string(),
            start_time: "10:45".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
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
            start_date: "2025-10-25".to_string(),
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
