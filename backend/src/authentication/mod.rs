use chrono::TimeDelta;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub use self::{api::*, user_api::*};
pub use middleware::*;
pub use role::{Admin, AdminOrCoordinator, Coordinator, Role, Typist};
pub use user::User;

pub mod api;
pub mod error;
mod middleware;
mod password;
pub mod request_data;
mod role;
pub mod session;
pub mod user;
pub mod user_api;
mod util;

/// Session lifetime, for both cookie and database
/// Also change the translation string "users.session_expired" in the frontend if this value is changed
pub const SESSION_LIFE_TIME: TimeDelta = TimeDelta::seconds(60 * 30); // 30 minutes

/// Minimum session lifetime, refresh if only this much time or less is left before expiration
pub const SESSION_MIN_LIFE_TIME: TimeDelta = TimeDelta::seconds(60 * 15); // 15 minutes

/// Session cookie name
pub const SESSION_COOKIE_NAME: &str = "ABACUS_SESSION";

/// Only send cookies over a secure (https) connection
pub const SECURE_COOKIES: bool = false;

/// Struct used to create a new user
#[derive(Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CreateUserRequest {
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub fullname: Option<String>,
    pub temp_password: String,
    pub role: Role,
}

#[cfg(test)]
mod tests {
    use std::net::SocketAddr;

    use axum::{
        Router,
        body::Body,
        extract::ConnectInfo,
        http::{HeaderValue, Request, StatusCode},
        middleware,
    };
    use http_body_util::BodyExt;
    use hyper::{
        Method,
        header::{CONTENT_TYPE, COOKIE, USER_AGENT},
    };
    use sqlx::SqlitePool;
    use test_log::test;
    use tower::ServiceExt;

    use crate::{
        AppState, ErrorResponse,
        airgap::AirgapDetection,
        audit_log::{AuditEvent, LogFilter, UserLoginFailedDetails},
        authentication::{
            api::{AccountUpdateRequest, Credentials},
            middleware::extend_session,
            role::Role,
            *,
        },
        error::ErrorReference,
    };

    const TEST_USER_AGENT: &str = "TestAgent/1.0";
    const TEST_IP_ADDRESS: &str = "0.0.0.0";

    fn create_app(pool: SqlitePool) -> Router {
        let state = AppState {
            pool: pool.clone(),
            airgap_detection: AirgapDetection::nop(),
        };

        Router::from(router())
            .merge(user_router())
            .layer(middleware::map_response_with_state(
                state.clone(),
                extend_session,
            ))
            .layer(middleware::map_request_with_state(
                state.clone(),
                inject_user,
            ))
            .with_state(state)
    }

