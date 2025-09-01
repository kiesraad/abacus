#![cfg(test)]

use abacus::{
    committee_session::status::CommitteeSessionStatus, election::ElectionWithPoliticalGroups,
};
use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;
use utils::serve_api;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_election_subcategory(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "election_data": include_str!("../src/eml/tests/eml110a_invalid_election_subcategory.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_election_number_of_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "election_data": include_str!("../src/eml/tests/eml110a_invalid_election_number_of_seats.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_election_missing_region(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "election_data": include_str!("../src/eml/tests/eml110a_invalid_election_missing_region.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_validate_invalid_xml(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "election_data": include_str!("../src/eml/tests/eml110a_invalid_xml.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_file(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_document_type.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_missing_authority(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_missing_authority.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_election_type(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_incorrect_election_type.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_election_id(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_incorrect_election.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_missing_election_domain(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_incorrect_election_domain.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_domain_id(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_incorrect_election_domain.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_wrong_election_date(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_incorrect_election_date.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_empty_affiliates(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_empty_affiliates.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_candidates_validate_empty_candidates(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import/validate");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_data": include_str!("../src/eml/tests/eml230b_invalid_empty_candidates.eml.xml"),
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_save(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "146d", "3784", "efa2", "93b5",
                "721a", "7578", "a43f", "0636",
                "7281", "66a0", "acf1", "55d3",
                "ab25", "083c", "c000", "7096"
            ],
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::CREATED);
    let body: ElectionWithPoliticalGroups = response.json().await.unwrap();
    let committee_session =
        shared::get_election_committee_session(&addr, &admin_cookie, body.id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted,
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_save_empty_stubs(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "", "ae90", "3882", "c2dc",
                "9162", "1950", "", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "candidate_hash": [
                "146d", "3784", "efa2", "93b5",
                "721a", "7578", "a43f", "0636",
                "7281", "66a0", "acf1", "55d3",
                "ab25", "083c", "c000", "7096"
            ],
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_save_empty_candidate_stubs(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "candidate_hash": [
                "146d", "3784", "efa2", "93b5",
                "", "7578", "a43f", "0636",
                "7281", "66a0", "acf1", "55d3",
                "ab25", "083c", "c000", ""
            ],
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_save_wrong_hash(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "1234", "ae90", "3882", "c2dc",
                "9162", "1950", "5678", "0651",
                "34ff", "c0de", "340a", "4a38"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "a0b9", "6a6e", "5d3c", "17fd",
                "6aeb", "3b89", "48df", "2f7a",
                "2165", "7f17", "11a1", "d379",
                "f7cf", "07ef", "7f7a", "cfa2"
            ],
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_import_missing_file_name(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/import");
    let admin_cookie = shared::admin_login(&addr).await;
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
            "election_hash": [
                "84c9", "caba", "ff33", "6c42",
                "9825", "b20c", "2ba9", "1ceb",
                "3c61", "9b99", "8af1", "a57e",
                "cf00", "8930", "9bce", "0c33"
            ],
            "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "146d", "3784", "efa2", "93b5",
                "721a", "7578", "a43f", "0636",
                "7281", "66a0", "acf1", "55d3",
                "ab25", "083c", "c000", "7096"
            ],
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_polling_stations_validate_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
          ],
          "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "146d", "3784", "efa2", "93b5",
                "721a", "7578", "a43f", "0636",
                "7281", "66a0", "acf1", "55d3",
                "ab25", "083c", "c000", "7096"
            ],
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
            "polling_station_file_name": "eml110b_test.eml.xml",
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_polling_stations_validate_missing_filename(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "election_hash": [
              "84c9", "caba", "ff33", "6c42",
              "9825", "b20c", "2ba9", "1ceb",
              "3c61", "9b99", "8af1", "a57e",
              "cf00", "8930", "9bce", "0c33"
          ],
          "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "146d", "3784", "efa2", "93b5",
                "721a", "7578", "a43f", "0636",
                "7281", "66a0", "acf1", "55d3",
                "ab25", "083c", "c000", "7096"
            ],
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../src/eml/tests/eml110b_test.eml.xml"),
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_polling_stations_validate_invalid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/elections/import/validate");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", admin_cookie)
        .json(&serde_json::json!({
          "election_hash": [
                "4291", "a4e7", "c76e", "ed19",
                "476b", "ae90", "3882", "c2dc",
                "9162", "1950", "0e13", "0651",
                "34ff", "c0de", "340a", "4a38"
          ],
          "election_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "candidate_hash": [
                "146d", "3784", "efa2", "93b5",
                "721a", "7578", "a43f", "0636",
                "7281", "66a0", "acf1", "55d3",
                "ab25", "083c", "c000", "7096"
            ],
            "candidate_data": include_str!("../src/eml/tests/eml230b_test.eml.xml"),
            "polling_station_data": include_str!("../src/eml/tests/eml110a_test.eml.xml"),
            "number_of_voters": 1234,
            "counting_method": "CSO",
        }))
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
