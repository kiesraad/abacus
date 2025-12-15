#![cfg(test)]
use abacus::{
    committee_session::status::CommitteeSessionStatus,
    election::{
        ElectionDetailsResponse, ElectionId, ElectionListResponse,
        ElectionNumberOfVotersChangeRequest,
    },
};
use async_zip::base::read::mem::ZipFileReader;
use axum::http::StatusCode;
use sha2::Digest;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        admin_login, coordinator_login, create_polling_station, create_result,
        get_election_committee_session,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_4", "election_5_with_results", "users")
)))]
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_election_details_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/5");
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
        body.current_committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
    assert_eq!(body.committee_sessions.len(), 2);
    assert_eq!(body.election.name, "Corrigendum 2026");
    assert_eq!(body.polling_stations.len(), 2);
    assert!(
        body.polling_stations
            .iter()
            .any(|ps| ps.name == "Testgebouw")
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

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_election_number_of_voters_change_first_session_created_works_for_coordinator(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = ElectionId::from(6);

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let url = format!("http://{addr}/api/elections/{election_id}/voters");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&ElectionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_election_number_of_voters_change_first_session_not_started_works_for_administrator(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = ElectionId::from(6);

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    create_polling_station(&addr, &coordinator_cookie, election_id, 1).await;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    let url = format!("http://{addr}/api/elections/{election_id}/voters");
    let admin_cookie = admin_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", admin_cookie)
        .json(&ElectionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_election_number_of_voters_change_not_first_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/7/voters");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&ElectionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_number_of_voters_change_first_session_in_progress_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/voters");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&ElectionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_number_of_voters_change_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/1/voters");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&ElectionNumberOfVotersChangeRequest {
            number_of_voters: 0,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_pdf_download_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let election_id = ElectionId::from(2);
    create_result(&addr, 1, election_id).await;
    create_result(&addr, 2, election_id).await;

    shared::change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        2,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        shared::get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );
    assert_eq!(committee_session.results_eml, None);
    assert_eq!(committee_session.results_pdf, None);

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/2/download_pdf_results"
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

    let hash1 = sha2::Sha256::digest(response.bytes().await.unwrap());

    let committee_session =
        shared::get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.results_eml, Some(1));
    assert_eq!(committee_session.results_pdf, Some(2));

    // Request the file again
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    let hash2 = sha2::Sha256::digest(response.bytes().await.unwrap());

    // Check that the file is the same
    let committee_session =
        shared::get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.results_eml, Some(1));
    assert_eq!(committee_session.results_pdf, Some(2));
    assert_eq!(hash1, hash2);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_pdf_download_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let election_id = ElectionId::from(2);
    create_result(&addr, 1, election_id).await;
    create_result(&addr, 2, election_id).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2/download_pdf_results");
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
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let election_id = ElectionId::from(2);
    create_result(&addr, 1, election_id).await;
    create_result(&addr, 2, election_id).await;

    shared::change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        2,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        shared::get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );
    assert_eq!(committee_session.results_eml, None);
    assert_eq!(committee_session.results_pdf, None);

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

    let committee_session =
        shared::get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.results_eml, Some(1));
    assert_eq!(committee_session.results_pdf, Some(2));

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
    let committee_session =
        shared::get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.results_eml, Some(1));
    assert_eq!(committee_session.results_pdf, Some(2));
    assert_eq!(eml_hash1, eml_hash2, "EML files should have the same hash");
    assert_eq!(pdf_hash1, pdf_hash2, "PDF files should have the same hash");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_zip_download_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let election_id = ElectionId::from(2);
    create_result(&addr, 1, election_id).await;
    create_result(&addr, 2, election_id).await;

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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_election_na_31_2_inlegvel_download(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/download_na_31_2_inlegvel");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/pdf");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"Model_Na_31_2_Inlegvel.pdf\""
    );

    let bytes = response.bytes().await.unwrap();
    assert!(bytes.len() > 1024);
}
