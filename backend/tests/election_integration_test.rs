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
    assert_eq!(body.elections.len(), 5);
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

    // Ensure the statuses are "NotStarted"
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert!(!body.statuses.is_empty());
    assert_eq!(body.statuses[0].status, PollingStationStatus::NotStarted);
    assert_eq!(body.statuses[0].data_entry_progress, None);
    assert_eq!(body.statuses[1].status, PollingStationStatus::NotStarted);
    assert_eq!(body.statuses[1].data_entry_progress, None);

    // Finalise the first entry of one and set the other in progress
    shared::create_and_finalise_data_entry(&addr, 1, 1).await;
    shared::create_and_save_data_entry(&addr, 2, 1, Some(r#"{"continue": true}"#)).await;

    let url = format!("http://{addr}/api/elections/1/status");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let body: ElectionStatusResponse = response.json().await.unwrap();

    // polling station 1's first entry is now complete, polling station 2 is still incomplete and set to in progress
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert!(!body.statuses.is_empty());
    let statuses = [
        body.statuses.iter().find(|ps| ps.id == 1).unwrap(),
        body.statuses.iter().find(|ps| ps.id == 2).unwrap(),
    ];

    assert_eq!(statuses[0].status, PollingStationStatus::SecondEntry);
    assert_eq!(statuses[0].data_entry_progress, None);
    assert_eq!(
        statuses[1].status,
        PollingStationStatus::FirstEntryInProgress
    );
    assert_eq!(statuses[1].data_entry_progress, Some(60));

    // Abort and save the entries
    shared::create_and_save_data_entry(&addr, 1, 2, Some(r#"{"continue": true}"#)).await;
    shared::create_and_save_data_entry(&addr, 2, 1, Some(r#"{"continue": false}"#)).await;

    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let body: ElectionStatusResponse = response.json().await.unwrap();

    // polling station 1 should now be in progress, polling station 2 is still incomplete and set to unfinished
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert!(!body.statuses.is_empty());
    let statuses = [
        body.statuses.iter().find(|ps| ps.id == 1).unwrap(),
        body.statuses.iter().find(|ps| ps.id == 2).unwrap(),
    ];

    assert_eq!(
        statuses[0].status,
        PollingStationStatus::SecondEntryInProgress
    );
    assert_eq!(statuses[0].data_entry_progress, Some(60));
    assert_eq!(
        statuses[1].status,
        PollingStationStatus::FirstEntryUnfinished
    );
    assert_eq!(statuses[1].data_entry_progress, Some(60));

    // polling station 2 should now be unfinished
    shared::create_and_save_data_entry(&addr, 1, 2, Some(r#"{"continue": false}"#)).await;

    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let body: ElectionStatusResponse = response.json().await.unwrap();

    assert_eq!(status, StatusCode::OK);
    assert!(!body.statuses.is_empty());
    assert_eq!(
        body.statuses.iter().find(|ps| ps.id == 1).unwrap().status,
        PollingStationStatus::SecondEntryUnfinished
    );

    // polling station 2 should now be definitive
    shared::create_and_finalise_data_entry(&addr, 1, 2).await;

    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let body: ElectionStatusResponse = response.json().await.unwrap();

    assert_eq!(status, StatusCode::OK);
    assert!(!body.statuses.is_empty());
    assert_eq!(
        statuses[1].status,
        PollingStationStatus::FirstEntryUnfinished
    );
    assert_eq!(statuses[1].data_entry_progress, Some(60));
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_election_details_status_no_other_election_statuses(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    // Save data entry for election 1, polling station 1
    shared::create_and_save_data_entry(&addr, 1, 1, Some(r#"{"continue": true}"#)).await;

    // Save data entry for election 2, polling station 3
    shared::create_and_save_data_entry(&addr, 3, 1, Some(r#"{"continue": true}"#)).await;

    // Get statuses for election 2
    let url = format!("http://{addr}/api/elections/2/status");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    assert_eq!(status, StatusCode::OK);
    let body: ElectionStatusResponse = response.json().await.unwrap();

    assert_eq!(
        body.statuses.len(),
        1,
        "there can be only one {:?}",
        body.statuses
    );
    assert_eq!(body.statuses[0].id, 3);
    assert_eq!(
        body.statuses[0].status,
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

#[sqlx::test(fixtures(
    path = "../fixtures",
    scripts("elections", "polling_stations", "polling_station_results")
))]
async fn test_election_xml_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/4/download_xml_results");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let content_type = response.headers().get("Content-Type");

    // Ensure the response is what we expect
    assert_eq!(status, StatusCode::OK);
    assert_eq!(content_type.unwrap(), "text/xml");

    let body = response.text().await.unwrap();
    assert!(body.contains("<Election>"));
    assert!(body.contains("<ValidVotes>125</ValidVotes>"));
}
