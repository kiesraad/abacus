#![cfg(test)]

use axum::http::{HeaderValue, StatusCode};
use reqwest::Response;
use sqlx::SqlitePool;
use std::net::SocketAddr;
use test_log::test;

use crate::{
    shared::{
        change_status_committee_session, coordinator_login, create_investigation, create_result,
        get_election_committee_session,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

async fn delete_committee_session(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    election_id: u32,
    committee_session_id: u32,
) -> Response {
    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap()
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_create_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 5;

    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        6,
        "data_entry_finished",
    )
    .await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "data_entry_finished");

    let url = format!("http://{addr}/api/elections/{election_id}/committee_sessions");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["id"], 7);
    assert_eq!(body["number"], 3);
    assert_eq!(body["election_id"], election_id);
    assert_eq!(body["status"], "created");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_create_current_committee_session_not_finalised(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_delete_ok_status_created(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 7;
    let committee_session_id = 704;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["id"], 704);
    assert_eq!(committee_session["status"], "created");

    let response = delete_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
    )
    .await;
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["id"], 703);
    assert_eq!(committee_session["status"], "data_entry_finished");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_delete_fails_with_investigation(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 7;
    let committee_session_id = 704;
    let polling_station_id = 742;

    create_investigation(&addr, polling_station_id).await;

    let response = delete_committee_session(
        &addr,
        &coordinator_login(&addr).await,
        election_id,
        committee_session_id,
    )
    .await;
    // You cannot delete a committee session if there are investigations linked to it
    assert_eq!(
        response.status(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_delete_not_ok_wrong_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 5;
    let committee_session_id = 6;

    let response = delete_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
    )
    .await;
    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    // Set status to DataEntryPaused
    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        "data_entry_paused",
    )
    .await;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "data_entry_paused");

    let response = delete_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
    )
    .await;
    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    // Set status to DataEntryFinished
    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        "data_entry_finished",
    )
    .await;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "data_entry_finished");

    let response = delete_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
    )
    .await;
    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_delete_current_committee_session_but_its_the_first(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 2;
    let committee_session_id = 2;

    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        "created",
    )
    .await;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "created");

    let response = delete_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
    )
    .await;
    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "created");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_delete_previous_committee_session(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = delete_committee_session(&addr, &coordinator_cookie, 5, 5).await;
    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_delete_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = delete_committee_session(&addr, &coordinator_cookie, 5, 40404).await;
    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_update_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&serde_json::json!({
            "location": "Juinen".to_string(),
            "start_date": "2026-03-18".to_string(),
            "start_time": "10:45".to_string(),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_update_bad_request(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&serde_json::json!({
            "location": "".to_string(),
            "start_date": "".to_string(),
            "start_time": "".to_string(),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&serde_json::json!({
            "location": "Juinen".to_string(),
            "start_date": "25-10-2025".to_string(),
            "start_time": "10:45".to_string(),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_update_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/5");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&serde_json::json!({
            "location": "Juinen".to_string(),
            "start_date": "2025-10-25".to_string(),
            "start_time": "10:45".to_string(),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_committee_session_update_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/1/committee_sessions/1");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&serde_json::json!({
            "location": "Juinen".to_string(),
            "start_date": "2025-10-25".to_string(),
            "start_time": "10:45".to_string(),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_status_change_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/6/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&serde_json::json!({"status": "data_entry_finished"}))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_status_change_finished_to_in_progress_deletes_files(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 2;
    create_result(&addr, 1, election_id).await;
    create_result(&addr, 2, election_id).await;

    // Change committee session status to DataEntryFinished
    let url = format!("http://{addr}/api/elections/{election_id}/committee_sessions/2/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&serde_json::json!({"status": "data_entry_finished"}))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "data_entry_finished");

    // Generate and download results files
    let file_download_url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/2/download_zip_results"
    );
    let response = reqwest::Client::new()
        .get(&file_download_url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["results_eml"], 1);
    assert_eq!(committee_session["results_pdf"], 2);

    // Change committee session status to DataEntryInProgress
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&serde_json::json!({"status": "data_entry_in_progress"}))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "data_entry_in_progress");
    assert!(committee_session["results_eml"].is_null());
    assert!(committee_session["results_pdf"].is_null());
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_status_change_invalid_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&serde_json::json!({"status": "data_entry_not_started"}))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_committee_session_status_change_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/1/committee_sessions/1/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&serde_json::json!({"status": "data_entry_paused"}))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_status_change_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/5/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&serde_json::json!({"status": "data_entry_in_progress"}))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_investigations_list_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/7/committee_sessions/702/investigations");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response and make sure the investigations are from the requested committee session
    let body: serde_json::Value = response.json().await.unwrap();
    let investigations = body["investigations"].as_array().unwrap();
    assert_eq!(investigations.len(), 1);
    assert_eq!(
        investigations[0]["polling_station_id"].as_u64().unwrap(),
        721
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_investigations_list_works_no_investigations(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/7/committee_sessions/704/investigations");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response and make sure the investigations are empty
    let body: serde_json::Value = response.json().await.unwrap();
    let investigations = body["investigations"].as_array().unwrap();
    assert_eq!(investigations.len(), 0);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_investigations_list_fails_election_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/1/committee_sessions/1/investigations");
    let response = reqwest::Client::new()
        .get(&url)
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
