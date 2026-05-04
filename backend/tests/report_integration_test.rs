#![cfg(test)]

use std::net::SocketAddr;

use async_zip::base::read::mem::ZipFileReader;
use axum::http::{HeaderValue, StatusCode};
use sha2::Digest;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        FixtureUser::*, change_status_committee_session, create_cso_result,
        get_election_committee_session, login, update_committee_session_details,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

pub async fn complete_committee_session(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    election_id: u32,
    committee_session_id: u32,
) {
    change_status_committee_session(addr, cookie, election_id, committee_session_id, "completed")
        .await;
    let session = get_election_committee_session(addr, cookie, election_id).await;
    assert_eq!(session["status"], "completed");
}

pub async fn download_zip_assert(
    cookie: &HeaderValue,
    url: &str,
    expected_filename_prefix: &str,
) -> Vec<u8> {
    let response = reqwest::Client::new()
        .get(url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.headers().get("Content-Type").unwrap(),
        "application/zip"
    );

    let content_disposition = response.headers().get("Content-Disposition");
    let content_disposition_string = content_disposition.unwrap().to_str().unwrap().to_string();
    // Full filename contains created date and time, so checking if the name is correct up to the date
    // File name: definitieve-documenten_gr2024_heemdamseburg_gemeente_heemdamseburg-Ymd-HMS.zip
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert!(
        content_disposition_string[21..].starts_with(expected_filename_prefix),
        "expected filename to start with {expected_filename_prefix:?}, got {content_disposition_string:?}"
    );
    response.bytes().await.unwrap().to_vec()
}

