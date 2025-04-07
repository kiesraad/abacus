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
    // check that there is a authenticated user and a session
    let (Some(session), Some(user)) = (session, user) else {
        return response;
    };

    let mut expires = session.expires_at();

    let min_life_time = get_expires_at(SESSION_MIN_LIFE_TIME);
    let now = Utc::now();

    // extend lifetime of session and set new cookie if the session is still valid and will soon be expired
    if expires < min_life_time && expires > now {
        if let Ok(session) = sessions.extend_session(&session).await {
            let _ = audit_service
                .with_user(user.clone())
                .log(&AuditEvent::UserSessionExtended, None)
                .await;

            let mut cookie = session.get_cookie();
            set_default_cookie_properties(&mut cookie);

            debug!("Setting cookie: {:?}", cookie);

            if let Ok(header_value) = cookie.encoded().to_string().parse() {
                response.headers_mut().append(SET_COOKIE, header_value);
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

#[cfg(test)]
mod test {
    use axum::{body::Body, extract::State, response::Response};
    use chrono::TimeDelta;
    use cookie::Cookie;
    use hyper::header::SET_COOKIE;
    use sqlx::SqlitePool;
    use std::{net::Ipv4Addr, str::FromStr};
    use test_log::test;

    use crate::{
        audit_log::{AuditLog, AuditService},
        authentication::{Role, Sessions, User, extend_session},
    };

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_extend_session(pool: SqlitePool) {
        let sessions = Sessions::new(pool.clone());
        let user = User::test_user(Role::Administrator);

        let audit_service = AuditService::new(
            AuditLog::new(pool.clone()),
            user.clone(),
            Some(Ipv4Addr::new(203, 0, 113, 0).into()),
        );

        let updated_response = extend_session(
            State(sessions),
            audit_service.clone(),
            None,
            None,
            Response::new(Body::empty()),
        )
        .await;

        assert!(
            updated_response
                .headers()
                .get("X-Session-Expires-At")
                .is_none(),
            "extend_session should not return a header given an unauthenticated request"
        );

        let life_time = TimeDelta::seconds(60 * 20); // 20 minutes
        let sessions = Sessions::new(pool.clone());
        let session = sessions.create(user.id(), life_time).await.unwrap();

        let sessions = Sessions::new(pool.clone());
        let updated_response = extend_session(
            State(sessions),
            audit_service.clone(),
            Some(session.clone()),
            Some(user.clone()),
            Response::new(Body::empty()),
        )
        .await;

        assert_eq!(
            updated_response
                .headers()
                .get("X-Session-Expires-At")
                .unwrap()
                .to_str()
                .unwrap(),
            session.expires_at().to_rfc3339().as_str(),
            "extend_session should return the current expiration time"
        );

        let life_time = TimeDelta::seconds(60 * 10); // 10 minutes
        let sessions = Sessions::new(pool.clone());
        let session = sessions.create(user.id(), life_time).await.unwrap();

        let sessions = Sessions::new(pool.clone());
        let updated_response = extend_session(
            State(sessions),
            audit_service.clone(),
            Some(session.clone()),
            Some(user),
            Response::new(Body::empty()),
        )
        .await;

        let cookie = updated_response.headers().get(SET_COOKIE).unwrap();
        let cookie = Cookie::from_str(cookie.to_str().unwrap()).unwrap();

        let sessions = Sessions::new(pool.clone());
        let new_session = sessions.get_by_key(cookie.value()).await.unwrap().unwrap();

        assert_eq!(
            updated_response
                .headers()
                .get("X-Session-Expires-At")
                .unwrap()
                .to_str()
                .unwrap(),
            new_session.expires_at().to_rfc3339().as_str(),
            "extend_session should update the expiration time"
        );
    }
}
