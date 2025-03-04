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
