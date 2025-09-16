#![cfg(test)]
use hyper::StatusCode;
use serde_json::json;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_and_conlusion(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/741/investigations");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = json!({
        "reason": "Test reason"
    });
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie.clone())
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body = json!({
        "findings": "Test findings",
        "corrected_results": false
    });
    let url = format!("http://{addr}/api/polling_stations/741/investigations");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_fails_for_wrong_polling_station(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    // 732 is an  existing polling station, but in the wrong committee session
    let url = format!("http://{addr}/api/polling_stations/732/investigations");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = json!({
        "reason": "Test reason"
    });

    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie.clone())
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
