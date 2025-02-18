#![cfg(test)]

use abacus::authentication::UserListResponse;
use hyper::StatusCode;
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
