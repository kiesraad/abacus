#![cfg(test)]

use std::net::SocketAddr;

use async_zip::base::read::mem::ZipFileReader;
use axum::http::{HeaderValue, StatusCode};
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        ApportionmentAction, FixtureUser::*, apportionment_state_action,
        change_status_committee_session, create_cso_result, create_dso_result,
        get_election_committee_session, login, update_committee_session_details,
    },
    utils::serve_api,
};

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
    assert_eq!(&content_disposition_string[..22], "attachment; filename=\"");
    let filename = content_disposition_string[22..].trim_end_matches('"');
    assert!(
        filename.starts_with(expected_filename_prefix),
        "expected filename {filename} to start with {expected_filename_prefix}"
    );
    assert!(
        filename.ends_with(".zip"),
        "expected filename {filename} to end with .zip"
    );

    response.bytes().await.unwrap().to_vec()
}

/// Returns a list of filename+crc32 tuples to assert all files in a zip,
/// and to compare two zip contents including crc32 hashes of the files.
/// It will also include the list of files from an inner zip.
async fn get_files(bytes: Vec<u8>) -> Vec<(String, u32)> {
    let mut files = Vec::new();
    let archive = ZipFileReader::new(bytes).await.unwrap();

    for (index, file) in archive.file().entries().iter().enumerate() {
        let filename = file.filename().as_str().unwrap();
        assert!(file.uncompressed_size() > 512, "{filename} was too small");

        if filename.ends_with(".zip") {
            // Do not compare crc32 for zip files
            files.push((filename.to_string(), 0));
            // Add all files from zip-in-zip as well, prefixed with inner zip filename
            let mut reader = archive.reader_with_entry(index).await.unwrap();
            let mut buf = Vec::new();
            reader.read_to_end_checked(&mut buf).await.unwrap();
            for (inner_filename, crc) in Box::pin(get_files(buf)).await {
                files.push((format!("{filename}/{inner_filename}"), crc));
            }
        } else {
            files.push((filename.to_string(), file.crc32()));
        }
    }

    files
}

/// Extract only the filenames, for assertions
fn filenames(files: &[(String, u32)]) -> Vec<&String> {
    files.iter().map(|(filename, _)| filename).collect()
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
    assert!(reader.entry().uncompressed_size() > 512);
    let mut buf = Vec::new();
    reader.read_to_end_checked(&mut buf).await.unwrap();
    buf
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2", "users"))))]
async fn test_gsb_cso_election_first_session_zip_download_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorGSB).await;
    let election_id = 2;
    create_cso_result(&addr, 201, election_id).await;
    create_cso_result(&addr, 202, election_id).await;
    complete_committee_session(&addr, &cookie, election_id, 2).await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/2/download_zip_results"
    );
    let prefix = "definitieve-documenten_gr2024_heemdamseburg_gemeente_heemdamseburg-";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let files = get_files(bytes).await;
    assert_eq!(
        filenames(&files),
        [
            "Model_Na31-2.pdf",
            "Telling_GR2024_Heemdamseburg.zip",
            "Telling_GR2024_Heemdamseburg.zip/Telling_GR2024_Heemdamseburg.eml.xml",
            "osv4-3_telling_gr2024_heemdamseburg.csv",
        ]
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let files2 = get_files(bytes2).await;
    assert_eq!(files, files2);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_11_dso", "users"))))]
async fn test_gsb_dso_election_first_session_zip_download_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorGSB).await;
    let election_id = 11;
    create_dso_result(&addr, 1101, election_id).await;
    create_dso_result(&addr, 1102, election_id).await;
    complete_committee_session(&addr, &cookie, election_id, 11).await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/11/download_zip_results"
    );
    let prefix = "definitieve-documenten_ab2026_rivierenpolder_gemeente_heemdamseburg-";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let files = get_files(bytes).await;
    assert_eq!(
        filenames(&files),
        [
            "Model_Na31-1.pdf",
            "Telling_AB2026_Heemdamseburg.zip",
            "Telling_AB2026_Heemdamseburg.zip/Telling_AB2026_Heemdamseburg.eml.xml",
            "osv4-3_telling_ab2026_heemdamseburg.csv",
        ]
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let files2 = get_files(bytes2).await;
    assert_eq!(files, files2);
}

#[test(sqlx::test(fixtures(
    path = "../../fixtures",
    scripts("election_5_with_results", "users")
)))]
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
    let prefix = "correctie_gr2026_juinen_gemeente_juinen-";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let files = get_files(bytes).await;
    assert_eq!(
        filenames(&files),
        [
            "Model_Na14-2.pdf",
            "Telling_GR2026_Juinen.zip",
            "Telling_GR2026_Juinen.zip/Telling_GR2026_Juinen.eml.xml",
            "osv4-3_telling_gr2026_juinen.csv",
            "Leeg_Model_P2a.pdf",
        ]
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let files2 = get_files(bytes2).await;
    assert_eq!(files, files2);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2", "users"))))]
async fn test_gsb_election_zip_download_invalid_committee_session_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorGSB).await;
    create_cso_result(&addr, 201, 2).await;
    create_cso_result(&addr, 202, 2).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2/download_zip_results");
    assert_zip_download_conflict(&cookie, &url).await;
}

