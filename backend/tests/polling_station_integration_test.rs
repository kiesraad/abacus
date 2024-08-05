#![cfg(test)]

use reqwest::StatusCode;
use sqlx::SqlitePool;

use backend::polling_station::PollingStationListResponse;

use crate::utils::serve_api;

mod utils;

#[sqlx::test(fixtures("../fixtures/elections.sql", "../fixtures/polling_stations.sql"))]
async fn test_polling_station_listing_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1/polling_stations");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: PollingStationListResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK, "Unexpected response status");
    assert_eq!(body.polling_stations.len(), 2);
    assert!(body
        .polling_stations
        .iter()
        .any(|ps| ps.name == "Stembureau \"Op Rolletjes\""));
}

#[sqlx::test(fixtures("../fixtures/elections.sql", "../fixtures/polling_stations.sql"))]
async fn test_polling_station_list_invalid_election(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    // election ID 1234 does not exist
    let url = format!("http://{addr}/api/elections/1234/polling_stations");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    let status = response.status();
    assert_eq!(status, StatusCode::NOT_FOUND);
}
