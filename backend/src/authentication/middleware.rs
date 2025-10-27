use axum::{
    RequestExt,
    body::Body,
    extract::{Request, State},
    http::{HeaderMap, HeaderValue, header::SET_COOKIE},
    response::Response,
};
use chrono::Utc;
use sqlx::SqlitePool;
use tracing::{debug, error, info};

use super::{SESSION_MIN_LIFE_TIME, session::Session};
use crate::{
    SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::{User, request_data::RequestSessionData, set_default_cookie_properties},
};

/// Inject user and session
pub async fn inject_user(
    State(pool): State<SqlitePool>,
    mut request: Request<Body>,
) -> Request<Body> {
    let Some(request_data) = request.extract_parts::<RequestSessionData>().await.ok() else {
        return request;
    };

    // fetch the session from the database
    let Ok(mut conn) = pool.acquire().await else {
        return request;
    };

    let Ok(Some(session)) = super::session::get_by_request_data(&mut conn, &request_data).await
    else {
        return request;
    };

    let session_id = session.user_id();
    let extensions = request.extensions_mut();
    extensions.insert(session);

    // fetch the user from the database
    let Ok(Some(user)) = super::user::get_by_id(&mut conn, session_id).await else {
        return request;
    };

    if let Err(e) = user.update_last_activity_at(&mut conn).await {
        error!("Error updating last activity at: {e:?}")
    }

    extensions.insert(user);

    request
}

/// Middleware to extend the session lifetime
pub async fn extend_session(
    State(pool): State<SqlitePool>,
    headers: HeaderMap,
    audit_service: AuditService,
    session: Option<Session>,
    user: Option<User>,
    mut response: Response,
) -> Response {
    // check that there is a authenticated user and a session
    let (Some(session), Some(user)) = (session, user) else {
        return response;
    };

    // check for the existence of the do not extend session header
    let do_not_extend = headers.get(super::DO_NOT_EXTEND_SESSION_HEADER).is_some();

    let mut expires = session.expires_at();
    let now = Utc::now();

    // extend lifetime of session and set new cookie if the session is still valid and will soon expire
    if (expires - now) < SESSION_MIN_LIFE_TIME && expires > now && !do_not_extend {
        match pool.begin_immediate().await {
            Ok(mut tx) => match super::session::extend_session(&mut tx, &session).await {
                Ok(session) => {
                    let _ = audit_service
                        .with_user(user.clone())
                        .log(&mut tx, &AuditEvent::UserSessionExtended, None)
                        .await;
                    if let Err(err) = tx.commit().await {
                        error!("Failed to commit transaction: {:?}", err);
                    }

                    let mut cookie = session.get_cookie();
                    set_default_cookie_properties(&mut cookie);

                    debug!("Setting cookie: {:?}", cookie);

                    if let Ok(header_value) = cookie.encoded().to_string().parse() {
                        response.headers_mut().append(SET_COOKIE, header_value);
                    }

                    info!("Session extended for user {}", session.user_id());
                    expires = session.expires_at();
                }
                Err(err) => {
                    error!("Failed to extend session: {:?}", err);
                }
            },
            Err(err) => {
                error!("Failed to start transaction: {}", err);
            }
        }
    }

    // always return a header with the current expiration time for authenticated requests
    if let Ok(expires) = HeaderValue::from_str(&expires.to_rfc3339()) {
        response
            .headers_mut()
            .append("x-session-expires-at", expires);
    }

    response
}

#[cfg(test)]
mod test {
    use std::{net::Ipv4Addr, str::FromStr};

    use axum::{
        body::Body,
        extract::{Request, State},
        http::{
            HeaderMap, HeaderValue,
            header::{COOKIE, SET_COOKIE, USER_AGENT},
        },
        response::Response,
    };
    use chrono::TimeDelta;
    use cookie::Cookie;
    use sqlx::SqlitePool;
    use test_log::test;

    use super::{extend_session, inject_user};
    use crate::{
        audit_log::AuditService,
        authentication::{
            DO_NOT_EXTEND_SESSION_HEADER, Role, SESSION_LIFE_TIME, SESSION_MIN_LIFE_TIME, User,
        },
    };

