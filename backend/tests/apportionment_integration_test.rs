#![cfg(test)]

use crate::{
    shared::{
        create_and_finalise_data_entry, create_result, create_result_with_non_example_data_entry,
        differences_counts_zero, political_group_votes_from_test_data_auto,
    },
    utils::serve_api,
};
use abacus::{
    ErrorResponse,
    apportionment::{
        ElectionApportionmentResponse, Fraction, get_total_seats_from_apportionment_result,
    },
    data_entry::{
        DataEntry, PollingStationResults, VotersCounts, VotesCounts, status::ClientState,
    },
    election::Election,
};
use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_4", "users"))))]
async fn test_election_apportionment_works_for_less_than_19_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;

    let data_entry = DataEntry {
        progress: 100,
        data: PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 1200,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 1205,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 1200,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 1205,
            },
            voters_recounts: None,
            differences_counts: differences_counts_zero(),
            political_group_votes: vec![
                political_group_votes_from_test_data_auto(
                    1,
                    &[138, 20, 55, 45, 50, 100, 60, 40, 30, 20, 50, 200],
                ),
                political_group_votes_from_test_data_auto(2, &[20, 15, 5, 3, 2, 15]),
                political_group_votes_from_test_data_auto(3, &[20, 15, 5, 3, 2, 13]),
                political_group_votes_from_test_data_auto(4, &[20, 15, 5, 3, 14]),
                political_group_votes_from_test_data_auto(5, &[20, 15, 5, 16]),
                political_group_votes_from_test_data_auto(6, &[20, 15, 5, 15]),
                political_group_votes_from_test_data_auto(7, &[20, 15, 5, 14]),
                political_group_votes_from_test_data_auto(8, &[32, 15, 5]),
            ],
        },
        client_state: ClientState::new_from_str(None).unwrap(),
    };
    create_result_with_non_example_data_entry(&addr, 7, 4, data_entry).await;

    let url = format!("http://{addr}/api/elections/4/apportionment");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionApportionmentResponse = response.json().await.unwrap();
    assert_eq!(body.seat_assignment.seats, 15);
    assert_eq!(body.seat_assignment.quota, Fraction::new(1200, 15));
    assert_eq!(body.seat_assignment.steps.len(), 5);
    let total_seats = get_total_seats_from_apportionment_result(&body.seat_assignment);
    assert_eq!(total_seats, vec![12, 1, 1, 1, 0, 0, 0, 0]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5", "users"))))]
async fn test_election_apportionment_works_for_19_or_more_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie: axum::http::HeaderValue = shared::coordinator_login(&addr).await;

    let data_entry = DataEntry {
        progress: 100,
        data: PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 1200,
                proxy_certificate_count: 2,
                voter_card_count: 3,
                total_admitted_voters_count: 1205,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 1200,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 1205,
            },
            voters_recounts: None,
            differences_counts: differences_counts_zero(),
            political_group_votes: vec![
                political_group_votes_from_test_data_auto(
                    1,
                    &[78, 20, 55, 45, 50, 0, 60, 40, 30, 20, 50, 152],
                ),
                political_group_votes_from_test_data_auto(2, &[150, 50, 22, 10, 30, 40]),
                political_group_votes_from_test_data_auto(3, &[20, 15, 25, 3, 2, 33]),
                political_group_votes_from_test_data_auto(4, &[20, 15, 25, 24, 15]),
                political_group_votes_from_test_data_auto(5, &[20, 31, 10, 40]),
            ],
        },
        client_state: ClientState::new_from_str(None).unwrap(),
    };

    create_result_with_non_example_data_entry(&addr, 8, 5, data_entry).await;

    let url = format!("http://{addr}/api/elections/5/apportionment");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionApportionmentResponse = response.json().await.unwrap();
    assert_eq!(body.seat_assignment.seats, 23);
    assert_eq!(body.seat_assignment.quota, Fraction::new(1200, 23));
    assert_eq!(body.seat_assignment.steps.len(), 4);
    let total_seats = get_total_seats_from_apportionment_result(&body.seat_assignment);
    assert_eq!(total_seats, vec![12, 6, 1, 2, 2]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3", "users"))))]
async fn test_election_apportionment_error_all_lists_exhausted(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie: axum::http::HeaderValue = shared::coordinator_login(&addr).await;
    create_result(&addr, 3, 3).await;

    let url = format!("http://{addr}/api/elections/3/apportionment");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(
        body.error,
        "All lists are exhausted, not enough candidates to fill all seats"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3", "users"))))]
async fn test_election_apportionment_error_drawing_of_lots_not_implemented(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let data_entry = DataEntry {
        progress: 100,
        data: PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 2,
                total_admitted_voters_count: 104,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 102,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 104,
            },
            voters_recounts: None,
            differences_counts: differences_counts_zero(),
            political_group_votes: vec![
                political_group_votes_from_test_data_auto(1, &[30, 21]),
                political_group_votes_from_test_data_auto(2, &[30, 21]),
            ],
        },
        client_state: ClientState::new_from_str(None).unwrap(),
    };

    create_result_with_non_example_data_entry(&addr, 3, 3, data_entry).await;

    let url = format!("http://{addr}/api/elections/3/apportionment");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Drawing of lots is required");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_apportionment_error_apportionment_not_available_no_polling_stations(
    pool: SqlitePool,
) {
    let addr: std::net::SocketAddr = serve_api(pool).await;
    let cookie = shared::admin_login(&addr).await;

    // Create election without polling stations
    let response = reqwest::Client::new()
        .post(format!("http://{addr}/api/elections"))
        .header("cookie", cookie.clone())
        .json(&serde_json::json!({
            "name": "Test Election",
            "location": "Test Location",
            "number_of_voters": 100,
            "category": "Municipal",
            "number_of_seats": 29,
            "election_date": "2026-01-01",
            "nomination_date": "2026-01-01",
            "status": "DataEntryInProgress",
            "political_groups": [
          {
            "number": 1,
            "name": "Political Group A",
            "candidates": [
              {
                "number": 1,
                "initials": "A.",
                "first_name": "Alice",
                "last_name": "Foo",
                "locality": "Amsterdam",
                "gender": "Female"
              },
              {
                "number": 2,
                "initials": "C.",
                "first_name": "Charlie",
                "last_name": "Doe",
                "locality": "Rotterdam",
                "gender": null
              }
            ]
          }
        ]
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let election: Election = response.json().await.unwrap();

    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let url = format!(
        "http://{}/api/elections/{}/apportionment",
        addr, election.id
    );
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::PRECONDITION_FAILED);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(
        body.error,
        "Election data entry first needs to be finalised"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users", "election_3"))))]
async fn test_election_apportionment_error_apportionment_not_available_until_data_entries_finalised(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let typist_cookie: axum::http::HeaderValue = shared::typist_login(&addr).await;
    let coordinator_cookie: axum::http::HeaderValue = shared::coordinator_login(&addr).await;

    // Add and finalise first data entry
    create_and_finalise_data_entry(&addr, typist_cookie, 3, 1).await;

    let url = format!("http://{addr}/api/elections/3/apportionment");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::PRECONDITION_FAILED);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(
        body.error,
        "Election data entry first needs to be finalised"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_election_apportionment_election_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/1/apportionment");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Item not found");
}
