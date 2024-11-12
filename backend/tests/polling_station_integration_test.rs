#![cfg(test)]

use reqwest::StatusCode;
use sqlx::SqlitePool;

use backend::polling_station::{
    PollingStation, PollingStationListResponse, PollingStationRequest, PollingStationType,
};

use crate::utils::serve_api;

mod utils;

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_listing(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1/polling_stations");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::OK, "Unexpected response status");

    let body: PollingStationListResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(body.polling_stations.len(), 2);
    assert!(body
        .polling_stations
        .iter()
        .any(|ps| ps.name == "Op Rolletjes"))
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_creation(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 1;
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&PollingStationRequest {
            name: "New Polling Station".to_string(),
            number: 5,
            number_of_voters: Some(426),
            polling_station_type: PollingStationType::FixedLocation,
            street: "Teststraat".to_string(),
            house_number: "3".to_string(),
            house_number_addition: None,
            postal_code: "1234 QY".to_string(),
            locality: "Heemdamseburg".to_string(),
        })
        .send()
        .await
        .unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::CREATED, "Unexpected response status");

    let body: PollingStation = response.json().await.unwrap();

    println!("response body: {:?}", &body);
    assert_eq!(body.election_id, election_id);
    assert_eq!(body.name, "New Polling Station");
    assert_eq!(body.polling_station_type, PollingStationType::FixedLocation);
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_get(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/2");

    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::OK, "Unexpected response status");

    let body: PollingStation = response.json().await.unwrap();

    println!("response body: {:?}", &body);
    assert_eq!(body.election_id, 1);
    assert_eq!(body.name, "Testplek");
    assert_eq!(body.polling_station_type, PollingStationType::Special);
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_update_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/2");

    let response = reqwest::Client::new()
        .put(&url)
        .json(&PollingStationRequest {
            name: "Testverandering".to_string(),
            number: 34,
            number_of_voters: Some(2000),
            polling_station_type: PollingStationType::Special,
            street: "Teststraat".to_string(),
            house_number: "2".to_string(),
            house_number_addition: Some("bis".to_string()),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        })
        .send()
        .await
        .unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::OK, "Unexpected response status");

    let updated = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(
        updated.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let updated_body: PollingStation = updated.json().await.unwrap();
    assert_eq!(updated_body.name, "Testverandering");
    assert_eq!(updated_body.street, "Teststraat");
    assert_eq!(updated_body.house_number_addition, Some("bis".to_string()));
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_update_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/40404");

    let response = reqwest::Client::new()
        .put(&url)
        .json(&PollingStationRequest {
            name: "Testverandering".to_string(),
            number: 34,
            number_of_voters: Some(2000),
            polling_station_type: PollingStationType::Special,
            street: "Teststraat".to_string(),
            house_number: "2".to_string(),
            house_number_addition: Some("bis".to_string()),
            postal_code: "1234 QY".to_string(),
            locality: "Testdorp".to_string(),
        })
        .send()
        .await
        .unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::NOT_FOUND, "Unexpected response status");
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_delete_ok(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/2");

    let response = reqwest::Client::new().delete(&url).send().await.unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::OK, "Unexpected response status");

    let gone = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(
        gone.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_delete_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/40404");

    let response = reqwest::Client::new().delete(&url).send().await.unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::NOT_FOUND, "Unexpected response status");
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_non_unique(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 1;
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&PollingStationRequest {
            name: "New Polling Station".to_string(),
            number: 33,
            number_of_voters: None,
            polling_station_type: PollingStationType::FixedLocation,
            street: "Teststraat".to_string(),
            house_number: "3".to_string(),
            house_number_addition: None,
            postal_code: "1234 QY".to_string(),
            locality: "Heemdamseburg".to_string(),
        })
        .send()
        .await
        .unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::CONFLICT, "Unexpected response status");
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_list_invalid_election(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/elections/1234/polling_stations");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::NOT_FOUND);
}
