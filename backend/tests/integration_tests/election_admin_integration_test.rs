#![cfg(test)]

use async_zip::{Compression, ZipEntryBuilder, tokio::write::ZipFileWriter};
use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{FixtureUser::*, get_election_details, get_statuses, login, post_multipart},
    utils::serve_api,
};

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_gsb_election_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "GSB",
          "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_category"], "GSB");
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_gsb_election_validate_invalid_election_limited_elections_supported(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "GSB",
          "election_data": include_str!("../../src/eml/tests/eml110a_invalid_election_limited_elections_supported.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_gsb_election_validate_invalid_election_category_and_sub_category_mismatch(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "GSB",
          "election_data": include_str!("../../src/eml/tests/eml110a_invalid_election_category_and_sub_category_mismatch.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_election_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "CSB",
          "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_category"], "CSB");
    assert_eq!(body["election"]["committee_category"], "CSB");
    // CSB responses don't have these GSB-specific fields
    assert!(body.get("number_of_voters").is_none());
    assert!(body.get("polling_stations").is_none());
    assert!(
        body.get("polling_station_definition_matches_election")
            .is_none()
    );
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_municipal_election_validate_with_candidates(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "CSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_category"], "CSB");
    assert_eq!(body["election"]["committee_category"], "CSB");
    // CSB responses don't have number_of_voters field
    assert!(body.get("number_of_voters").is_none());
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_water_authority_election_validate_with_candidates(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "CSB",
            "election_hash": [
                "21d3", "291c", "fc95", "b2ed",
                "2eed", "37b6", "c697", "d202",
                "e4e0", "db18", "d30c", "40e3",
                "4c17", "66ac", "1d82", "afbc",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test_AB.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test_AB.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_category"], "CSB");
    assert_eq!(body["election"]["authority_id"], "CSB");
    assert_eq!(body["election"]["authority_name"], "Rivier en Polder");
    assert_eq!(body["election"]["category"], "WaterAuthority");
    assert_eq!(body["election"]["committee_category"], "CSB");
    assert_eq!(body["election"]["district"]["district"], "None");
    assert_eq!(body["election"]["name"], "Waterschap Rivier en Polder 2023");
    assert_eq!(
        body["election"]["official_name"],
        "Algemeen bestuur van het waterschap Rivier en Polder 2023"
    );
    // CSB responses don't have these GSB-specific fields.
    assert!(body.get("number_of_voters").is_none());
    assert!(body.get("gsb_list").is_none());
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_municipal_election_import_save(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "CSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_category"], "CSB");
    assert!(body["counting_method"].is_null());

    let election_id = u32::try_from(body["id"].as_u64().unwrap()).unwrap();
    let election_details = get_election_details(&addr, &admin_cookie, election_id).await;
    assert_eq!(election_details["election"]["committee_category"], "CSB");
    assert!(election_details["election"]["counting_method"].is_null());
    assert_eq!(election_details["election"]["number_of_voters"], 1);
    assert_eq!(
        election_details["current_committee_session"]["status"],
        "in_preparation"
    );

    // CSB for GR has exactly one sub committee (the GSB of the municipality itself).
    let statuses = get_statuses(&addr, &admin_cookie, election_id).await;
    assert_eq!(statuses.len(), 1);
    let sub_committee = &statuses.values().next().unwrap()["source"];
    assert_eq!(sub_committee["authority_id"], "0000");
    assert_eq!(sub_committee["authority_name"], "Test");
    assert_eq!(sub_committee["name"], "Test");
    assert_eq!(sub_committee["number"], 0);
    assert_eq!(sub_committee["type"], "SubCommittee");
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_election_import_and_gsb_count_import(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let client = reqwest::Client::new();

    let admin_cookie = login(&addr, Admin).await;
    let response = client
        .post(format!("http://{addr}/api/elections/import"))
        .header("cookie", &admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "CSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body: serde_json::Value = response.json().await.unwrap();
    let election_id = body["id"].as_u64().unwrap();

    let coordinator_cookie = login(&addr, CoordinatorCSB).await;
    let import_url = format!("http://{addr}/api/elections/{election_id}/data_entry/import");

    // Make ZIP with EML file
    let mut writer = ZipFileWriter::with_tokio(Vec::new());
    let entry = ZipEntryBuilder::new("count.eml.xml".into(), Compression::Deflate);
    let eml = include_bytes!("../../src/eml/tests/eml510b_test.eml.xml");
    writer.write_entry_whole(entry, eml).await.unwrap();
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
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_water_authority_election_import_save(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "CSB",
            "election_hash": [
                "21d3", "291c", "fc95", "b2ed",
                "2eed", "37b6", "c697", "d202",
                "e4e0", "db18", "d30c", "40e3",
                "4c17", "66ac", "1d82", "afbc",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test_AB.eml.xml"),
            "candidate_hash": [
                "5708", "8b85", "4f52", "aeac",
                "7097", "6d45", "6ebe", "d319",
                "5bc0", "0c7d", "bd87", "52a8",
                "48d6", "a153", "333c", "1649",
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test_AB.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["committee_category"], "CSB");
    assert!(body["counting_method"].is_null());

    let election_id = u32::try_from(body["id"].as_u64().unwrap()).unwrap();
    let election_details = get_election_details(&addr, &admin_cookie, election_id).await;
    assert_eq!(election_details["election"]["committee_category"], "CSB");
    assert!(election_details["election"]["counting_method"].is_null());
    assert_eq!(election_details["election"]["number_of_voters"], 1);
    assert_eq!(
        election_details["current_committee_session"]["status"],
        "in_preparation"
    );

    // CSB for WS has a sub committee for each GSB.
    let statuses = get_statuses(&addr, &admin_cookie, election_id).await;
    assert_eq!(statuses.len(), 4);
    let heemdamseburg = &statuses.values().next().unwrap()["source"]; // First sub committee in the EML
    assert_eq!(heemdamseburg["authority_id"], "0123");
    assert_eq!(heemdamseburg["authority_name"], "Heemdamseburg");
    assert_eq!(heemdamseburg["name"], "Heemdamseburg");
    assert_eq!(heemdamseburg["number"], 123);
    assert_eq!(heemdamseburg["type"], "SubCommittee");
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_csb_election_import_only_municipal_and_water_authority_elections_supported(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "CSB",
            "election_hash": [
                "4011", "894b", "16de", "b0cf",
                "51ca", "a653", "3880", "dbd7",
                "16a2", "4809", "2d7e", "ac16",
                "826d", "d292", "04fd", "9253",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test_PS1.eml.xml"),
            "candidate_hash": [
                "95ea", "3b22", "d86e", "bd75",
                "1067", "2ae1", "73f8", "bb48",
                "262d", "b348", "4fe5", "87d2",
                "0845", "8b5b", "9f6a", "d84a",
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test_PS1.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_validate_missing_election_domain(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "GSB",
          "election_data": include_str!("../../src/eml/tests/eml110a_invalid_election_missing_election_domain.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_gsb_election_validate_hash_file_instead_of_election_definition(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "GSB",
          "election_data": "5738 d520 a7f2 89b8 8875 ebfe cfc8 6012 d7b6 f65f 3271 d0e1 180b ccdd 8134 cd5d",
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["reference"], "EmlImportError");
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_document_type.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_missing_authority(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_missing_authority.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_election_type(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election_type.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_election_id(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_missing_election_domain(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election_domain.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_domain_id(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election_domain.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_election_date(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_incorrect_election_date.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_empty_affiliates(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_empty_affiliates.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_empty_candidates(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../../src/eml/tests/eml230b_invalid_empty_candidates.eml.xml"),
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_import_save_with_polling_stations(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
    let body: serde_json::Value = response.json().await.unwrap();
    let election_details = get_election_details(
        &addr,
        &admin_cookie,
        u32::try_from(body["id"].as_u64().unwrap()).unwrap(),
    )
    .await;
    assert_eq!(election_details["election"]["counting_method"], "CSO");
    assert_eq!(election_details["election"]["number_of_voters"], 1234);
    assert_eq!(
        election_details["current_committee_session"]["status"],
        "in_preparation"
    );
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_import_save_without_polling_stations(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
    let body: serde_json::Value = response.json().await.unwrap();
    let election_details = get_election_details(
        &addr,
        &admin_cookie,
        u32::try_from(body["id"].as_u64().unwrap()).unwrap(),
    )
    .await;
    assert_eq!(election_details["election"]["counting_method"], "CSO");
    assert_eq!(election_details["election"]["number_of_voters"], 1234);
    assert_eq!(
        election_details["current_committee_session"]["status"],
        "created"
    );
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_import_save_empty_stubs(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "", "0323", "bc85", "d000",
                "93e4", "1cc2", "", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_import_save_empty_candidate_stubs(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", ""
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_import_save_wrong_hash(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "1234", "0323", "bc85", "d000",
                "93e4", "1cc2", "5678", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "a0b9", "6a6e", "5d3c", "17fd",
                "6aeb", "3b89", "48df", "2f7a",
                "2165", "7f17", "11a1", "d379",
                "f7cf", "07ef", "7f7a", "cfa2"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_import_missing_file_name(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_test.eml.xml"),
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_polling_stations_not_matching_election(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "GSB",
          "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
          ],
          "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_not_matching_election_id.eml.xml"),
            "polling_station_file_name": "eml110b_not_matching_election_id.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["polling_station_definition_matches_election"], false);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_polling_stations_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "GSB",
          "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
          ],
          "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["polling_station_definition_matches_election"], true);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_polling_stations_validate_missing_filename(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "committee_category": "GSB",
            "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03",
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110b_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_election_polling_stations_validate_invalid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, Admin).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "committee_category": "GSB",
          "election_hash": [
                "9ec4", "63e4", "7c98", "544f",
                "e4b8", "0323", "bc85", "d000",
                "93e4", "1cc2", "53ae", "bf8d",
                "cf84", "99b3", "24f0", "7334"
          ],
          "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "7c1a", "b8f2", "aa51", "2b77",
                "0116", "802a", "9c46", "5ece",
                "5eab", "760d", "2f59", "9f21",
                "d21b", "e0c2", "8f0d", "fa03"
            ],
            "candidate_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
