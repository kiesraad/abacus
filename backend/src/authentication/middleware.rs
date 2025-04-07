use crate::{
    audit_log::{AuditEvent, AuditService},
    authentication::{SESSION_COOKIE_NAME, User, set_default_cookie_properties},
};
use axum::{
    extract::{Request, State},
    http::HeaderValue,
    response::Response,
};
use axum_extra::extract::CookieJar;
use chrono::Utc;
use hyper::header::SET_COOKIE;
use tracing::{debug, error, info};

use super::{
    SESSION_MIN_LIFE_TIME, Users,
    session::{Session, Sessions},
    util::get_expires_at,
};

/// Inject user and session
pub async fn inject_user<B>(
    State(users): State<Users>,
    State(sessions): State<Sessions>,
    jar: CookieJar,
    mut request: Request<B>,
) -> Request<B> {
    let Some(session_cookie) = jar.get(SESSION_COOKIE_NAME) else {
        return request;
    };

    // fetch the session from the database
    let Ok(Some(session)) = sessions.get_by_key(session_cookie.value()).await else {
        return request;
    };

    let session_id = session.user_id();

    let extensions = request.extensions_mut();

    extensions.insert(session);

    // fetch the user from the database
    let Ok(Some(user)) = users.get_by_id(session_id).await else {
        return request;
    };

    if let Err(e) = user.update_last_activity_at(&users).await {
        error!("Error updating last activity at: {e:?}")
    }

    extensions.insert(user);

    request
}

/// Middleware to extend the session lifetime
pub async fn extend_session(
    State(sessions): State<Sessions>,
    audit_service: AuditService,
    session: Option<Session>,
    user: Option<User>,
    mut response: Response,
) -> Response {
    let Some(session) = session else {
        return response;
    };

    let mut expires = session.expires_at();

    let Ok(min_life_time) = get_expires_at(SESSION_MIN_LIFE_TIME) else {
        return response;
    };
    let now = Utc::now();

    // extend lifetime of session and set new cookie if the session is still valid and will soon be expired
    if expires < min_life_time && expires > now {
        if let Ok(session) = sessions.extend_session(&session).await {
            if let Some(user) = user {
                let _ = audit_service
                    .with_user(user.clone())
                    .log_success(&AuditEvent::UserSessionExtended, None)
                    .await;

                let mut cookie = session.get_cookie();
                set_default_cookie_properties(&mut cookie);

                debug!("Setting cookie: {:?}", cookie);

                if let Ok(header_value) = cookie.encoded().to_string().parse() {
                    response.headers_mut().append(SET_COOKIE, header_value);
                }
            }

            info!("Session extended for user {}", session.user_id());
            expires = session.expires_at();
        }
    }

    // always return a header with the current expiration time for authenticated requests
    if let Ok(expires) = HeaderValue::from_str(&expires.to_rfc3339()) {
        response
            .headers_mut()
            .append("X-Session-Expires-At", expires);
    }

    response
}
