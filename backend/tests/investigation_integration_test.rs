#![cfg(test)]
use hyper::StatusCode;
use reqwest::Response;
use serde_json::json;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

async fn create_investigation(pool: SqlitePool, polling_station_id: u32) -> Response {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/investigations");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = json!({
        "reason": "Test reason"
    });
    reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie.clone())
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

async fn update_investigation(pool: SqlitePool, polling_station_id: u32) -> Response {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = json!({
        "findings": "Test findings",
        "corrected_results": false
    });
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/investigations");
    reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_create_and_update(pool: SqlitePool) {
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        update_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_fails_for_wrong_polling_station(pool: SqlitePool) {
    // 732 is an  existing polling station, but in the wrong committee session
    assert_eq!(
        create_investigation(pool.clone(), 732).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_fails_on_creating_second_investigation(pool: SqlitePool) {
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::CONFLICT
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_update_existing(pool: SqlitePool) {
    assert_eq!(
        update_investigation(pool.clone(), 741).await.status(),
        StatusCode::NOT_FOUND
    );
}
