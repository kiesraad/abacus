#![cfg(test)]

use hyper::StatusCode;
use serde_json::{Value, json};
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api;

pub mod shared;
pub mod utils;

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("users"))))]
async fn test_account_update(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/user/account");
    let admin_cookie = shared::admin_login(&addr).await;

    let response = reqwest::Client::new()
        .put(&url)
        .json(&json!({
            "username": "admin",
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

    let body: Value = response.json().await.unwrap();
    assert_eq!(body["username"], "admin");
    assert_eq!(body["fullname"], "Saartje Molenaar");
    assert_eq!(body["needs_password_change"], false);
}