#[test(sqlx::test(fixtures(
    path = "../../fixtures",
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
    apportionment_state_action(
        &addr,
        &cookie,
        election_id,
        ApportionmentAction::SkipDeceasedCandidates,
    )
    .await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results_csb"
    );
    let prefix = "vaststelling-uitslag_gr2024_juinen_gemeente_juinen";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let files = get_files(bytes).await;
    assert_eq!(
        filenames(&files),
        [
            "Model_P22-2.pdf",
            "Resultaat_GR2024_Juinen.zip",
            "Resultaat_GR2024_Juinen.zip/Resultaat_GR2024_Juinen.eml.xml",
        ]
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let files2 = get_files(bytes2).await;
    assert_eq!(files, files2);
}

#[test(sqlx::test(fixtures(
    path = "../../fixtures",
    scripts("election_13_csb_ws_completed", "users")
)))]
async fn test_csb_election_zip_download_water_authority(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 13;
    let committee_session_id = 1301;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results_csb"
    );
    let prefix = "vaststelling-uitslag_ab2023_rivierenpolder_waterschap_rivier-en-polder";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let files = get_files(bytes).await;
    assert_eq!(
        filenames(&files),
        [
            "Model_P22-2.pdf",
            "Resultaat_AB2023_RivierenPolder.zip",
            "Resultaat_AB2023_RivierenPolder.zip/Resultaat_AB2023_RivierenPolder.eml.xml"
        ]
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let files2 = get_files(bytes2).await;
    assert_eq!(files, files2);
}

#[test(sqlx::test(fixtures(
    path = "../../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_results_invalid_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results_csb"
    );

    // Committee session is not completed
    assert_zip_download_conflict(&cookie, &url).await;

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

    // Apportionment state is not finalised
    assert_zip_download_conflict(&cookie, &url).await;
}

#[test(sqlx::test(fixtures(
    path = "../../fixtures",
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
    apportionment_state_action(
        &addr,
        &cookie,
        election_id,
        ApportionmentAction::SkipDeceasedCandidates,
    )
    .await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_attachment_csb"
    );
    let prefix = "model-p22-2-bijlage_gr2024_juinen_gemeente_juinen";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let files = get_files(bytes).await;
    assert_eq!(filenames(&files), ["Model_P22-2_bijlage.pdf"]);

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let files2 = get_files(bytes2).await;
    assert_eq!(files, files2);
}
//
#[test(sqlx::test(fixtures(
    path = "../../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_attachment_invalid_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_attachment_csb"
    );

    // Committee session is not completed
    assert_zip_download_conflict(&cookie, &url).await;

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

    // Apportionment state is not finalised
    assert_zip_download_conflict(&cookie, &url).await;
}

#[test(sqlx::test(fixtures(
    path = "../../fixtures",
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
    apportionment_state_action(
        &addr,
        &cookie,
        election_id,
        ApportionmentAction::SkipDeceasedCandidates,
    )
    .await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_total_counts_csb"
    );
    let prefix = "definitieve-documenten_gr2024_juinen_gemeente_juinen";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let files = get_files(bytes).await;
    assert_eq!(
        filenames(&files),
        [
            "osv4-3_telling_gr2024_juinen.csv",
            "Totaaltelling_GR2024_Juinen.zip",
            "Totaaltelling_GR2024_Juinen.zip/Totaaltelling_GR2024_Juinen.eml.xml",
        ]
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let files2 = get_files(bytes2).await;
    assert_eq!(files, files2);
}

#[test(sqlx::test(fixtures(
    path = "../../fixtures",
    scripts("election_13_csb_ws_completed", "users")
)))]
async fn test_csb_election_zip_download_total_counts_water_authority(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 13;
    let committee_session_id = 1301;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_total_counts_csb"
    );
    let prefix = "definitieve-documenten_ab2023_rivierenpolder_waterschap_rivier-en-polder";

    let bytes = download_zip_assert(&cookie, &url, prefix).await;
    let files = get_files(bytes).await;
    assert_eq!(
        filenames(&files),
        [
            "osv4-3_telling_ab2023_rivierenpolder.csv",
            "Totaaltelling_AB2023_RivierenPolder.zip",
            "Totaaltelling_AB2023_RivierenPolder.zip/Totaaltelling_AB2023_RivierenPolder.eml.xml"
        ]
    );

    let bytes2 = download_zip_assert(&cookie, &url, prefix).await;
    let files2 = get_files(bytes2).await;
    assert_eq!(files, files2);
}

#[test(sqlx::test(fixtures(
    path = "../../fixtures",
    scripts("election_8_csb_with_results", "users")
)))]
async fn test_csb_election_zip_download_total_counts_invalid_state(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let election_id = 8;
    let committee_session_id = 801;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_total_counts_csb"
    );

    // Committee session is not completed
    assert_zip_download_conflict(&cookie, &url).await;

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

    // Apportionment state is not finalised
    assert_zip_download_conflict(&cookie, &url).await;
}
