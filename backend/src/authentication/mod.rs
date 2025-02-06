use chrono::TimeDelta;

pub use self::api::*;

mod api;
pub mod error;
mod password;
mod role;
mod session;
mod user;
mod util;

/// Session lifetime, for both cookie and database
pub const SESSION_LIFE_TIME: TimeDelta = TimeDelta::seconds(60 * 60 * 2); // 2 hours

/// Session cookie name
pub const SESSION_COOKIE_NAME: &str = "ABACUS_SESSION";

/// Only send cookies over a secure (https) connection
pub const SECURE_COOKIES: bool = false;

#[cfg(test)]
mod tests {
    use api::{ChangePasswordRequest, Credentials, LoginResponse, UserListResponse};
    use axum::{
        body::Body,
        http::{Request, StatusCode},
        routing::{get, post},
        Router,
    };
    use http_body_util::BodyExt;
    use hyper::{header::CONTENT_TYPE, Method};
    use sqlx::SqlitePool;
    use test_log::test;
    use tower::ServiceExt;

    use crate::{authentication::*, AppState};

    fn create_app(pool: SqlitePool) -> Router {
        let state = AppState { pool };

        let router = Router::new()
            .route("/api/user", get(api::list))
            .route("/api/user/login", post(api::login))
            .route("/api/user/logout", post(api::logout))
            .route("/api/user/whoami", get(api::whoami))
            .route("/api/user/change-password", post(api::change_password));

        #[cfg(debug_assertions)]
        let router = router
            .route(
                "/api/user/development/create",
                post(api::development_create_user),
            )
            .route("/api/user/development/login", get(api::development_login));

        router.with_state(state)
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
                            username: "user".to_string(),
                            password: "password".to_string(),
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
        assert_eq!(result.username, "user");
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
                            username: "user".to_string(),
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
                            username: "user".to_string(),
                            password: "password".to_string(),
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
        assert_eq!(result.username, "user");

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
                            username: "user".to_string(),
                            password: "password".to_string(),
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
        assert_eq!(result.username, "user");

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
        assert_eq!(result.username, "user");

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

    #[cfg(debug_assertions)]
    #[test(sqlx::test)]
    async fn test_development_login(pool: SqlitePool) {
        let app = create_app(pool);

        // test login
        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/user/development/login")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        assert!(response.headers().get("set-cookie").is_some());

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: LoginResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.username, "user");
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
                            username: "user".to_string(),
                            password: "password".to_string(),
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

        // Call the change password endpoint
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/change-password")
                    .header(CONTENT_TYPE, "application/json")
                    .header("cookie", &cookie)
                    .body(Body::from(
                        serde_json::to_vec(&ChangePasswordRequest {
                            username: "user".to_string(),
                            password: "password".to_string(),
                            new_password: "new_password".to_string(),
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

        assert_eq!(result.username, "user");

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/login")
                    .header(CONTENT_TYPE, "application/json")
                    .body(Body::from(
                        serde_json::to_vec(&Credentials {
                            username: "user".to_string(),
                            password: "new_password".to_string(),
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
                            username: "user".to_string(),
                            password: "password".to_string(),
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

        // Call the change password endpoint with incorrect password
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/change-password")
                    .header(CONTENT_TYPE, "application/json")
                    .header("cookie", &cookie)
                    .body(Body::from(
                        serde_json::to_vec(&ChangePasswordRequest {
                            username: "user".to_string(),
                            password: "wrong_password".to_string(),
                            new_password: "new_password".to_string(),
                        })
                        .unwrap(),
                    ))
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

        // Call the change password endpoint with incorrect ucer
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::POST)
                    .uri("/api/user/change-password")
                    .header(CONTENT_TYPE, "application/json")
                    .header("cookie", &cookie)
                    .body(Body::from(
                        serde_json::to_vec(&ChangePasswordRequest {
                            username: "wrong_user".to_string(),
                            password: "password".to_string(),
                            new_password: "new_password".to_string(),
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
        let app = create_app(pool);

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .uri("/api/user")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: UserListResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.users.len(), 1);
    }
}
