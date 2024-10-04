#![cfg(test)]

use hyper::StatusCode;
use sqlx::SqlitePool;

use crate::utils::serve_api;
use backend::election::{ElectionDetailsResponse, ElectionListResponse, ElectionStatusResponse};
use backend::polling_station::PollingStationStatus;

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

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
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
    assert_eq!(body.polling_stations.len(), 2);
    assert!(body
        .polling_stations
        .iter()
        .any(|ps| ps.name == "Op Rolletjes"));
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

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
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
    assert_eq!(body.statuses[0].status, PollingStationStatus::FirstEntry);
    assert_eq!(body.statuses[1].status, PollingStationStatus::FirstEntry);

    // Finalise one and save the other
    shared::create_and_finalise_data_entry(&addr, 1).await;
    shared::create_and_save_data_entry(&addr, 2).await;

    let url = format!("http://{addr}/api/elections/1/status");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let body: ElectionStatusResponse = response.json().await.unwrap();

    // Ensure the response is what we expect:
    // polling station 1 is now complete, polling station 2 is still incomplete
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert!(!body.statuses.is_empty());
    assert_eq!(
        body.statuses.iter().find(|ps| ps.id == 1).unwrap().status,
        PollingStationStatus::Definitive
    );
    assert_eq!(
        body.statuses.iter().find(|ps| ps.id == 2).unwrap().status,
        PollingStationStatus::FirstEntryInProgress
    );
}

#[sqlx::test(fixtures("../fixtures/elections.sql"))]
async fn test_election_pdf_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1/download_results");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    // Ensure the response is what we expect
    assert_eq!(status, StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/pdf");

    // Check if the first 21 characters compare
    let content_disposition_string = content_disposition
        .unwrap()
        .to_str()
        .unwrap()
        .to_lowercase();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    // But the header should also contain ".pdf"
    assert!(content_disposition_string.contains(".pdf"));
}
