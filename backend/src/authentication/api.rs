use super::{
    error::AuthenticationError,
    role::Role,
    session::Sessions,
    user::{User, Users},
    SECURE_COOKIES, SESSION_COOKIE_NAME, SESSION_LIFE_TIME,
};
use axum::{
    extract::{Path, Request, State},
    middleware::Next,
    response::{IntoResponse, Json, Response},
};
use axum_extra::extract::CookieJar;
use cookie::{Cookie, SameSite};
use hyper::{header::SET_COOKIE, StatusCode};
use serde::{Deserialize, Serialize};
use sqlx::{Error, SqlitePool};
use tracing::debug;
use utoipa::ToSchema;

use crate::{APIError, ErrorResponse};
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct LoginResponse {
    pub user_id: u32,
    pub fullname: String,
    pub username: String,
    pub role: Role,
}

impl From<&User> for LoginResponse {
    fn from(user: &User) -> Self {
        Self {
            user_id: user.id(),
            fullname: user
                .fullname()
                .unwrap_or_else(|| user.username())
                .to_string(),
            username: user.username().to_string(),
            role: user.role(),
        }
    }
}

/// Set default session cookie properties
pub(super) fn set_default_cookie_properties(cookie: &mut Cookie) {
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
    pub username: String,
    pub password: String,
    pub new_password: String,
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

/// Middleware to extend the session lifetime
pub async fn extend_session(State(pool): State<SqlitePool>, req: Request, next: Next) -> Response {
    let jar = CookieJar::from_headers(req.headers());
    let mut res = next.run(req).await;

    let Some(session_cookie) = jar.get(SESSION_COOKIE_NAME) else {
        return res;
    };

    let sessions = Sessions::new(pool);

    // extend lifetime of session and set new cookie if the session is still valid and will soon be expired
    if let Ok(Some(session)) = sessions.extend_session(session_cookie.value()).await {
        debug!("Session extended: {:?}", session_cookie);

        let mut cookie = session.get_cookie();
        set_default_cookie_properties(&mut cookie);

        debug!("Setting cookie: {:?}", cookie);

        if let Ok(header_value) = cookie.encoded().to_string().parse() {
            res.headers_mut().append(SET_COOKIE, header_value);
        }
    }

    res
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
    use super::role::Role;

    let Credentials { username, password } = credentials;

    // Create a new user
    users
        .create(&username, None, &password, Role::Typist)
        .await?;

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

    use super::role::Role;
    let user = match users.get_by_username("admin").await? {
        Some(u) => u,
        None => {
            users
                .create("admin", Some("Full Name"), "password", Role::Administrator)
                .await?
        }
    };

    // Create a new session and cookie
    let session = sessions.create(user.id(), SESSION_LIFE_TIME).await?;

    // Add the session cookie to the response
    let mut cookie = session.get_cookie();
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.add(cookie);

    Ok((updated_jar, Json(LoginResponse::from(&user))))
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UserListResponse {
    pub users: Vec<User>,
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
pub async fn user_list(
    State(users_repo): State<Users>,
) -> Result<Json<UserListResponse>, APIError> {
    Ok(Json(UserListResponse {
        users: users_repo.list().await?,
    }))
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CreateUserRequest {
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub fullname: Option<String>,
    pub temp_password: String,
    pub role: Role,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateUserRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub fullname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub temp_password: Option<String>,
}

/// Create a new user
#[utoipa::path(
    post,
    path = "/api/user",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "User created", body = User),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn user_create(
    State(users_repo): State<Users>,
    Json(create_user_req): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), APIError> {
    let user = users_repo
        .create(
            &create_user_req.username,
            create_user_req.fullname.as_deref(),
            &create_user_req.temp_password,
            create_user_req.role,
        )
        .await?;
    Ok((StatusCode::CREATED, Json(user)))
}

/// Get a user
#[utoipa::path(
    get,
    path = "/api/user/{user_id}",
    responses(
        (status = 200, description = "User found", body = User),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("user_id" = u32, description = "User id"),
    ),
)]
pub async fn user_get(
    State(users_repo): State<Users>,
    Path(user_id): Path<u32>,
) -> Result<Json<User>, APIError> {
    let user = users_repo.get_by_id(user_id).await?;
    Ok(Json(user.ok_or(Error::RowNotFound)?))
}

/// Update a user
#[utoipa::path(
    put,
    path = "/api/user/{user_id}",
    request_body = UpdateUserRequest,
    responses(
        (status = 200, description = "User updated", body = User),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn user_update(
    State(users_repo): State<Users>,
    Path(user_id): Path<u32>,
    Json(update_user_req): Json<UpdateUserRequest>,
) -> Result<Json<User>, APIError> {
    let user = users_repo
        .update(
            user_id,
            update_user_req.fullname.as_deref(),
            update_user_req.temp_password.as_deref(),
        )
        .await?;
    Ok(Json(user))
}
