#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        create_and_finalise_data_entry, create_result, create_result_with_non_example_data_entry,
    },
    utils::serve_api,
};
use abacus::{
    apportionment::{
        get_total_seats_from_apportionment_result, ElectionApportionmentResponse, Fraction,
    },
    data_entry::{
        status::ClientState, CandidateVotes, DataEntry, DifferencesCounts, PoliticalGroupVotes,
        PollingStationResults, VotersCounts, VotesCounts,
    },
    election::Election,
    ErrorResponse,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_election_apportionment_works_for_less_than_19_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let typist_cookie = shared::typist_login(&addr).await;
    create_result(&addr, typist_cookie.clone(), 1, 2).await;
    create_result(&addr, typist_cookie.clone(), 2, 2).await;

    let url = format!("http://{addr}/api/elections/2/apportionment");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionApportionmentResponse = response.json().await.unwrap();
    assert_eq!(body.apportionment.seats, 15);
    assert_eq!(body.apportionment.quota, Fraction::new(204, 15));
    assert_eq!(body.apportionment.steps.len(), 1);
    let total_seats = get_total_seats_from_apportionment_result(body.apportionment);
    assert_eq!(total_seats, vec![9, 6]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3", "users"))))]
async fn test_election_apportionment_works_for_19_or_more_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie: axum::http::HeaderValue = shared::coordinator_login(&addr).await;
    let typist_cookie = shared::typist_login(&addr).await;
    create_result(&addr, typist_cookie.clone(), 3, 3).await;

    let url = format!("http://{addr}/api/elections/3/apportionment");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionApportionmentResponse = response.json().await.unwrap();
    assert_eq!(body.apportionment.seats, 29);
    assert_eq!(body.apportionment.quota, Fraction::new(102, 29));
    assert_eq!(body.apportionment.steps.len(), 1);
    let total_seats = get_total_seats_from_apportionment_result(body.apportionment);
    assert_eq!(total_seats, vec![17, 12]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3", "users"))))]
async fn test_election_apportionment_error_drawing_of_lots_not_implemented(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let typist_cookie = shared::typist_login(&addr).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let data_entry = DataEntry {
        progress: 60,
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
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![
                PoliticalGroupVotes {
                    number: 1,
                    total: 51,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 30,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 21,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 2,
                    total: 51,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 30,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 21,
                        },
                    ],
                },
            ],
        },
        client_state: ClientState::new_from_str(None).unwrap(),
    };

    create_result_with_non_example_data_entry(&addr, typist_cookie, 3, 3, data_entry).await;

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
