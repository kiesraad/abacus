#![cfg(test)]
use abacus::investigation::PollingStationInvestigation;
use hyper::StatusCode;
use reqwest::Response;
use serde_json::json;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

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

async fn update_investigation(pool: SqlitePool, polling_station_id: u32) -> Response {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = json!({
        "reason": "Updated reason",
        "findings": "updated test findings",
        "corrected_results": true
    });
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
async fn test_investigation_create_and_conclude(pool: SqlitePool) {
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        conclude_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_create_conclude_update(pool: SqlitePool) {
    async fn get_investigation(
        pool: &SqlitePool,
        polling_station_id: u32,
    ) -> PollingStationInvestigation {
        sqlx::query_as!(
            PollingStationInvestigation,
            r#"SELECT polling_station_id as "polling_station_id: u32", reason, findings, corrected_results as "corrected_results: bool" FROM polling_station_investigations WHERE polling_station_id = ?"#,
            polling_station_id
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }

    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let investigation = get_investigation(&pool, 741).await;

    assert_eq!(investigation.polling_station_id, 741);
    assert_eq!(investigation.reason, "Test reason");
    assert_eq!(investigation.findings, None);

    assert_eq!(
        conclude_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let investigation = get_investigation(&pool, 741).await;

    assert_eq!(investigation.polling_station_id, 741);
    assert_eq!(investigation.reason, "Test reason");
    assert_eq!(investigation.findings, Some("Test findings".to_string()));
    assert_eq!(investigation.corrected_results, Some(false));

    assert_eq!(
        update_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let investigation = get_investigation(&pool, 741).await;

    assert_eq!(investigation.polling_station_id, 741);
    assert_eq!(investigation.reason, "Updated reason");
    assert_eq!(
        investigation.findings,
        Some("updated test findings".to_string())
    );
    assert_eq!(investigation.corrected_results, Some(true));
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
        update_investigation(pool.clone(), 741).await.status(),
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
        update_investigation(pool.clone(), 732).await.status(),
        StatusCode::NOT_FOUND
    );
}
