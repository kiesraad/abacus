#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{FixtureUser::*, login},
    utils::serve_api_with_backup_dir,
};
pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn backup_unauthenticated(pool: SqlitePool) {
    let (addr, _backup_dir) = serve_api_with_backup_dir(pool).await;
    let response = reqwest::Client::new()
        .post(format!("http://{addr}/api/backup"))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn backup_forbidden_typist(pool: SqlitePool) {
    let (addr, _backup_dir) = serve_api_with_backup_dir(pool).await;
    let cookie = login(&addr, TypistGSB).await;
    let response = reqwest::Client::new()
        .post(format!("http://{addr}/api/backup"))
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn backup_success_as_admin(pool: SqlitePool) {
    let (addr, backup_dir) = serve_api_with_backup_dir(pool).await;
    let cookie = login(&addr, Admin).await;
    let response = reqwest::Client::new()
        .post(format!("http://{addr}/api/backup"))
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
    let body: serde_json::Value = response.json().await.unwrap();
    let filename = body["filename"].as_str().unwrap();
    assert!(filename.starts_with("db_backup_") && filename.ends_with(".sqlite"));
    assert!(body["created_at"].is_string());
    assert!(backup_dir.path().join(filename).exists());
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn backup_success_as_coordinator_csb(pool: SqlitePool) {
    let (addr, _backup_dir) = serve_api_with_backup_dir(pool).await;
    let cookie = login(&addr, CoordinatorCSB).await;
    let response = reqwest::Client::new()
        .post(format!("http://{addr}/api/backup"))
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CREATED);
}
