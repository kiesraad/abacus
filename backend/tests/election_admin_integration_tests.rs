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

    let url = format!("http://{addr}/api/elections/import/validate");
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

    let url = format!("http://{addr}/api/elections/import/validate");
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

    let url = format!("http://{addr}/api/elections/import/validate");
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

    let url = format!("http://{addr}/api/elections/import/validate");
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

    let url = format!("http://{addr}/api/elections/import/validate");
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_save(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "hash": [
                "84c9", "caba", "ff33", "6c42",
                "9825", "b20c", "2ba9", "1ceb",
                "3c61", "9b99", "8af1", "a57e",
                "cf00", "8930", "9bce", "0c33"
            ],
            "data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_save_empty_stubs(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "hash": [
                "84c9", "caba", "ff33", "6c42",
                "", "b20c", "2ba9", "1ceb",
                "3c61", "9b99", "", "a57e",
                "cf00", "8930", "9bce", "0c33"
            ],
            "data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_save_wrong_hash(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "hash": [
                "84c9", "caba", "ff33", "6c42",
                "1234", "b20c", "2ba9", "1ceb",
                "3c61", "9b99", "f0a6", "a57e",
                "cf00", "8930", "9bce", "0c33"
            ],
            "data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
