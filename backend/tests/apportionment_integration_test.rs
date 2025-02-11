#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{create_result, create_result_with_non_example_data_entry},
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
    ErrorResponse,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2"))))]
async fn test_election_apportionment_works_for_less_than_19_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    create_result(&addr, 1, 2).await;
    create_result(&addr, 2, 2).await;

    let url = format!("http://{addr}/api/elections/2/apportionment");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionApportionmentResponse = response.json().await.unwrap();
    assert_eq!(body.apportionment.seats, 15);
    assert_eq!(body.apportionment.quota, Fraction::new(204, 15));
    assert_eq!(body.apportionment.steps.len(), 1);
    let total_seats = get_total_seats_from_apportionment_result(body.apportionment);
    assert_eq!(total_seats, vec![9, 6]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3"))))]
async fn test_election_apportionment_works_for_19_or_more_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    create_result(&addr, 3, 3).await;

    let url = format!("http://{addr}/api/elections/3/apportionment");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionApportionmentResponse = response.json().await.unwrap();
    assert_eq!(body.apportionment.seats, 29);
    assert_eq!(body.apportionment.quota, Fraction::new(102, 29));
    assert_eq!(body.apportionment.steps.len(), 1);
    let total_seats = get_total_seats_from_apportionment_result(body.apportionment);
    assert_eq!(total_seats, vec![17, 12]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3"))))]
async fn test_election_apportionment_error_drawing_of_lots_not_implemented(pool: SqlitePool) {
    let addr = serve_api(pool).await;

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

    create_result_with_non_example_data_entry(&addr, 3, 3, data_entry).await;

    let url = format!("http://{addr}/api/elections/3/apportionment");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Drawing of lots is required");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3"))))]
async fn test_election_apportionment_error_apportionment_not_available_until_data_entry_finalised(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/3/apportionment");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::PRECONDITION_FAILED);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(
        body.error,
        "Election data entry first needs to be finalised"
    );
}

#[test(sqlx::test)]
async fn test_election_apportionment_election_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/elections/1/apportionment");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body: ErrorResponse = response.json().await.unwrap();
    assert_eq!(body.error, "Item not found");
}
