#![cfg(test)]

use reqwest::StatusCode;
use serde_json::json;
use sqlx::SqlitePool;

use backend::election::ElectionDetailsResponse;
use backend::polling_station::{CandidateVotes, DataEntryResponse, PoliticalGroupVotes};
use backend::validation::ValidationResultCode::IncorrectTotal;
use backend::ErrorResponse;

use crate::utils::serve_api;

mod utils;

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections")))]
async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = backend::polling_station::DataEntryRequest {
        data: backend::polling_station::PollingStationResults {
            voters_counts: backend::polling_station::VotersCounts {
                poll_card_count: 1,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 4,
            },
            votes_counts: backend::polling_station::VotesCounts {
                votes_candidates_counts: 5,
                blank_votes_count: 6,
                invalid_votes_count: 7,
                total_votes_cast_count: 8,
            },
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 9,
                candidate_votes: vec![CandidateVotes {
                    number: 1,
                    votes: 10,
                }],
            }],
        },
    };

    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    println!("response body: {:?}", &response.text().await.unwrap());
    assert_eq!(status, StatusCode::OK);
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

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections")))]
async fn test_polling_station_data_entry_validation(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = json!({
      "data": {
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
    assert_eq!(errors.len(), 3);
    assert_eq!(
        errors[0].fields,
        vec![
            "data.voters_counts.total_admitted_voters_count",
            "data.voters_counts.poll_card_count",
            "data.voters_counts.proxy_certificate_count",
            "data.voters_counts.voter_card_count"
        ]
    );
    assert_eq!(errors[0].code, IncorrectTotal);
    assert_eq!(
        errors[1].fields,
        vec![
            "data.votes_counts.total_votes_cast_count",
            "data.votes_counts.votes_candidates_counts",
            "data.votes_counts.blank_votes_count",
            "data.votes_counts.invalid_votes_count"
        ]
    );
    assert_eq!(errors[1].code, IncorrectTotal);
    assert_eq!(
        errors[2].fields,
        vec!["data.political_group_votes[0].total"]
    );
    assert_eq!(errors[2].code, IncorrectTotal);
    assert_eq!(body.validation_results.warnings.len(), 0);
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections")))]
async fn test_election_list_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: backend::election::ElectionListResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.elections.len(), 2);
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections")))]
async fn test_election_details_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: ElectionDetailsResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body.election.name, "Municipal Election");
}

#[sqlx::test]
async fn test_election_details_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    assert_eq!(status, StatusCode::NOT_FOUND);
}
