#![cfg(test)]

use std::net::SocketAddr;

use crate::shared::example_data_entry;
use abacus::data_entry::DataEntry;
use axum::http::HeaderValue;
use reqwest::{Client, Response, StatusCode};
use sqlx::SqlitePool;
use test_log::test;

pub mod shared;
pub mod utils;

async fn save_data_entry(
    addr: &SocketAddr,
    cookie: HeaderValue,
    polling_station_id: u32,
    entry_number: u32,
    data_entry: DataEntry,
) -> Response {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/{entry_number}"
    );
    let res = Client::new()
        .post(&url)
        .header("cookie", cookie)
        .json(&data_entry)
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "{:?}", res.text().await);
    res
}

async fn complete_data_entry(
    addr: &SocketAddr,
    cookie: HeaderValue,
    polling_station_id: u32,
    entry_number: u32,
    data_entry: DataEntry,
) -> Response {
    shared::claim_data_entry(addr, cookie.clone(), polling_station_id, entry_number).await;

    save_data_entry(
        addr,
        cookie.clone(),
        polling_station_id,
        entry_number,
        data_entry,
    )
    .await;

    shared::finalise_data_entry(addr, cookie, polling_station_id, entry_number).await
}

fn data_entry_with_error() -> DataEntry {
    let mut data_entry = shared::example_data_entry(None);
    // Introduce error F.101
    data_entry.data.recounted = None;
    data_entry
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
async fn test_polling_station_data_entry_resolve_errors_discard(pool: SqlitePool) {
    let addr = utils::serve_api(pool.clone()).await;

    let typist = shared::typist_login(&addr).await;
    let res = complete_data_entry(&addr, typist, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "FirstEntryHasErrors");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = resolve_errors(&addr, &coordinator, 1, "discard_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let polling_station_data_entry: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        polling_station_data_entry["state"]["status"],
        "FirstEntryNotStarted"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_resume(pool: SqlitePool) {
    let addr = utils::serve_api(pool.clone()).await;

    let typist = shared::typist_login(&addr).await;
    let res = complete_data_entry(&addr, typist, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "FirstEntryHasErrors");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = resolve_errors(&addr, &coordinator, 1, "resume_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let polling_station_data_entry: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        polling_station_data_entry["state"]["status"],
        "FirstEntryInProgress"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_wrong_state(pool: SqlitePool) {
    let addr = utils::serve_api(pool.clone()).await;

    let typist = shared::typist_login(&addr).await;
    shared::claim_data_entry(&addr, typist, 1, 1).await;

    let coordinator = shared::coordinator_login(&addr).await;
    let response = resolve_errors(&addr, &coordinator, 1, "discard_first_entry").await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_errors_wrong_action(pool: SqlitePool) {
    let addr = utils::serve_api(pool.clone()).await;

    let typist = shared::typist_login(&addr).await;
    let res = complete_data_entry(&addr, typist, 1, 1, data_entry_with_error()).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "FirstEntryHasErrors");

    let coordinator = shared::coordinator_login(&addr).await;
    let response = resolve_errors(&addr, &coordinator, 1, "make_tea").await;
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_differences(pool: SqlitePool) {
    let addr = utils::serve_api(pool.clone()).await;

    let first_data_entry = example_data_entry(None);
    let mut second_data_entry = first_data_entry.clone();
    second_data_entry.data.voters_counts.poll_card_count =
        first_data_entry.data.voters_counts.poll_card_count - 2;
    second_data_entry.data.voters_counts.proxy_certificate_count =
        first_data_entry.data.voters_counts.poll_card_count + 2;

    let typist = shared::typist_login(&addr).await;
    let res = complete_data_entry(&addr, typist, 1, 1, first_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "SecondEntryNotStarted");

    let typist2 = shared::typist2_login(&addr).await;
    let res = complete_data_entry(&addr, typist2, 1, 2, second_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "EntriesDifferent");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = resolve_differences(&addr, &coordinator, 1, "keep_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["state"]["status"], "SecondEntryNotStarted");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_resolve_differences_then_resolve_errors(pool: SqlitePool) {
    let addr = utils::serve_api(pool.clone()).await;

    let first_data_entry = example_data_entry(None);
    let mut second_data_entry = first_data_entry.clone();
    second_data_entry.data.voters_counts.poll_card_count = 0;

    let typist = shared::typist_login(&addr).await;
    let res = complete_data_entry(&addr, typist, 1, 1, first_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "SecondEntryNotStarted");

    let typist2 = shared::typist2_login(&addr).await;
    let res = complete_data_entry(&addr, typist2, 1, 2, second_data_entry).await;
    let data_entry_status: serde_json::Value = res.json().await.unwrap();
    assert_eq!(data_entry_status["status"], "EntriesDifferent");

    let coordinator = shared::coordinator_login(&addr).await;
    let res = resolve_differences(&addr, &coordinator, 1, "keep_second_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let body: serde_json::Value = res.json().await.unwrap();
    assert_eq!(body["state"]["status"], "FirstEntryHasErrors");

    let res = resolve_errors(&addr, &coordinator, 1, "resume_first_entry").await;
    assert_eq!(res.status(), StatusCode::OK);
    let polling_station_data_entry: serde_json::Value = res.json().await.unwrap();
    assert_eq!(
        polling_station_data_entry["state"]["status"],
        "FirstEntryInProgress"
    );
}
