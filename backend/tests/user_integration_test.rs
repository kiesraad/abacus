#![cfg(test)]

use abacus::authentication::UserListResponse;
use hyper::{header::CONTENT_TYPE, StatusCode};
use reqwest::Body;
use serde_json::json;
use sqlx::SqlitePool;
use test_log::test;
use utils::serve_api;

pub mod shared;
pub mod utils;
#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_user_last_activity_at_updating(pool: SqlitePool) {
    // Assert the user has no last activity timestamp yet
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body: UserListResponse = response.json().await.unwrap();
    let user = body.users.first().unwrap();
    assert!(user.last_activity_at().is_none());

    // Login, so we can call the whoami endpoint
    let url = format!("http://{addr}/api/user/login");
    let response = reqwest::Client::new()
        .post(&url)
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "username": "user",
                "password": "password",
            })
            .to_string(),
        ))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let cookie = shared::login(&addr).await.unwrap();

    // Call an endpoint using the `FromRequestParts` for `User`
    let url = format!("http://{addr}/api/user/whoami");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Test that a timestamp is present
    let url = format!("http://{addr}/api/user");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body: UserListResponse = response.json().await.unwrap();
    let user = body.users.first().unwrap();

    // Panics (thus fails) when timestamp was not set
    let first_timestamp = user.last_activity_at().unwrap();

    // Test that the timestamp is not updated when we
    // immediately call the same enpoint againg

    // Call an endpoint using the `FromRequestParts` for `User`
    let url = format!("http://{addr}/api/user/whoami");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Test that the timestamps are the same
    let url = format!("http://{addr}/api/user");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body: UserListResponse = response.json().await.unwrap();
    let user = body.users.first().unwrap();
    assert_eq!(user.last_activity_at().unwrap(), first_timestamp);
}
