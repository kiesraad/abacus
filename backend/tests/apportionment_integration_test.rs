#![cfg(test)]

use std::net::SocketAddr;

use axum::http::StatusCode;
use reqwest::Response;
use serde_json::json;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        complete_data_entry, create_result, create_result_with_non_example_data_entry,
        differences_counts_zero, example_data_entry, political_group_votes_from_test_data_auto,
    },
    utils::serve_api,
};
pub mod shared;
pub mod utils;

fn get_total_seats_from_seat_assignment(seat_assignment: &serde_json::Value) -> Vec<u64> {
    seat_assignment["final_standing"]
        .as_array()
        .unwrap()
        .iter()
        .map(|list| list["total_seats"].as_u64().unwrap())
        .collect()
}

async fn get_apportionment(addr: &SocketAddr, election_id: u32) -> Response {
    let coordinator_cookie = shared::coordinator_login(addr).await;
    let url = format!("http://{addr}/api/elections/{election_id}/apportionment");
    reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap()
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_4", "users"))))]
async fn test_lt_19_seats(pool: SqlitePool) {
    let addr: SocketAddr = serve_api(pool).await;
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
                "poll_card_count": 1203,
                "proxy_certificate_count": 2,
                "total_admitted_voters_count": 1205
            },
            "votes_counts": {
                "political_group_total_votes": [
                    {
                        "number": 1,
                        "total": 808
                    },
                    {
                        "number": 2,
                        "total": 60
                    },
                    {
                        "number": 3,
                        "total": 58
                    },
                    {
                        "number": 4,
                        "total": 57
                    },
                    {
                        "number": 5,
                        "total": 56
                    },
                    {
                        "number": 6,
                        "total": 55
                    },
                    {
                        "number": 7,
                        "total": 54
                    },
                    {
                        "number": 8,
                        "total": 52
                    }
                ],
                "total_votes_candidates_count": 1200,
                "blank_votes_count": 3,
                "invalid_votes_count": 2,
                "total_votes_cast_count": 1205
            },
            "differences_counts": differences_counts_zero(),
            "political_group_votes": [
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
            ]
        },
        "progress": 100,
        "client_state": {}
    });
    create_result_with_non_example_data_entry(&addr, 7, 4, request_body).await;

    let response = get_apportionment(&addr, 4).await;
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["seat_assignment"]["seats"], 15);
    assert_eq!(
        body["seat_assignment"]["quota"],
        json!({
            "integer": 80,
            "numerator": 0,
            "denominator": 15
        })
    );
    assert_eq!(
        body["seat_assignment"]["steps"].as_array().unwrap().len(),
        5
    );
    let total_seats = get_total_seats_from_seat_assignment(&body["seat_assignment"]);
    assert_eq!(total_seats, vec![12, 1, 1, 1, 0, 0, 0, 0]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_gte_19_seats(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    shared::create_investigation(&addr, 9).await;
    shared::update_investigation(&addr, 9, None).await;

    let request_body = json!({
        "data": {
            "model": "CSONextSession",
            "voters_counts": {
                "poll_card_count": 1203,
                "proxy_certificate_count": 2,
                "total_admitted_voters_count": 1205
            },
            "votes_counts": {
                "political_group_total_votes": [
                    {
                        "number": 1,
                        "total": 600
                    },
                    {
                        "number": 2,
                        "total": 302
                    },
                    {
                        "number": 3,
                        "total": 98
                    },
                    {
                        "number": 4,
                        "total": 99
                    },
                    {
                        "number": 5,
                        "total": 101
                    }
                ],
                "total_votes_candidates_count": 1200,
                "blank_votes_count": 3,
                "invalid_votes_count": 2,
                "total_votes_cast_count": 1205
            },
            "differences_counts": differences_counts_zero(),
            "political_group_votes": [
                political_group_votes_from_test_data_auto(
                    1,
                    &[
                        78, 20, 55, 45, 50, 0, 60, 40, 30, 20, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 152,
                    ],
                ),
                political_group_votes_from_test_data_auto(2, &[150, 50, 22, 10, 30, 40]),
                political_group_votes_from_test_data_auto(3, &[20, 15, 25, 3, 2, 33]),
                political_group_votes_from_test_data_auto(4, &[20, 15, 25, 24, 15]),
                political_group_votes_from_test_data_auto(5, &[20, 31, 10, 40]),
            ]
        },
        "progress": 100,
        "client_state": {}
    });
    create_result_with_non_example_data_entry(&addr, 9, 5, request_body).await;

    let response = get_apportionment(&addr, 5).await;
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["seat_assignment"]["seats"], 23);
    assert_eq!(
        body["seat_assignment"]["quota"],
        json!({
            "integer": 104,
            "numerator": 8,
            "denominator": 23
        })
    );
    assert_eq!(
        body["seat_assignment"]["steps"].as_array().unwrap().len(),
        4
    );
    let total_seats = get_total_seats_from_seat_assignment(&body["seat_assignment"]);
    assert_eq!(total_seats, vec![12, 6, 1, 2, 2]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users", "election_5_with_results"))))]
async fn test_no_investigations(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let response = get_apportionment(&addr, 5).await;
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["seat_assignment"]["seats"], 23);
    assert_eq!(
        body["seat_assignment"]["quota"],
        json!({
            "integer": 104,
            "numerator": 8,
            "denominator": 23
        })
    );
    assert_eq!(
        body["seat_assignment"]["steps"].as_array().unwrap().len(),
        4
    );
    let total_seats = get_total_seats_from_seat_assignment(&body["seat_assignment"]);
    assert_eq!(total_seats, vec![12, 6, 1, 2, 2]);
}

/// Test that apportionment is not available until data entries are finalised in the second committee session
#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users", "election_5_with_results"))))]
async fn test_error_second_session_not_finalised(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    // Add investigation with corrected results
    shared::create_investigation(&addr, 9).await;
    shared::update_investigation(&addr, 9, None).await;

    let response = get_apportionment(&addr, 5).await;
    assert_eq!(response.status(), StatusCode::PRECONDITION_FAILED);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(
        body["error"],
        "Election data entry first needs to be finalised"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3", "users"))))]
async fn test_error_all_lists_exhausted(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    create_result(&addr, 3, 3).await;

    let response = get_apportionment(&addr, 3).await;
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(
        body["error"],
        "All lists are exhausted, not enough candidates to fill all seats"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_3", "users"))))]
async fn test_error_drawing_of_lots_not_implemented(pool: SqlitePool) {
    let addr = serve_api(pool).await;

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
                "poll_card_count": 102,
                "proxy_certificate_count": 2,
                "total_admitted_voters_count": 104
            },
            "votes_counts": {
                "political_group_total_votes": [
                    {
                        "number": 1,
                        "total": 51
                    },
                    {
                        "number": 2,
                        "total": 51
                    },
                ],
                "total_votes_candidates_count": 102,
                "blank_votes_count": 1,
                "invalid_votes_count": 1,
                "total_votes_cast_count": 104
            },
            "differences_counts": differences_counts_zero(),
            "political_group_votes": [
                political_group_votes_from_test_data_auto(1, &[30, 21]),
                political_group_votes_from_test_data_auto(2, &[30, 21]),
            ]
        },
        "progress": 100,
        "client_state": {}
    });
    create_result_with_non_example_data_entry(&addr, 3, 3, request_body).await;

    let response = get_apportionment(&addr, 3).await;
    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["error"], "Drawing of lots is required");
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("users", "election_6_no_polling_stations")
)))]
async fn test_error_no_polling_stations(pool: SqlitePool) {
    let addr: std::net::SocketAddr = serve_api(pool).await;

    let response = get_apportionment(&addr, 6).await;
    assert_eq!(response.status(), StatusCode::PRECONDITION_FAILED);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(
        body["error"],
        "Election data entry first needs to be finalised"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users", "election_3"))))]
async fn test_error_not_finalised(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let typist_cookie = shared::typist_login(&addr).await;

    // Add and finalise first data entry
    complete_data_entry(&addr, &typist_cookie, 3, 1, example_data_entry(None)).await;

    let response = get_apportionment(&addr, 3).await;
    assert_eq!(response.status(), StatusCode::PRECONDITION_FAILED);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(
        body["error"],
        "Election data entry first needs to be finalised"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_error_invalid_election(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let response = get_apportionment(&addr, 1).await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["error"], "Item not found");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users", "election_5_with_results"))))]
async fn test_api_output(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let response = get_apportionment(&addr, 5).await;
    assert_eq!(response.status(), StatusCode::OK);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["seat_assignment"]["seats"], 23);
    assert_eq!(body["seat_assignment"]["full_seats"], 19);
    assert_eq!(body["seat_assignment"]["residual_seats"], 4);
    assert_eq!(
        body["seat_assignment"]["quota"],
        json!({"integer": 104, "numerator": 8, "denominator": 23})
    );

    // 4 steps
    assert_eq!(
        body["seat_assignment"]["steps"].as_array().unwrap().len(),
        4
    );
    let first_step = &body["seat_assignment"]["steps"][0];
    assert_eq!(first_step["residual_seat_number"], 1);
    assert_eq!(
        first_step["change"],
        json!({
              "changed_by": "HighestAverageAssignment",
              "selected_list_number": 5,
              "list_options": [5],
              "list_assigned": [5],
              "list_exhausted": [],
              "votes_per_seat": {
                "integer": 101,
                "numerator": 0,
                "denominator": 2
              }
        })
    );

    assert_eq!(first_step["standings"].as_array().unwrap().len(), 5);
    assert_eq!(
        first_step["standings"][0],
        json!({
          "list_number": 1,
          "votes_cast": 1200,
          "remainder_votes": {
            "integer": 52,
            "numerator": 4,
            "denominator": 23
          },
          "meets_remainder_threshold": true,
          "next_votes_per_seat": {
            "integer": 100,
            "numerator": 0,
            "denominator": 12
          },
          "full_seats": 11,
          "residual_seats": 0
        })
    );

    assert_eq!(
        body["seat_assignment"]["final_standing"]
            .as_array()
            .unwrap()
            .len(),
        5
    );
    assert_eq!(
        body["seat_assignment"]["final_standing"][0],
        json!({
            "list_number": 1,
            "votes_cast": 1200,
            "remainder_votes": {
              "integer": 52,
              "numerator": 4,
              "denominator": 23
            },
            "meets_remainder_threshold": true,
            "full_seats": 11,
            "residual_seats": 1,
            "total_seats": 12
          }
        )
    );

    let cn = &body["candidate_nomination"];
    assert_eq!(
        cn["preference_threshold"],
        json!({
          "percentage": 25,
          "number_of_votes": {
            "integer": 26,
            "numerator": 200,
            "denominator": 2300
          }
        })
    );
    assert_eq!(cn["chosen_candidates"].as_array().unwrap().len(), 23);
    assert_eq!(
        cn["chosen_candidates"][0],
        json!({
            "number": 8,
            "initials": "S.",
            "first_name": "Sophie",
            "last_name": "Bakker",
            "locality": "Juinen",
            "gender": "Female"
        })
    );

    assert_eq!(cn["list_candidate_nomination"].as_array().unwrap().len(), 5);
    let second_list_nomination = &cn["list_candidate_nomination"][1];
    assert_eq!(second_list_nomination["list_number"], 2);
    assert_eq!(second_list_nomination["list_name"], "Political Group B");
    assert_eq!(second_list_nomination["list_seats"], 6);
    assert_eq!(
        second_list_nomination["preferential_candidate_nomination"],
        json!([
          {"number": 1, "votes": 300},
          {"number": 2, "votes": 100},
          {"number": 6, "votes": 80},
          {"number": 5, "votes": 60},
          {"number": 3, "votes": 44}
        ])
    );
    assert_eq!(
        second_list_nomination["other_candidate_nomination"],
        json!([
          {"number": 4, "votes": 20},
        ])
    );
    assert_eq!(
        second_list_nomination["updated_candidate_ranking"],
        json!([
            { "number": 1, "initials": "T.", "first_name": "Tinus", "last_name": "Bakker", "locality": "Test Location", "gender": "Male" },
            { "number": 2, "initials": "D.", "last_name": "Po", "locality": "Test Location", "gender": "X" },
            { "number": 6, "initials": "H.", "first_name": "Henk", "last_name_prefix": "van den", "last_name": "Berg", "locality": "Test Location", "gender": "Male" },
            { "number": 5, "initials": "L.", "first_name": "Liesbeth", "last_name": "Jansen", "locality": "Test Location", "gender": "Female" },
            { "number": 3, "initials": "W.", "first_name": "Willem", "last_name_prefix": "de", "last_name": "Vries", "locality": "Test Location", "gender": "Male" },
            { "number": 4, "initials": "K.", "first_name": "Klaas", "last_name": "Kloosterboer", "locality": "Test Location", "gender": "Male" }
        ])
    );
}
