#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{FixtureUser::*, get_election_details, get_statuses, login},
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
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
                "972b", "b30f", "70ae", "5632",
                "702c", "5b1e", "2d34", "e30e",
                "16b2", "d9dd", "0a94", "57eb",
                "0877", "8ed3", "cedf", "0904",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9",
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
                "972b", "b30f", "70ae", "5632",
                "702c", "5b1e", "2d34", "e30e",
                "16b2", "d9dd", "0a94", "57eb",
                "0877", "8ed3", "cedf", "0904",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test_AB.eml.xml"),
            "candidate_hash": [
                "9526", "1053", "22c1", "69e1",
                "abb0", "1b89", "65cc", "5cfd",
                "49c0", "392a", "161a", "5ba4",
                "5e96", "77ae", "fe0d", "b775",
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
                "4e34", "9467", "c418", "efcd",
                "f2c4", "b302", "bafd", "30ba",
                "b0eb", "5689", "aaeb", "3d5e",
                "f4c8", "9bd3", "0a51", "e384",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test_PS1.eml.xml"),
            "candidate_hash": [
                "d464", "56c3", "78b3", "941a",
                "baff", "1ee2", "eb41", "d88c",
                "0af8", "465c", "33aa", "6559",
                "ac15", "5a78", "64b0", "09d4",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",            ],
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",            ],
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",            ],
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
"c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",            ],
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
        "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [

                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [

                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9",
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
                "c738", "4baf", "7edc", "13e6",
                "", "ceb1", "57db", "d48a",
                "88fc", "771b", "", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
            ],
            "election_data": include_str!("../../src/eml/tests/eml230b_test.eml.xml"),
            "candidate_hash": [

                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9",
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "0e5b", "7360", "6c66", "4093",
                "", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "",
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
                "c738", "4baf", "7edc", "13e6",
                "1234", "ceb1", "57db", "d48a",
                "88fc", "771b", "5678", "a7c5",
                "a5a3", "aca7", "acbe", "ee24"
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9"
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
          ],
          "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9"
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
          ],
          "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9"
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
                "c738", "4baf", "7edc", "13e6",
                "ede8", "ceb1", "57db", "d48a",
                "88fc", "771b", "be49", "a7c5",
                "a5a3", "aca7", "acbe", "ee24",
            ],
            "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9"
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
              "c738", "4baf", "7edc", "13e6",
              "ede8", "ceb1", "57db", "d48a",
              "88fc", "771b", "be49", "a7c5",
              "a5a3", "aca7", "acbe", "ee24",
          ],
          "election_data": include_str!("../../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "0e5b", "7360", "6c66", "4093",
                "68e5", "f853", "1470", "b5cf",
                "5293", "21dd", "f92e", "76b8",
                "8ed5", "f18e", "81f6", "4fe9"
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
