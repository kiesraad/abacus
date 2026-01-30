use std::net::{IpAddr, Ipv4Addr};

use axum::{
    extract::State,
    response::{AppendHeaders, IntoResponse, Json},
};
use axum_extra::{TypedHeader, extract::CookieJar, headers::UserAgent};
use cookie::{Cookie, SameSite};
use hyper::StatusCode;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::middleware::authentication::{
        IncompleteUser, SECURE_COOKIES, SESSION_COOKIE_NAME, SESSION_LIFE_TIME,
        error::AuthenticationError, session,
    },
    domain::role::Role,
    error::ErrorReference,
    infra::audit_log::{
        AuditEvent, AuditService, UserDetails, UserLoggedInDetails, UserLoggedOutDetails,
        UserLoginFailedDetails,
    },
    repository::user_repo::{self, User, UserId},
};

impl From<AuthenticationError> for APIError {
    fn from(err: AuthenticationError) -> Self {
        APIError::Authentication(err)
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(login))
        .routes(routes!(account))
        .routes(routes!(account_update))
        .routes(routes!(initialised))
        .routes(routes!(create_first_admin))
        .routes(routes!(admin_exists))
        .routes(routes!(logout))
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
    pub user_id: UserId,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
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
pub(crate) fn set_default_cookie_properties(cookie: &mut Cookie) {
    cookie.set_path("/");
    cookie.set_http_only(true);
    cookie.set_secure(SECURE_COOKIES);
    cookie.set_same_site(SameSite::Strict);
}

/// Login endpoint, authenticates a user and creates a new session + session cookie
#[utoipa::path(
    post,
    path = "/api/login",
    request_body = Credentials,
    responses(
        (status = 200, description = "The logged in user id and user name", body = LoginResponse),
        (status = 401, description = "Invalid credentials", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn login(
    State(pool): State<SqlitePool>,
    jar: CookieJar,
    audit_service: AuditService,
    user_agent: Option<TypedHeader<UserAgent>>,
    Json(credentials): Json<Credentials>,
) -> Result<impl IntoResponse, APIError> {
    let Credentials { username, password } = credentials;
    let user_agent = user_agent.map(|ua| ua.to_string()).unwrap_or_default();

    // Check the username + password combination, do not leak information about usernames etc.
    // Log when the attempt fails
    let user = match user_repo::authenticate(&pool, &username, &password).await {
        Ok(u) => Ok(u),
        Err(AuthenticationError::UserNotFound) | Err(AuthenticationError::InvalidPassword) => {
            let mut tx = pool.begin_immediate().await?;
            audit_service
                .log(
                    &mut tx,
                    &AuditEvent::UserLoginFailed(UserLoginFailedDetails {
                        username,
                        user_agent: user_agent.clone(),
                    }),
                    None,
                )
                .await?;
            tx.commit().await?;
            Err(AuthenticationError::InvalidUsernameOrPassword)
        }
        e => e,
    }?;

    let mut tx = pool.begin_immediate().await?;

    // Remove expired sessions, we do this after a login to prevent the necessity of periodical cleanup jobs
    session::delete_expired_sessions(&mut tx).await?;

    // Remove possible old session for this user
    session::delete_user_session(&mut tx, user.id()).await?;

    // Get the client IP address if available
    let ip = audit_service
        .get_ip()
        .unwrap_or(IpAddr::V4(Ipv4Addr::UNSPECIFIED))
        .to_string();

    // Create a new session and cookie
    let session = session::create(&mut tx, user.id(), &user_agent, &ip, SESSION_LIFE_TIME).await?;

    // Log the login event
    let logged_in_users_count = session::count(&mut tx).await?;
    audit_service
        .with_user(user.clone())
        .log(
            &mut tx,
            &AuditEvent::UserLoggedIn(UserLoggedInDetails {
                user_agent: user_agent.to_string(),
                logged_in_users_count,
            }),
            None,
        )
        .await?;

    tx.commit().await?;

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
    #[schema(nullable = false)]
    pub fullname: Option<String>,
}

/// Get current logged-in user endpoint
#[utoipa::path(
  get,
  path = "/api/account",
  responses(
      (status = 200, description = "The current user name and id", body = LoginResponse),
      (status = 401, description = "Invalid user session", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
  security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
async fn account(user: Option<User>) -> Result<impl IntoResponse, APIError> {
    let user = user.ok_or(AuthenticationError::UserNotFound)?;

    Ok(Json(LoginResponse::from(&user)))
}

/// Update the user's account with a new password and optionally new fullname
#[utoipa::path(
  put,
  path = "/api/account",
  request_body = AccountUpdateRequest,
  responses(
      (status = 200, description = "The logged in user", body = LoginResponse),
      (status = 400, description = "Bad request", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
  security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
async fn account_update(
    IncompleteUser(user): IncompleteUser,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(account): Json<AccountUpdateRequest>,
) -> Result<impl IntoResponse, APIError> {
    let mut tx = pool.begin_immediate().await?;

    if user.username() != account.username {
        return Err(AuthenticationError::UserNotFound.into());
    }

    // Update the password
    user_repo::update_password(&mut tx, user.id(), &account.username, &account.password).await?;

    // Update the fullname
    if let Some(fullname) = account.fullname {
        user_repo::update_fullname(&mut tx, user.id(), &fullname).await?;
    }

    let Some(updated_user) = user_repo::get_by_username(&mut tx, user.username()).await? else {
        return Err(AuthenticationError::UserNotFound.into());
    };

    let response = LoginResponse::from(&updated_user);

    audit_service
        .log(
            &mut tx,
            &AuditEvent::UserAccountUpdated(response.clone().into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(Json(response))
}

/// Check whether the application is initialised (an admin user exists + has logged in at least once)
#[utoipa::path(
  get,
  path = "/api/initialised",
  responses(
      (status = 204, description = "The application is initialised"),
      (status = 418, description = "The application is not initialised", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
async fn initialised(State(pool): State<SqlitePool>) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    if user_repo::has_active_users(&mut conn).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AuthenticationError::NotInitialised.into())
    }
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CreateFirstAdminRequest {
    pub username: String,
    pub fullname: String,
    pub temp_password: String,
}

/// Create the first admin user, only allowed if no users exist yet
#[utoipa::path(
    post,
    path = "/api/initialise/first-admin",
    request_body = CreateFirstAdminRequest,
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
    Json(admin_request): Json<CreateFirstAdminRequest>,
) -> Result<(StatusCode, Json<User>), APIError> {
    let mut tx = pool.begin_immediate().await?;

    if user_repo::has_active_users(&mut tx).await? {
        return Err(AuthenticationError::AlreadyInitialised.into());
    }

    // Delete any existing admin user
    let users = user_repo::list(&mut tx, None).await?;
    for user in users {
        if user.role() == Role::Administrator {
            user_repo::delete(&mut tx, user.id()).await?;

            audit_service
                .log(&mut tx, &AuditEvent::UserDeleted(user.into()), None)
                .await?;
        }
    }

    // Create the first admin user
    let user = user_repo::create(
        &mut tx,
        &admin_request.username,
        Some(&admin_request.fullname),
        &admin_request.temp_password,
        false,
        Role::Administrator,
    )
    .await?;

    audit_service
        .log(&mut tx, &AuditEvent::UserCreated(user.clone().into()), None)
        .await?;

    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(user)))
}

#[utoipa::path(
    get,
    path = "/api/initialise/admin-exists",
    responses(
        (status = 204, description = "First admin user exists"),
        (status = 403, description = "Forbidden, the application is already initialised", body = ErrorResponse),
        (status = 404, description = "No admin user exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn admin_exists(State(pool): State<SqlitePool>) -> Result<StatusCode, APIError> {
    let mut conn = pool.acquire().await?;
    if user_repo::has_active_users(&mut conn).await? {
        return Err(AuthenticationError::AlreadyInitialised.into());
    }

    if user_repo::admin_exists(&mut conn).await? {
        return Ok(StatusCode::NO_CONTENT);
    }

    Err(APIError::NotFound(
        "No admin user exists".into(),
        ErrorReference::UserNotFound,
    ))
}

/// Logout endpoint, deletes the session cookie
#[utoipa::path(
    post,
    path = "/api/logout",
    responses(
        (status = 204, description = "Successful logout, or user was already logged out"),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn logout(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    jar: CookieJar,
) -> Result<impl IntoResponse, APIError> {
    // Ask browser to remove cookies and storage data
    // https://owasp.org/www-project-secure-headers/#clear-site-data
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Clear-Site-Data
    const CLEAR_SITE_DATA_HEADER: (&str, &str) = ("Clear-Site-Data", r#""cookies","storage""#);

    let Some(mut cookie) = jar.get(SESSION_COOKIE_NAME).cloned() else {
        // no cookie found, return OK
        return Ok((AppendHeaders([CLEAR_SITE_DATA_HEADER]), jar, StatusCode::OK));
    };

    // Get the session key from the cookie
    let session_key = cookie.value();

    // Log audit event when a valid session exists
    let mut tx = pool.begin_immediate().await?;

    if let Some(session) = session::get_by_key(&mut tx, session_key)
        .await
        .ok()
        .flatten()
    {
        // Log the logout event
        audit_service
            .log(
                &mut tx,
                &AuditEvent::UserLoggedOut(UserLoggedOutDetails {
                    session_duration: session.duration().as_secs(),
                }),
                None,
            )
            .await?;
    }

    // Remove session from the database
    session::delete(&mut tx, session_key).await?;

    // Commit the transaction
    tx.commit().await?;

    // Set cookie parameters, these are not present in the request, and have to match in order to clear the cookie
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.remove(cookie);

    Ok((
        AppendHeaders([CLEAR_SITE_DATA_HEADER]),
        updated_jar,
        StatusCode::NO_CONTENT,
    ))
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::repository::user_repo::update_last_activity_at;

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
        let result = initialised(State(pool.clone())).await;

        assert!(matches!(
            result,
            Err(APIError::Authentication(
                AuthenticationError::NotInitialised
            ))
        ));

        // Create an admin user to mark the application as initialised
        let mut conn = pool.acquire().await.unwrap();
        let admin = user_repo::create(
            &mut conn,
            "admin",
            Some("Admin User"),
            "admin_password",
            false,
            Role::Administrator,
        )
        .await
        .unwrap();

        admin.update_last_activity_at(&mut conn).await.unwrap();

        let result = initialised(State(pool)).await;
        assert!(result.is_ok());

        let response = result.unwrap().into_response();
        assert_eq!(response.status(), StatusCode::NO_CONTENT);
    }

    #[test(sqlx::test)]
    async fn test_create_first_admin(pool: SqlitePool) {
        let admin_request = CreateFirstAdminRequest {
            username: "admin".to_string(),
            fullname: "Admin User".to_string(),
            temp_password: "admin_password".to_string(),
        };

        let response = create_first_admin(
            State(pool.clone()),
            AuditService::new(None, None),
            Json(admin_request),
        )
        .await;

        assert!(response.is_ok());
        let (status, user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(user.username(), "admin");

        // Create a new user again is allowed as long as the admin has not logged in yet
        let admin_request = CreateFirstAdminRequest {
            username: "admin2".to_string(),
            fullname: "Admin User 2".to_string(),
            temp_password: "admin_password".to_string(),
        };
        let response = create_first_admin(
            State(pool.clone()),
            AuditService::new(None, None),
            Json(admin_request),
        )
        .await;

        assert!(response.is_ok());
        let (status, user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(user.username(), "admin2");

        // Not allowed to create a new user after the first admin has logged in
        let mut conn = pool.acquire().await.unwrap();
        update_last_activity_at(&mut conn, user.id()).await.unwrap();

        let admin_request = CreateFirstAdminRequest {
            username: "admin2".to_string(),
            fullname: "Admin User 3".to_string(),
            temp_password: "admin_password".to_string(),
        };
        let response = create_first_admin(
            State(pool.clone()),
            AuditService::new(None, None),
            Json(admin_request),
        )
        .await;

        assert!(response.is_err());
    }

    #[test(sqlx::test)]
    async fn test_admin_exists(pool: SqlitePool) {
        // No admin user exists yet
        let response = admin_exists(State(pool.clone())).await;
        assert!(response.is_err());
        assert!(matches!(response, Err(APIError::NotFound(_, _))));

        // Create an admin user
        let admin_request = CreateFirstAdminRequest {
            username: "admin".to_string(),
            fullname: "Admin User".to_string(),
            temp_password: "admin_password".to_string(),
        };
        let response = create_first_admin(
            State(pool.clone()),
            AuditService::new(None, None),
            Json(admin_request),
        )
        .await;

        assert!(response.is_ok());
        let (status, _user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);

        let response = admin_exists(State(pool.clone())).await;
        assert_eq!(response.unwrap(), StatusCode::NO_CONTENT);
    }
}
