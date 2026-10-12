#![cfg(test)]

use std::net::SocketAddr;

use async_zip::{Compression, ZipEntryBuilder, tokio::write::ZipFileWriter};
use axum::http::{HeaderValue, StatusCode};
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        FixtureUser::{Admin, CoordinatorCSB},
        get_statuses, import_certificate, login, post_multipart,
    },
    utils::serve_api,
};

async fn import_election(addr: &SocketAddr, admin_cookie: &HeaderValue) -> u64 {
    let response = reqwest::Client::new()
        .post(format!("http://{addr}/api/elections/import"))
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "CSB",
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "146d", "3784", "efa2", "93b5",
                "721a", "7578", "a43f", "0636",
                "7281", "66a0", "acf1", "55d3",
                "ab25", "083c", "c000", "7096"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body: serde_json::Value = response.json().await.unwrap();
    body["id"].as_u64().unwrap()
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_certificate_import_and_gsb_count_import(pool: SqlitePool) {
    // To create a certificate and signature
    // - cd backend/eml_signature
    // - cargo run --example create GR2022_Test 0000 Test 2022-03-16 2022-03-16
    // - cargo run --example sign PSB0000.key PSB0000.crt ../src/eml/tests/eml510b_test.eml.xml
    // - mv PSB0000.crt ../src/eml/tests/eml510b_test.crt

    let addr = serve_api(pool).await;

    let admin_cookie = login(&addr, Admin).await;
    let election_id = import_election(&addr, &admin_cookie).await;

    let certificate = include_str!("../../src/eml/tests/eml510b_test.crt");
    let response = import_certificate(&addr, &admin_cookie, election_id, certificate).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let import_url = format!("http://{addr}/api/elections/{election_id}/data_entry/import");

    // Make ZIP with EML file and signature
    let mut writer = ZipFileWriter::with_tokio(Vec::new());
    let entry = ZipEntryBuilder::new("count.eml.xml".into(), Compression::Deflate);
    let eml = include_bytes!("../../src/eml/tests/eml510b_test.eml.xml");
    writer.write_entry_whole(entry, eml).await.unwrap();
    let entry = ZipEntryBuilder::new("count.eml.xml.signature".into(), Compression::Deflate);
    let signature = include_bytes!("../../src/eml/tests/eml510b_test.eml.xml.signature");
    writer.write_entry_whole(entry, signature).await.unwrap();
    let zip = writer.close().await.unwrap().into_inner();

    let hash = serde_json::json!([
        "5497", "947b", "9664", "d818", "2120", "c6ae", "9e05", "ce5b", "12bd", "3430", "b44a",
        "778a", "cc6a", "253f", "78c2", "64f6"
    ]);

    // Validate without hash
    let validate_url = format!("{import_url}/validate");
    let fields = [("data", zip.as_slice())];
    let response = post_multipart(&validate_url, &coordinator_cookie, &fields).await;
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["election_name"], "Gemeenteraad Test 2022");
    assert_eq!(body["election_date"], "2022-03-16");
    assert_eq!(body["sub_committee"]["authority_id"], "0000");
    assert_eq!(body["sub_committee"]["authority_name"], "Test");

    // Import with wrong hash should return error
    let wrong_hash = serde_json::json!(vec!["0000"; 16]).to_string();
    let fields = [("hash", wrong_hash.as_bytes()), ("data", zip.as_slice())];
    let response = post_multipart(&import_url, &coordinator_cookie, &fields).await;
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    // Import with correct hash should succeed
    let hash = hash.to_string();
    let fields = [("hash", hash.as_bytes()), ("data", zip.as_slice())];
    let response = post_multipart(&import_url, &coordinator_cookie, &fields).await;
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["election_name"], "Gemeenteraad Test 2022");
    assert_eq!(body["sub_committee"]["authority_id"], "0000");
    let sub_committee_id = u32::try_from(body["sub_committee"]["id"].as_u64().unwrap()).unwrap();

    // The imported results are saved as the finalised first entry
    let statuses = get_statuses(
        &addr,
        &coordinator_cookie,
        u32::try_from(election_id).unwrap(),
    )
    .await;
    let status = &statuses[&sub_committee_id];
    assert_eq!(status["status"], "first_entry_finalised");
    assert_eq!(status["first_entry_origin"]["type"], "Import");

    // Importing the same file again is not allowed
    let response = post_multipart(&import_url, &coordinator_cookie, &fields).await;
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["reference"], "DataEntryAlreadyImported");
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_wrong_signature(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let admin_cookie = login(&addr, Admin).await;
    let election_id = import_election(&addr, &admin_cookie).await;

    let certificate = include_str!("../../src/eml/tests/eml510b_test.crt");
    let response = import_certificate(&addr, &admin_cookie, election_id, certificate).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let import_url = format!("http://{addr}/api/elections/{election_id}/data_entry/import");

    // Make ZIP with EML file and signature
    let mut writer = ZipFileWriter::with_tokio(Vec::new());
    let entry = ZipEntryBuilder::new("count.eml.xml".into(), Compression::Deflate);
    let eml = include_bytes!("../../src/eml/tests/eml510b_test.eml.xml");
    writer.write_entry_whole(entry, eml).await.unwrap();
    let entry = ZipEntryBuilder::new("count.eml.xml.signature".into(), Compression::Deflate);
    let wrong_signature: &[u8] =
        include_bytes!("../../src/eml/tests/eml510b_tampered.eml.xml.signature");
    writer
        .write_entry_whole(entry, wrong_signature)
        .await
        .unwrap();
    let zip = writer.close().await.unwrap().into_inner();

    // Import with wrong signature should fail
    let hash = serde_json::json!([
        "5497", "947b", "9664", "d818", "2120", "c6ae", "9e05", "ce5b", "12bd", "3430", "b44a",
        "778a", "cc6a", "253f", "78c2", "64f6"
    ])
    .to_string();
    let hash = hash.to_string();
    let fields = [("hash", hash.as_bytes()), ("data", zip.as_slice())];
    let response = post_multipart(&import_url, &coordinator_cookie, &fields).await;
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["reference"], "SignatureUnknown");
}
