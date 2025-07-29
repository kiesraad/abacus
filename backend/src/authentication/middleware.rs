use axum::{
    extract::{Request, State},
    http::HeaderValue,
    response::Response,
};
use axum_extra::extract::CookieJar;
use chrono::Utc;
use hyper::header::SET_COOKIE;
use sqlx::SqlitePool;
use tracing::{debug, error, info};

use super::{SESSION_MIN_LIFE_TIME, session::Session};
use crate::{
    audit_log::{AuditEvent, AuditService},
    authentication::{SESSION_COOKIE_NAME, User, set_default_cookie_properties},
};

/// Inject user and session
pub async fn inject_user<B>(
    State(pool): State<SqlitePool>,
    jar: CookieJar,
    mut request: Request<B>,
) -> Request<B> {
    let Some(session_cookie) = jar.get(SESSION_COOKIE_NAME) else {
        return request;
    };

    // fetch the session from the database
    let Ok(Some(session)) = super::session::get_by_key(&pool, session_cookie.value()).await else {
        return request;
    };

    let session_id = session.user_id();

    let extensions = request.extensions_mut();

    extensions.insert(session);

    // fetch the user from the database
    let Ok(Some(user)) = super::user::get_by_id(&pool, session_id).await else {
        return request;
    };

    if let Err(e) = user.update_last_activity_at(&pool).await {
        error!("Error updating last activity at: {e:?}")
    }

    extensions.insert(user);

    request
}

/// Middleware to extend the session lifetime
pub async fn extend_session(
    State(pool): State<SqlitePool>,
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
    let now = Utc::now();

    // extend lifetime of session and set new cookie if the session is still valid and will soon expire
    if (expires - now) < SESSION_MIN_LIFE_TIME && expires > now {
        if let Ok(session) = super::session::extend_session(&pool, &session).await {
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
    use std::{net::Ipv4Addr, str::FromStr};

    use axum::{
        body::Body,
        extract::{Request, State},
        response::Response,
    };
    use axum_extra::extract::CookieJar;
    use chrono::TimeDelta;
    use cookie::Cookie;
    use hyper::header::SET_COOKIE;
    use sqlx::SqlitePool;
    use test_log::test;

    use super::{extend_session, inject_user};
    use crate::{
        audit_log::AuditService,
        authentication::{Role, SESSION_LIFE_TIME, SESSION_MIN_LIFE_TIME, User},
    };

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_inject_user(pool: SqlitePool) {
        let jar = CookieJar::new();

        let request = inject_user(
            State(pool.clone()),
            jar.clone(),
            Request::new(Body::empty()),
        )
        .await;

        assert!(
            request.extensions().get::<User>().is_none(),
            "inject_user should not inject a user if there is no session cookie"
        );

        let user = User::test_user(Role::Administrator, 1);
        let session = crate::authentication::session::create(&pool, user.id(), SESSION_LIFE_TIME)
            .await
            .unwrap();

        let mut jar = CookieJar::new();
        let cookie = session.get_cookie();
        jar = jar.add(cookie);

        let request = inject_user(
            State(pool.clone()),
            jar.clone(),
            Request::new(Body::empty()),
        )
        .await;

        assert!(
            request.extensions().get::<User>().is_some(),
            "inject_user should inject a user if there is a session cookie"
        );

        crate::authentication::user::delete(&pool, user.id())
            .await
            .unwrap();

        let request = inject_user(State(pool.clone()), jar, Request::new(Body::empty())).await;

        assert!(
            request.extensions().get::<User>().is_none(),
            "inject_user should not inject a user if the user is removed from the database"
        );
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_extend_session(pool: SqlitePool) {
        let user = User::test_user(Role::Administrator, 1);

        let audit_service = AuditService::new(
            pool.clone(),
            Some(user.clone()),
            Some(Ipv4Addr::new(203, 0, 113, 0).into()),
        );

        let updated_response = extend_session(
            State(pool.clone()),
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

        let life_time = SESSION_MIN_LIFE_TIME + TimeDelta::seconds(30); // min life time + 30 seconds
        let session = crate::authentication::session::create(&pool, user.id(), life_time)
            .await
            .unwrap();

        let updated_response = extend_session(
            State(pool.clone()),
            audit_service.clone(),
            Some(session.clone()),
            Some(user.clone()),
            Response::new(Body::empty()),
        )
        .await;

        assert!(updated_response.headers().get(SET_COOKIE).is_none());

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

        let life_time = SESSION_MIN_LIFE_TIME - TimeDelta::seconds(30); // min life time - 30 seconds
        let session = crate::authentication::session::create(&pool, user.id(), life_time)
            .await
            .unwrap();

        let updated_response = extend_session(
            State(pool.clone()),
            audit_service.clone(),
            Some(session.clone()),
            Some(user),
            Response::new(Body::empty()),
        )
        .await;

        let cookie = updated_response.headers().get(SET_COOKIE).unwrap();
        let cookie = Cookie::from_str(cookie.to_str().unwrap()).unwrap();

        let new_session = crate::authentication::session::get_by_key(&pool, cookie.value())
            .await
            .unwrap()
            .unwrap();

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
