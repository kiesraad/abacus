use std::net::{IpAddr, SocketAddr};

use axum::{
    extract::{ConnectInfo, FromRef, FromRequestParts},
    http::request::Parts,
};

use super::{AuditEvent, AuditLog, AuditLogEvent};
use crate::{
    APIError,
    authentication::{User, Users, error::AuthenticationError},
};

#[derive(Clone)]
pub struct AuditService {
    log: AuditLog,
    user: Option<User>,
    ip: Option<IpAddr>,
}

impl<S> FromRequestParts<S> for AuditService
where
    AuditLog: FromRef<S>,
    Users: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, APIError> {
        let log = AuditLog::from_ref(state);

        let user: Option<User> = User::from_request_parts(parts, state).await.ok();
        let ip = ConnectInfo::<SocketAddr>::from_request_parts(parts, state)
            .await
            .ok()
            .map(|a| a.ip());

        Ok(Self { log, ip, user })
    }
}

impl AuditService {
    #[cfg(test)]
    pub fn new(log: AuditLog, user: User, ip: Option<IpAddr>) -> Self {
        Self {
            log,
            user: Some(user),
            ip,
        }
    }

    pub fn with_user(mut self, user: User) -> Self {
        self.user = Some(user);

        self
    }

    pub fn has_user(&self) -> bool {
        self.user.is_some()
    }

    pub async fn log(
        &self,
        event: &AuditEvent,
        message: Option<String>,
    ) -> Result<AuditLogEvent, APIError> {
        let Some(user) = &self.user else {
            return Err(AuthenticationError::UserNotFound.into());
        };

        self.log.create(user, event, message, self.ip).await
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
            log: AuditLog::new(pool.clone()),
            ip: Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))),
            user: Users::new(pool).get_by_username("admin").await.unwrap(),
        };

        let audit_event = AuditEvent::UserLoggedIn(UserLoggedInDetails {
            user_agent: "Mozilla/5.0".to_string(),
            logged_in_users_count: 5,
        });
        let message = Some("User logged in".to_string());
        let event = service.log(&audit_event, message).await.unwrap();

        assert_eq!(
            event.event(),
            &AuditEvent::UserLoggedIn(UserLoggedInDetails {
                user_agent: "Mozilla/5.0".to_string(),
                logged_in_users_count: 5,
            })
        );

        assert_eq!(event.event_level(), &AuditEventLevel::Success);
        assert_eq!(event.message(), Some(&"User logged in".to_string()));
        assert_eq!(event.user_id(), 1);
        assert_eq!(event.username(), "admin");
        assert_eq!(event.ip(), Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))));
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_log_event_without_user(pool: SqlitePool) {
        let service = AuditService {
            log: AuditLog::new(pool.clone()),
            ip: Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))),
            user: None,
        };

        let audit_event = AuditEvent::UserLoggedIn(UserLoggedInDetails {
            user_agent: "Mozilla/5.0".to_string(),
            logged_in_users_count: 5,
        });

        let error = service.log(&audit_event, None).await.unwrap_err();

        assert!(
            matches!(
                error,
                APIError::Authentication(AuthenticationError::UserNotFound)
            ),
            "Expected UserNotFound error, got {error:?}"
        );
    }
}
