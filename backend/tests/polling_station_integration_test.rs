#![cfg(test)]

use reqwest::StatusCode;
use serde_json::json;
use sqlx::SqlitePool;

use backend::polling_station::{
    CandidateVotes, DataEntryRequest, DataEntryResponse, DifferencesCounts, PoliticalGroupVotes,
    PollingStationListResponse, PollingStationResults, VotersCounts, VotesCounts,
};
use backend::validation::ValidationResultCode::IncorrectTotal;
use backend::ErrorResponse;

use crate::utils::serve_api;

mod utils;

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections", "polling_stations")))]
async fn test_polling_station_listing_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/polling_stations/1");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    let body: PollingStationListResponse = response.json().await.unwrap();
    println!("response body: {:?}", &body);
    assert_eq!(status, StatusCode::OK, "Unexpected response status");
    assert_eq!(body.polling_stations.len(), 2);
    assert!(body
        .polling_stations
        .iter()
        .any(|ps| ps.name == "Stembureau \"Op Rolletjes\""));
}

#[sqlx::test(fixtures(path = "../fixtures", scripts("elections")))]
async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = DataEntryRequest {
        data: PollingStationResults {
            recounted: false,
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 2,
                total_admitted_voters_count: 104,
            },
            votes_counts: VotesCounts {
                votes_candidates_counts: 102,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 104,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 102,
                candidate_votes: vec![
                    CandidateVotes {
                        number: 1,
                        votes: 54,
                    },
                    CandidateVotes {
                        number: 2,
                        votes: 48,
                    },
                ],
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
    if status != StatusCode::OK {
        println!("Response body: {:?}", &response.text().await.unwrap());
        panic!("Unexpected response status: {:?}", status);
    }
    let validation_results: DataEntryResponse = response.json().await.unwrap();
    assert_eq!(validation_results.validation_results.errors.len(), 0);
    assert_eq!(validation_results.validation_results.warnings.len(), 0);

    // Finalise the data entry
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1/finalise");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
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
    assert_eq!(errors[0].code, IncorrectTotal);
    assert_eq!(
        errors[0].fields,
        vec![
            "data.voters_counts.total_admitted_voters_count",
            "data.voters_counts.poll_card_count",
            "data.voters_counts.proxy_certificate_count",
            "data.voters_counts.voter_card_count"
        ]
    );
    // error 2
    assert_eq!(errors[1].code, IncorrectTotal);
    assert_eq!(
        errors[1].fields,
        vec![
            "data.votes_counts.total_votes_cast_count",
            "data.votes_counts.votes_candidates_counts",
            "data.votes_counts.blank_votes_count",
            "data.votes_counts.invalid_votes_count"
        ]
    );
    // error 3
    assert_eq!(errors[2].code, IncorrectTotal);
    assert_eq!(
        errors[2].fields,
        vec!["data.political_group_votes[0].total"]
    );
    // error 4
    assert_eq!(errors[3].code, IncorrectTotal);
    assert_eq!(
        errors[3].fields,
        vec![
            "data.votes_counts.votes_candidates_counts",
            "data.political_group_votes"
        ]
    );
    assert_eq!(body.validation_results.warnings.len(), 0);
}
