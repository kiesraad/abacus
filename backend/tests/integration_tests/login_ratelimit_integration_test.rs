#![cfg(test)]

use std::net::{IpAddr, Ipv4Addr};

use abacus::{ErrorResponse, api::middleware::authentication::ratelimit::LoginRateLimit};
use hyper::StatusCode;
use reqwest::Client;
use sqlx::SqlitePool;
use test_log::test;

use crate::utils::serve_api_with_login_ratelimit;

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_login_ratelimit_by_source_ip(pool: SqlitePool) {
    let (addr, _backup_dir) = serve_api_with_login_ratelimit(pool, LoginRateLimit::default()).await;
    let url = format!("http://{addr}/api/login");

    // Rate limiting remains active after failed authentication for known and unknown users.
    // Different sources can attempt to log in independently.
    for (last_octet, username) in [(1, "admin1"), (2, "nobody")] {
        let client = Client::builder()
            .local_address(IpAddr::V4(Ipv4Addr::new(127, 0, 0, last_octet)))
            .build()
            .unwrap();
        let response = client
            .post(&url)
            .json(&serde_json::json!({ "username": username, "password": "wrong" }))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        // A different username and spoofed forwarding headers cannot bypass the limit.
        let response = client
            .post(&url)
            .header("x-forwarded-for", "192.0.2.1")
            .header("forwarded", "for=192.0.2.2")
            .json(&serde_json::json!({ "username": "typist1", "password": "Typist1Password01" }))
            .send()
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        assert!(response.headers().get("set-cookie").is_none());
        let body: ErrorResponse = response.json().await.unwrap();
        assert!(!body.fatal);
        assert_eq!(
            serde_json::to_value(body.reference).unwrap(),
            "LoginRateLimited"
        );
    }
}

#[test(sqlx::test(fixtures(path = "../../fixtures", scripts("users"))))]
async fn test_successful_login_resets_rate_limiting(pool: SqlitePool) {
    let (addr, _backup_dir) = serve_api_with_login_ratelimit(pool, LoginRateLimit::default()).await;
    let client = Client::new();
    let url = format!("http://{addr}/api/login");
    let credentials = serde_json::json!({
        "username": "admin1",
        "password": "Admin1Password01",
    });

    let mut cookie = None;
    for _ in 0..2 {
        let response = client.post(&url).json(&credentials).send().await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        cookie = Some(response.headers()["set-cookie"].clone());
    }

    // Success also permits an immediate failed attempt, which activates rate limiting again.
    let response = client
        .post(&url)
        .json(&serde_json::json!({ "username": "admin1", "password": "wrong" }))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let response = client.post(&url).json(&credentials).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);

    // Rate limiting does not affect the session established by the last success.
    let response = client
        .get(format!("http://{addr}/api/account"))
        .header("cookie", cookie.unwrap())
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}
