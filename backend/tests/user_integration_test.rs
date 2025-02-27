#![cfg(test)]

use abacus::authentication::UserListResponse;
use hyper::StatusCode;
use serde_json::{Value, json};
use sqlx::SqlitePool;
use test_log::test;
use utils::serve_api;

pub mod shared;
pub mod utils;
#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_user_last_activity_at_updating(pool: SqlitePool) {
    // Assert the user has no last activity timestamp yet
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/user");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", admin_cookie.clone())
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body: UserListResponse = response.json().await.unwrap();
    let typist_user = body.users.iter().find(|u| u.id() == 2).unwrap();
    assert!(typist_user.last_activity_at().is_none());

    // Log in as the typist and call whoami to trigger an update
    let typist_cookie = shared::typist_login(&addr).await;

    // Call an endpoint using the `FromRequestParts` for `User`
    let url = format!("http://{addr}/api/user/whoami");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &typist_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Test that a timestamp is present
    let url = format!("http://{addr}/api/user");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body: UserListResponse = response.json().await.unwrap();
    let user = body.users.first().unwrap();
    assert!(user.last_activity_at().is_some());
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_listing(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;

    let url = format!("http://{addr}/api/user");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );
    let body: UserListResponse = response.json().await.unwrap();
    assert_eq!(body.users.len(), 3);
    assert!(body.users.iter().any(|ps| {
        ["admin", "coordinator", "typist"]
            .iter()
            .any(|u| ps.username() == *u)
    }))
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_creation(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user");
    let admin_cookie = shared::admin_login(&addr).await;

    let response = reqwest::Client::new()
        .post(&url)
        .json(&json!({
            "role": "administrator",
            "username": "username",
            "fullname": "fullname",
            "temp_password": "MyLongPassword13"
        }))
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );

    let body: Value = response.json().await.unwrap();

    assert_eq!(body["role"], "administrator");
    assert_eq!(body["username"], "username");
    assert_eq!(body["fullname"], "fullname");
    assert!(body.get("temp_password").is_none());
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_creation_anonymous(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user");
    let admin_cookie = shared::admin_login(&addr).await;

    let response = reqwest::Client::new()
        .post(&url)
        .json(&json!({
            "role": "typist",
            "username": "username",
            "temp_password": "MyLongPassword13"
        }))
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );

    let body: Value = response.json().await.unwrap();

    assert_eq!(body["role"], "typist");
    assert_eq!(body["username"], "username");
    assert!(body.get("fullname").is_none());
    assert!(body.get("temp_password").is_none());
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_creation_invalid_password(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/user");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&json!({
            "role": "typist",
            "username": "username",
            "temp_password": "too_short"
        }))
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_update_password_invalid(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/user/2");

    let response = reqwest::Client::new()
        .put(&url)
        .json(&json!({
            "temp_password": "too_short"
        }))
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_change_to_same_password_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let typist_cookie = shared::typist_login(&addr).await;
    let url = format!("http://{addr}/api/user/change-password");

    let response = reqwest::Client::new()
        .post(&url)
        .json(&json!({
            "username": "typist",
            "password": "TypistPassword01",
            "new_password": "TypistPassword01"
        }))
        .header("cookie", typist_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_get(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user/1");
    let admin_cookie = shared::admin_login(&addr).await;

    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);

    let body: Value = response.json().await.unwrap();

    assert_eq!(body["id"], 1);
    assert_eq!(body["role"], "administrator");
    assert_eq!(body["username"], "admin");
    assert_eq!(body["fullname"], "Sanne Molenaar");
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_get_not_found(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user/40404");
    let admin_cookie = shared::admin_login(&addr).await;

    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_delete(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user/1");

    let response = reqwest::Client::new().delete(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = reqwest::Client::new().delete(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
