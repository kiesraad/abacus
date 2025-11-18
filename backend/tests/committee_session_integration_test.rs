#![cfg(test)]

use abacus::committee_session::{
    CommitteeSession, CommitteeSessionNumberOfVotersChangeRequest,
    CommitteeSessionStatusChangeRequest, CommitteeSessionUpdateRequest,
    status::CommitteeSessionStatus,
};
use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        admin_login, change_status_committee_session, coordinator_login, create_investigation,
        create_polling_station, create_result, get_election_committee_session,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_create_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 5;

    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        6,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    let url = format!("http://{addr}/api/elections/{election_id}/committee_sessions");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: CommitteeSession = response.json().await.unwrap();
    assert_eq!(body.id, 7);
    assert_eq!(body.number, 3);
    assert_eq!(body.election_id, election_id);
    assert_eq!(body.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_create_current_committee_session_not_finalised(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions");
    let response = reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_delete_ok_status_created(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 7;
    let committee_session_id = 704;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_delete_fails_with_investigation(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 7;
    let committee_session_id = 704;
    let polling_station_id = 742;

    create_investigation(&addr, polling_station_id).await;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // You cannot delete a committee session if there are investigations linked to it
    assert_eq!(
        response.status(),
        StatusCode::UNPROCESSABLE_ENTITY,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_delete_not_ok_wrong_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 5;
    let committee_session_id = 6;

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    // Set status to DataEntryPaused
    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        CommitteeSessionStatus::DataEntryPaused,
    )
    .await;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryPaused,
    );

    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    // Set status to DataEntryFinished
    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished,
    );

    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_delete_current_committee_session_but_its_the_first(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 2;
    let committee_session_id = 2;

    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        CommitteeSessionStatus::Created,
    )
    .await;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}"
    );
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_delete_previous_committee_session(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/5");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_delete_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/40404");
    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_update_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "Juinen".to_string(),
            start_date: "2026-03-18".to_string(),
            start_time: "10:45".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_update_bad_request(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "".to_string(),
            start_date: "".to_string(),
            start_time: "".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "Juinen".to_string(),
            start_date: "25-10-2025".to_string(),
            start_time: "10:45".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_update_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/5");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "Juinen".to_string(),
            start_date: "2025-10-25".to_string(),
            start_time: "10:45".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_committee_session_update_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/1/committee_sessions/1");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionUpdateRequest {
            location: "Juinen".to_string(),
            start_date: "2025-10-25".to_string(),
            start_time: "10:45".to_string(),
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_status_change_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/6/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryFinished,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_status_change_finished_to_in_progress_deletes_files(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 2;
    create_result(&addr, 1, election_id).await;
    create_result(&addr, 2, election_id).await;

    // Change committee session status to DataEntryFinished
    let url = format!("http://{addr}/api/elections/{election_id}/committee_sessions/2/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryFinished,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    // Generate and download results files
    let file_download_url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/2/download_zip_results"
    );
    let response = reqwest::Client::new()
        .get(&file_download_url)
        .header("cookie", &coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.results_eml, Some(1));
    assert_eq!(committee_session.results_pdf, Some(2));

    // Change committee session status to DataEntryInProgress
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryInProgress,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
    assert_eq!(committee_session.results_eml, None);
    assert_eq!(committee_session.results_pdf, None);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_status_change_invalid_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryNotStarted,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::CONFLICT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_committee_session_status_change_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/1/committee_sessions/1/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryPaused,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_status_change_previous_committee_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/5/status");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionStatusChangeRequest {
            status: CommitteeSessionStatus::DataEntryInProgress,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_committee_session_number_of_voters_change_first_session_created_works_for_coordinator(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 6;
    let committee_session_id = 7;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/voters"
    );
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(
    path = "../fixtures",
    scripts("election_6_no_polling_stations", "users")
)))]
async fn test_committee_session_number_of_voters_change_first_session_not_started_works_for_administrator(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let election_id = 6;
    let committee_session_id = 7;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    create_polling_station(&addr, &coordinator_cookie, election_id, 1).await;

    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    let url = format!(
        "http://{addr}/api/elections/{election_id}/committee_sessions/{committee_session_id}/voters"
    );
    let admin_cookie = admin_login(&addr).await;
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", admin_cookie)
        .json(&CommitteeSessionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::NO_CONTENT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_committee_session_number_of_voters_change_previous_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/5/committee_sessions/5/voters");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionNumberOfVotersChangeRequest {
            number_of_voters: 0,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_number_of_voters_change_not_first_session_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/7/committee_sessions/704/voters");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_committee_session_number_of_voters_change_first_session_in_progress_fails(
    pool: SqlitePool,
) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/2/committee_sessions/2/voters");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionNumberOfVotersChangeRequest {
            number_of_voters: 12345,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_committee_session_number_of_voters_change_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;

    let url = format!("http://{addr}/api/elections/1/committee_sessions/1/voters");
    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .json(&CommitteeSessionNumberOfVotersChangeRequest {
            number_of_voters: 0,
        })
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_investigations_list_works(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/7/committee_sessions/702/investigations");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response and make sure the investigations are from the requested committee session
    let body: serde_json::Value = response.json().await.unwrap();
    let investigations = body["investigations"].as_array().unwrap();
    assert_eq!(investigations.len(), 1);
    let map = investigations
        .iter()
        .map(|inv| inv["polling_station_id"].as_u64().unwrap())
        .collect::<Vec<u64>>();
    assert_eq!(map, vec![721]);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_investigations_list_works_no_investigations(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/7/committee_sessions/704/investigations");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    // Validate response and make sure the investigations are empty
    let body: serde_json::Value = response.json().await.unwrap();
    let investigations = body["investigations"].as_array().unwrap();
    assert_eq!(investigations.len(), 0);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_committee_session_investigations_list_fails_election_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/elections/1/committee_sessions/1/investigations");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::NOT_FOUND,
        "Unexpected response status"
    );
}
