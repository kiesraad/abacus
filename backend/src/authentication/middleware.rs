use crate::{
    audit_log::{AuditEvent, AuditService},
    authentication::{SESSION_COOKIE_NAME, set_default_cookie_properties},
};
use axum::{extract::State, http::HeaderValue, response::Response};
use axum_extra::extract::CookieJar;
use hyper::header::SET_COOKIE;
use tracing::{debug, info};

use super::{Users, session::Sessions};

/// Middleware to extend the session lifetime
pub async fn extend_session(
    State(users): State<Users>,
    State(sessions): State<Sessions>,
    jar: CookieJar,
    audit_service: AuditService,
    mut response: Response,
) -> Response {
    let Some(session_cookie) = jar.get(SESSION_COOKIE_NAME) else {
        return response;
    };

    let mut expires = None;

    // extend lifetime of session and set new cookie if the session is still valid and will soon be expired
    if let Ok(Some(session)) = sessions.extend_session(session_cookie.value()).await {
        info!("Session extended for user {}", session.user_id());

        if let Some(user) = users.get_by_id(session.user_id()).await.ok().flatten() {
            let _ = audit_service
                .with_user(user)
                .log_success(&AuditEvent::UserSessionExtended, None)
                .await;

            let mut cookie = session.get_cookie();
            set_default_cookie_properties(&mut cookie);

            debug!("Setting cookie: {:?}", cookie);

            if let Ok(header_value) = cookie.encoded().to_string().parse() {
                response.headers_mut().append(SET_COOKIE, header_value);
            }
        }

        expires = Some(session.expires_at());
    } else if let Ok(Some(session)) = sessions.get_by_key(session_cookie.value()).await {
        expires = Some(session.expires_at());
    }

    if let Some(expires) = expires.and_then(|e| HeaderValue::from_str(&e.to_rfc3339()).ok()) {
        response
            .headers_mut()
            .append("X-Session-Expires-At", expires);
    }

    response
}
