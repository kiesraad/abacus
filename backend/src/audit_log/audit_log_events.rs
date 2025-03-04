use axum::extract::FromRef;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{prelude::FromRow, SqlitePool, Type};
use std::{fmt, net::IpAddr};
use utoipa::ToSchema;

use crate::{authentication::User, APIError, AppState};

#[derive(Serialize, Deserialize, Clone, Debug, ToSchema)]
pub struct UserLoggedInDetails {
    pub user_agent: String,
    pub logged_in_users_count: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, ToSchema)]
pub struct UserLoggedOutDetails {
    session_duration: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, ToSchema, Default)]
#[serde(rename_all = "lowercase", tag = "event_type")]
pub enum AuditEvent {
    UserLoggedIn(UserLoggedInDetails),
    UserLoggedOut(UserLoggedOutDetails),
    #[default]
    UnknownEvent,
}

impl From<serde_json::Value> for AuditEvent {
    fn from(value: serde_json::Value) -> Self {
        serde_json::from_value(value).unwrap_or_default()
    }
}

impl fmt::Display for AuditEvent {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AuditEvent::UserLoggedIn(..) => write!(f, "UserLoggedIn"),
            AuditEvent::UserLoggedOut(..) => write!(f, "UserLoggedOut"),
            AuditEvent::UnknownEvent => write!(f, "UnknownEvent"),
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, ToSchema, Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(rename_all = "snake_case")]
pub enum AuditEventType {
    Info,
    Success,
    Warning,
    Error,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(transparent)]
pub struct Ip(Option<IpAddr>);

impl From<Option<String>> for Ip {
    fn from(ip: Option<String>) -> Self {
        Ip(ip.and_then(|ip| ip.parse().ok()))
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, FromRow, ToSchema)]
pub struct AuditLogEvent {
    id: u32,
    #[schema(value_type = String)]
    time: DateTime<Utc>,
    event: AuditEvent,
    event_type: AuditEventType,
    message: Option<String>,
    workstation: Option<u32>,
    user_id: u32,
    username: String,
    #[schema(value_type = String)]
    ip: Ip,
}
pub struct AuditLog(SqlitePool);

impl FromRef<AppState> for AuditLog {
    fn from_ref(state: &AppState) -> Self {
        Self(state.pool.clone())
    }
}

impl AuditLog {
    pub async fn create(
        &self,
        user: User,
        event: AuditEvent,
        event_type: AuditEventType,
        message: Option<String>,
        ip: IpAddr,
    ) -> Result<AuditLogEvent, APIError> {
        // TODO: set workstation id once we have one
        let workstation: Option<u32> = None;
        let event_name = event.to_string();
        let event = serde_json::to_value(event)?;
        let user_id = user.id();
        let username = user.username();
        let ip = ip.to_string();

        let event = sqlx::query_as!(
            AuditLogEvent,
            r#"INSERT INTO audit_log (event, event_name, event_type, message, workstation, user_id, username, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
                id as "id: u32",
                time as "time: _",
                event as "event: serde_json::Value",
                event_type as "event_type: _",
                message,
                workstation as "workstation: _",
                user_id as "user_id: u32",
                username,
                ip as "ip: String"
            "#,
            event,
            event_name,
            event_type,
            message,
            workstation,
            user_id,
            username,
            ip,
        )
        .fetch_one(&self.0)
        .await?;

        Ok(event)
    }
}
