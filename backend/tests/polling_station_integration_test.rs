#![cfg(test)]

use std::net::SocketAddr;

use crate::{
    shared::{
        admin_login, change_status_committee_session, claim_data_entry, coordinator_login,
        create_investigation, create_polling_station, create_result, example_data_entry,
        get_election, get_election_committee_session, get_statuses, save_data_entry, typist_login,
    },
    utils::serve_api,
};
use abacus::committee_session::status::CommitteeSessionStatus;
use axum::http::StatusCode;
use hyper::http::HeaderValue;
use reqwest::Response;
use sqlx::SqlitePool;
use test_log::test;

pub mod shared;
pub mod utils;

async fn get_polling_station(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    election_id: u32,
    polling_station_id: u32,
) -> Response {
    let url =
        format!("http://{addr}/api/elections/{election_id}/polling_stations/{polling_station_id}");
    reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap()
}

async fn import_polling_stations(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    election_id: u32,
    file_name: &str,
    polling_stations: serde_json::Value,
) -> Response {
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations/import");
    reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({
            "file_name": file_name,
            "polling_stations": polling_stations,
        }))
        .header("cookie", cookie)
        .send()
        .await
        .unwrap()
}

async fn import_validate_polling_stations(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    election_id: u32,
    data: &str,
) -> Response {
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations/validate-import");
    reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({
            "data": data,
        }))
        .header("cookie", cookie)
        .send()
        .await
        .unwrap()
}

