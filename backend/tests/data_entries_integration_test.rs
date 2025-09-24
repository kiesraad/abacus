#![cfg(test)]

use std::net::SocketAddr;

use abacus::{
    ErrorResponse,
    data_entry::{
        ClaimDataEntryResponse, ElectionStatusResponse, SaveDataEntryResponse,
        ValidationResultCode, status::DataEntryStatusName::*,
    },
};
use axum::http::HeaderValue;
use reqwest::{Response, StatusCode};
use serde_json::json;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        claim_data_entry, complete_data_entry, example_data_entry, finalise_data_entry,
        get_statuses, save_data_entry,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_valid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::typist_login(&addr).await;

    claim_data_entry(&addr, &cookie, 1, 1).await;

    let res = save_data_entry(&addr, &cookie, 1, 1, example_data_entry(None)).await;
    let validation_results: SaveDataEntryResponse = res.json().await.unwrap();
    assert_eq!(validation_results.validation_results.errors.len(), 0);
    assert_eq!(validation_results.validation_results.warnings.len(), 0);

    finalise_data_entry(&addr, &cookie, 1, 1).await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_validation(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::typist_login(&addr).await;

    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1/claim");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let request_body = json!({
      "data": {
        "model": "CSOFirstSession",
        "extra_investigation": {
          "extra_investigation_other_reason": { "yes": false, "no": false },
          "ballots_recounted_extra_investigation": { "yes": false, "no": false },
        },
        "counting_differences_polling_station": {
          "unexplained_difference_ballots_voters": { "yes": false, "no": true },
          "difference_ballots_per_list": { "yes": false, "no": true },
        },
        "voters_counts": {
          "poll_card_count": 4,
          "proxy_certificate_count": 2,
          "total_admitted_voters_count": 4
        },
        "votes_counts": {
          "political_group_total_votes": [
            {
              "number": 1,
              "total": 11,
            },
            {
              "number": 2,
              "total": 11,
            }
          ],
          "total_votes_candidates_count": 5,
          "blank_votes_count": 6,
          "invalid_votes_count": 7,
          "total_votes_cast_count": 8
        },
        "differences_counts": {
          "more_ballots_count": 4,
          "fewer_ballots_count": 0,
          "compare_votes_cast_admitted_voters": {
            "admitted_voters_equal_votes_cast": false,
            "votes_cast_greater_than_admitted_voters": true,
            "votes_cast_smaller_than_admitted_voters": false
          },
          "difference_completely_accounted_for": { "yes": true, "no": false },
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
        .header("cookie", cookie)
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
            "data.voters_counts.total_admitted_voters_count",
        ]
    );
    // error 2
    assert_eq!(errors[1].code, ValidationResultCode::F202);
    assert_eq!(
        errors[1].fields,
        vec![
            "data.votes_counts.political_group_total_votes[0].total",
            "data.votes_counts.political_group_total_votes[1].total",
            "data.votes_counts.total_votes_candidates_count"
        ]
    );
    // error 3
    assert_eq!(errors[2].code, ValidationResultCode::F203);
    assert_eq!(
        errors[2].fields,
        vec![
            "data.votes_counts.total_votes_candidates_count",
            "data.votes_counts.blank_votes_count",
            "data.votes_counts.invalid_votes_count",
            "data.votes_counts.total_votes_cast_count",
        ]
    );
    // error 4
    assert_eq!(errors[3].code, ValidationResultCode::F402);
    assert_eq!(errors[3].fields, vec!["data.political_group_votes[0]"]);
    // error 5
    assert_eq!(errors[4].code, ValidationResultCode::F402);
    assert_eq!(errors[4].fields, vec!["data.political_group_votes[1]"]);

    let warnings = body.validation_results.warnings;
    assert_eq!(warnings.len(), 3);
    // warning 1
    assert_eq!(warnings[0].code, ValidationResultCode::W201);
    assert_eq!(
        warnings[0].fields,
        vec!["data.votes_counts.blank_votes_count",]
    );
    // warning 2
    assert_eq!(warnings[1].code, ValidationResultCode::W202);
    assert_eq!(
        warnings[1].fields,
        vec!["data.votes_counts.invalid_votes_count"]
    );
    // warning 3
    assert_eq!(warnings[2].code, ValidationResultCode::W203);
    assert_eq!(
        warnings[2].fields,
        vec![
            "data.voters_counts.total_admitted_voters_count",
            "data.votes_counts.total_votes_cast_count",
        ]
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_polling_station_data_entry_invalid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::typist_login(&addr).await;
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .header("content-type", "application/json")
        .header("cookie", cookie)
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
         invalid type: null, expected internally tagged enum PollingStationResults at line 1 column 12"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_only_for_existing(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::typist_login(&addr).await;

    let request_body = example_data_entry(None);
    let invalid_id = 123_456_789;

    let url = format!("http://{addr}/api/polling_stations/{invalid_id}/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    // Check the same for finalising data entries
    let url = format!("http://{addr}/api/polling_stations/{invalid_id}/data_entries/1/finalise");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

/// test that we can get a data entry after saving it
#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_claim(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::typist_login(&addr).await;

    let request_body = example_data_entry(None);

    // claim a data entry
    let claim_url = format!("http://{addr}/api/polling_stations/1/data_entries/1/claim");
    let response = reqwest::Client::new()
        .post(&claim_url)
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // save a data entry
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let save_response: SaveDataEntryResponse = response.json().await.unwrap();

    // claim the data entry again
    let response = reqwest::Client::new()
        .post(&claim_url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // check that the data entry is the same
    let claim_response: ClaimDataEntryResponse = response.json().await.unwrap();
    assert_eq!(claim_response.data, request_body.data);
    assert_eq!(
        claim_response.client_state.as_ref(),
        request_body.client_state.as_ref()
    );
    assert_eq!(
        claim_response.validation_results,
        save_response.validation_results
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_claim_finalised(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::typist_login(&addr).await;
    complete_data_entry(&addr, &cookie, 1, 1, example_data_entry(None)).await;

    // claim the data entry and expect 409 Conflict
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1/claim");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_data_entry_deletion(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::typist_login(&addr).await;
    let request_body = example_data_entry(None);

    // claim a data entry
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1/claim");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // create a data entry
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // delete the data entry
    async fn delete_data_entry(addr: SocketAddr, cookie: &HeaderValue) -> Response {
        let url = format!("http://{addr}/api/polling_stations/1/data_entries/1");
        reqwest::Client::new()
            .delete(&url)
            .header("cookie", cookie)
            .send()
            .await
            .unwrap()
    }
    let response = delete_data_entry(addr, &cookie).await;
    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // we should not be allowed to delete the entry again
    let response = delete_data_entry(addr, &cookie).await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_details_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let typist_cookie = shared::typist_login(&addr).await;
    let typist_user_id = 5;
    let typist2_cookie = shared::typist2_login(&addr).await;
    let typist2_user_id = 6;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let election_id = 2;

    // Ensure the statuses are "NotStarted"
    let statuses = get_statuses(&addr, &coordinator_cookie, election_id).await;

    assert_eq!(statuses[&1].status, FirstEntryNotStarted);
    assert_eq!(statuses[&1].first_entry_user_id, None);
    assert_eq!(statuses[&1].second_entry_user_id, None);
    assert_eq!(statuses[&1].first_entry_progress, None);
    assert_eq!(statuses[&1].second_entry_progress, None);
    assert_eq!(statuses[&2].status, FirstEntryNotStarted);
    assert_eq!(statuses[&2].first_entry_user_id, None);
    assert_eq!(statuses[&2].second_entry_user_id, None);
    assert_eq!(statuses[&2].first_entry_progress, None);
    assert_eq!(statuses[&2].second_entry_progress, None);

    // Finalise the first data entry for polling station 1
    complete_data_entry(&addr, &typist_cookie, 1, 1, example_data_entry(None)).await;

    // Set polling station 2 first entry to in progress
    claim_data_entry(&addr, &typist_cookie, 2, 1).await;
    save_data_entry(
        &addr,
        &typist_cookie,
        2,
        1,
        example_data_entry(Some(r#"{"continue": true}"#)),
    )
    .await;

    // polling station 1's first entry is now complete, polling station 2 is still incomplete and set to in progress
    let statuses = get_statuses(&addr, &coordinator_cookie, election_id).await;

    assert_eq!(statuses[&1].status, SecondEntryNotStarted);
    assert_eq!(statuses[&1].first_entry_user_id, Some(typist_user_id));
    assert_eq!(statuses[&1].second_entry_user_id, None);
    assert_eq!(statuses[&1].first_entry_progress, Some(100));
    assert_eq!(statuses[&1].second_entry_progress, None);

    assert_eq!(statuses[&2].status, FirstEntryInProgress);
    assert_eq!(statuses[&2].first_entry_user_id, Some(typist_user_id));
    assert_eq!(statuses[&2].second_entry_user_id, None);
    assert_eq!(statuses[&2].first_entry_progress, Some(60));
    assert_eq!(statuses[&2].second_entry_progress, None);

    // Claim and save the entries
    claim_data_entry(&addr, &typist2_cookie, 1, 2).await;
    save_data_entry(
        &addr,
        &typist2_cookie,
        1,
        2,
        example_data_entry(Some(r#"{"continue": true}"#)),
    )
    .await;
    save_data_entry(
        &addr,
        &typist_cookie,
        2,
        1,
        example_data_entry(Some(r#"{"continue": false}"#)),
    )
    .await;

    // polling station 1 should now be SecondEntryInProgress, polling station 2 is still in the FirstEntryInProgress state
    let statuses = get_statuses(&addr, &coordinator_cookie, election_id).await;

    assert_eq!(statuses[&1].status, SecondEntryInProgress);
    assert_eq!(statuses[&1].first_entry_user_id, Some(typist_user_id));
    assert_eq!(statuses[&1].second_entry_user_id, Some(typist2_user_id));
    assert_eq!(statuses[&1].first_entry_progress, Some(100));
    assert_eq!(statuses[&1].second_entry_progress, Some(60));

    assert_eq!(statuses[&2].status, FirstEntryInProgress);
    assert_eq!(statuses[&2].first_entry_user_id, Some(typist_user_id));
    assert_eq!(statuses[&2].second_entry_user_id, None);
    assert_eq!(statuses[&2].first_entry_progress, Some(60));
    assert_eq!(statuses[&2].second_entry_progress, None);

    // finalise second data entry for polling station 1
    complete_data_entry(&addr, &typist2_cookie, 1, 2, example_data_entry(None)).await;

    // polling station 1 should now be definitive
    let statuses = get_statuses(&addr, &coordinator_cookie, election_id).await;

    assert_eq!(statuses[&1].status, Definitive);
    assert_eq!(statuses[&1].first_entry_user_id, Some(typist_user_id));
    assert_eq!(statuses[&1].second_entry_user_id, Some(typist2_user_id));
    assert_eq!(statuses[&1].first_entry_progress, Some(100));
    assert_eq!(statuses[&1].second_entry_progress, Some(100));

    assert_eq!(statuses[&2].status, FirstEntryInProgress);
    assert_eq!(statuses[&2].first_entry_user_id, Some(typist_user_id));
    assert_eq!(statuses[&2].second_entry_user_id, None);
    assert_eq!(statuses[&2].first_entry_progress, Some(60));
    assert_eq!(statuses[&2].second_entry_progress, None);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "election_3", "users"))))]
async fn test_election_details_status_no_other_election_statuses(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let typist_cookie = shared::typist_login(&addr).await;

    // Save data entry for election 1, polling station 1
    claim_data_entry(&addr, &typist_cookie, 1, 1).await;
    save_data_entry(
        &addr,
        &typist_cookie,
        1,
        1,
        example_data_entry(Some(r#"{"continue": true}"#)),
    )
    .await;

    // Save data entry for election 2, polling station 3
    claim_data_entry(&addr, &typist_cookie, 3, 1).await;
    save_data_entry(
        &addr,
        &typist_cookie,
        3,
        1,
        example_data_entry(Some(r#"{"continue": true}"#)),
    )
    .await;

    // Get statuses for election 2
    let url = format!("http://{addr}/api/elections/3/status");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

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
