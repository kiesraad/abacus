#![cfg(test)]

use reqwest::{Response, StatusCode};
use serde_json::json;
use sqlx::SqlitePool;
use std::net::SocketAddr;

use backend::polling_station::DataEntryResponse;
use backend::validation::ValidationResultCode;
use backend::ErrorResponse;

use crate::utils::serve_api;

mod shared;
mod utils;

#[sqlx::test(fixtures("../fixtures/elections.sql", "../fixtures/polling_stations.sql"))]
async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    shared::create_and_finalise_data_entry(&addr).await;
}

#[sqlx::test(fixtures("../fixtures/elections.sql", "../fixtures/polling_stations.sql"))]
async fn test_polling_station_data_entry_validation(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = json!({
      "data": {
        "recounted": false,
        "voters_counts": {
          "poll_card_count": 1,
          "proxy_certificate_count": 2,
          "voter_card_count": 3,
          "total_admitted_voters_count": 4
        },
        "votes_counts": {
          "votes_candidates_counts": 5,
          "blank_votes_count": 6,
          "invalid_votes_count": 7,
          "total_votes_cast_count": 8
        },
        "voters_recounts": null,
        "differences_counts": {
          "more_ballots_count": 4,
          "fewer_ballots_count": 0,
          "unreturned_ballots_count": 0,
          "too_few_ballots_handed_out_count": 0,
          "too_many_ballots_handed_out_count": 2,
          "other_explanation_count": 1,
          "no_explanation_count": 1,
        },
        "political_group_votes": [
          {
            "number": 1,
            "total": 11,
            "candidate_votes": [
              {
                "number": 1,
                "votes": 6
              },
              {
                "number": 2,
                "votes": 4
              }
            ]
          }
        ]
      }
    });

    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    if status != StatusCode::OK {
        println!("response body: {:?}", &response.text().await.unwrap());
        panic!("Unexpected response status: {:?}", status);
    }
    let body: DataEntryResponse = response.json().await.unwrap();
    let errors = body.validation_results.errors;
    assert_eq!(errors.len(), 4);
    // error 1
    assert_eq!(errors[0].code, ValidationResultCode::F201);
    assert_eq!(
        errors[0].fields,
        vec![
            "data.voters_counts.poll_card_count",
            "data.voters_counts.proxy_certificate_count",
            "data.voters_counts.voter_card_count",
            "data.voters_counts.total_admitted_voters_count",
        ]
    );
    // error 2
    assert_eq!(errors[1].code, ValidationResultCode::F202);
    assert_eq!(
        errors[1].fields,
        vec![
            "data.votes_counts.votes_candidates_counts",
            "data.votes_counts.blank_votes_count",
            "data.votes_counts.invalid_votes_count",
            "data.votes_counts.total_votes_cast_count",
        ]
    );
    // error 3
    assert_eq!(errors[2].code, ValidationResultCode::F204);
    assert_eq!(
        errors[2].fields,
        vec![
            "data.votes_counts.votes_candidates_counts",
            "data.political_group_votes"
        ]
    );
    // error 4
    assert_eq!(errors[3].code, ValidationResultCode::F401);
    assert_eq!(errors[3].fields, vec!["data.political_group_votes[0]"]);
    let warnings = body.validation_results.warnings;
    assert_eq!(warnings.len(), 1);
    // warning 1
    assert_eq!(warnings[0].code, ValidationResultCode::W203);
    assert_eq!(
        warnings[0].fields,
        vec![
            "data.voters_counts.total_admitted_voters_count",
            "data.votes_counts.total_votes_cast_count"
        ]
    );
}

#[sqlx::test]
async fn test_polling_station_data_entry_invalid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .header("content-type", "application/json")
        .body(r##"{"data":null}"##)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: ErrorResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
    assert_eq!(
        body.error,
        "Failed to deserialize the JSON body into the target type: data: \
         invalid type: null, expected struct PollingStationResults at line 1 column 12"
    );
}

#[sqlx::test(fixtures("../fixtures/elections.sql", "../fixtures/polling_stations.sql"))]
async fn test_polling_station_data_entry_only_for_existing(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = shared::example_data_entry();
    let invalid_id = 123_456_789;

    let url = format!("http://{addr}/api/polling_stations/{invalid_id}/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    assert_eq!(status, StatusCode::NOT_FOUND);

    // Check the same for finalising data entries
    let url = format!("http://{addr}/api/polling_stations/{invalid_id}/data_entries/1/finalise");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[sqlx::test(fixtures("../fixtures/elections.sql", "../fixtures/polling_stations.sql"))]
async fn test_polling_station_data_entry_deletion(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = shared::example_data_entry();

    // create a data entry
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // delete the data entry
    async fn delete_data_entry(addr: SocketAddr) -> Response {
        let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
        reqwest::Client::new().delete(&url).send().await.unwrap()
    }
    let response = delete_data_entry(addr).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // delete a non-existing data entry
    let response = delete_data_entry(addr).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
