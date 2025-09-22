#![cfg(test)]
use abacus::{
    committee_session::status::CommitteeSessionStatus, election::ElectionDetailsResponse,
};
use axum::http::StatusCode;
use reqwest::Response;
use serde_json::json;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

async fn get_election(pool: SqlitePool, election_id: u32) -> ElectionDetailsResponse {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/elections/{election_id}");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    response.json().await.unwrap()
}

async fn create_investigation(pool: SqlitePool, polling_station_id: u32) -> Response {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/investigation");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = json!({
        "reason": "Test reason"
    });
    reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

async fn update_investigation(
    pool: SqlitePool,
    polling_station_id: u32,
    body: Option<serde_json::Value>,
) -> Response {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = body.unwrap_or(json!({
        "reason": "Updated reason",
        "findings": "updated test findings",
        "corrected_results": true
    }));
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/investigation");
    reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

async fn conclude_investigation(pool: SqlitePool, polling_station_id: u32) -> Response {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = json!({
        "findings": "Test findings",
        "corrected_results": false
    });
    let url =
        format!("http://{addr}/api/polling_stations/{polling_station_id}/investigation/conclude");
    reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_create_conclude_update(pool: SqlitePool) {
    let election_id = 7;
    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 0);

    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(election_details.investigations[0].reason, "Test reason");
    assert_eq!(election_details.investigations[0].findings, None);

    assert_eq!(
        conclude_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(election_details.investigations[0].reason, "Test reason");
    assert_eq!(
        election_details.investigations[0].findings,
        Some("Test findings".to_string())
    );
    assert_eq!(
        election_details.investigations[0].corrected_results,
        Some(false)
    );

    assert_eq!(
        update_investigation(pool.clone(), 741, None).await.status(),
        StatusCode::OK
    );

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(election_details.investigations[0].reason, "Updated reason");
    assert_eq!(
        election_details.investigations[0].findings,
        Some("updated test findings".to_string())
    );
    assert_eq!(
        election_details.investigations[0].corrected_results,
        Some(true)
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_partials_investigation_update(pool: SqlitePool) {
    let election_id = 7;

    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(election_details.investigations[0].reason, "Test reason");
    assert_eq!(election_details.investigations[0].findings, None);

    // Update only the reason
    let updated = update_investigation(
        pool.clone(),
        741,
        Some(json!({
            "reason": "Partially updated reason"
        })),
    )
    .await;

    assert_eq!(updated.status(), StatusCode::OK);

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(
        election_details.investigations[0].reason,
        "Partially updated reason"
    );
    assert_eq!(election_details.investigations[0].findings, None);

    let updated = update_investigation(
        pool.clone(),
        741,
        Some(json!({
            "reason": "Partially updated reason",
            "findings": "Partially updated findings"
        })),
    )
    .await;

    // Update only the findings
    assert_eq!(updated.status(), StatusCode::OK);

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(
        election_details.investigations[0].reason,
        "Partially updated reason"
    );
    assert_eq!(
        election_details.investigations[0].findings,
        Some("Partially updated findings".to_string())
    );

    let updated = update_investigation(
        pool.clone(),
        741,
        Some(json!({
            "reason": "Partially updated reason",
            "corrected_results": true
        })),
    )
    .await;

    // Update only the corrected_results
    assert_eq!(updated.status(), StatusCode::OK);

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(
        election_details.investigations[0].reason,
        "Partially updated reason"
    );
    assert_eq!(election_details.investigations[0].findings, None);
    assert_eq!(
        election_details.investigations[0].corrected_results,
        Some(true)
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_for_committee_session_with_created_status(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 7;

    shared::change_status_committee_session(&addr, &cookie, 704, CommitteeSessionStatus::Created)
        .await;
    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_investigation_creation_for_committee_session_with_finished_status(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 5;

    shared::change_status_committee_session(
        &addr,
        &cookie,
        6,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    assert_eq!(
        create_investigation(pool.clone(), 9).await.status(),
        StatusCode::OK
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_fails_for_wrong_polling_station(pool: SqlitePool) {
    // 732 is an existing polling station, but in the wrong committee session
    assert_eq!(
        create_investigation(pool.clone(), 732).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_fails_on_creating_second_investigation(pool: SqlitePool) {
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::CONFLICT
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_conclude_existing(pool: SqlitePool) {
    assert_eq!(
        conclude_investigation(pool.clone(), 741).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_update_existing(pool: SqlitePool) {
    assert_eq!(
        update_investigation(pool.clone(), 741, None).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_conclude_current_session(pool: SqlitePool) {
    assert_eq!(
        conclude_investigation(pool.clone(), 732).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_update_current_session(pool: SqlitePool) {
    assert_eq!(
        update_investigation(pool.clone(), 732, None).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_polling_station_corrigendum_download_with_previous_results(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let polling_station_id = 9;

    assert_eq!(
        create_investigation(pool.clone(), polling_station_id)
            .await
            .status(),
        StatusCode::OK
    );

    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/investigation/download_corrigendum_pdf"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/pdf");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"Model_Na14-2_GR2026_Stembureau_41_Bijlage_1.pdf\""
    );

    let bytes = response.bytes().await.unwrap();
    assert!(bytes.len() > 1024);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_corrigendum_download_without_previous_results(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let polling_station_id = 2;

    assert_eq!(
        create_investigation(pool.clone(), polling_station_id)
            .await
            .status(),
        StatusCode::OK
    );

    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/investigation/download_corrigendum_pdf"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/pdf");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"Model_Na14-2_GR2024_Stembureau_34_Bijlage_1.pdf\""
    );

    let bytes = response.bytes().await.unwrap();
    assert!(bytes.len() > 1024);
}
