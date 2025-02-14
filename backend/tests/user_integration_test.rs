#![cfg(test)]

use abacus::authentication::{role::Role, user::User, CreateUserRequest, UserListResponse};
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
        .header("cookie", cookie)
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_creation(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&CreateUserRequest {
            role: Role::Administrator,
            username: "username".to_string(),
            fullname: Some("fullname".to_string()),
            temp_password: "MyLongPassword13".to_string(),
        })
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: User = response.json().await.unwrap();
    assert_eq!(body.role, Role::Administrator);
    assert_eq!(body.username, "username");
    assert_eq!(body.fullname, Some("fullname".to_string()));
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_creation_anonymous(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&CreateUserRequest {
            role: Role::Typist,
            username: "username".to_string(),
            fullname: None,
            temp_password: "MyLongPassword13".to_string(),
        })
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );
    let body: User = response.json().await.unwrap();
    assert_eq!(body.role, Role::Typist);
    assert_eq!(body.username, "username");
    assert_eq!(body.fullname, None);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_creation_not_unique(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&CreateUserRequest {
            role: Role::Typist,
            username: "user".to_string(),
            fullname: None,
            temp_password: "MyLongPassword13".to_string(),
        })
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
}