    const TEST_USER_AGENT: &str = "TestAgent/1.0";
    const TEST_IP_ADDRESS: &str = "0.0.0.0";

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_inject_user(pool: SqlitePool) {
        let request = inject_user(State(pool.clone()), Request::new(Body::empty())).await;

        assert!(
            request.extensions().get::<User>().is_none(),
            "inject_user should not inject a user if there is no session cookie"
        );

        let user = User::test_user(Role::Administrator, 1);
        let mut conn = pool.acquire().await.unwrap();
        let session = crate::authentication::session::create(
            &mut conn,
            user.id(),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            SESSION_LIFE_TIME,
        )
        .await
        .unwrap();

        let cookie = session.get_cookie();

        let request = Request::builder()
            .header(USER_AGENT, TEST_USER_AGENT)
            .header(COOKIE, cookie.encoded().to_string())
            .body(Body::empty())
            .unwrap();

        let request = inject_user(State(pool.clone()), request).await;

        assert!(
            request.extensions().get::<User>().is_some(),
            "inject_user should inject a user if there is a session cookie"
        );

        crate::authentication::user::delete(&mut conn, user.id())
            .await
            .unwrap();

        let request = inject_user(State(pool.clone()), Request::new(Body::empty())).await;

        assert!(
            request.extensions().get::<User>().is_none(),
            "inject_user should not inject a user if the user is removed from the database"
        );
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_extend_session(pool: SqlitePool) {
        let user = User::test_user(Role::Administrator, 1);

        let audit_service = AuditService::new(
            Some(user.clone()),
            Some(Ipv4Addr::new(203, 0, 113, 0).into()),
        );

        let updated_response = extend_session(
            State(pool.clone()),
            HeaderMap::new(),
            audit_service.clone(),
            None,
            None,
            Response::new(Body::empty()),
        )
        .await;

        assert!(
            updated_response
                .headers()
                .get("x-session-expires-at")
                .is_none(),
            "extend_session should not return a header given an unauthenticated request"
        );

        let life_time = SESSION_MIN_LIFE_TIME + TimeDelta::seconds(30); // min life time + 30 seconds
        let mut conn = pool.acquire().await.unwrap();
        let session = crate::authentication::session::create(
            &mut conn,
            user.id(),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            life_time,
        )
        .await
        .unwrap();

        let updated_response = extend_session(
            State(pool.clone()),
            HeaderMap::new(),
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
                .get("x-session-expires-at")
                .unwrap()
                .to_str()
                .unwrap(),
            session.expires_at().to_rfc3339().as_str(),
            "extend_session should return the current expiration time"
        );

        let life_time = SESSION_MIN_LIFE_TIME - TimeDelta::seconds(30); // min life time - 30 seconds
        let session = crate::authentication::session::create(
            &mut conn,
            user.id(),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            life_time,
        )
        .await
        .unwrap();

        let updated_response = extend_session(
            State(pool.clone()),
            HeaderMap::new(),
            audit_service.clone(),
            Some(session.clone()),
            Some(user),
            Response::new(Body::empty()),
        )
        .await;

        let cookie = updated_response.headers().get(SET_COOKIE).unwrap();
        let cookie = Cookie::from_str(cookie.to_str().unwrap()).unwrap();

        let new_session = crate::authentication::session::get_by_key(&mut conn, cookie.value())
            .await
            .unwrap()
            .unwrap();

        assert_eq!(
            updated_response
                .headers()
                .get("x-session-expires-at")
                .unwrap()
                .to_str()
                .unwrap(),
            new_session.expires_at().to_rfc3339().as_str(),
            "extend_session should update the expiration time"
        );
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_extend_session_do_not_extend_header(pool: SqlitePool) {
        let user = User::test_user(Role::Administrator, 1);

        let audit_service = AuditService::new(
            Some(user.clone()),
            Some(Ipv4Addr::new(203, 0, 113, 0).into()),
        );

        let life_time = SESSION_MIN_LIFE_TIME - TimeDelta::seconds(30); // min life time - 30 seconds
        let mut conn = pool.acquire().await.unwrap();
        let session = crate::authentication::session::create(
            &mut conn,
            user.id(),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            life_time,
        )
        .await
        .unwrap();

        let mut headers = HeaderMap::new();
        headers.insert(
            DO_NOT_EXTEND_SESSION_HEADER,
            HeaderValue::from_str("true").unwrap(),
        );

        let updated_response = extend_session(
            State(pool.clone()),
            headers,
            audit_service.clone(),
            Some(session.clone()),
            Some(user),
            Response::new(Body::empty()),
        )
        .await;

        assert!(
            updated_response.headers().get(SET_COOKIE).is_none(),
            "extend_session should not extend the session when the do not extend header is set"
        );

        assert_eq!(
            updated_response
                .headers()
                .get("x-session-expires-at")
                .unwrap()
                .to_str()
                .unwrap(),
            session.expires_at().to_rfc3339().as_str(),
            "extend_session should return the current expiration time"
        );
    }
}
