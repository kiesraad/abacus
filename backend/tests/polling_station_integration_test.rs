#![cfg(test)]

use std::net::SocketAddr;

use abacus::{ErrorResponse, committee_session::status::CommitteeSessionStatus};
use axum::http::StatusCode;
use reqwest::Response;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

async fn get_polling_station(
    addr: &SocketAddr,
    election_id: u32,
    polling_station_id: u32,
) -> Response {
    let url =
        format!("http://{addr}/api/elections/{election_id}/polling_stations/{polling_station_id}");
    let coordinator_cookie = shared::coordinator_login(addr).await;
    reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap()
}

async fn import_polling_stations(
    addr: &SocketAddr,
    election_id: u32,
    file_name: &str,
    polling_stations: serde_json::Value,
) -> Response {
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations/import");
    let coordinator_cookie = shared::coordinator_login(addr).await;
    reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({
            "file_name": file_name,
            "polling_stations": polling_stations,
        }))
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap()
}

async fn import_validate_polling_stations(
    addr: &SocketAddr,
    election_id: u32,
    data: &str,
) -> Response {
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations/validate-import");
    let coordinator_cookie = shared::coordinator_login(addr).await;
    reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({
            "data": data,
        }))
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap()
}

async fn update_polling_station(
    addr: &SocketAddr,
    election_id: u32,
    polling_station_id: u32,
    body: serde_json::Value,
) -> Response {
    let url =
        format!("http://{addr}/api/elections/{election_id}/polling_stations/{polling_station_id}");
    let coordinator_cookie = shared::coordinator_login(addr).await;
    reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

async fn delete_polling_station(
    addr: &SocketAddr,
    election_id: u32,
    polling_station_id: u32,
) -> Response {
    let url =
        format!("http://{addr}/api/elections/{election_id}/polling_stations/{polling_station_id}");
    let coordinator_cookie = shared::coordinator_login(addr).await;
    reqwest::Client::new()
        .delete(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap()
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_listing(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/7/polling_stations");
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
async fn test_creation_for_committee_session_with_created_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 6;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let response = shared::create_polling_station(&addr, election_id, 5).await;

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
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_get(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let response = get_polling_station(&addr, 7, 742).await;
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_session_id"], 704);
    assert_eq!(body["id_prev_session"], 732);
    assert_eq!(body["name"], "TestB");
    assert_eq!(body["polling_station_type"], "FixedLocation");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_get_from_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let response = get_polling_station(&addr, 5, 8).await;

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_update_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 7;
    let polling_station_id = 742;

    let response = update_polling_station(
        &addr,
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
    let response = get_polling_station(&addr, election_id, polling_station_id).await;
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["name"], "Testverandering");
    assert_eq!(body["address"], "Teststraat 2a");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_update_empty_type_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let response = update_polling_station(
        &addr,
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

    let response = update_polling_station(
        &addr,
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

    let response = update_polling_station(
        &addr,
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 2;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let response = delete_polling_station(&addr, election_id, 2).await;

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let gone = get_polling_station(&addr, election_id, 2).await;
    assert_eq!(
        gone.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );

    // Remove last polling station for election
    let response = delete_polling_station(&addr, election_id, 1).await;
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_with_data_entry_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let typist_cookie = shared::typist_login(&addr).await;
    shared::claim_data_entry(&addr, &typist_cookie, 2, 1).await;
    shared::save_data_entry(
        &addr,
        &typist_cookie,
        2,
        1,
        shared::example_data_entry(None),
    )
    .await;

    let response = delete_polling_station(&addr, 2, 2).await;

    assert_eq!(
        response.status(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "Unexpected response status"
    );
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Invalid data");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_with_results_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    shared::create_result(&addr, 1, 2).await;

    let response = delete_polling_station(&addr, 2, 1).await;

    assert_eq!(
        response.status(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "Unexpected response status"
    );
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Invalid data");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_delete_from_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let response = delete_polling_station(&addr, 5, 8).await;

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_delete_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let response = delete_polling_station(&addr, 2, 40404).await;

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_non_unique_number(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 2;

    let response = shared::create_polling_station(&addr, election_id, 33).await;

    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_list_invalid_election(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/1234/polling_stations");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_import_validate_correct_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let response = import_validate_polling_stations(
        &addr,
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
    let response = import_validate_polling_stations(
        &addr,
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
    let response =
        import_polling_stations(&addr, 6, "eml110b_test.eml.xml", serde_json::Value::Null).await;

    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_import_correct_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 6;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let validate_response = import_validate_polling_stations(
        &addr,
        election_id,
        include_str!("../src/eml/tests/eml110b_test.eml.xml"),
    )
    .await;
    assert_eq!(validate_response.status(), StatusCode::OK);
    let body: serde_json::Value = validate_response.json().await.unwrap();

    let import_response = import_polling_stations(
        &addr,
        6,
        "eml110b_test.eml.xml",
        body["polling_stations"].clone(),
    )
    .await;
    assert_eq!(import_response.status(), StatusCode::OK);

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
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
    let cookie = shared::coordinator_login(addr).await;
    let election_id = 2;

    shared::create_result(addr, 1, election_id).await;
    shared::create_result(addr, 2, election_id).await;

    shared::change_status_committee_session(
        addr,
        &cookie,
        election_id,
        2,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        shared::get_election_committee_session(addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    let status = action().await.status();
    assert!(status == StatusCode::OK || status == StatusCode::CREATED);

    let committee_session =
        shared::get_election_committee_session(addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_finished_to_in_progress_on_create(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    check_finished_to_in_progress_on(&addr, || shared::create_polling_station(&addr, 2, 35)).await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_finished_to_in_progress_on_import(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    check_finished_to_in_progress_on(&addr, || async {
        let validate_response = import_validate_polling_stations(
            &addr,
            2,
            include_str!("../src/eml/tests/eml110b_1_station.eml.xml"),
        )
        .await;
        let body: serde_json::Value = validate_response.json().await.unwrap();

        import_polling_stations(
            &addr,
            2,
            "eml110b_1_station.eml.xml",
            body["polling_stations"].clone(),
        )
        .await
    })
    .await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_finished_to_in_progress_on_update(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    check_finished_to_in_progress_on(&addr, || {
        update_polling_station(
            &addr,
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
