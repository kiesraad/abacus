#![cfg(test)]

use hyper::StatusCode;
use serde_json::{Value, json};
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;
use abacus::authentication::UserListResponse;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_login(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    shared::admin_login(&addr).await;
    shared::coordinator_login(&addr).await;
    shared::typist_login(&addr).await;
    shared::typist2_login(&addr).await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_user_last_activity_at_updating(pool: SqlitePool) {
    // Assert the user has no last activity timestamp yet
    let addr = serve_api(pool).await;
    let admin_cookie = shared::admin_login(&addr).await;
    let url = format!("http://{addr}/api/user");
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", &admin_cookie)
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
    assert_eq!(body.users.len(), 6);
    assert!(body.users.iter().any(|ps| {
        [
            "admin1",
            "admin2",
            "coordinator1",
            "coordinator2",
            "typist1",
            "typist2",
        ]
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
async fn test_user_creation_duplicate_username(pool: SqlitePool) {
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
        .header("cookie", &admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CREATED,
        "Unexpected response status"
    );

    let response = reqwest::Client::new()
        .post(&url)
        .json(&json!({
            "role": "administrator",
            "username": "Username",
            "fullname": "fullname",
            "temp_password": "MyLongPassword13"
        }))
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::CONFLICT,
        "Unexpected response status"
    );
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
    let url = format!("http://{addr}/api/user/account");

    let response = reqwest::Client::new()
        .put(&url)
        .json(&json!({
            "username": "typist1",
            "password": "Typist1Password01",
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
    assert_eq!(body["username"], "admin1");
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
    let url = format!("http://{addr}/api/user/2");
    let admin_cookie = shared::admin_login(&addr).await;

    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", &admin_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_can_delete_logged_in_user(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user/2");
    shared::typist_login(&addr).await;
    let admin_cookie = shared::admin_login(&addr).await;

    let response = reqwest::Client::new()
        .delete(&url)
        .header("cookie", &admin_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_1", "users"))))]
async fn test_cant_do_anything_when_password_needs_change(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user/5");
    let admin_cookie = shared::admin_login(&addr).await;
    let typist_cookie = shared::typist_login(&addr).await;

    let response = reqwest::Client::new()
        .put(&url)
        .header("cookie", &admin_cookie)
        .json(&json!({
            "temp_password": "TotallyValidTempP4ssW0rd"
        }))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Can't call arbitrary endpoint
    let some_endpoint = format!("http://{addr}/api/elections/1/polling_stations");
    let response = reqwest::Client::new()
        .get(&some_endpoint)
        .header("cookie", &typist_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // Login again with the temporary password
    let typist_cookie = shared::login(&addr, "typist1", "TotallyValidTempP4ssW0rd").await;

    // User sets password
    let url = format!("http://{addr}/api/user/account");
    let response = reqwest::Client::new()
        .put(&url)
        .json(&json!({
            "username": "typist1",
            "password": "Typist1Password02",
        }))
        .header("cookie", &typist_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // Can call the endpoint again to test that the user can call it again
    let some_endpoint = format!("http://{addr}/api/elections/1/polling_stations");
    let response = reqwest::Client::new()
        .get(&some_endpoint)
        .header("cookie", &typist_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}
