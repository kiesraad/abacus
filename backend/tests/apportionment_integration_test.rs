#![cfg(test)]

use crate::{
    shared::{
        create_and_finalise_data_entry, create_result, create_result_with_non_example_data_entry,
    },
    utils::serve_api,
};
use abacus::{
    ErrorResponse,
    apportionment::{
        ElectionApportionmentResponse, Fraction, get_total_seats_from_apportionment_result,
    },
    data_entry::{
        CandidateVotes, DataEntry, DifferencesCounts, PoliticalGroupVotes, PollingStationResults,
        VotersCounts, VotesCounts, status::ClientState,
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
    let typist_cookie = shared::typist_login(&addr).await;
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
                    total: 808,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 138,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 55,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 45,
                        },
                        CandidateVotes {
                            number: 5,
                            votes: 50,
                        },
                        CandidateVotes {
                            number: 6,
                            votes: 100,
                        },
                        CandidateVotes {
                            number: 7,
                            votes: 60,
                        },
                        CandidateVotes {
                            number: 8,
                            votes: 40,
                        },
                        CandidateVotes {
                            number: 9,
                            votes: 30,
                        },
                        CandidateVotes {
                            number: 10,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 11,
                            votes: 50,
                        },
                        CandidateVotes {
                            number: 12,
                            votes: 200,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 2,
                    total: 60,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 5,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 3,
                        },
                        CandidateVotes {
                            number: 5,
                            votes: 2,
                        },
                        CandidateVotes {
                            number: 6,
                            votes: 15,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 3,
                    total: 58,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 5,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 3,
                        },
                        CandidateVotes {
                            number: 5,
                            votes: 2,
                        },
                        CandidateVotes {
                            number: 6,
                            votes: 13,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 4,
                    total: 57,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 5,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 3,
                        },
                        CandidateVotes {
                            number: 5,
                            votes: 14,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 5,
                    total: 56,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 5,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 16,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 6,
                    total: 55,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 5,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 15,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 7,
                    total: 54,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 5,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 14,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 8,
                    total: 52,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 32,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 5,
                        },
                    ],
                },
            ],
        },
        client_state: ClientState::new_from_str(None).unwrap(),
    };
    create_result_with_non_example_data_entry(&addr, typist_cookie.clone(), 7, 4, data_entry).await;

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
    let total_seats = get_total_seats_from_apportionment_result(body.seat_assignment);
    assert_eq!(total_seats, vec![12, 1, 1, 1, 0, 0, 0, 0]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5", "users"))))]
async fn test_election_apportionment_works_for_19_or_more_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie: axum::http::HeaderValue = shared::coordinator_login(&addr).await;
    let typist_cookie = shared::typist_login(&addr).await;
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
                    total: 600,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 78,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 55,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 45,
                        },
                        CandidateVotes {
                            number: 5,
                            votes: 50,
                        },
                        CandidateVotes {
                            number: 6,
                            votes: 0,
                        },
                        CandidateVotes {
                            number: 7,
                            votes: 60,
                        },
                        CandidateVotes {
                            number: 8,
                            votes: 40,
                        },
                        CandidateVotes {
                            number: 9,
                            votes: 30,
                        },
                        CandidateVotes {
                            number: 10,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 11,
                            votes: 50,
                        },
                        CandidateVotes {
                            number: 12,
                            votes: 152,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 2,
                    total: 302,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 150,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 50,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 22,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 10,
                        },
                        CandidateVotes {
                            number: 5,
                            votes: 30,
                        },
                        CandidateVotes {
                            number: 6,
                            votes: 40,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 3,
                    total: 98,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 25,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 3,
                        },
                        CandidateVotes {
                            number: 5,
                            votes: 2,
                        },
                        CandidateVotes {
                            number: 6,
                            votes: 33,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 4,
                    total: 99,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 15,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 25,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 24,
                        },
                        CandidateVotes {
                            number: 5,
                            votes: 15,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 5,
                    total: 101,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 20,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 31,
                        },
                        CandidateVotes {
                            number: 3,
                            votes: 10,
                        },
                        CandidateVotes {
                            number: 4,
                            votes: 40,
                        },
                    ],
                },
            ],
        },
        client_state: ClientState::new_from_str(None).unwrap(),
    };

    create_result_with_non_example_data_entry(&addr, typist_cookie, 8, 5, data_entry).await;

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
    let total_seats = get_total_seats_from_apportionment_result(body.seat_assignment);
    assert_eq!(total_seats, vec![12, 6, 1, 2, 2]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3", "users"))))]
async fn test_election_apportionment_error_all_lists_exhausted(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie: axum::http::HeaderValue = shared::coordinator_login(&addr).await;
    let typist_cookie = shared::typist_login(&addr).await;
    create_result(&addr, typist_cookie, 3, 3).await;

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
    let typist_cookie = shared::typist_login(&addr).await;
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
