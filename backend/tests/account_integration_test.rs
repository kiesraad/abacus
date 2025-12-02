#![cfg(test)]

use hyper::StatusCode;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_account_update(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/account");
    let admin_cookie = shared::admin_login(&addr).await;

    let response = reqwest::Client::new()
        .put(&url)
        .json(&serde_json::json!({
            "username": "admin1",
            "fullname": "Saartje Molenaar",
            "password": "MyLongPassword13"
        }))
        .header("cookie", admin_cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::OK,
        "Unexpected response status"
    );

    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["username"], "admin1");
    assert_eq!(body["fullname"], "Saartje Molenaar");
    assert_eq!(body["needs_password_change"], false);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_user_change_to_same_password_fails(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let typist_cookie = shared::typist_login(&addr).await;

    let url = format!("http://{addr}/api/account");
    let response = reqwest::Client::new()
        .put(&url)
        .json(&serde_json::json!({
            "username": "typist1",
            "password": "Typist1Password01",
        }))
        .header("cookie", typist_cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}
