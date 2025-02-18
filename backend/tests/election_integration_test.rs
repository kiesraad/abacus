#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{shared::create_result, utils::serve_api};
#[cfg(feature = "dev-database")]
use abacus::election::Election;
use abacus::election::{ElectionDetailsResponse, ElectionListResponse};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "election_3", "users"))))]
async fn test_election_list_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections");
    let typist_cookie = shared::typist_login(&addr).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", typist_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionListResponse = response.json().await.unwrap();
    assert_eq!(body.elections.len(), 2);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_details_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/2");
    let typist_cookie = shared::typist_login(&addr).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", typist_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionDetailsResponse = response.json().await.unwrap();
    assert_eq!(body.election.name, "Municipal Election");
    assert_eq!(body.polling_stations.len(), 2);
    assert!(body
        .polling_stations
        .iter()
        .any(|ps| ps.name == "Op Rolletjes"));
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
#[cfg(feature = "dev-database")]
async fn test_election_create_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "name": "Test Election",
            "location": "Test Location",
            "number_of_voters": 100,
            "category": "Municipal",
            "number_of_seats": 29,
            "election_date": "2026-01-01",
            "nomination_date": "2026-01-01",
            "status": "DataEntryInProgress",
            "political_groups": [
          {
            "number": 1,
            "name": "Political Group A",
            "candidates": [
              {
                "number": 1,
                "initials": "A.",
                "first_name": "Alice",
                "last_name": "Foo",
                "locality": "Amsterdam",
                "gender": "Female"
              },
              {
                "number": 2,
                "initials": "C.",
                "first_name": "Charlie",
                "last_name": "Doe",
                "locality": "Rotterdam",
                "gender": null
              }
            ]
          }
        ]
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CREATED);
    let body: Election = response.json().await.unwrap();
    assert_eq!(body.name, "Test Election");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_details_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url: String = format!("http://{addr}/api/elections/1");
    let typist_cookie = shared::typist_login(&addr).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", typist_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_pdf_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/2/download_pdf_results");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_election_xml_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    create_result(&addr, cookie.clone(), 1, 2).await;
    create_result(&addr, cookie.clone(), 2, 2).await;

    let url = format!("http://{addr}/api/elections/2/download_xml_results");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let content_type = response.headers().get("Content-Type");

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "text/xml");

    let body = response.text().await.unwrap();
    assert!(body.contains("<Election>"));
    assert!(body.contains("<TotalCounted>204</TotalCounted>"));
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_election_zip_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    create_result(&addr, cookie.clone(), 1, 2).await;
    create_result(&addr, cookie, 2, 2).await;

    let url = format!("http://{addr}/api/elections/2/download_zip_results");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(response.status(), StatusCode::OK);
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
