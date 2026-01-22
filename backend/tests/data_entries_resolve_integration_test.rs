#![cfg(test)]

use std::net::SocketAddr;

use axum::http::HeaderValue;
use reqwest::{Client, Response, StatusCode};
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        change_status_committee_session, claim_data_entry, complete_data_entry, coordinator_login,
        example_data_entry, typist_login, typist2_login,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

pub fn data_entry_with_error() -> serde_json::Value {
    let mut data_entry = example_data_entry(None);
    // Introduce error F.203
    data_entry["data"]["votes_counts"]["invalid_votes_count"] = serde_json::Value::from(2);
    data_entry
}

pub fn different_data_entries() -> (serde_json::Value, serde_json::Value) {
    let first_data_entry = example_data_entry(None);

    let mut second_data_entry = first_data_entry.clone();
    let poll_card_count = second_data_entry["data"]["voters_counts"]["poll_card_count"]
        .as_u64()
        .unwrap();
    let proxy_certificate_count =
        second_data_entry["data"]["voters_counts"]["proxy_certificate_count"]
            .as_u64()
            .unwrap();
    second_data_entry["data"]["voters_counts"]["poll_card_count"] =
        serde_json::Value::from(poll_card_count - 2);
    second_data_entry["data"]["voters_counts"]["proxy_certificate_count"] =
        serde_json::Value::from(proxy_certificate_count + 2);

    (first_data_entry, second_data_entry)
}

async fn get_data_entry(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
) -> Response {
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/data_entries/get");
    Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap()
}

async fn resolve_errors(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
    action: &str,
) -> Response {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/resolve_errors"
    );
    Client::new()
        .post(&url)
        .header("cookie", cookie)
        .json(action)
        .send()
        .await
        .unwrap()
}

async fn get_resolve_differences(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
) -> Response {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/resolve_differences"
    );
    Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap()
}