    async fn login_as_admin(app: Router) -> HeaderValue {
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/login")
                    .header(CONTENT_TYPE, "application/json")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin1".to_string(),
                            password: "Admin1Password01".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert!(response.headers().get("set-cookie").is_some());

        response.headers().get("set-cookie").unwrap().clone()
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_login_success(pool: SqlitePool) {
        let app = create_app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/login")
                    .header(CONTENT_TYPE, "application/json")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin1".to_string(),
                            password: "Admin1Password01".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert!(response.headers().get("set-cookie").is_some());

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: LoginResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.user_id, 1);
        assert_eq!(result.username, "admin1");
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_login_error(pool: SqlitePool) {
        let app = create_app(pool.clone());

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/login")
                    .header(CONTENT_TYPE, "application/json")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin".to_string(),
                            password: "wrong".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        let mut conn = pool.acquire().await.unwrap();
        let events = crate::audit_log::list(
            &mut conn,
            &LogFilter {
                limit: 10,
                ..Default::default()
            },
        )
        .await
        .unwrap();

        assert_eq!(events.len(), 1);
        assert_eq!(
            events[0].event(),
            &AuditEvent::UserLoginFailed(UserLoginFailedDetails {
                username: "admin".to_string(),
                user_agent: TEST_USER_AGENT.to_string(),
            })
        );
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_logout(pool: SqlitePool) {
        let app = create_app(pool);

        let cookie = login_as_admin(app.clone()).await;

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/logout")
                    .header(COOKIE, &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.headers()["clear-site-data"],
            r#""cookies","storage""#
        );
        let set_cookie_header = response
            .headers()
            .get("set-cookie")
            .unwrap()
            .to_str()
            .unwrap();
        assert!(
            set_cookie_header.contains("ABACUS_SESSION=")
                && set_cookie_header.contains("Max-Age=0"),
            "Session cookie should be removed after logout"
        );

        // Logout again, should return 200
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/logout")
                    .header(COOKIE, &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(
            response.headers()["clear-site-data"],
            r#""cookies","storage""#
        );
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_whoami(pool: SqlitePool) {
        let app = create_app(pool);

        let cookie = login_as_admin(app.clone()).await;

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/whoami")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: LoginResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.user_id, 1);
        assert_eq!(result.username, "admin1");

        // logout the current user
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/logout")
                    .header(COOKIE, &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        // try to get the current user again, should return 401
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/whoami")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        // try to the current without any cookie, should return 401
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/whoami")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_update_password(pool: SqlitePool) {
        let app = create_app(pool);

        let cookie = login_as_admin(app.clone()).await;

        // Call the account update endpoint
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::PUT)
                    .uri("/api/account")
                    .header(CONTENT_TYPE, "application/json")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, &cookie)
                    .body(Body::from(
                        serde_json::to_vec(&AccountUpdateRequest {
                            username: "admin1".to_string(),
                            password: "TotallyValidNewP4ssW0rd".to_string(),
                            fullname: None,
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: LoginResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.username, "admin1");

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/login")
                    .header(CONTENT_TYPE, "application/json")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin1".to_string(),
                            password: "TotallyValidNewP4ssW0rd".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_update_password_fail(pool: SqlitePool) {
        let app = create_app(pool);

        let cookie = login_as_admin(app.clone()).await;

        // Call the account update endpoint with incorrect user
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::PUT)
                    .uri("/api/account")
                    .header(CONTENT_TYPE, "application/json")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, &cookie)
                    .body(Body::from(
                        serde_json::to_vec(&AccountUpdateRequest {
                            username: "wrong_user".to_string(),
                            password: "new_password".to_string(),
                            fullname: Some("Wrong User".to_string()),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list(pool: SqlitePool) {
        let app = create_app(pool.clone());
        let mut conn = pool.acquire().await.unwrap();
        let session = super::session::create(
            &mut conn,
            1,
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            SESSION_LIFE_TIME,
        )
        .await
        .unwrap();
        let mut cookie = session.get_cookie();
        set_default_cookie_properties(&mut cookie);
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/user")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, cookie.encoded().to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: user_api::UserListResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.users.len(), 6);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_extend_session(pool: SqlitePool) {
        let app = create_app(pool.clone());

        // with a normal long-valid session the user should not get a new cookie
        let mut conn = pool.acquire().await.unwrap();
        let session = super::session::create(
            &mut conn,
            1,
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            SESSION_LIFE_TIME,
        )
        .await
        .unwrap();
        let mut cookie = session.get_cookie();
        set_default_cookie_properties(&mut cookie);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/whoami")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, cookie.encoded().to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers().get("set-cookie"), None);

        // with a session that is about to expire the user should get a new cookie, and the session lifetime should be extended
        let session: session::Session = super::session::create(
            &mut conn,
            1,
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            SESSION_MIN_LIFE_TIME / 2,
        )
        .await
        .unwrap();
        let mut cookie = session.get_cookie();
        set_default_cookie_properties(&mut cookie);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/whoami")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, cookie.encoded().to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let response_cookie = response
            .headers()
            .get("set-cookie")
            .unwrap()
            .to_str()
            .unwrap();

        assert!(response_cookie.contains(&format!("Max-Age={}", SESSION_LIFE_TIME.num_seconds())));
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_create(pool: SqlitePool) {
        let app = create_app(pool.clone());
        let cookie = login_as_admin(app.clone()).await;
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user")
                    .header(CONTENT_TYPE, "application/json")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, cookie)
                    .body(Body::from(
                        serde_json::to_vec(&CreateUserRequest {
                            username: "test_user".to_string(),
                            fullname: None,
                            temp_password: "TotallyValidP4ssW0rd".to_string(),
                            role: Role::Administrator,
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: User = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.username(), "test_user");
        assert!(result.fullname().is_none());
        assert_eq!(result.role(), Role::Administrator);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_update_user(pool: SqlitePool) {
        let app = create_app(pool.clone());
        let cookie = login_as_admin(app.clone()).await;
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::PUT)
                    .uri("/api/user/1")
                    .header(CONTENT_TYPE, "application/json")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, cookie)
                    .body(Body::from(
                        serde_json::to_vec(&user_api::UpdateUserRequest {
                            fullname: Some("Test Full Name".to_string()),
                            temp_password: None,
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: User = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.username(), "admin1");
        assert_eq!(result.fullname().unwrap(), "Test Full Name".to_string());
        assert_eq!(result.role(), Role::Administrator);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_forbidden_on_wrong_user_role(pool: SqlitePool) {
        let app = create_app(pool.clone());
        // user id 5 is a typist
        let mut conn = pool.acquire().await.unwrap();
        let session = super::session::create(
            &mut conn,
            5,
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            SESSION_LIFE_TIME,
        )
        .await
        .unwrap();
        let mut cookie = session.get_cookie();
        set_default_cookie_properties(&mut cookie);
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/user")
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, cookie.encoded().to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::Forbidden);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_denied_on_different_user_agent(pool: SqlitePool) {
        let app = create_app(pool.clone());
        let cookie = login_as_admin(app.clone()).await;

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/whoami")
                    .header(USER_AGENT, "DifferentAgent/2.0")
                    .header(COOKIE, &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::UserNotFound);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_denied_on_different_client_ip(pool: SqlitePool) {
        let app = create_app(pool.clone());
        let cookie = login_as_admin(app.clone()).await;

        let mut request = Request::builder()
            .method(Method::GET)
            .uri("/api/whoami")
            .header(USER_AGENT, TEST_USER_AGENT)
            .header(COOKIE, &cookie)
            .body(Body::empty())
            .unwrap();

        // manually set a different IP address
        request
            .extensions_mut()
            .insert(ConnectInfo(SocketAddr::from(([1, 2, 3, 4], 1234))));

        let response = app.clone().oneshot(request).await.unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::UserNotFound);
    }
}
