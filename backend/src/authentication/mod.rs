use axum::{extract::State, http::StatusCode, response::IntoResponse, Json};
use axum_extra::extract::CookieJar;
use chrono::TimeDelta;
use cookie::{Cookie, SameSite};
use serde::{Deserialize, Serialize};
use session::Sessions;
use user::{ListedUser, User, Users};
use utoipa::ToSchema;

use crate::{APIError, ErrorResponse};

mod error;
mod password;
mod session;
mod user;
mod util;

pub use error::AuthenticationError;

/// Session lifetime, for both cookie and database
pub const SESSION_LIFE_TIME: TimeDelta = TimeDelta::seconds(60 * 60 * 2); // 2 hours

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

    // Check the username + password combination, do not leak information about usernames etc.
    let user = users
        .authenticate(&username, &password)
        .await
        .map_err(|e| match e {
            AuthenticationError::UserNotFound => AuthenticationError::InvalidUsernameOrPassword,
            AuthenticationError::InvalidPassword => AuthenticationError::InvalidUsernameOrPassword,
            e => e,
        })?;

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

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ChangePasswordRequest {
    username: String,
    password: String,
    new_password: String,
}

/// Get current logged-in user endpoint
#[utoipa::path(
  get,
  path = "/api/user/whoami",
  responses(
      (status = 200, description = "The current user name and id", body = LoginResponse),
      (status = 401, description = "Invalid user session", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
pub async fn whoami(user: Option<User>) -> Result<impl IntoResponse, APIError> {
    let user = user.ok_or(AuthenticationError::UserNotFound)?;

    Ok(Json(LoginResponse::from(&user)))
}

/// Change password endpoint, updates a user password
#[utoipa::path(
  post,
  path = "/api/user/change-password",
  request_body = ChangePasswordRequest,
  responses(
      (status = 200, description = "The current user name and id", body = LoginResponse),
      (status = 401, description = "Invalid credentials", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
pub async fn change_password(
    State(users): State<Users>,
    user: User,
    Json(credentials): Json<ChangePasswordRequest>,
) -> Result<impl IntoResponse, APIError> {
    if user.username() != credentials.username {
        return Err(AuthenticationError::UserNotFound.into());
    }

    // Check the username + password combination
    let authenticated = users
        .authenticate(&credentials.username, &credentials.password)
        .await?;

    if authenticated.id() != user.id() {
        return Err(AuthenticationError::InvalidPassword.into());
    }

    // Update the password
    users
        .update_password(user.id(), &credentials.new_password)
        .await?;

    Ok(Json(LoginResponse::from(&user)))
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

/// Development endpoint: create a new user (unauthenticated)
#[cfg(debug_assertions)]
#[utoipa::path(
  post,
  path = "/api/user/development/create",
  request_body = Credentials,
  responses(
      (status = 201, description = "User was successfully created"),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
pub async fn development_create_user(
    State(users): State<Users>,
    Json(credentials): Json<Credentials>,
) -> Result<impl IntoResponse, APIError> {
    let Credentials { username, password } = credentials;

    // Create a new user
    users.create(&username, &password).await?;

    Ok(StatusCode::CREATED)
}

/// Development endpoint: login as a user (unauthenticated)
#[cfg(debug_assertions)]
#[utoipa::path(
  get,
  path = "/api/user/development/login",
  responses(
    (status = 200, description = "The logged in user id and user name", body = LoginResponse),
    (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
pub async fn development_login(
    State(users): State<Users>,
    State(sessions): State<Sessions>,
    jar: CookieJar,
) -> Result<impl IntoResponse, APIError> {
    // Get or create the test user
    let user = match users.get_by_username("user").await? {
        Some(u) => u,
        None => users.create("user", "password").await?,
    };

    // Create a new session and cookie
    let session = sessions.create(user.id(), SESSION_LIFE_TIME).await?;

    // Add the session cookie to the response
    let mut cookie = session.get_cookie();
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.add(cookie);

    Ok((updated_jar, Json(LoginResponse::from(&user))))
}

#[derive(Serialize, ToSchema)]
#[cfg_attr(test, derive(Deserialize))]
pub struct UserListResponse {
    users: Vec<ListedUser>,
}

/// Lists all users
#[utoipa::path(
    get,
    path = "/api/user",
    responses(
        (status = 200, description = "User list", body = UserListResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn list(State(users_repo): State<Users>) -> Result<Json<UserListResponse>, APIError> {
    Ok(Json(UserListResponse {
        users: users_repo.list().await?,
    }))
}

#[cfg(test)]
mod tests {
    use axum::{
        body::Body,
        http::Request,
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
            .route("/api/user", get(list))
            .route("/api/user/login", post(login))
            .route("/api/user/logout", post(logout))
            .route("/api/user/whoami", get(whoami))
            .route("/api/user/change-password", post(change_password));

        #[cfg(debug_assertions)]
        let router = router
            .route(
                "/api/user/development/create",
                post(development_create_user),
            )
            .route("/api/user/development/login", get(development_login));

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
