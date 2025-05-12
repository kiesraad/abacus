#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use utils::serve_api;

use test_log::test;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_election_subcategory(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "data": include_str!("../src/eml/tests/eml110a_invalid_election_subcategory.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_election_number_of_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "data": include_str!("../src/eml/tests/eml110a_invalid_election_number_of_seats.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_election_missing_region(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "data": include_str!("../src/eml/tests/eml110a_invalid_election_missing_region.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_xml(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "data": include_str!("../src/eml/tests/eml110a_invalid_xml.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
