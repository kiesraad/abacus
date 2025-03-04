use chrono::TimeDelta;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub use self::{
    api::*,
    role::{Admin, AdminOrCoordinator, Coordinator, Role, Typist},
    user::User,
};

mod api;
pub mod error;
mod password;
mod role;
mod session;
mod user;
mod util;

/// Session lifetime, for both cookie and database
pub const SESSION_LIFE_TIME: TimeDelta = TimeDelta::seconds(60 * 30); // 30 minutes

/// Minimum session lifetime, refresh if only this much time or less is left before expiration
pub const SESSION_MIN_LIFE_TIME: TimeDelta = TimeDelta::seconds(60 * 15); // 15 minutes

/// Session cookie name
pub const SESSION_COOKIE_NAME: &str = "ABACUS_SESSION";

/// Only send cookies over a secure (https) connection
pub const SECURE_COOKIES: bool = false;

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Credentials {
    username: String,
    password: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LoginResponse {
    user_id: u32,
    username: String,
}

impl From<&User> for LoginResponse {
    fn from(user: &User) -> Self {
        Self {
            user_id: user.id(),
            username: user.username().to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::role::Role;
    use api::{AccountUpdateRequest, Credentials, LoginResponse, UserListResponse};
    use axum::{
        Router,
        body::Body,
        http::{HeaderValue, Request, StatusCode},
        middleware,
        routing::{get, post, put},
    };
    use http_body_util::BodyExt;
    use hyper::{Method, header::CONTENT_TYPE};
    use sqlx::SqlitePool;
    use test_log::test;
    use tower::ServiceExt;

    use crate::{
        AppState,
        authentication::{session::Sessions, *},
    };

    fn create_app(pool: SqlitePool) -> Router {
        let state = AppState { pool: pool.clone() };

        let router = Router::new()
            .route("/api/user", get(api::user_list).post(api::user_create))
            .route("/api/user/{user_id}", put(api::user_update))
            .route("/api/user/login", post(api::login))
            .route("/api/user/logout", post(api::logout))
            .route("/api/user/whoami", get(api::whoami))
            .route("/api/user/account", put(api::account_update))
            .layer(middleware::from_fn_with_state(pool, extend_session));

        #[cfg(debug_assertions)]
        let router = router.route(
            "/api/user/development/create",
            post(api::development_create_user),
        );

        router.with_state(state)
    }

    async fn login(app: Router) -> HeaderValue {
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin".to_string(),
                            password: "AdminPassword01".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        response.headers().get("set-cookie").unwrap().clone()
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_login_success(pool: SqlitePool) {
        let app = create_app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin".to_string(),
                            password: "AdminPassword01".to_string(),
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
        assert_eq!(result.username, "admin");
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_login_error(pool: SqlitePool) {
        let app = create_app(pool);

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
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
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_logout(pool: SqlitePool) {
        let app = create_app(pool);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin".to_string(),
                            password: "AdminPassword01".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let cookie = response
            .headers()
            .get("set-cookie")
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: LoginResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.user_id, 1);
        assert_eq!(result.username, "admin");

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/logout")
                    .header("cookie", &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        // Logout again, should return 200
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/logout")
                    .header("cookie", &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_whoami(pool: SqlitePool) {
        let app = create_app(pool);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin".to_string(),
                            password: "AdminPassword01".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let cookie = response
            .headers()
            .get("set-cookie")
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: LoginResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.user_id, 1);
        assert_eq!(result.username, "admin");

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/user/whoami")
                    .header("cookie", &cookie)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: LoginResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.user_id, 1);
        assert_eq!(result.username, "admin");

        // logout the current user
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/logout")
                    .header("cookie", &cookie)
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
                    .uri("/api/user/whoami")
                    .header("cookie", &cookie)
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
                    .uri("/api/user/whoami")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }

    #[cfg(debug_assertions)]
    #[test(sqlx::test)]
    async fn test_development_create_user(pool: SqlitePool) {
        let app = create_app(pool);

        // create a new user
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/development/create")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "user_test".to_string(),
                            password: "password_test".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::CREATED);

        // test login
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "user_test".to_string(),
                            password: "password_test".to_string(),
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
    async fn test_update_password(pool: SqlitePool) {
        let app = create_app(pool);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin".to_string(),
                            password: "AdminPassword01".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert!(response.headers().get("set-cookie").is_some());

        let cookie = response
            .headers()
            .get("set-cookie")
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();

        // Call the account update endpoint
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::PUT)
                    .uri("/api/user/account")
                    .header(CONTENT_TYPE, "application/json")
                    .header("cookie", &cookie)
                    .body(Body::from(
                        serde_json::to_vec(&AccountUpdateRequest {
                            username: "admin".to_string(),
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

        assert_eq!(result.username, "admin");

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin".to_string(),
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

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "admin".to_string(),
                            password: "AdminPassword01".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert!(response.headers().get("set-cookie").is_some());

        let cookie = response
            .headers()
            .get("set-cookie")
            .unwrap()
            .to_str()
            .unwrap()
            .to_string();

        // Call the account update endpoint with incorrect user
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::PUT)
                    .uri("/api/user/account")
                    .header(CONTENT_TYPE, "application/json")
                    .header("cookie", &cookie)
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
        let sessions = Sessions::new(pool);
        let session = sessions.create(1, SESSION_LIFE_TIME).await.unwrap();
        let mut cookie = session.get_cookie();
        set_default_cookie_properties(&mut cookie);
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/user")
                    .header("cookie", &cookie.encoded().to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: UserListResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.users.len(), 3);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_extend_session(pool: SqlitePool) {
        let app = create_app(pool.clone());

        // with a normal long-valid session the user should not get a new cookie
        let sessions = Sessions::new(pool);
        let session = sessions.create(1, SESSION_LIFE_TIME).await.unwrap();
        let mut cookie = session.get_cookie();
        set_default_cookie_properties(&mut cookie);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/user/whoami")
                    .header("cookie", &cookie.encoded().to_string())
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers().get("set-cookie"), None);

        // with a session that is about to expire the user should get a new cookie, and the session lifetime should be extended
        let session: session::Session =
            sessions.create(1, SESSION_MIN_LIFE_TIME / 2).await.unwrap();
        let mut cookie = session.get_cookie();
        set_default_cookie_properties(&mut cookie);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/user/whoami")
                    .header("cookie", &cookie.encoded().to_string())
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

        assert!(response_cookie.contains("Max-Age=1800"));
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_create(pool: SqlitePool) {
        let app = create_app(pool.clone());
        let cookie = login(app.clone()).await;
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user")
                    .header(CONTENT_TYPE, "application/json")
                    .header("cookie", cookie)
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
        let result: user::User = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.username(), "test_user");
        assert!(result.fullname().is_none());
        assert_eq!(result.role(), Role::Administrator);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_update_user(pool: SqlitePool) {
        let app = create_app(pool.clone());
        let cookie = login(app.clone()).await;
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::PUT)
                    .uri("/api/user/1")
                    .header(CONTENT_TYPE, "application/json")
                    .header("cookie", cookie)
                    .body(Body::from(
                        serde_json::to_vec(&UpdateUserRequest {
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
        let result: user::User = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.username(), "admin");
        assert_eq!(result.fullname().unwrap(), "Test Full Name".to_string());
        assert_eq!(result.role(), Role::Administrator);
    }
}
