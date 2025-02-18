#![cfg(test)]

use reqwest::{Response, StatusCode};
use serde_json::json;
use sqlx::SqlitePool;
use std::{collections::BTreeMap, net::SocketAddr};
use test_log::test;

use crate::{
    shared::{create_and_finalise_data_entry, create_and_save_data_entry},
    utils::serve_api,
};
use abacus::{
    data_entry::{
        status::DataEntryStatusName::*, ElectionStatusResponse, ElectionStatusResponseEntry,
        GetDataEntryResponse, SaveDataEntryResponse, ValidationResultCode,
    },
    ErrorResponse,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::typist_login(&addr).await;
    create_and_finalise_data_entry(&addr, cookie, 1, 1).await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
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
          "votes_candidates_count": 5,
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
          },
          {
            "number": 2,
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
      },
      "progress": 60,
      "client_state": {"foo": "bar"}
    });

    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: SaveDataEntryResponse = response.json().await.unwrap();
    let errors = body.validation_results.errors;
    assert_eq!(errors.len(), 5);
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
            "data.votes_counts.votes_candidates_count",
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
            "data.votes_counts.votes_candidates_count",
            "data.political_group_votes"
        ]
    );
    // error 4
    assert_eq!(errors[3].code, ValidationResultCode::F401);
    assert_eq!(errors[3].fields, vec!["data.political_group_votes[0]"]);
    // error 5
    assert_eq!(errors[4].code, ValidationResultCode::F401);
    assert_eq!(errors[4].fields, vec!["data.political_group_votes[1]"]);

    let warnings = body.validation_results.warnings;
    assert_eq!(warnings.len(), 1);
    // warning 1
    assert_eq!(warnings[0].code, ValidationResultCode::W203);
    assert_eq!(
        warnings[0].fields,
        vec![
            "data.votes_counts.total_votes_cast_count",
            "data.voters_counts.total_admitted_voters_count",
        ]
    );
}

#[test(sqlx::test)]
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
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(
        body.error,
        "Failed to deserialize the JSON body into the target type: data: \
         invalid type: null, expected struct PollingStationResults at line 1 column 12"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_data_entry_only_for_existing(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = shared::example_data_entry(None);
    let invalid_id = 123_456_789;

    let url = format!("http://{addr}/api/polling_stations/{invalid_id}/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Check the same for finalising data entries
    let url = format!("http://{addr}/api/polling_stations/{invalid_id}/data_entries/1/finalise");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

/// test that we can get a data entry after saving it
#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_data_entry_get(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = shared::example_data_entry(None);

    // create a data entry
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let save_response: SaveDataEntryResponse = response.json().await.unwrap();

    // get the data entry
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // check that the data entry is the same
    let get_response: GetDataEntryResponse = response.json().await.unwrap();
    assert_eq!(get_response.data, request_body.data);
    assert_eq!(
        get_response.client_state.as_ref(),
        request_body.client_state.as_ref()
    );
    assert_eq!(
        get_response.validation_results,
        save_response.validation_results
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_data_entry_get_finalised(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::typist_login(&addr).await;
    create_and_finalise_data_entry(&addr, cookie, 1, 1).await;

    // get the data entry and expect 404 Not Found
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_polling_station_data_entry_deletion(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let request_body = shared::example_data_entry(None);

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

    // we should not be allowed to delete the entry again
    let response = delete_data_entry(addr).await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

async fn get_statuses(addr: &SocketAddr) -> BTreeMap<u32, ElectionStatusResponseEntry> {
    let url = format!("http://{addr}/api/elections/2/status");
    let response = reqwest::Client::new().get(url).send().await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionStatusResponse = response.json().await.unwrap();
    assert!(!body.statuses.is_empty());
    body.statuses
        .into_iter()
        .fold(BTreeMap::new(), |mut acc, entry| {
            acc.insert(entry.polling_station_id, entry);
            acc
        })
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_election_details_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;

    // Ensure the statuses are "NotStarted"
    let statuses = get_statuses(&addr).await;
    assert_eq!(statuses[&1].status, FirstEntryNotStarted);
    assert_eq!(statuses[&1].first_data_entry_progress, None);
    assert_eq!(statuses[&1].second_data_entry_progress, None);
    assert_eq!(statuses[&2].status, FirstEntryNotStarted);
    assert_eq!(statuses[&2].first_data_entry_progress, None);
    assert_eq!(statuses[&2].second_data_entry_progress, None);

    // Finalise the first entry of one and set the other in progress
    create_and_finalise_data_entry(&addr, cookie.clone(), 1, 1).await;
    create_and_save_data_entry(&addr, cookie.clone(), 2, 1, Some(r#"{"continue": true}"#)).await;

    // polling station 1's first entry is now complete, polling station 2 is still incomplete and set to in progress
    let statuses = get_statuses(&addr).await;
    assert_eq!(statuses[&1].status, SecondEntryNotStarted);
    assert_eq!(statuses[&1].first_data_entry_progress, Some(100));
    assert_eq!(statuses[&1].second_data_entry_progress, None);
    assert_eq!(statuses[&2].status, FirstEntryInProgress);
    assert_eq!(statuses[&2].first_data_entry_progress, Some(60));
    assert_eq!(statuses[&2].second_data_entry_progress, None);

    // Save the entries
    create_and_save_data_entry(&addr, cookie.clone(), 1, 2, Some(r#"{"continue": true}"#)).await;
    create_and_save_data_entry(&addr, cookie.clone(), 2, 1, Some(r#"{"continue": false}"#)).await;

    // polling station 1 should now be SecondEntryInProgress, polling station 2 is still in the FirstEntryInProgress state
    let statuses = get_statuses(&addr).await;
    assert_eq!(statuses[&1].status, SecondEntryInProgress);
    assert_eq!(statuses[&1].first_data_entry_progress, Some(100));
    assert_eq!(statuses[&1].second_data_entry_progress, Some(60));
    assert_eq!(statuses[&2].status, FirstEntryInProgress);
    assert_eq!(statuses[&2].first_data_entry_progress, Some(60));
    assert_eq!(statuses[&2].second_data_entry_progress, None);

    // finalise second data entry for polling station 1
    create_and_finalise_data_entry(&addr, cookie.clone(), 1, 2).await;

    // polling station 1 should now be definitive
    let statuses = get_statuses(&addr).await;
    assert_eq!(statuses[&1].status, Definitive);
    assert_eq!(statuses[&1].first_data_entry_progress, Some(100));
    assert_eq!(statuses[&1].second_data_entry_progress, Some(100));
    assert_eq!(statuses[&2].status, FirstEntryInProgress);
    assert_eq!(statuses[&2].first_data_entry_progress, Some(60));
    assert_eq!(statuses[&2].second_data_entry_progress, None);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "election_3", "users"))))]
async fn test_election_details_status_no_other_election_statuses(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;

    // Save data entry for election 1, polling station 1
    create_and_save_data_entry(&addr, cookie.clone(), 1, 1, Some(r#"{"continue": true}"#)).await;

    // Save data entry for election 2, polling station 3
    create_and_save_data_entry(&addr, cookie.clone(), 3, 1, Some(r#"{"continue": true}"#)).await;

    // Get statuses for election 2
    let url = format!("http://{addr}/api/elections/3/status");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionStatusResponse = response.json().await.unwrap();

    assert_eq!(
        body.statuses.len(),
        1,
        "there can be only one {:?}",
        body.statuses
    );
    assert_eq!(body.statuses[0].polling_station_id, 3);
    assert_eq!(body.statuses[0].status, FirstEntryInProgress);
}
