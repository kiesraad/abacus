#![cfg(test)]

use async_zip::base::read::mem::ZipFileReader;
use axum::http::StatusCode;
use sha2::Digest;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        FixtureUser::*, change_status_committee_session, create_cso_result,
        get_election_committee_session, login,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_gsb_election_first_session_zip_download_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = login(&addr, CoordinatorGSB).await;
    let election_id = 2;
    create_cso_result(&addr, 201, election_id).await;
    create_cso_result(&addr, 202, election_id).await;

    change_status_committee_session(&addr, &coordinator_cookie, election_id, 2, "completed").await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "completed");

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/2/download_zip_results"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
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
    // Full filename contains created date and time, so checking if the name is correct up to the date
    // File name: definitieve-documenten_gr2024_heemdamseburg_gemeente_heemdamseburg-Ymd-HMS.zip
    assert!(
        &content_disposition_string[21..]
            .starts_with("\"definitieve-documenten_gr2024_heemdamseburg_gemeente_heemdamseburg-"),
    );

    let bytes = response.bytes().await.unwrap();
    let archive = ZipFileReader::new(bytes.to_vec()).await.unwrap();

    // Extract and hash the PDF file
    let mut reader = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_Na31-2.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
    let mut pdf_content = Vec::new();
    reader.read_to_end_checked(&mut pdf_content).await.unwrap();
    let pdf_hash1 = sha2::Sha256::digest(&pdf_content);

    // Extract the XML archive
    let mut reader = archive.reader_with_entry(1).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Telling_GR2024_Heemdamseburg.zip"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
    let mut xml_zip_file = Vec::new();
    reader.read_to_end_checked(&mut xml_zip_file).await.unwrap();

    // Extract and hash the XML file
    let xml_archive = ZipFileReader::new(xml_zip_file).await.unwrap();
    let mut xml_reader = xml_archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        xml_reader.entry().filename().as_str().unwrap(),
        "Telling_GR2024_Heemdamseburg.eml.xml"
    );
    assert!(xml_reader.entry().uncompressed_size() > 1024);
    let mut eml_content = Vec::new();
    xml_reader
        .read_to_end_checked(&mut eml_content)
        .await
        .unwrap();
    let eml_hash1 = sha2::Sha256::digest(&eml_content);

    // Request the file again
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    let bytes2 = response.bytes().await.unwrap();
    let archive2 = ZipFileReader::new(bytes2.to_vec()).await.unwrap();

    // Extract and hash the PDF file from second download
    let mut reader2 = archive2.reader_with_entry(0).await.unwrap();
    let mut pdf_content2 = Vec::new();
    reader2
        .read_to_end_checked(&mut pdf_content2)
        .await
        .unwrap();
    let pdf_hash2 = sha2::Sha256::digest(&pdf_content2);

    // Extract the XML archive from the second download
    let mut reader2 = archive2.reader_with_entry(1).await.unwrap();
    assert_eq!(
        reader2.entry().filename().as_str().unwrap(),
        "Telling_GR2024_Heemdamseburg.zip"
    );
    assert!(reader2.entry().uncompressed_size() > 1024);
    let mut xml_zip_file2 = Vec::new();
    reader2
        .read_to_end_checked(&mut xml_zip_file2)
        .await
        .unwrap();

    // Extract and hash the XML file from the second download
    let xml_archive2 = ZipFileReader::new(xml_zip_file2).await.unwrap();
    let mut xml_reader2 = xml_archive2.reader_with_entry(0).await.unwrap();
    assert_eq!(
        xml_reader2.entry().filename().as_str().unwrap(),
        "Telling_GR2024_Heemdamseburg.eml.xml"
    );
    assert!(xml_reader2.entry().uncompressed_size() > 1024);
    let mut eml_content2 = Vec::new();
    xml_reader2
        .read_to_end_checked(&mut eml_content2)
        .await
        .unwrap();
    let eml_hash2 = sha2::Sha256::digest(&eml_content2);

    // Check that the files inside the zip are the same
    assert_eq!(eml_hash1, eml_hash2, "EML files should have the same hash");
    assert_eq!(pdf_hash1, pdf_hash2, "PDF files should have the same hash");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_gsb_election_next_session_zip_download_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = login(&addr, CoordinatorGSB).await;
    let election_id = 5;
    let committee_session_id = 6;

    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        "completed",
    )
    .await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "completed");

    // Update committee session details
    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&serde_json::json!({
            "location": "Juinen".to_string(),
            "start_date": "2026-03-18".to_string(),
            "start_time": "10:45".to_string(),
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
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
    // Full filename contains created date and time, so checking if the name is correct up to the date
    // File name: correctie_gr2026_grotestad_gemeente_grote-stad-Ymd-HMS.zip
    assert!(
        &content_disposition_string[21..]
            .starts_with("\"correctie_gr2026_grotestad_gemeente_grote-stad-"),
    );

    let bytes = response.bytes().await.unwrap();
    let archive = ZipFileReader::new(bytes.to_vec()).await.unwrap();

    // Extract and hash the PDF file
    let mut reader = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_Na14-2.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
    let mut pdf_content = Vec::new();
    reader.read_to_end_checked(&mut pdf_content).await.unwrap();
    let pdf_hash1 = sha2::Sha256::digest(&pdf_content);

    // Extract the XML archive
    let mut reader = archive.reader_with_entry(1).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Telling_GR2026_GroteStad.zip"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
    let mut xml_zip_file = Vec::new();
    reader.read_to_end_checked(&mut xml_zip_file).await.unwrap();

    // Extract and hash the XML file
    let xml_archive = ZipFileReader::new(xml_zip_file).await.unwrap();
    let mut xml_reader = xml_archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        xml_reader.entry().filename().as_str().unwrap(),
        "Telling_GR2026_GroteStad.eml.xml"
    );
    assert!(xml_reader.entry().uncompressed_size() > 1024);
    let mut eml_content = Vec::new();
    xml_reader
        .read_to_end_checked(&mut eml_content)
        .await
        .unwrap();
    let eml_hash1 = sha2::Sha256::digest(&eml_content);

    // Request the file again
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    let bytes2 = response.bytes().await.unwrap();
    let archive2 = ZipFileReader::new(bytes2.to_vec()).await.unwrap();

    // Extract and hash the PDF file from second download
    let mut reader2 = archive2.reader_with_entry(0).await.unwrap();
    let mut pdf_content2 = Vec::new();
    reader2
        .read_to_end_checked(&mut pdf_content2)
        .await
        .unwrap();
    let pdf_hash2 = sha2::Sha256::digest(&pdf_content2);

    // Extract the XML archive from the second download
    let mut reader2 = archive2.reader_with_entry(1).await.unwrap();
    assert_eq!(
        reader2.entry().filename().as_str().unwrap(),
        "Telling_GR2026_GroteStad.zip"
    );
    assert!(reader2.entry().uncompressed_size() > 1024);
    let mut xml_zip_file2 = Vec::new();
    reader2
        .read_to_end_checked(&mut xml_zip_file2)
        .await
        .unwrap();

    // Extract and hash the XML file from the second download
    let xml_archive2 = ZipFileReader::new(xml_zip_file2).await.unwrap();
    let mut xml_reader2 = xml_archive2.reader_with_entry(0).await.unwrap();
    assert_eq!(
        xml_reader2.entry().filename().as_str().unwrap(),
        "Telling_GR2026_GroteStad.eml.xml"
    );
    assert!(xml_reader2.entry().uncompressed_size() > 1024);
    let mut eml_content2 = Vec::new();
    xml_reader2
        .read_to_end_checked(&mut eml_content2)
        .await
        .unwrap();
    let eml_hash2 = sha2::Sha256::digest(&eml_content2);

    // Check that the files inside the zip are the same
    assert_eq!(eml_hash1, eml_hash2, "EML files should have the same hash");
    assert_eq!(pdf_hash1, pdf_hash2, "PDF files should have the same hash");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_gsb_election_zip_download_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = login(&addr, CoordinatorGSB).await;
    let election_id = 2;
    create_cso_result(&addr, 201, election_id).await;
    create_cso_result(&addr, 202, election_id).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2/download_zip_results");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_results_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        "completed",
    )
    .await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "completed");

    // Update committee session details
    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&serde_json::json!({
            "location": "Juinen".to_string(),
            "start_date": "2026-03-18".to_string(),
            "start_time": "10:45".to_string(),
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results_csb"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
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
    println!("{:?}", content_disposition_string);
    // Full filename contains created date and time, so checking if the name is correct up to the date
    // File name: vaststelling-uitslag_gr2024_juinen_gemeente_juinen-Ymd-HMS.zip
    assert!(
        &content_disposition_string[21..]
            .starts_with("\"vaststelling-uitslag_gr2024_juinen_gemeente_juinen"),
    );

    let bytes = response.bytes().await.unwrap();
    let archive = ZipFileReader::new(bytes.to_vec()).await.unwrap();

    // Extract and hash the PDF file
    let mut reader = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_P22-2.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
    let mut pdf_content = Vec::new();
    reader.read_to_end_checked(&mut pdf_content).await.unwrap();
    let pdf_hash1 = sha2::Sha256::digest(&pdf_content);

    // Request the file again
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    let bytes2 = response.bytes().await.unwrap();
    let archive2 = ZipFileReader::new(bytes2.to_vec()).await.unwrap();

    // Extract and hash the PDF file from second download
    let mut reader2 = archive2.reader_with_entry(0).await.unwrap();
    let mut pdf_content2 = Vec::new();
    reader2
        .read_to_end_checked(&mut pdf_content2)
        .await
        .unwrap();
    let pdf_hash2 = sha2::Sha256::digest(&pdf_content2);

    // Check that the files inside the zip are the same
    assert_eq!(pdf_hash1, pdf_hash2, "PDF files should have the same hash");
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_results_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/801/download_zip_results_csb"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_attachment_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        "completed",
    )
    .await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "completed");

    // Update committee session details
    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&serde_json::json!({
            "location": "Juinen".to_string(),
            "start_date": "2026-03-18".to_string(),
            "start_time": "10:45".to_string(),
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_attachment_csb"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
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
    println!("{:?}", content_disposition_string);
    // Full filename contains created date and time, so checking if the name is correct up to the date
    // File name: model-p22-2-bijlage_gr2024_juinen_gemeente_juinen-Ymd-HMS.zip
    assert!(
        &content_disposition_string[21..]
            .starts_with("\"model-p22-2-bijlage_gr2024_juinen_gemeente_juinen"),
    );

    let bytes = response.bytes().await.unwrap();
    let archive = ZipFileReader::new(bytes.to_vec()).await.unwrap();

    // Extract and hash the PDF file
    let mut reader = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Model_P22-2_bijlage.pdf"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
    let mut pdf_content = Vec::new();
    reader.read_to_end_checked(&mut pdf_content).await.unwrap();
    let pdf_hash1 = sha2::Sha256::digest(&pdf_content);

    // Request the file again
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    let bytes2 = response.bytes().await.unwrap();
    let archive2 = ZipFileReader::new(bytes2.to_vec()).await.unwrap();

    // Extract and hash the PDF file from second download
    let mut reader2 = archive2.reader_with_entry(0).await.unwrap();
    let mut pdf_content2 = Vec::new();
    reader2
        .read_to_end_checked(&mut pdf_content2)
        .await
        .unwrap();
    let pdf_hash2 = sha2::Sha256::digest(&pdf_content2);

    // Check that the files inside the zip are the same
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
    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/801/download_zip_attachment_csb"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_total_counts_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        "completed",
    )
    .await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session["status"], "completed");

    // Update committee session details
    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&serde_json::json!({
            "location": "Juinen".to_string(),
            "start_date": "2026-03-18".to_string(),
            "start_time": "10:45".to_string(),
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_total_counts_csb"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
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
    println!("{:?}", content_disposition_string);
    // Full filename contains created date and time, so checking if the name is correct up to the date
    // File name: definitieve-documenten_gr2024_juinen_gemeente_juinen-Ymd-HMS.zip
    assert!(
        &content_disposition_string[21..]
            .starts_with("\"definitieve-documenten_gr2024_juinen_gemeente_juinen"),
    );

    let bytes = response.bytes().await.unwrap();
    let archive = ZipFileReader::new(bytes.to_vec()).await.unwrap();

    // Extract the XML archive
    let mut reader = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader.entry().filename().as_str().unwrap(),
        "Totaaltelling_GR2024_Juinen.zip"
    );
    assert!(reader.entry().uncompressed_size() > 1024);
    let mut xml_zip_file = Vec::new();
    reader.read_to_end_checked(&mut xml_zip_file).await.unwrap();

    // Extract and hash the XML file
    let xml_archive = ZipFileReader::new(xml_zip_file).await.unwrap();
    let mut xml_reader = xml_archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        xml_reader.entry().filename().as_str().unwrap(),
        "Totaaltelling_GR2024_Juinen.eml.xml"
    );
    assert!(xml_reader.entry().uncompressed_size() > 1024);
    let mut eml_content = Vec::new();
    xml_reader
        .read_to_end_checked(&mut eml_content)
        .await
        .unwrap();
    let eml_hash1 = sha2::Sha256::digest(&eml_content);

    // Extract the XML archive from second download
    let mut reader2 = archive.reader_with_entry(0).await.unwrap();
    assert_eq!(
        reader2.entry().filename().as_str().unwrap(),
        "Totaaltelling_GR2024_Juinen.zip"
    );
    assert!(reader2.entry().uncompressed_size() > 1024);
    let mut xml_zip_file2 = Vec::new();
    reader2
        .read_to_end_checked(&mut xml_zip_file2)
        .await
        .unwrap();

    // Extract and hash the XML file from second download
    let xml_archive2 = ZipFileReader::new(xml_zip_file2).await.unwrap();
    let mut xml_reader2 = xml_archive2.reader_with_entry(0).await.unwrap();
    assert_eq!(
        xml_reader2.entry().filename().as_str().unwrap(),
        "Totaaltelling_GR2024_Juinen.eml.xml"
    );
    assert!(xml_reader2.entry().uncompressed_size() > 1024);
    let mut eml_content2 = Vec::new();
    xml_reader2
        .read_to_end_checked(&mut eml_content2)
        .await
        .unwrap();
    let eml_hash2 = sha2::Sha256::digest(&eml_content2);

    // Check that the files inside the zip are the same
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
    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/801/download_zip_total_counts_csb"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}
