#![cfg(test)]

use hyper::StatusCode;
use sqlx::SqlitePool;

use crate::utils::serve_api;
use backend::election::{ElectionDetailsResponse, ElectionListResponse};

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

#[sqlx::test(fixtures("../fixtures/elections.sql"))]
async fn test_election_pdf_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1/download_pdf_results");
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

#[sqlx::test(fixtures(
    path = "../fixtures",
    scripts("elections", "polling_stations", "polling_station_results")
))]
async fn test_election_zip_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/4/download_zip_results");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let status = response.status();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(status, StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/zip");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"election_result_GR2024_Heemdamseburg.zip\""
    );

    let bytes = response.bytes().await.unwrap();
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).unwrap();
    {
        let xml_file = archive
            .by_name("Telling_GR2024_Heemdamseburg.eml.xml")
            .unwrap();
        assert!(xml_file.size() > 0);
    }

    {
        let pdf_file = archive
            .by_name("Model_Na31-2_GR2024_Heemdamseburg.pdf")
            .unwrap();
        assert!(pdf_file.size() > 0);
    }
}