async fn resolve_differences(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
    action: &str,
) -> Response {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/resolve_differences"
    );
    Client::new()
        .post(&url)
        .header("cookie", cookie)
        .json(action)
        .send()
        .await
        .unwrap()
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_get_errors(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;

    let typist_cookie = typist_login(&addr).await;
    let res = complete_data_entry(&addr, &typist_cookie, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_has_errors");

    let coordinator_cookie = coordinator_login(&addr).await;
    let response = get_data_entry(&addr, &coordinator_cookie, 1).await;
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();

    assert_eq!(
        body["validation_results"]["errors"],
        serde_json::json!([{
            "code": "F203",
            "fields": [
                "data.votes_counts.total_votes_candidates_count",
                "data.votes_counts.blank_votes_count",
                "data.votes_counts.invalid_votes_count",
                "data.votes_counts.total_votes_cast_count",
            ]
        }])
    );
    assert_eq!(
        body["validation_results"]["warnings"],
        serde_json::json!([])
    );

    change_status_committee_session(&addr, &coordinator_cookie, 2, 2, "paused").await;

    let response = get_data_entry(&addr, &coordinator_cookie, 1).await;
    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_no_errors(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let typist = typist_login(&addr).await;
    let data_entry_no_errors = example_data_entry(None);
    let res = complete_data_entry(&addr, &typist, 1, 1, data_entry_no_errors).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_finalised");

    let coordinator_cookie = coordinator_login(&addr).await;
    let res = get_data_entry(&addr, &coordinator_cookie, 1).await;
    assert_eq!(res.status(), StatusCode::OK);

    let body: serde_json::Value = res.json().await.unwrap();
    assert!(
        body["validation_results"]["errors"]
            .as_array()
            .unwrap()
            .is_empty()
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_discard(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let typist = typist_login(&addr).await;
    let res = complete_data_entry(&addr, &typist, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_has_errors");

    let coordinator_cookie = coordinator_login(&addr).await;
    let res = resolve_errors(&addr, &coordinator_cookie, 1, "discard_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "empty");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_resume(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;

    let typist_cookie = typist_login(&addr).await;
    let res = complete_data_entry(&addr, &typist_cookie, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_has_errors");

    let coordinator_cookie = coordinator_login(&addr).await;

    change_status_committee_session(&addr, &coordinator_cookie, 2, 2, "paused").await;

    let res = resolve_errors(&addr, &coordinator_cookie, 1, "resume_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "first_entry_in_progress");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_wrong_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let typist = typist_login(&addr).await;
    claim_data_entry(&addr, &typist, 1, 1).await;

    let coordinator_cookie = coordinator_login(&addr).await;
    let response = resolve_errors(&addr, &coordinator_cookie, 1, "discard_first_entry").await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_wrong_action(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let typist = typist_login(&addr).await;
    let res = complete_data_entry(&addr, &typist, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_has_errors");

    let coordinator_cookie = coordinator_login(&addr).await;
    let response = resolve_errors(&addr, &coordinator_cookie, 1, "make_tea").await;
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_get_differences(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let (first_entry, second_entry) = different_data_entries();

    let typist_cookie = typist_login(&addr).await;
    complete_data_entry(&addr, &typist_cookie, 1, 1, first_entry).await;

    let typist2_cookie = typist2_login(&addr).await;
    let res = complete_data_entry(&addr, &typist2_cookie, 1, 2, second_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "entries_different");

    let coordinator_cookie = coordinator_login(&addr).await;
    let res = get_resolve_differences(&addr, &coordinator_cookie, 1).await;
    assert_eq!(res.status(), StatusCode::OK);
    let result: serde_json::Value = res.json().await.unwrap();

    assert!(result["first_entry_user_id"].is_number());
    assert!(result["second_entry_user_id"].is_number());
    assert_ne!(
        result["first_entry"]["voters_counts"]["poll_card_count"],
        result["second_entry"]["voters_counts"]["poll_card_count"]
    );

    change_status_committee_session(&addr, &coordinator_cookie, 2, 2, "paused").await;

    let res = get_resolve_differences(&addr, &coordinator_cookie, 1).await;
    assert_eq!(res.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_differences_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let typist = typist_login(&addr).await;
    let data_entry = example_data_entry(None);
    let res = complete_data_entry(&addr, &typist, 1, 1, data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_finalised");

    let coordinator_cookie = coordinator_login(&addr).await;
    let res = get_resolve_differences(&addr, &coordinator_cookie, 1).await;
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_differences(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let first_data_entry = example_data_entry(None);
    let mut second_data_entry = first_data_entry.clone();
    second_data_entry["data"]["voters_counts"]["poll_card_count"] = serde_json::Value::from(
        first_data_entry["data"]["voters_counts"]["poll_card_count"]
            .as_u64()
            .unwrap()
            - 2,
    );
    second_data_entry["data"]["voters_counts"]["proxy_certificate_count"] = serde_json::Value::from(
        first_data_entry["data"]["voters_counts"]["poll_card_count"]
            .as_u64()
            .unwrap()
            + 2,
    );

    let typist = typist_login(&addr).await;
    let res = complete_data_entry(&addr, &typist, 1, 1, first_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_finalised");

    let typist2 = typist2_login(&addr).await;
    let res = complete_data_entry(&addr, &typist2, 1, 2, second_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "entries_different");

    let coordinator_cookie = coordinator_login(&addr).await;
    let res = resolve_differences(&addr, &coordinator_cookie, 1, "keep_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "first_entry_finalised");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_differences_then_resolve_errors(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let first_data_entry = example_data_entry(None);
    let mut second_data_entry = first_data_entry.clone();
    second_data_entry["data"]["voters_counts"]["poll_card_count"] = serde_json::Value::from(0);

    let typist = typist_login(&addr).await;
    let res = complete_data_entry(&addr, &typist, 1, 1, first_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_finalised");

    let typist2 = typist2_login(&addr).await;
    let res = complete_data_entry(&addr, &typist2, 1, 2, second_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "entries_different");

    let coordinator_cookie = coordinator_login(&addr).await;
    let res = resolve_differences(&addr, &coordinator_cookie, 1, "keep_second_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "first_entry_has_errors");

    let res = resolve_errors(&addr, &coordinator_cookie, 1, "resume_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "first_entry_in_progress");
}
