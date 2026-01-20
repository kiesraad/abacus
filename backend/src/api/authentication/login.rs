use std::net::{IpAddr, Ipv4Addr};

use axum::{
    Json,
    extract::State,
    http::StatusCode,
    response::{AppendHeaders, IntoResponse},
};
use axum_extra::{TypedHeader, extract::CookieJar, headers::UserAgent};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    infra::authentication::{
        Role, SESSION_COOKIE_NAME, SESSION_LIFE_TIME, User, error::AuthenticationError, session,
        util,
    },
    repository::user_repo,
    service::audit_log::{
        AuditEvent, AuditService, UserDetails, UserLoggedInDetails, UserLoggedOutDetails,
        UserLoginFailedDetails,
    },
};

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
pub async fn login(
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
    util::set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.add(cookie);

    Ok((updated_jar, Json(LoginResponse::from(&user))))
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
pub async fn logout(
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
    util::set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.remove(cookie);

    Ok((
        AppendHeaders([CLEAR_SITE_DATA_HEADER]),
        updated_jar,
        StatusCode::NO_CONTENT,
    ))
}

impl From<AuthenticationError> for APIError {
    fn from(err: AuthenticationError) -> Self {
        APIError::Authentication(err)
    }
}

#[cfg(test)]
mod tests {}