async fn update_polling_station(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    election_id: u32,
    polling_station_id: u32,
    body: serde_json::Value,
) -> Response {
    let url =
        format!("http://{addr}/api/elections/{election_id}/polling_stations/{polling_station_id}");
    reqwest::Client::new()
        .put(&url)
        .header("cookie", cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

async fn delete_polling_station(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    election_id: u32,
    polling_station_id: u32,
) -> Response {
    let url =
        format!("http://{addr}/api/elections/{election_id}/polling_stations/{polling_station_id}");
    reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap()
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_listing(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/7/polling_stations");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response and make sure they are from the last committee session
    let body: serde_json::Value = response.json().await.unwrap();
    let polling_stations = body["polling_stations"].as_array().unwrap();
    assert_eq!(polling_stations.len(), 2);
    let map = polling_stations
        .iter()
        .map(|ps| (ps["id"].as_u64().unwrap(), ps["id_prev_session"].as_u64()))
        .collect::<Vec<(u64, Option<u64>)>>();
    assert_eq!(map, vec![(741, Some(731)), (742, Some(732))]);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_creation_for_committee_session_with_created_and_not_started_status_as_coordinator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 6;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = create_polling_station(&addr, &coordinator_cookie, election_id, 1).await;

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_session_id"], committee_session.id);
    assert_eq!(body["name"], "Test polling station");
    assert_eq!(body["polling_station_type"], "FixedLocation");

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    // Create another polling station
    let response = create_polling_station(&addr, &coordinator_cookie, election_id, 2).await;

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_creation_for_committee_session_with_created_and_not_started_status_as_administrator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = admin_login(&addr).await;
    let election_id = 6;

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = create_polling_station(&addr, &admin_cookie, election_id, 1).await;

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_session_id"], committee_session.id);
    assert_eq!(body["name"], "Test polling station");
    assert_eq!(body["polling_station_type"], "FixedLocation");

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    // Create another polling station
    let response = create_polling_station(&addr, &admin_cookie, election_id, 2).await;

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_4", "users"))))]
async fn test_creation_for_committee_session_with_in_progress_status_as_coordinator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 4;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let response = create_polling_station(&addr, &coordinator_cookie, election_id, 5).await;

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_session_id"], committee_session.id);
    assert_eq!(body["name"], "Test polling station");
    assert_eq!(body["polling_station_type"], "FixedLocation");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_4", "users"))))]
async fn test_creation_for_committee_session_with_in_progress_status_as_administrator_fails(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = admin_login(&addr).await;
    let election_id = 4;

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let response = create_polling_station(&addr, &admin_cookie, election_id, 5).await;

    assert_eq!(
        response.status(),
        StatusCode::FORBIDDEN,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_get(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = get_polling_station(&addr, &coordinator_cookie, 7, 742).await;
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_session_id"], 704);
    assert_eq!(body["id_prev_session"], 732);
    assert_eq!(body["name"], "TestB");
    assert_eq!(body["polling_station_type"], "FixedLocation");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_get_from_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = get_polling_station(&addr, &coordinator_cookie, 5, 8).await;

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_update_for_committee_session_with_created_status_as_coordinator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 7;
    let polling_station_id = 741;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = update_polling_station(
        &addr,
        &coordinator_cookie,
        election_id,
        polling_station_id,
        serde_json::json!({
            "name": "Testverandering",
            "number_of_voters": 2000,
            "polling_station_type": "Special",
            "address": "Teststraat 2a",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    // Validate that the changes are persisted
    let response =
        get_polling_station(&addr, &coordinator_cookie, election_id, polling_station_id).await;
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_update_for_committee_session_with_created_status_as_administrator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = admin_login(&addr).await;
    let election_id = 7;
    let polling_station_id = 741;

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = update_polling_station(
        &addr,
        &admin_cookie,
        election_id,
        polling_station_id,
        serde_json::json!({
            "name": "Testverandering",
            "number_of_voters": 2000,
            "polling_station_type": "Special",
            "address": "Teststraat 2a",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    // Validate that the changes are persisted
    let response = get_polling_station(&addr, &admin_cookie, election_id, polling_station_id).await;
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_update_for_committee_session_with_not_started_status_as_coordinator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 6;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = create_polling_station(&addr, &coordinator_cookie, election_id, 1).await;
    let body: serde_json::Value = response.json().await.unwrap();
    let polling_station_id = u32::try_from(body.get("id").unwrap().as_u64().unwrap()).unwrap();

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    let response = update_polling_station(
        &addr,
        &coordinator_cookie,
        election_id,
        polling_station_id,
        serde_json::json!({
            "name": "Testverandering",
            "number_of_voters": 2000,
            "polling_station_type": "Special",
            "address": "Teststraat 2a",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    // Validate that the changes are persisted
    let response =
        get_polling_station(&addr, &coordinator_cookie, election_id, polling_station_id).await;
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_update_for_committee_session_with_not_started_status_as_administrator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = admin_login(&addr).await;
    let election_id = 6;

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = create_polling_station(&addr, &admin_cookie, election_id, 1).await;
    let body: serde_json::Value = response.json().await.unwrap();
    let polling_station_id = u32::try_from(body.get("id").unwrap().as_u64().unwrap()).unwrap();

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    let response = update_polling_station(
        &addr,
        &admin_cookie,
        election_id,
        polling_station_id,
        serde_json::json!({
            "name": "Testverandering",
            "number_of_voters": 2000,
            "polling_station_type": "Special",
            "address": "Teststraat 2a",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    // Validate that the changes are persisted
    let response = get_polling_station(&addr, &admin_cookie, election_id, polling_station_id).await;
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_4", "users"))))]
async fn test_update_for_committee_session_with_in_progress_status_as_coordinator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 4;
    let polling_station_id = 7;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let response = update_polling_station(
        &addr,
        &coordinator_cookie,
        election_id,
        polling_station_id,
        serde_json::json!({
            "name": "Testverandering",
            "number_of_voters": 2000,
            "polling_station_type": "Special",
            "address": "Teststraat 2a",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");

    // Validate that the changes are persisted
    let response =
        get_polling_station(&addr, &coordinator_cookie, election_id, polling_station_id).await;
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_4", "users"))))]
async fn test_update_for_committee_session_with_in_progress_status_as_administrator_fails(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = admin_login(&addr).await;
    let election_id = 4;
    let polling_station_id = 7;

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let response = update_polling_station(
        &addr,
        &admin_cookie,
        election_id,
        polling_station_id,
        serde_json::json!({
            "name": "Testverandering",
            "number_of_voters": 2000,
            "polling_station_type": "Special",
            "address": "Teststraat 2a",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::FORBIDDEN,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_update_empty_type_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = update_polling_station(
        &addr,
        &coordinator_cookie,
        2,
        2,
        serde_json::json!({
            "name": "Testverandering",
            "number": 34,
            "number_of_voters": 2000,
            "address": "Teststraat 2a",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["polling_station_type"], serde_json::Value::Null);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_update_from_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = update_polling_station(
        &addr,
        &coordinator_cookie,
        5,
        8,
        serde_json::json!({
            "name": "Testverandering",
            "number": 34,
            "number_of_voters": 2000,
            "address": "Teststraat 2a",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_update_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = update_polling_station(
        &addr,
        &coordinator_cookie,
        2,
        40404,
        serde_json::json!({
            "name": "Testverandering",
            "number": 34,
            "number_of_voters": 2000,
            "address": "Teststraat 2a",
            "polling_station_type": "Special",
            "postal_code": "1234 QY",
            "locality": "Testdorp",
        }),
    )
    .await;

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_delete_for_committee_session_with_created_status_as_coordinator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 7;
    let polling_station_id = 741;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response =
        delete_polling_station(&addr, &coordinator_cookie, election_id, polling_station_id).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_delete_for_committee_session_with_created_status_as_administrator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = admin_login(&addr).await;
    let election_id = 7;
    let polling_station_id = 741;

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response =
        delete_polling_station(&addr, &admin_cookie, election_id, polling_station_id).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_delete_for_committee_session_with_not_started_status_as_coordinator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 6;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = create_polling_station(&addr, &coordinator_cookie, election_id, 1).await;
    let body: serde_json::Value = response.json().await.unwrap();
    let polling_station_id = u32::try_from(body.get("id").unwrap().as_u64().unwrap()).unwrap();

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    let response =
        delete_polling_station(&addr, &coordinator_cookie, election_id, polling_station_id).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_delete_for_committee_session_with_not_started_status_as_administrator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = admin_login(&addr).await;
    let election_id = 6;

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = create_polling_station(&addr, &admin_cookie, election_id, 1).await;
    let body: serde_json::Value = response.json().await.unwrap();
    let polling_station_id = u32::try_from(body.get("id").unwrap().as_u64().unwrap()).unwrap();

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    let response =
        delete_polling_station(&addr, &admin_cookie, election_id, polling_station_id).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_for_committee_session_with_in_progress_status_as_coordinator_works(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 2;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let response = delete_polling_station(&addr, &coordinator_cookie, election_id, 2).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let gone = get_polling_station(&addr, &coordinator_cookie, election_id, 2).await;
    assert_eq!(
        gone.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );

    // Remove last polling station for election
    let response = delete_polling_station(&addr, &coordinator_cookie, election_id, 1).await;
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_for_committee_session_with_in_progress_status_as_administrator_fails(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let admin_cookie = admin_login(&addr).await;
    let election_id = 2;

    let committee_session = get_election_committee_session(&addr, &admin_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let response = delete_polling_station(&addr, &admin_cookie, election_id, 2).await;

    assert_eq!(
        response.status(),
        StatusCode::FORBIDDEN,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_with_data_entry_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 2;
    let polling_station_id = 1;

    let typist_cookie = typist_login(&addr).await;
    claim_data_entry(&addr, &typist_cookie, polling_station_id, 1).await;
    save_data_entry(
        &addr,
        &typist_cookie,
        polling_station_id,
        1,
        example_data_entry(None),
    )
    .await;

    let coordinator_cookie = coordinator_login(&addr).await;
    let statuses = get_statuses(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(statuses.len(), 2);

    let response =
        delete_polling_station(&addr, &coordinator_cookie, election_id, polling_station_id).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    // Data entry is deleted
    let statuses = get_statuses(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(statuses.len(), 1);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_with_result_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 2;
    let polling_station_id = 1;

    let coordinator_cookie = coordinator_login(&addr).await;
    create_result(&addr, polling_station_id, election_id).await;
    let statuses = get_statuses(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(statuses.len(), 2);

    let response =
        delete_polling_station(&addr, &coordinator_cookie, election_id, polling_station_id).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    // Data entry result is deleted
    let statuses = get_statuses(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(statuses.len(), 1);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_delete_with_investigation_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 5;
    let polling_station_id = 9;

    let coordinator_cookie = coordinator_login(&addr).await;
    assert_eq!(
        create_investigation(&addr, polling_station_id)
            .await
            .status(),
        StatusCode::CREATED
    );
    let election_details = get_election(&addr, election_id).await;
    assert_eq!(election_details.investigations.len(), 2);

    let response =
        delete_polling_station(&addr, &coordinator_cookie, election_id, polling_station_id).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let election_details = get_election(&addr, election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_delete_from_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = delete_polling_station(&addr, &coordinator_cookie, 5, 8).await;

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let response = delete_polling_station(&addr, &coordinator_cookie, 2, 40404).await;

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_non_unique_number(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 2;

    let response = create_polling_station(&addr, &coordinator_cookie, election_id, 33).await;

    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_list_invalid_election(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/1234/polling_stations");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_import_validate_correct_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let response = import_validate_polling_stations(
        &addr,
        &coordinator_cookie,
        2,
        include_str!("../src/eml/tests/eml110b_test.eml.xml"),
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["polling_stations"].as_array().unwrap().len(), 420);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_import_validate_wrong_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let response = import_validate_polling_stations(
        &addr,
        &coordinator_cookie,
        2,
        include_str!("../src/eml/tests/eml110a_test.eml.xml"),
    )
    .await;

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_import_missing_data(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let response = import_polling_stations(
        &addr,
        &coordinator_cookie,
        6,
        "eml110b_test.eml.xml",
        serde_json::Value::Null,
    )
    .await;

    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_import_fails_when_polling_stations_exist(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 7;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let validate_response = import_validate_polling_stations(
        &addr,
        &coordinator_cookie,
        election_id,
        include_str!("../src/eml/tests/eml110b_test.eml.xml"),
    )
    .await;
    assert_eq!(validate_response.status(), StatusCode::OK);
    let body: serde_json::Value = validate_response.json().await.unwrap();

    let import_response = import_polling_stations(
        &addr,
        &coordinator_cookie,
        election_id,
        "eml110b_test.eml.xml",
        body["polling_stations"].clone(),
    )
    .await;
    assert_eq!(import_response.status(), StatusCode::FORBIDDEN);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_import_correct_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 6;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let validate_response = import_validate_polling_stations(
        &addr,
        &coordinator_cookie,
        election_id,
        include_str!("../src/eml/tests/eml110b_test.eml.xml"),
    )
    .await;
    assert_eq!(validate_response.status(), StatusCode::OK);
    let body: serde_json::Value = validate_response.json().await.unwrap();

    let import_response = import_polling_stations(
        &addr,
        &coordinator_cookie,
        election_id,
        "eml110b_test.eml.xml",
        body["polling_stations"].clone(),
    )
    .await;
    assert_eq!(import_response.status(), StatusCode::OK);

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}

async fn check_finished_to_in_progress_on<F, Fut>(addr: &SocketAddr, action: F)
where
    F: FnOnce() -> Fut,
    Fut: Future<Output = Response>,
{
    let coordinator_cookie = coordinator_login(addr).await;
    let election_id = 2;

    create_result(addr, 1, election_id).await;
    create_result(addr, 2, election_id).await;

    change_status_committee_session(
        addr,
        &coordinator_cookie,
        election_id,
        2,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        get_election_committee_session(addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    let status = action().await.status();
    assert!(status == StatusCode::OK || status == StatusCode::CREATED);

    let committee_session =
        get_election_committee_session(addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_finished_to_in_progress_on_create(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    check_finished_to_in_progress_on(&addr, || {
        create_polling_station(&addr, &coordinator_cookie, 2, 35)
    })
    .await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_finished_to_in_progress_on_update(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    check_finished_to_in_progress_on(&addr, || {
        update_polling_station(
            &addr,
            &coordinator_cookie,
            2,
            1,
            serde_json::json!({
                "name": "Testverandering",
                "number_of_voters": 2000,
                "polling_station_type": "Special",
                "address": "Teststraat 2a",
                "postal_code": "1234 QY",
                "locality": "Testdorp",
            }),
        )
    })
    .await;
}
