#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{create_and_save_data_entry, create_result},
    utils::serve_api,
};
use abacus::{
    polling_station::{
        PollingStation, PollingStationListResponse, PollingStationRequest, PollingStationType,
    },
    ErrorResponse,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_listing(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/2/polling_stations");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );
    let body: PollingStationListResponse = response.json().await.unwrap();
    assert_eq!(body.polling_stations.len(), 2);
    assert!(body
        .polling_stations
        .iter()
        .any(|ps| ps.name == "Op Rolletjes"))
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_creation(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 2;
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
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: PollingStation = response.json().await.unwrap();
    assert_eq!(body.election_id, election_id);
    assert_eq!(body.name, "New Polling Station");
    assert_eq!(
        body.polling_station_type,
        Some(PollingStationType::FixedLocation)
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_get(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 2;
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations/2");

    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );
    let body: PollingStation = response.json().await.unwrap();
    assert_eq!(body.election_id, election_id);
    assert_eq!(body.name, "Testplek");
    assert_eq!(body.polling_station_type, Some(PollingStationType::Special));
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_update_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
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
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let updated = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(
        updated.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let updated_body: PollingStation = updated.json().await.unwrap();
    assert_eq!(updated_body.name, "Testverandering");
    assert_eq!(updated_body.address, "Teststraat 2a");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_update_empty_type_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
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
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let updated = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(
        updated.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let updated_body: PollingStation = updated.json().await.unwrap();
    assert_eq!(updated_body.name, "Testverandering");
    assert_eq!(updated_body.polling_station_type, None);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_update_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
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
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_delete_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/2");

    let response = reqwest::Client::new().delete(&url).send().await.unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let gone = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(
        gone.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_delete_with_data_entry_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    create_and_save_data_entry(&addr, 2, 1, None).await;

    let url = format!("http://{addr}/api/elections/2/polling_stations/2");
    let response = reqwest::Client::new().delete(&url).send().await.unwrap();

    assert_eq!(
        response.status(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "Unexpected response status"
    );
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Invalid data");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_delete_with_results_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    create_result(&addr, 1, 2).await;

    let url = format!("http://{addr}/api/elections/2/polling_stations/1");
    let response = reqwest::Client::new().delete(&url).send().await.unwrap();

    assert_eq!(
        response.status(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "Unexpected response status"
    );
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Invalid data");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_delete_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/elections/2/polling_stations/40404");

    let response = reqwest::Client::new().delete(&url).send().await.unwrap();

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_non_unique(pool: SqlitePool) {
    let addr = serve_api(pool).await;
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
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_list_invalid_election(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/elections/1234/polling_stations");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
