#![cfg(test)]

use abacus::{
    ErrorResponse,
    committee_session::status::CommitteeSessionStatus,
    polling_station::{
        PollingStation, PollingStationListResponse, PollingStationRequest,
        PollingStationRequestListResponse, PollingStationType, PollingStationsRequest,
    },
};
use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_listing(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations");
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
    let body: PollingStationListResponse = response.json().await.unwrap();
    assert_eq!(body.polling_stations.len(), 2);
    assert!(
        body.polling_stations
            .iter()
            .any(|ps| ps.name == "Op Rolletjes")
    )
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_polling_station_creation_for_committee_session_with_created_status(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 6;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&PollingStationRequest {
            name: "New Polling Station".to_string(),
            number: 5,
            number_of_voters: Some(426),
            polling_station_type: Some(PollingStationType::FixedLocation),
            address: "Teststraat 2a".to_string(),
            postal_code: "1234 QY".to_string(),
            locality: "Heemdamseburg".to_string(),
        })
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: PollingStation = response.json().await.unwrap();
    assert_eq!(body.committee_session_id, committee_session.id);
    assert_eq!(body.name, "New Polling Station");
    assert_eq!(
        body.polling_station_type,
        Some(PollingStationType::FixedLocation)
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_creation_for_committee_session_with_finished_status(
    pool: SqlitePool,
) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 2;

    shared::change_status_committee_session(
        &addr,
        &cookie,
        2,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&PollingStationRequest {
            name: "New Polling Station".to_string(),
            number: 5,
            number_of_voters: Some(426),
            polling_station_type: Some(PollingStationType::FixedLocation),
            address: "Teststraat 2a".to_string(),
            postal_code: "1234 QY".to_string(),
            locality: "Heemdamseburg".to_string(),
        })
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: PollingStation = response.json().await.unwrap();
    assert_eq!(body.committee_session_id, committee_session.id);
    assert_eq!(body.name, "New Polling Station");
    assert_eq!(
        body.polling_station_type,
        Some(PollingStationType::FixedLocation)
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_get(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 2;
    let committee_session_id = 2;
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations/2");

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
    let body: PollingStation = response.json().await.unwrap();
    assert_eq!(body.committee_session_id, committee_session_id);
    assert_eq!(body.name, "Testplek");
    assert_eq!(body.polling_station_type, Some(PollingStationType::Special));
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_update_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/2");

    let response = reqwest::Client::new()
        .put(&url)
        .json(&PollingStationRequest {
            name: "Testverandering".to_string(),
            number: 34,
            number_of_voters: Some(2000),
            polling_station_type: Some(PollingStationType::Special),
            address: "Teststraat 2a".to_string(),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        })
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let update: PollingStation = response.json().await.unwrap();
    assert_eq!(update.name, "Testverandering");
    assert_eq!(update.address, "Teststraat 2a");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_update_empty_type_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/2");

    let response = reqwest::Client::new()
        .put(&url)
        .json(&PollingStationRequest {
            name: "Testverandering".to_string(),
            number: 34,
            number_of_voters: Some(2000),
            polling_station_type: None,
            address: "Teststraat 2a".to_string(),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        })
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let update: PollingStation = response.json().await.unwrap();
    assert_eq!(update.name, "Testverandering");
    assert_eq!(update.polling_station_type, None);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_update_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/40404");

    let response = reqwest::Client::new()
        .put(&url)
        .json(&PollingStationRequest {
            name: "Testverandering".to_string(),
            number: 34,
            number_of_voters: Some(2000),
            polling_station_type: Some(PollingStationType::Special),
            address: "Teststraat 2a".to_string(),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        })
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_delete_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 2;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations/2");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    let gone = reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    assert_eq!(
        gone.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );

    // Remove last polling station for election
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations/1");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", cookie.clone())
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_delete_with_data_entry_fails(pool: SqlitePool) {
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

    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/2");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "Unexpected response status"
    );
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Invalid data");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_delete_with_results_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    shared::create_result(&addr, 1, 2).await;

    let url = format!("http://{addr}/api/elections/2/polling_stations/1");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "Unexpected response status"
    );
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Invalid data");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_delete_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/40404");

    let response = reqwest::Client::new()
        .delete(&url)
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_non_unique(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 2;
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&PollingStationRequest {
            name: "New Polling Station".to_string(),
            number: 33,
            number_of_voters: None,
            polling_station_type: Some(PollingStationType::FixedLocation),
            address: "Teststraat 2a".to_string(),
            postal_code: "1234 QY".to_string(),
            locality: "Heemdamseburg".to_string(),
        })
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_list_invalid_election(pool: SqlitePool) {
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
async fn test_polling_station_import_validate_correct_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/validate-import");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({
            "data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
        }))
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: PollingStationRequestListResponse = response.json().await.unwrap();
    assert_eq!(body.polling_stations.len(), 420);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_import_validate_wrong_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/validate-import");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({
            "data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST,);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_polling_station_import_missing_data(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/6/polling_stations/import");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&serde_json::json!({
            "file_name": "eml110b_test.eml.xml",
        }))
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY,);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_polling_station_import_correct_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 6;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let validate_url =
        format!("http://{addr}/api/elections/{election_id}/polling_stations/validate-import");
    let validate_response = reqwest::Client::new()
        .post(&validate_url)
        .json(&serde_json::json!({
            "data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
        }))
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(validate_response.status(), StatusCode::OK);
    let validate_body: PollingStationRequestListResponse = validate_response.json().await.unwrap();
    let polling_stations = validate_body.polling_stations;

    let import_url = format!("http://{addr}/api/elections/{election_id}/polling_stations/import");
    let import_response = reqwest::Client::new()
        .post(&import_url)
        .json(&PollingStationsRequest {
            file_name: "eml110b_test.eml.xml".to_string(),
            polling_stations,
        })
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(import_response.status(), StatusCode::OK);

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}
