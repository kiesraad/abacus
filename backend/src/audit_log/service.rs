use std::net::{IpAddr, SocketAddr};

use axum::{
    extract::{ConnectInfo, FromRef, FromRequestParts},
    http::request::Parts,
};
use sqlx::SqlitePool;

use super::AuditEvent;
use crate::{APIError, authentication::User};

#[derive(Clone)]
pub struct AuditService {
    pool: SqlitePool,
    user: Option<User>,
    ip: Option<IpAddr>,
}

impl<S> FromRequestParts<S> for AuditService
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, APIError> {
        let pool = SqlitePool::from_ref(state);

        let user: Option<User> = User::from_request_parts(parts, state).await.ok();
        let ip = ConnectInfo::<SocketAddr>::from_request_parts(parts, state)
            .await
            .ok()
            .map(|a| a.ip());

        Ok(Self { pool, ip, user })
    }
}

impl AuditService {
    #[cfg(test)]
    pub fn new(pool: SqlitePool, user: Option<User>, ip: Option<IpAddr>) -> Self {
        Self { pool, user, ip }
    }

    pub fn with_user(mut self, user: User) -> Self {
        self.user = Some(user);

        self
    }

    pub fn has_user(&self) -> bool {
        self.user.is_some()
    }

    pub async fn log(&self, event: &AuditEvent, message: Option<String>) -> Result<(), APIError> {
        crate::audit_log::create(&self.pool, event, self.user.as_ref(), message, self.ip).await
    }
}

// write some tests
#[cfg(test)]
mod test {
    use std::net::Ipv4Addr;

    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::audit_log::{AuditEventLevel, UserLoggedInDetails};

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_log_event(pool: SqlitePool) {
        let service = AuditService {
            pool: pool.clone(),
            ip: Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))),
            user: crate::authentication::user::get_by_username(&pool, "admin1")
                .await
                .unwrap(),
        };

        let audit_event = AuditEvent::UserLoggedIn(UserLoggedInDetails {
            user_agent: "Mozilla/5.0".to_string(),
            logged_in_users_count: 5,
        });
        let message = Some("User logged in".to_string());
        service.log(&audit_event, message).await.unwrap();

        // Verify the event was logged by checking the audit log
        let logged_events = crate::audit_log::list_all(&pool).await.unwrap();
        let event = logged_events.first().unwrap();

        assert_eq!(
            event.event(),
            &AuditEvent::UserLoggedIn(UserLoggedInDetails {
                user_agent: "Mozilla/5.0".to_string(),
                logged_in_users_count: 5,
            })
        );

        assert_eq!(event.event_level(), &AuditEventLevel::Success);
        assert_eq!(event.message(), Some(&"User logged in".to_string()));
        assert_eq!(event.user_id(), Some(1));
        assert_eq!(event.username(), Some("admin1"));
        assert_eq!(event.ip(), Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))));
    }
}
