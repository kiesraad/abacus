#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        complete_data_entry, create_result, create_result_with_non_example_data_entry,
        differences_counts_zero, example_data_entry, political_group_votes_from_test_data_auto,
    },
    utils::serve_api,
};
use abacus::{
    ErrorResponse,
    apportionment::{
        ElectionApportionmentResponse, Fraction, get_total_seats_from_apportionment_result,
    },
    data_entry::{
        CountingDifferencesPollingStation, DataEntry, PoliticalGroupTotalVotes,
        PollingStationResults, VotersCounts, VotesCounts, YesNo, status::ClientState,
    },
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_4", "users"))))]
async fn test_election_apportionment_works_for_less_than_19_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;

    let data_entry = DataEntry {
        progress: 100,
        data: PollingStationResults {
            extra_investigation: Default::default(),
            counting_differences_polling_station: CountingDifferencesPollingStation {
                unexplained_difference_ballots_voters: YesNo::no(),
                difference_ballots_per_list: YesNo::no(),
            },
            voters_counts: VotersCounts {
                poll_card_count: 1203,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 1205,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: 1,
                        total: 808,
                    },
                    PoliticalGroupTotalVotes {
                        number: 2,
                        total: 60,
                    },
                    PoliticalGroupTotalVotes {
                        number: 3,
                        total: 58,
                    },
                    PoliticalGroupTotalVotes {
                        number: 4,
                        total: 57,
                    },
                    PoliticalGroupTotalVotes {
                        number: 5,
                        total: 56,
                    },
                    PoliticalGroupTotalVotes {
                        number: 6,
                        total: 55,
                    },
                    PoliticalGroupTotalVotes {
                        number: 7,
                        total: 54,
                    },
                    PoliticalGroupTotalVotes {
                        number: 8,
                        total: 52,
                    },
                ],
                total_votes_candidates_count: 1200,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 1205,
            },

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
            extra_investigation: Default::default(),
            counting_differences_polling_station: CountingDifferencesPollingStation {
                unexplained_difference_ballots_voters: YesNo::no(),
                difference_ballots_per_list: YesNo::no(),
            },
            voters_counts: VotersCounts {
                poll_card_count: 1203,
                proxy_certificate_count: 2,

                total_admitted_voters_count: 1205,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: 1,
                        total: 592,
                    },
                    PoliticalGroupTotalVotes {
                        number: 2,
                        total: 302,
                    },
                    PoliticalGroupTotalVotes {
                        number: 3,
                        total: 98,
                    },
                    PoliticalGroupTotalVotes {
                        number: 4,
                        total: 99,
                    },
                    PoliticalGroupTotalVotes {
                        number: 5,
                        total: 101,
                    },
                ],
                total_votes_candidates_count: 1200,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 1205,
            },

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
            extra_investigation: Default::default(),
            counting_differences_polling_station: CountingDifferencesPollingStation {
                unexplained_difference_ballots_voters: YesNo::no(),
                difference_ballots_per_list: YesNo::no(),
            },
            voters_counts: VotersCounts {
                poll_card_count: 102,
                proxy_certificate_count: 2,

                total_admitted_voters_count: 104,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: 1,
                        total: 51,
                    },
                    PoliticalGroupTotalVotes {
                        number: 2,
                        total: 51,
                    },
                ],
                total_votes_candidates_count: 102,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 104,
            },

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

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("users", "election_6_no_polling_stations")
)))]
async fn test_election_apportionment_error_apportionment_not_available_no_polling_stations(
    pool: SqlitePool,
) {
    let addr: std::net::SocketAddr = serve_api(pool).await;

    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/6/apportionment");
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
    complete_data_entry(&addr, &typist_cookie, 3, 1, example_data_entry(None)).await;

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
