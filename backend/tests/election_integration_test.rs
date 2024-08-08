#![cfg(test)]

use hyper::StatusCode;
use sqlx::SqlitePool;

use backend::{
    election::{ElectionDetailsResponse, ElectionListResponse, ElectionStatusResponse},
    polling_station::PollingStationStatus,
};

use crate::utils::serve_api;

mod shared;
mod utils;

#[sqlx::test(fixtures("../fixtures/elections.sql"))]
async fn test_election_list_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: ElectionListResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.elections.len(), 2);
}

#[sqlx::test(fixtures("../fixtures/elections.sql"))]
async fn test_election_details_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: ElectionDetailsResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.election.name, "Municipal Election");
}

#[sqlx::test]
async fn test_election_details_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("../fixtures/elections.sql", "../fixtures/polling_stations.sql"))]
async fn test_election_details_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1/status");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let body: ElectionStatusResponse = response.json().await.unwrap();

    // Ensure the response is what we expect
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert!(!body.statuses.is_empty());
    assert_eq!(body.statuses[0].status, PollingStationStatus::Incomplete);
    assert_eq!(body.statuses[1].status, PollingStationStatus::Incomplete);

    shared::create_and_finalise_data_entry(&addr).await;

    let url = format!("http://{addr}/api/elections/1/status");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let body: ElectionStatusResponse = response.json().await.unwrap();

    // Ensure the response is what we expect
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert!(!body.statuses.is_empty());
    assert_eq!(
        body.statuses.iter().find(|ps| ps.id == 1).unwrap().status,
        PollingStationStatus::Complete
    );
}
