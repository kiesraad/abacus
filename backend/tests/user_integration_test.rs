#![cfg(test)]

use abacus::authentication::UserListResponse;
use hyper::{header::CONTENT_TYPE, StatusCode};
use reqwest::Body;
use serde_json::{json, Value};
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
    assert!(user.last_activity_at().is_some());
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_listing(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    let url = format!("http://{addr}/api/user");
    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );
    let body: UserListResponse = response.json().await.unwrap();
    assert_eq!(body.users.len(), 1);
    assert!(body.users.iter().any(|ps| ps.username() == "user"))
}

#[test(sqlx::test)]
async fn test_user_creation(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&json!({
            "role": "administrator",
            "username": "username",
            "fullname": "fullname",
            "temp_password": "MyLongPassword13"
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );

    let body: Value = response.json().await.unwrap();
    dbg!(&body);

    assert_eq!(body["role"], "administrator");
    assert_eq!(body["username"], "username");
    assert_eq!(body["fullname"], "fullname");
    assert!(body.get("temp_password").is_none());
}

#[test(sqlx::test)]
async fn test_user_creation_anonymous(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&json!({
            "role": "typist",
            "username": "username",
            "temp_password": "MyLongPassword13"
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );

    let body: Value = response.json().await.unwrap();
    dbg!(&body);

    assert_eq!(body["role"], "typist");
    assert_eq!(body["username"], "username");
    assert!(body.get("fullname").is_none());
    assert!(body.get("temp_password").is_none());
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_get(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user/1");

    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body: Value = response.json().await.unwrap();
    dbg!(&body);

    assert_eq!(body["id"], 1);
    assert_eq!(body["role"], "administrator");
    assert_eq!(body["username"], "user");
    assert_eq!(body["fullname"], "Sanne Molenaar");
}

#[test(sqlx::test)]
async fn test_user_get_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user/40404");

    let response = reqwest::Client::new().get(&url).send().await.unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