pub async fn assert_zip_download_conflict(cookie: &HeaderValue, url: &str) {
    let response = reqwest::Client::new()
        .get(url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

pub async fn read_zip_entry(
    archive: &ZipFileReader,
    index: usize,
    expected_filename: &str,
) -> Vec<u8> {
    let mut reader = archive.reader_with_entry(index).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        expected_filename
    );
    assert!(reader.entry().uncompressed_size() > 1024);
    let mut buf = Vec::new();
    reader.read_to_end_checked(&mut buf).await.unwrap();
    buf
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_gsb_election_first_session_zip_download_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorGSB).await;
    let election_id = 2;
    create_cso_result(&addr, 201, election_id).await;
    create_cso_result(&addr, 202, election_id).await;
    complete_committee_session(&addr, &cookie, election_id, 2).await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/2/download_zip_results"
    );
    let prefix = "\"definitieve-documenten_gr2024_heemdamseburg_gemeente_heemdamseburg-";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let archive = ZipFileReader::new(bytes).await.unwrap();
    let pdf_hash1 = sha2::Sha256::digest(read_zip_entry(&archive, 0, "Model_Na31-2.pdf").await);
    let xml_zip = read_zip_entry(&archive, 1, "Telling_GR2024_Heemdamseburg.zip").await;
    let xml_archive = ZipFileReader::new(xml_zip).await.unwrap();
    let eml_hash1 = sha2::Sha256::digest(
        read_zip_entry(&xml_archive, 0, "Telling_GR2024_Heemdamseburg.eml.xml").await,
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let archive2 = ZipFileReader::new(bytes2).await.unwrap();
    let pdf_hash2 = sha2::Sha256::digest(read_zip_entry(&archive2, 0, "Model_Na31-2.pdf").await);
    let xml_zip2 = read_zip_entry(&archive2, 1, "Telling_GR2024_Heemdamseburg.zip").await;
    let xml_archive2 = ZipFileReader::new(xml_zip2).await.unwrap();
    let eml_hash2 = sha2::Sha256::digest(
        read_zip_entry(&xml_archive2, 0, "Telling_GR2024_Heemdamseburg.eml.xml").await,
    );

    assert_eq!(pdf_hash1, pdf_hash2, "PDF files should have the same hash");
    assert_eq!(eml_hash1, eml_hash2, "EML files should have the same hash");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_gsb_election_next_session_zip_download_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorGSB).await;
    let election_id = 5;
    let committee_session_id = 6;

    complete_committee_session(&addr, &cookie, election_id, committee_session_id).await;
    update_committee_session_details(
        &addr,
        &cookie,
        election_id,
        committee_session_id,
        "Juinen",
        "2026-03-18",
        "10:45",
    )
    .await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results"
    );
    let prefix = "\"correctie_gr2026_grotestad_gemeente_grote-stad-";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let archive = ZipFileReader::new(bytes).await.unwrap();
    let pdf_hash1 = sha2::Sha256::digest(read_zip_entry(&archive, 0, "Model_Na14-2.pdf").await);
    let xml_zip = read_zip_entry(&archive, 1, "Telling_GR2026_GroteStad.zip").await;
    let xml_archive = ZipFileReader::new(xml_zip).await.unwrap();
    let eml_hash1 = sha2::Sha256::digest(
        read_zip_entry(&xml_archive, 0, "Telling_GR2026_GroteStad.eml.xml").await,
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let archive2 = ZipFileReader::new(bytes2).await.unwrap();
    let pdf_hash2 = sha2::Sha256::digest(read_zip_entry(&archive2, 0, "Model_Na14-2.pdf").await);
    let xml_zip2 = read_zip_entry(&archive2, 1, "Telling_GR2026_GroteStad.zip").await;
    let xml_archive2 = ZipFileReader::new(xml_zip2).await.unwrap();
    let eml_hash2 = sha2::Sha256::digest(
        read_zip_entry(&xml_archive2, 0, "Telling_GR2026_GroteStad.eml.xml").await,
    );

    assert_eq!(pdf_hash1, pdf_hash2, "PDF files should have the same hash");
    assert_eq!(eml_hash1, eml_hash2, "EML files should have the same hash");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_gsb_election_zip_download_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorGSB).await;
    create_cso_result(&addr, 201, 2).await;
    create_cso_result(&addr, 202, 2).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2/download_zip_results");
    assert_zip_download_conflict(&cookie, &url).await;
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_results_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    complete_committee_session(&addr, &cookie, election_id, committee_session_id).await;
    update_committee_session_details(
        &addr,
        &cookie,
        election_id,
        committee_session_id,
        "Juinen",
        "2026-03-18",
        "10:45",
    )
    .await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results_csb"
    );
    let prefix = "\"vaststelling-uitslag_gr2024_juinen_gemeente_juinen";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let archive = ZipFileReader::new(bytes).await.unwrap();
    let pdf_hash1 = sha2::Sha256::digest(read_zip_entry(&archive, 0, "Model_P22-2.pdf").await);

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let archive2 = ZipFileReader::new(bytes2).await.unwrap();
    let pdf_hash2 = sha2::Sha256::digest(read_zip_entry(&archive2, 0, "Model_P22-2.pdf").await);

    assert_eq!(pdf_hash1, pdf_hash2, "PDF files should have the same hash");
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_results_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/801/download_zip_results_csb"
    );
    assert_zip_download_conflict(&cookie, &url).await;
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_attachment_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    complete_committee_session(&addr, &cookie, election_id, committee_session_id).await;
    update_committee_session_details(
        &addr,
        &cookie,
        election_id,
        committee_session_id,
        "Juinen",
        "2026-03-18",
        "10:45",
    )
    .await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_attachment_csb"
    );
    let prefix = "\"model-p22-2-bijlage_gr2024_juinen_gemeente_juinen";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let archive = ZipFileReader::new(bytes).await.unwrap();
    let pdf_hash1 =
        sha2::Sha256::digest(read_zip_entry(&archive, 0, "Model_P22-2_bijlage.pdf").await);

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let archive2 = ZipFileReader::new(bytes2).await.unwrap();
    let pdf_hash2 =
        sha2::Sha256::digest(read_zip_entry(&archive2, 0, "Model_P22-2_bijlage.pdf").await);

    assert_eq!(pdf_hash1, pdf_hash2, "PDF files should have the same hash");
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_attachment_invalid_committee_session_state(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/801/download_zip_attachment_csb"
    );
    assert_zip_download_conflict(&cookie, &url).await;
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_total_counts_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    complete_committee_session(&addr, &cookie, election_id, committee_session_id).await;
    update_committee_session_details(
        &addr,
        &cookie,
        election_id,
        committee_session_id,
        "Juinen",
        "2026-03-18",
        "10:45",
    )
    .await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_total_counts_csb"
    );
    let prefix = "\"definitieve-documenten_gr2024_juinen_gemeente_juinen";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let archive = ZipFileReader::new(bytes).await.unwrap();
    let xml_zip = read_zip_entry(&archive, 0, "Totaaltelling_GR2024_Juinen.zip").await;
    let xml_archive = ZipFileReader::new(xml_zip).await.unwrap();
    let eml_hash1 = sha2::Sha256::digest(
        read_zip_entry(&xml_archive, 0, "Totaaltelling_GR2024_Juinen.eml.xml").await,
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let archive2 = ZipFileReader::new(bytes2).await.unwrap();
    let xml_zip2 = read_zip_entry(&archive2, 0, "Totaaltelling_GR2024_Juinen.zip").await;
    let xml_archive2 = ZipFileReader::new(xml_zip2).await.unwrap();
    let eml_hash2 = sha2::Sha256::digest(
        read_zip_entry(&xml_archive2, 0, "Totaaltelling_GR2024_Juinen.eml.xml").await,
    );

    assert_eq!(eml_hash1, eml_hash2, "EML files should have the same hash");
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_total_counts_invalid_committee_session_state(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/801/download_zip_total_counts_csb"
    );
    assert_zip_download_conflict(&cookie, &url).await;
}
