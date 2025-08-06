#![cfg(test)]

use crate::{shared::create_result, utils::serve_api};
use abacus::{
    committee_session::status::CommitteeSessionStatus,
    election::{ElectionDetailsResponse, ElectionListResponse},
};
use async_zip::base::read::mem::ZipFileReader;
use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_4", "election_5", "users"))))]
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
    assert_eq!(body.committee_sessions.len(), 2);
    assert_eq!(body.committee_sessions[1].number, 2);
    assert_eq!(
        body.committee_sessions[1].status,
        CommitteeSessionStatus::DataEntryInProgress
    );
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
    assert_eq!(
        body.committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
    assert_eq!(body.election.name, "Municipal Election");
    assert_eq!(body.polling_stations.len(), 2);
    assert!(
        body.polling_stations
            .iter()
            .any(|ps| ps.name == "Op Rolletjes")
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_payload_too_large(pool: SqlitePool) {
    use abacus::MAX_BODY_SIZE_MB;
    use reqwest::Body;

    let addr = serve_api(pool).await;

    // Create a payload that is larger than MAX_BODY_SIZE_MB
    let body = Vec::from_iter((0..MAX_BODY_SIZE_MB * 1024 * 1024 + 1).map(|_| b'a'));

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .header("Content-Type", "application/json")
        .body(Body::from(body))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_payload_not_too_large(pool: SqlitePool) {
    use abacus::MAX_BODY_SIZE_MB;
    use reqwest::Body;

    let addr = serve_api(pool).await;

    // Create a MAX_BODY_SIZE_MB payload (should return a 400 instead of a 413)
    let body = Vec::from_iter((0..MAX_BODY_SIZE_MB * 1024 * 1024).map(|_| b'a'));

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .header("Content-Type", "application/json")
        .body(Body::from(body))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
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
async fn test_election_pdf_download_works(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    create_result(&addr, 1, 2).await;
    create_result(&addr, 2, 2).await;
    shared::change_status_committee_session(
        &addr,
        &coordinator_cookie,
        2,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;

    let url = format!("http://{addr}/api/elections/2/download_pdf_results");
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_pdf_download_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    create_result(&addr, 1, 2).await;
    create_result(&addr, 2, 2).await;

    let url = format!("http://{addr}/api/elections/2/download_pdf_results");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_xml_download_works(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    create_result(&addr, 1, 2).await;
    create_result(&addr, 2, 2).await;
    shared::change_status_committee_session(
        &addr,
        &coordinator_cookie,
        2,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;

    let url = format!("http://{addr}/api/elections/2/download_xml_results");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_type = response.headers().get("Content-Type");

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "text/xml");

    let body = response.text().await.unwrap();
    assert!(body.contains("<Election>"));
    assert!(body.contains("<TotalCounted>204</TotalCounted>"));
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_xml_download_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    create_result(&addr, 1, 2).await;
    create_result(&addr, 2, 2).await;

    let url = format!("http://{addr}/api/elections/2/download_xml_results");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_zip_download_works(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    create_result(&addr, 1, 2).await;
    create_result(&addr, 2, 2).await;
    shared::change_status_committee_session(
        &addr,
        &coordinator_cookie,
        2,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;

    let url = format!("http://{addr}/api/elections/2/download_zip_results");
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
    assert_eq!(content_type.unwrap(), "application/zip");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"election_result_GR2024_Heemdamseburg.zip\""
    );

    let bytes = response.bytes().await.unwrap();
    let archive = ZipFileReader::new(bytes.to_vec()).await.unwrap();

    let reader = archive.reader_with_entry(1).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Telling_GR2024_Heemdamseburg.eml.xml"
    );
    assert!(reader.entry().uncompressed_size() > 1024);

    let reader = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_Na31-2_GR2024_Heemdamseburg.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_zip_download_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    create_result(&addr, 1, 2).await;
    create_result(&addr, 2, 2).await;

    let url = format!("http://{addr}/api/elections/2/download_zip_results");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_na_31_2_bijlage1_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/download_na_31_2_bijlage1");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/zip");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"GR2024_Heemdamseburg_na_31_2_bijlage1.zip\""
    );

    let bytes = response.bytes().await.unwrap();
    assert!(bytes.len() > 1024);

    let archive = ZipFileReader::new(bytes.to_vec()).await.unwrap();

    let reader = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_Na31-2_GR2024_Stembureau_33_Bijlage_1.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);

    let reader = archive.reader_with_entry(1).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_Na31-2_GR2024_Stembureau_34_Bijlage_1.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_n_10_2_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/download_n_10_2");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/zip");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"GR2024_Heemdamseburg_n_10_2.zip\""
    );

    let bytes = response.bytes().await.unwrap();
    assert!(bytes.len() > 1024);

    let archive = ZipFileReader::new(bytes.to_vec()).await.unwrap();

    let reader = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_N_10_2_GR2024_Stembureau_33.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);

    let reader = archive.reader_with_entry(1).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_N_10_2_GR2024_Stembureau_34.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
}
