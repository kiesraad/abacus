use std::net::{IpAddr, SocketAddr};

use axum::{
    extract::{ConnectInfo, FromRef, FromRequestParts},
    http::request::Parts,
};
use sqlx::{SqliteConnection, SqlitePool};

use super::AuditEvent;
use crate::{APIError, infra::authentication::User};

#[derive(Clone)]
pub struct AuditService {
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
        let user: Option<User> = User::from_request_parts(parts, state).await.ok();
        let ip = ConnectInfo::<SocketAddr>::from_request_parts(parts, state)
            .await
            .ok()
            .map(|a| a.ip());

        Ok(Self { ip, user })
    }
}

impl AuditService {
    #[cfg(test)]
    pub fn new(user: Option<User>, ip: Option<IpAddr>) -> Self {
        Self { user, ip }
    }

    pub fn with_user(mut self, user: User) -> Self {
        self.user = Some(user);

        self
    }

    pub fn get_ip(&self) -> Option<IpAddr> {
        self.ip
    }

    pub fn has_user(&self) -> bool {
        self.user.is_some()
    }

    pub async fn log(
        &self,
        conn: &mut SqliteConnection,
        event: &AuditEvent,
        message: Option<String>,
    ) -> Result<(), APIError> {
        Ok(crate::audit_log::create(conn, event, self.user.as_ref(), message, self.ip).await?)
    }
}

// write some tests
#[cfg(test)]
mod test {
    use std::net::Ipv4Addr;

    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::{
        SqlitePoolExt,
        infra::audit_log::{AuditEventLevel, UserLoggedInDetails},
        repository::user_repo::{self, UserId},
    };

    #[test(sqlx::test(fixtures("../../../fixtures/users.sql")))]
    async fn test_log_event(pool: SqlitePool) {
        let mut tx = pool.begin_immediate().await.unwrap();
        let service = AuditService {
            ip: Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))),
            user: user_repo::get_by_username(&mut tx, "admin1").await.unwrap(),
        };

        let audit_event = AuditEvent::UserLoggedIn(UserLoggedInDetails {
            user_agent: "Mozilla/5.0".to_string(),
            logged_in_users_count: 5,
        });
        let message = Some("User logged in".to_string());
        service.log(&mut tx, &audit_event, message).await.unwrap();
        tx.commit().await.unwrap();

        let mut conn = pool.acquire().await.unwrap();

        // Verify the event was logged by checking the audit log
        let logged_events = crate::audit_log::list_all(&mut conn).await.unwrap();
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
        assert_eq!(event.user_id(), Some(UserId::from(1)));
        assert_eq!(event.username(), Some("admin1"));
        assert_eq!(event.ip(), Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))));
    }
}
