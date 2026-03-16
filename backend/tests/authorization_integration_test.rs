#![cfg(test)]

use axum::http::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{FixtureUser, login},
    utils::serve_api,
};
pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_route_public(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/initialised");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::NO_CONTENT);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_route_authorized(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/users");

    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let coordinator_cookie = login(&addr, FixtureUser::CoordinatorGSB).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_route_authorized_wrong_role(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let typist_cookie = login(&addr, FixtureUser::TypistGSB).await;

    let url = format!("http://{addr}/api/users");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", typist_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_route_authorized_incomplete_user(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = login(&addr, FixtureUser::Admin).await;
    let coordinator_cookie = login(&addr, FixtureUser::CoordinatorGSB).await;

    let client = reqwest::Client::new();

    // Set a temporary password for the coordinator, which makes the account incomplete
    let response = client
        .put(format!("http://{addr}/api/users/3"))
        .header("cookie", admin_cookie)
        .header("content-type", "application/json")
        .json(&serde_json::json!({ "temp_password": "Coordinator1Password01" }))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let url = format!("http://{addr}/api/users");
    let response = client
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_route_incomplete_user(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = login(&addr, FixtureUser::CoordinatorGSB).await;
    let admin_cookie = login(&addr, FixtureUser::Admin).await;

    let client = reqwest::Client::new();
    let url = format!("http://{addr}/api/account");

    // User is already complete, so this route is not allowed
    let response = client
        .put(&url)
        .header("cookie", coordinator_cookie.clone())
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::CONFLICT);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["reference"], "Forbidden");

    // Set a temporary password for the coordinator, which makes the account incomplete
    let response = client
        .put(format!("http://{addr}/api/users/3"))
        .header("cookie", admin_cookie)
        .header("content-type", "application/json")
        .json(&serde_json::json!({ "temp_password": "Coordinator1Password01" }))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Try again, now it should be allowed.
    let coordinator_cookie = login(&addr, FixtureUser::CoordinatorGSB).await;
    let response = client
        .put(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    // Not receiving forbidden indicates that we are past the user/role authorization
    assert_eq!(response.status(), StatusCode::UNSUPPORTED_MEDIA_TYPE);
}
