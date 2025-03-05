use axum::{
    extract::{ConnectInfo, FromRef, FromRequestParts},
    http::request::Parts,
};
use std::net::{IpAddr, SocketAddr};

use super::audit_log_events::{AuditEvent, AuditEventType, AuditLog, AuditLogEvent};
use crate::{
    APIError,
    authentication::{User, Users, error::AuthenticationError},
};

pub struct AuditService {
    log: AuditLog,
    ip: Option<IpAddr>,
    user: Option<User>,
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
    pub fn with_user(mut self, user: User) -> Self {
        self.user = Some(user);

        self
    }

    pub async fn log_error(
        &self,
        event: AuditEvent,
        message: Option<String>,
    ) -> Result<AuditLogEvent, APIError> {
        self.log(event, AuditEventType::Error, message).await
    }

    pub async fn log_warning(
        &self,
        event: AuditEvent,
        message: Option<String>,
    ) -> Result<AuditLogEvent, APIError> {
        self.log(event, AuditEventType::Warning, message).await
    }

    pub async fn log_info(
        &self,
        event: AuditEvent,
        message: Option<String>,
    ) -> Result<AuditLogEvent, APIError> {
        self.log(event, AuditEventType::Info, message).await
    }

    pub async fn log_success(
        &self,
        event: AuditEvent,
        message: Option<String>,
    ) -> Result<AuditLogEvent, APIError> {
        self.log(event, AuditEventType::Success, message).await
    }

    pub async fn log(
        &self,
        event: AuditEvent,
        event_type: AuditEventType,
        message: Option<String>,
    ) -> Result<AuditLogEvent, APIError> {
        let Some(user) = &self.user else {
            return Err(AuthenticationError::UserNotFound.into());
        };

        self.log
            .create(user.clone(), event, event_type, message, self.ip)
            .await
    }
}

// write some tests
#[cfg(test)]
mod test {
    use crate::audit_log::UserLoggedInDetails;
    use sqlx::SqlitePool;
    use std::net::Ipv4Addr;
    use test_log::test;

    use super::*;

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_log_event(pool: SqlitePool) {
        let service = AuditService {
            log: AuditLog::new(pool.clone()),
            ip: Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))),
            user: Users::new(pool).get_by_username("admin").await.unwrap(),
        };

        for level in [
            AuditEventType::Error,
            AuditEventType::Warning,
            AuditEventType::Info,
            AuditEventType::Success,
        ] {
            let audit_event = AuditEvent::UserLoggedIn(UserLoggedInDetails {
                user_agent: "Mozilla/5.0".to_string(),
                logged_in_users_count: 5,
            });
            let message = Some("User logged in".to_string());

            let event = match level {
                AuditEventType::Error => service.log_error(audit_event, message).await.unwrap(),
                AuditEventType::Warning => service.log_warning(audit_event, message).await.unwrap(),
                AuditEventType::Info => service.log_info(audit_event, message).await.unwrap(),
                AuditEventType::Success => service.log_success(audit_event, message).await.unwrap(),
            };

            assert_eq!(
                event.event(),
                &AuditEvent::UserLoggedIn(UserLoggedInDetails {
                    user_agent: "Mozilla/5.0".to_string(),
                    logged_in_users_count: 5,
                })
            );

            assert_eq!(event.event_type(), &level);
            assert_eq!(event.message(), Some(&"User logged in".to_string()));
            assert_eq!(event.user_id(), 1);
            assert_eq!(event.username(), "admin");
            assert_eq!(event.ip(), Some(IpAddr::V4(Ipv4Addr::new(203, 0, 113, 0))));
        }
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

        let error = service.log_info(audit_event, None).await.unwrap_err();

        assert!(
            matches!(
                error,
                APIError::Authentication(AuthenticationError::UserNotFound)
            ),
            "Expected UserNotFound error, got {error:?}"
        );
    }
}
