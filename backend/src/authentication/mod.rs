use axum::{extract::State, response::IntoResponse, Json};
use axum_extra::extract::CookieJar;
use cookie::{Cookie, SameSite};
use hyper::StatusCode;
use serde::{Deserialize, Serialize};
use session::Sessions;
use std::time::Duration;
use user::{User, Users};
use utoipa::ToSchema;

use crate::{APIError, ErrorResponse};

mod error;
mod password;
mod session;
mod user;
mod util;

pub use error::AuthenticationError;

/// Session lifetime, for both cookie and database
pub const SESSION_LIFE_TIME: Duration = Duration::from_secs(60 * 60 * 2); // 2 hours

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

/// Set default session cookie properties
fn set_default_cookie_properties(cookie: &mut Cookie) {
    cookie.set_path("/");
    cookie.set_http_only(true);
    cookie.set_secure(SECURE_COOKIES);
    cookie.set_same_site(SameSite::Strict);
}

/// Login endpoint, authenticates a user and creates a new session + session cookie
#[utoipa::path(
    post,
    path = "/api/user/login",
    request_body = Credentials,
    responses(
        (status = 200, description = "The logged in user id and user name", body = LoginResponse),
        (status = 401, description = "Invalid credentials", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn login(
    State(users): State<Users>,
    State(sessions): State<Sessions>,
    jar: CookieJar,
    Json(credentials): Json<Credentials>,
) -> Result<impl IntoResponse, APIError> {
    let Credentials { username, password } = credentials;

    // Check the username + password combination
    let user = users.authenticate(&username, &password).await?;

    // Remove expired sessions, we do this after a login to prevent the necessity of periodical cleanup jobs
    sessions.delete_expired_sessions().await?;

    // Create a new session and cookie
    let session = sessions.create(user.id(), SESSION_LIFE_TIME).await?;

    // Add the session cookie to the response
    let mut cookie = session.get_cookie();
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.add(cookie);

    Ok((updated_jar, Json(LoginResponse::from(&user))))
}

/// Logout endpoint, deletes the session cookie
#[utoipa::path(
    post,
    path = "/api/user/logout",
    responses(
        (status = 200, description = "Successful logout, or user was already logged out"),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn logout(
    State(sessions): State<Sessions>,
    jar: CookieJar,
) -> Result<impl IntoResponse, APIError> {
    let Some(mut cookie) = jar.get(SESSION_COOKIE_NAME).cloned() else {
        // no cookie found, return OK
        return Ok((jar, StatusCode::OK));
    };

    // Remove session from the database
    let session_key = cookie.value();
    sessions.delete(session_key).await?;

    // Set cookie parameters, these are not present in the request, and have to match in order to clear the cookie
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.remove(cookie);

    Ok((updated_jar, StatusCode::OK))
}

#[cfg(test)]
mod tests {
    use axum::{body::Body, http::Request, routing::post, Router};
    use http_body_util::BodyExt;
    use hyper::{header::CONTENT_TYPE, Method};
    use sqlx::SqlitePool;
    use tower::ServiceExt;

    use super::{login, logout};
    use crate::{
        authentication::{Credentials, LoginResponse},
        AppState,
    };

    fn create_app(pool: SqlitePool) -> Router {
        let state = AppState { pool };

        Router::new()
            .route("/api/user/login", post(login))
            .route("/api/user/logout", post(logout))
            .with_state(state)
    }

    #[sqlx::test(fixtures("../../fixtures/users.sql"))]
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

        assert_eq!(response.status(), 200);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: LoginResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.user_id, 1);
        assert_eq!(result.username, "user");
    }

    #[sqlx::test(fixtures("../../fixtures/users.sql"))]
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

        assert_eq!(response.status(), 401);
    }

    #[sqlx::test(fixtures("../../fixtures/users.sql"))]
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

        assert_eq!(response.status(), 200);

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

        assert_eq!(response.status(), 200);

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

        assert_eq!(response.status(), 200);
    }
}
