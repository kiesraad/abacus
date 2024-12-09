use axum::{extract::State, response::IntoResponse, Json};
use axum_extra::extract::CookieJar;
use cookie::{Cookie, SameSite};
use hyper::StatusCode;
use serde::{Deserialize, Serialize};

use crate::APIError;

use super::{
    session::Sessions,
    user::{User, Users},
    SECURE_COOKIES, SESSION_COOKIE_NAME, SESSION_LIFE_TIME,
};

#[derive(Debug, Deserialize)]
pub struct Credentials {
    username: String,
    password: String,
}

#[derive(Debug, Serialize)]
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
/// #[axum::debug_handler]
pub async fn login(
    State(users): State<Users>,
    State(sessions): State<Sessions>,
    jar: CookieJar,
    Json(credentials): Json<Credentials>,
) -> Result<impl IntoResponse, APIError> {
    let Credentials { username, password } = credentials;

    // Check the username + password combination
    let user = users.authenticate(&username, &password).await?;

    // Remove old sessions, we do this after a login to prevent the necessity of periodical cleanup jobs
    sessions.delete_old_sessions().await?;

    // Create a new session and cookie
    let session = sessions.create(user.id(), SESSION_LIFE_TIME).await?;

    // Add the session cookie to the response
    let mut cookie = session.get_cookie();
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.add(cookie);

    Ok((updated_jar, Json(LoginResponse::from(&user))))
}

/// Logout endpoint, deletes the session cookie
pub async fn logout(
    State(sessions): State<Sessions>,
    jar: CookieJar,
) -> Result<impl IntoResponse, APIError> {
    let Some(mut cookie) = jar.get(SESSION_COOKIE_NAME).cloned() else {
        // no cookie found, return OK
        return Ok((jar, StatusCode::OK));
    };

    // Remove session form the database
    let Some(session) = sessions.get_by_key(cookie.value()).await? else {
        // no session found, return OK
        return Ok((jar, StatusCode::OK));
    };

    sessions.delete(session.session_key()).await?;

    // Set cookie parameters, these are not be retrieved by the request, and have to match in order to clear the cookie
    set_default_cookie_properties(&mut cookie);
    let updated_jar = jar.remove(cookie);

    Ok((updated_jar, StatusCode::OK))
}
