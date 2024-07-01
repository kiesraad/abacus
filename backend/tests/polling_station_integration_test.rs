#![cfg(test)]

mod utils;

use reqwest::StatusCode;
use sqlx::SqlitePool;

use backend::polling_station::PollingStationListResponse;

use crate::utils::serve_api;

#[sqlx::test(fixtures("elections", "polling_stations"))]
async fn test_polling_station_listing_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/polling_stations/1");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: PollingStationListResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.polling_stations.len(), 2);
    assert!(body
        .polling_stations
        .iter()
        .any(|ps| ps.name == "Stembureau \"Op Rolletjes\""));
}
