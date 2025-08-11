use axum::{
    extract::{Path, State},
    response::{AppendHeaders, IntoResponse, Json},
};
use axum_extra::{TypedHeader, extract::CookieJar, headers::UserAgent};
use cookie::{Cookie, SameSite};
use hyper::StatusCode;
use serde::{Deserialize, Serialize};
use sqlx::{Error, SqlitePool};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    Admin, AdminOrCoordinator, SECURE_COOKIES, SESSION_COOKIE_NAME, SESSION_LIFE_TIME,
    error::AuthenticationError, role::Role, user::User,
};
use crate::{
    APIError, AppState, ErrorResponse,
    audit_log::{
        AuditEvent, AuditService, UserDetails, UserLoggedInDetails, UserLoggedOutDetails,
        UserLoginFailedDetails,
    },
    error::ErrorReference,
};

impl From<AuthenticationError> for APIError {
    fn from(err: AuthenticationError) -> Self {
        APIError::Authentication(err)
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(login))
        .routes(routes!(whoami))
        .routes(routes!(initialised))
        .routes(routes!(create_first_admin))
        .routes(routes!(admin_exists))
        .routes(routes!(account_update))
        .routes(routes!(logout))
        .routes(routes!(user_list))
        .routes(routes!(user_create))
        .routes(routes!(user_get))
        .routes(routes!(user_update))
        .routes(routes!(user_delete))
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct LoginResponse {
    pub user_id: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
    pub fullname: Option<String>,
    pub username: String,
    pub role: Role,
    pub needs_password_change: bool,
}

impl From<&User> for LoginResponse {
    fn from(user: &User) -> Self {
        Self {
            user_id: user.id(),
            fullname: user.fullname().map(|u| u.to_string()),
            username: user.username().to_string(),
            role: user.role(),
            needs_password_change: user.needs_password_change(),
        }
    }
}

impl From<LoginResponse> for UserDetails {
    fn from(user: LoginResponse) -> Self {
        Self {
            user_id: user.user_id,
            fullname: user.fullname,
            username: user.username,
            role: user.role.to_string(),
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
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn login(
    user_agent: Option<TypedHeader<UserAgent>>,
    State(pool): State<SqlitePool>,
    jar: CookieJar,
    audit_service: AuditService,
    Json(credentials): Json<Credentials>,
) -> Result<impl IntoResponse, APIError> {
    let Credentials { username, password } = credentials;
    let user_agent = user_agent.map(|ua| ua.to_string()).unwrap_or_default();

    // Check the username + password combination, do not leak information about usernames etc.
    // Log when the attempt fails
    let user = match super::user::authenticate(&pool, &username, &password).await {
        Ok(u) => Ok(u),
        Err(AuthenticationError::UserNotFound) | Err(AuthenticationError::InvalidPassword) => {
            audit_service
                .log(
                    &AuditEvent::UserLoginFailed(UserLoginFailedDetails {
                        username,
                        user_agent: user_agent.clone(),
                    }),
                    None,
                )
                .await?;
            Err(AuthenticationError::InvalidUsernameOrPassword)
        }
        e => e,
    }?;

    // Remove expired sessions, we do this after a login to prevent the necessity of periodical cleanup jobs
    super::session::delete_expired_sessions(&pool).await?;

    // Create a new session and cookie
    let session = super::session::create(&pool, user.id(), SESSION_LIFE_TIME).await?;

    // Log the login event
    audit_service
        .with_user(user.clone())
        .log(
            &AuditEvent::UserLoggedIn(UserLoggedInDetails {
                user_agent,
                logged_in_users_count: super::session::count(&pool).await?,
            }),
            None,
        )
        .await?;

    // Add the session cookie to the response
    let mut cookie = session.get_cookie();
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.add(cookie);

    Ok((updated_jar, Json(LoginResponse::from(&user))))
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct AccountUpdateRequest {
    pub username: String,
    pub password: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
    pub fullname: Option<String>,
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
async fn whoami(user: Option<User>) -> Result<impl IntoResponse, APIError> {
    let user = user.ok_or(AuthenticationError::UserNotFound)?;

    Ok(Json(LoginResponse::from(&user)))
}

/// Check whether the application is initialised (an admin user exists + has logged in at least once)
#[utoipa::path(
  get,
  path = "/api/initialised",
  responses(
      (status = 200, description = "The application is initialised"),
      (status = 418, description = "The application is not initialised", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
async fn initialised(State(pool): State<SqlitePool>) -> Result<impl IntoResponse, APIError> {
    if super::user::has_active_users(&pool).await? {
        Ok(StatusCode::OK)
    } else {
        Err(AuthenticationError::NotInitialised.into())
    }
}

/// Create the first admin user, only allowed if no users exist yet
#[utoipa::path(
    post,
    path = "/api/initialise/first-admin",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "First admin user created", body = User),
        (status = 403, description = "Forbidden, an active user already exists", body = ErrorResponse),
        (status = 409, description = "Conflict (username already exists)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn create_first_admin(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(create_user_req): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), APIError> {
    if super::user::has_active_users(&pool).await? {
        return Err(AuthenticationError::AlreadyInitialised.into());
    }

    // Delete any existing admin user
    let users = super::user::list(&pool).await?;
    for user in users {
        if user.role() == Role::Administrator {
            super::user::delete(&pool, user.id()).await?;

            audit_service
                .log(&AuditEvent::UserDeleted(user.into()), None)
                .await?;
        }
    }

    // Create the first admin user
    let user = super::user::create(
        &pool,
        &create_user_req.username,
        create_user_req.fullname.as_deref(),
        &create_user_req.temp_password,
        false,
        Role::Administrator,
    )
    .await?;

    audit_service
        .log(&AuditEvent::UserCreated(user.clone().into()), None)
        .await?;

    Ok((StatusCode::CREATED, Json(user)))
}

#[utoipa::path(
    get,
    path = "/api/initialise/admin-exists",
    responses(
        (status = 200, description = "First admin user exists"),
        (status = 403, description = "Forbidden, the application is already initialised", body = ErrorResponse),
        (status = 404, description = "No admin user exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn admin_exists(State(pool): State<SqlitePool>) -> Result<StatusCode, APIError> {
    if super::user::has_active_users(&pool).await? {
        return Err(AuthenticationError::AlreadyInitialised.into());
    }

    if super::user::admin_exists(&pool).await? {
        return Ok(StatusCode::OK);
    }

    Err(APIError::NotFound(
        "No admin user exists".into(),
        ErrorReference::UserNotFound,
    ))
}

/// Update the user's account with a new password and optionally new fullname
#[utoipa::path(
  put,
  path = "/api/user/account",
  request_body = AccountUpdateRequest,
  responses(
      (status = 200, description = "The logged in user", body = LoginResponse),
      (status = 400, description = "Bad request", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
async fn account_update(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(account): Json<AccountUpdateRequest>,
) -> Result<impl IntoResponse, APIError> {
    if user.username() != account.username {
        return Err(AuthenticationError::UserNotFound.into());
    }

    // Update the password
    super::user::update_password(&pool, user.id(), &account.username, &account.password).await?;

    // Update the fullname
    if let Some(fullname) = account.fullname {
        super::user::update_fullname(&pool, user.id(), &fullname).await?;
    }

    let Some(updated_user) = super::user::get_by_username(&pool, user.username()).await? else {
        return Err(AuthenticationError::UserNotFound.into());
    };

    let response = LoginResponse::from(&updated_user);

    audit_service
        .log(
            &AuditEvent::UserAccountUpdated(response.clone().into()),
            None,
        )
        .await?;

    Ok(Json(response))
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
async fn logout(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    jar: CookieJar,
) -> Result<impl IntoResponse, APIError> {
    // Ask browser to remove all browsing data
    // https://owasp.org/www-project-secure-headers/#clear-site-data
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Clear-Site-Data
    const CLEAR_SITE_DATA_HEADER: (&str, &str) =
        ("Clear-Site-Data", r#""cache","cookies","storage""#);

    let Some(mut cookie) = jar.get(SESSION_COOKIE_NAME).cloned() else {
        // no cookie found, return OK
        return Ok((AppendHeaders([CLEAR_SITE_DATA_HEADER]), jar, StatusCode::OK));
    };

    // Get the session key from the cookie
    let session_key = cookie.value();

    // Log audit event when a valid session exists
    if let Some(session) = super::session::get_by_key(&pool, session_key)
        .await
        .ok()
        .flatten()
    {
        // Log the logout event
        audit_service
            .log(
                &AuditEvent::UserLoggedOut(UserLoggedOutDetails {
                    session_duration: session.duration().as_secs(),
                }),
                None,
            )
            .await?;
    }

    // Remove session from the database
    super::session::delete(&pool, session_key).await?;

    // Set cookie parameters, these are not present in the request, and have to match in order to clear the cookie
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.remove(cookie);

    Ok((
        AppendHeaders([CLEAR_SITE_DATA_HEADER]),
        updated_jar,
        StatusCode::OK,
    ))
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserListResponse {
    pub users: Vec<User>,
}

/// Lists all users
#[utoipa::path(
    get,
    path = "/api/user",
    responses(
        (status = 200, description = "User list", body = UserListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn user_list(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
) -> Result<Json<UserListResponse>, APIError> {
    Ok(Json(UserListResponse {
        users: super::user::list(&pool).await?,
    }))
}

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

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
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
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 409, description = "Conflict (username already exists)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn user_create(
    _admin: Admin,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(create_user_req): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), APIError> {
    let user = super::user::create(
        &pool,
        &create_user_req.username,
        create_user_req.fullname.as_deref(),
        &create_user_req.temp_password,
        true,
        create_user_req.role,
    )
    .await?;

    audit_service
        .log(&AuditEvent::UserCreated(user.clone().into()), None)
        .await?;

    Ok((StatusCode::CREATED, Json(user)))
}

/// Get a user
#[utoipa::path(
    get,
    path = "/api/user/{user_id}",
    responses(
        (status = 200, description = "User found", body = User),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("user_id" = u32, description = "User id"),
    ),
)]
async fn user_get(
    _user: Admin,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<u32>,
) -> Result<Json<User>, APIError> {
    let user = super::user::get_by_id(&pool, user_id).await?;
    Ok(Json(user.ok_or(Error::RowNotFound)?))
}

/// Update a user
#[utoipa::path(
    put,
    path = "/api/user/{user_id}",
    request_body = UpdateUserRequest,
    responses(
        (status = 200, description = "User updated", body = User),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn user_update(
    _admin: Admin,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(user_id): Path<u32>,
    Json(update_user_req): Json<UpdateUserRequest>,
) -> Result<Json<User>, APIError> {
    if let Some(fullname) = update_user_req.fullname {
        super::user::update_fullname(&pool, user_id, &fullname).await?
    };

    if let Some(temp_password) = update_user_req.temp_password {
        super::user::set_temporary_password(&pool, user_id, &temp_password).await?;

        super::session::delete_user_session(&pool, user_id).await?;
    };

    let user = super::user::get_by_id(&pool, user_id)
        .await?
        .ok_or(Error::RowNotFound)?;

    audit_service
        .log(&AuditEvent::UserUpdated(user.clone().into()), None)
        .await?;

    Ok(Json(user))
}

/// Delete a user
#[utoipa::path(
    delete,
    path = "/api/user/{user_id}",
    responses(
        (status = 200, description = "User deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn user_delete(
    logged_in_user: Admin,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(user_id): Path<u32>,
) -> Result<StatusCode, APIError> {
    let Some(user) = super::user::get_by_id(&pool, user_id).await? else {
        return Err(APIError::NotFound(
            format!("User with id {user_id} not found"),
            ErrorReference::EntryNotFound,
        ));
    };

    // Prevent user from deleting their own account
    if logged_in_user.0.id() == user_id {
        return Err(AuthenticationError::OwnAccountCannotBeDeleted.into());
    }

    let deleted = super::user::delete(&pool, user_id).await?;

    if deleted {
        audit_service
            .log(&AuditEvent::UserDeleted(user.clone().into()), None)
            .await?;

        Ok(StatusCode::OK)
    } else {
        Err(APIError::NotFound(
            format!("Error deleting user with id {user_id}"),
            ErrorReference::EntryNotFound,
        ))
    }
}

#[cfg(test)]
mod tests {
    use axum::{extract::State, response::IntoResponse};
    use cookie::{Cookie, SameSite};
    use hyper::StatusCode;
    use sqlx::SqlitePool;
    use test_log::test;

    use crate::{
        APIError,
        authentication::{
            Role, SECURE_COOKIES, api::set_default_cookie_properties, error::AuthenticationError,
            user::update_last_activity_at,
        },
    };

    #[test(tokio::test)]
    async fn test_set_default_cookie_properties() {
        let mut cookie = Cookie::new("test-cookie", "");

        set_default_cookie_properties(&mut cookie);

        assert_eq!(cookie.path().unwrap(), "/");
        assert!(cookie.http_only().unwrap());
        assert_eq!(cookie.secure().unwrap(), SECURE_COOKIES);
        assert_eq!(cookie.same_site().unwrap(), SameSite::Strict);
    }

    #[test(sqlx::test)]
    async fn test_initialised(pool: SqlitePool) {
        let initialised = super::initialised(State(pool.clone())).await;

        assert!(matches!(
            initialised,
            Err(APIError::Authentication(
                AuthenticationError::NotInitialised
            ))
        ));

        // Create an admin user to mark the application as initialised
        let admin = crate::authentication::user::create(
            &pool,
            "admin",
            Some("Admin User"),
            "admin_password",
            false,
            Role::Administrator,
        )
        .await
        .unwrap();

        admin.update_last_activity_at(&pool).await.unwrap();

        let initialised = super::initialised(State(pool)).await;
        assert!(initialised.is_ok());

        let response = initialised.unwrap().into_response();
        assert_eq!(response.status(), StatusCode::OK);
    }

    #[test(sqlx::test)]
    async fn test_create_first_admin(pool: SqlitePool) {
        let create_user_req = super::CreateUserRequest {
            username: "admin".to_string(),
            fullname: Some("Admin User".to_string()),
            temp_password: "admin_password".to_string(),
            role: Role::Administrator,
        };

        let response = super::create_first_admin(
            State(pool.clone()),
            crate::audit_log::AuditService::new(pool.clone(), None, None),
            axum::Json(create_user_req),
        )
        .await;

        assert!(response.is_ok());
        let (status, user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(user.username(), "admin");

        // Create a new user again is allowed as long as the admin has not logged in yet
        let create_user_req = super::CreateUserRequest {
            username: "admin2".to_string(),
            fullname: Some("Admin User 2".to_string()),
            temp_password: "admin_password".to_string(),
            role: Role::Administrator,
        };
        let response = super::create_first_admin(
            State(pool.clone()),
            crate::audit_log::AuditService::new(pool.clone(), None, None),
            axum::Json(create_user_req),
        )
        .await;

        assert!(response.is_ok());
        let (status, user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(user.username(), "admin2");

        // Not allowed to create a new user after the first admin has logged in
        update_last_activity_at(&pool, user.id()).await.unwrap();

        let create_user_req = super::CreateUserRequest {
            username: "admin2".to_string(),
            fullname: Some("Admin User 3".to_string()),
            temp_password: "admin_password".to_string(),
            role: Role::Administrator,
        };
        let response = super::create_first_admin(
            State(pool.clone()),
            crate::audit_log::AuditService::new(pool.clone(), None, None),
            axum::Json(create_user_req),
        )
        .await;

        assert!(response.is_err());
    }

    #[test(sqlx::test)]
    async fn test_admin_exists(pool: SqlitePool) {
        // No admin user exists yet
        let response = super::admin_exists(State(pool.clone())).await;
        assert!(response.is_err());
        assert!(matches!(response, Err(APIError::NotFound(_, _))));

        // Create an admin user
        let create_user_req = super::CreateUserRequest {
            username: "admin".to_string(),
            fullname: Some("Admin User".to_string()),
            temp_password: "admin_password".to_string(),
            role: Role::Administrator,
        };
        let response = super::create_first_admin(
            State(pool.clone()),
            crate::audit_log::AuditService::new(pool.clone(), None, None),
            axum::Json(create_user_req),
        )
        .await;

        assert!(response.is_ok());
        let (status, _user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);

        let response = super::admin_exists(State(pool.clone())).await;
        assert!(response.unwrap() == StatusCode::OK);
    }
}
