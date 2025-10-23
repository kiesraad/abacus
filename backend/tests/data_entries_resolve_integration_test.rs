#![cfg(test)]

use std::net::SocketAddr;

use abacus::{committee_session::status::CommitteeSessionStatus, data_entry::DataEntry};
use axum::http::HeaderValue;
use reqwest::{Client, Response, StatusCode};
use sqlx::SqlitePool;
use test_log::test;

pub mod shared;
pub mod utils;

fn data_entry_with_error() -> DataEntry {
    let mut data_entry = shared::example_data_entry(None);
    // Introduce error F.203
    data_entry
        .data
        .as_cso_first_session_mut()
        .unwrap()
        .votes_counts
        .invalid_votes_count = 2;
    data_entry
}

fn different_data_entries() -> (DataEntry, DataEntry) {
    let first_data_entry = shared::example_data_entry(None);

    let mut second_data_entry = first_data_entry.clone();
    second_data_entry
        .data
        .as_cso_first_session_mut()
        .unwrap()
        .voters_counts
        .poll_card_count -= 2;
    second_data_entry
        .data
        .as_cso_first_session_mut()
        .unwrap()
        .voters_counts
        .proxy_certificate_count += 2;

    (first_data_entry, second_data_entry)
}

async fn get_resolve_errors(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
) -> Response {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/resolve_errors"
    );
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
    let addr = utils::serve_api(pool.clone()).await;

    let typist_cookie = shared::typist_login(&addr).await;
    let res =
        shared::complete_data_entry(&addr, &typist_cookie, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_has_errors");

    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let res = get_resolve_errors(&addr, &coordinator_cookie, 1).await;
    assert_eq!(res.status(), StatusCode::OK);
    let result: serde_json::Value = res.json().await.unwrap();

    assert!(result["first_entry_user_id"].is_number());
    assert!(result["finalised_first_entry"].is_object());
    assert!(result["first_entry_finished_at"].is_string());

    assert_eq!(
        result["validation_results"]["errors"],
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
        result["validation_results"]["warnings"],
        serde_json::json!([])
    );

    shared::change_status_committee_session(
        &addr,
        &coordinator_cookie,
        2,
        2,
        CommitteeSessionStatus::DataEntryPaused,
    )
    .await;

    let res = get_resolve_errors(&addr, &coordinator_cookie, 1).await;
    assert_eq!(res.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_errors_not_found(pool: SqlitePool) {
    let addr = utils::serve_api(pool).await;

    let typist = shared::typist_login(&addr).await;
    let data_entry_no_errors = shared::example_data_entry(None);
    let res = shared::complete_data_entry(&addr, &typist, 1, 1, data_entry_no_errors).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "second_entry_not_started");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = get_resolve_errors(&addr, &coordinator, 1).await;
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_discard(pool: SqlitePool) {
    let addr = utils::serve_api(pool).await;

    let typist = shared::typist_login(&addr).await;
    let res = shared::complete_data_entry(&addr, &typist, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_has_errors");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = resolve_errors(&addr, &coordinator, 1, "discard_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "first_entry_not_started");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_resume(pool: SqlitePool) {
    let addr = utils::serve_api(pool.clone()).await;

    let typist_cookie = shared::typist_login(&addr).await;
    let res =
        shared::complete_data_entry(&addr, &typist_cookie, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_has_errors");

    let coordinator_cookie = shared::coordinator_login(&addr).await;

    shared::change_status_committee_session(
        &addr,
        &coordinator_cookie,
        2,
        2,
        CommitteeSessionStatus::DataEntryPaused,
    )
    .await;

    let res = resolve_errors(&addr, &coordinator_cookie, 1, "resume_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "first_entry_in_progress");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_wrong_state(pool: SqlitePool) {
    let addr = utils::serve_api(pool).await;

    let typist = shared::typist_login(&addr).await;
    shared::claim_data_entry(&addr, &typist, 1, 1).await;

    let coordinator = shared::coordinator_login(&addr).await;
    let response = resolve_errors(&addr, &coordinator, 1, "discard_first_entry").await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_wrong_action(pool: SqlitePool) {
    let addr = utils::serve_api(pool).await;

    let typist = shared::typist_login(&addr).await;
    let res = shared::complete_data_entry(&addr, &typist, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "first_entry_has_errors");

    let coordinator = shared::coordinator_login(&addr).await;
    let response = resolve_errors(&addr, &coordinator, 1, "make_tea").await;
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_get_differences(pool: SqlitePool) {
    let addr = utils::serve_api(pool.clone()).await;
    let (first_entry, second_entry) = different_data_entries();

    let typist_cookie = shared::typist_login(&addr).await;
    shared::complete_data_entry(&addr, &typist_cookie, 1, 1, first_entry).await;

    let typist2_cookie = shared::typist2_login(&addr).await;
    let res = shared::complete_data_entry(&addr, &typist2_cookie, 1, 2, second_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "entries_different");

    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let res = get_resolve_differences(&addr, &coordinator_cookie, 1).await;
    assert_eq!(res.status(), StatusCode::OK);
    let result: serde_json::Value = res.json().await.unwrap();

    assert!(result["first_entry_user_id"].is_number());
    assert!(result["second_entry_user_id"].is_number());
    assert_ne!(
        result["first_entry"]["voters_counts"]["poll_card_count"],
        result["second_entry"]["voters_counts"]["poll_card_count"]
    );

    shared::change_status_committee_session(
        &addr,
        &coordinator_cookie,
        2,
        2,
        CommitteeSessionStatus::DataEntryPaused,
    )
    .await;

    let res = get_resolve_differences(&addr, &coordinator_cookie, 1).await;
    assert_eq!(res.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_differences_not_found(pool: SqlitePool) {
    let addr = utils::serve_api(pool).await;

    let typist = shared::typist_login(&addr).await;
    let data_entry = shared::example_data_entry(None);
    let res = shared::complete_data_entry(&addr, &typist, 1, 1, data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "second_entry_not_started");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = get_resolve_differences(&addr, &coordinator, 1).await;
    assert_eq!(res.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_differences(pool: SqlitePool) {
    let addr = utils::serve_api(pool).await;

    let first_data_entry = shared::example_data_entry(None);
    let mut second_data_entry = first_data_entry.clone();
    second_data_entry
        .data
        .as_cso_first_session_mut()
        .unwrap()
        .voters_counts
        .poll_card_count = first_data_entry
        .data
        .as_cso_first_session()
        .unwrap()
        .voters_counts
        .poll_card_count
        - 2;
    second_data_entry
        .data
        .as_cso_first_session_mut()
        .unwrap()
        .voters_counts
        .proxy_certificate_count = first_data_entry
        .data
        .as_cso_first_session()
        .unwrap()
        .voters_counts
        .poll_card_count
        + 2;

    let typist = shared::typist_login(&addr).await;
    let res = shared::complete_data_entry(&addr, &typist, 1, 1, first_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "second_entry_not_started");

    let typist2 = shared::typist2_login(&addr).await;
    let res = shared::complete_data_entry(&addr, &typist2, 1, 2, second_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "entries_different");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = resolve_differences(&addr, &coordinator, 1, "keep_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "second_entry_not_started");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_differences_then_resolve_errors(pool: SqlitePool) {
    let addr = utils::serve_api(pool).await;

    let first_data_entry = shared::example_data_entry(None);
    let mut second_data_entry = first_data_entry.clone();
    second_data_entry
        .data
        .as_cso_first_session_mut()
        .unwrap()
        .voters_counts
        .poll_card_count = 0;

    let typist = shared::typist_login(&addr).await;
    let res = shared::complete_data_entry(&addr, &typist, 1, 1, first_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "second_entry_not_started");

    let typist2 = shared::typist2_login(&addr).await;
    let res = shared::complete_data_entry(&addr, &typist2, 1, 2, second_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "entries_different");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = resolve_differences(&addr, &coordinator, 1, "keep_second_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "first_entry_has_errors");

    let res = resolve_errors(&addr, &coordinator, 1, "resume_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["status"], "first_entry_in_progress");
}
