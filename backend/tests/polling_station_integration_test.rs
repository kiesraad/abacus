#![cfg(test)]

use reqwest::StatusCode;
use sqlx::SqlitePool;

use backend::polling_station::{
    NewPollingStationRequest, PollingStation, PollingStationListResponse, PollingStationType,
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
        .json(&NewPollingStationRequest {
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
    assert!(body.name == "New Polling Station");
    assert!(body.polling_station_type == PollingStationType::FixedLocation);
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_non_unique(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = 1;
    let url = format!("http://{addr}/api/elections/{election_id}/polling_stations");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&NewPollingStationRequest {
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
