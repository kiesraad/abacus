use axum::extract::FromRef;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{SqlitePool, Type, prelude::FromRow};
use std::net::IpAddr;
use strum::VariantNames;
use utoipa::ToSchema;

use crate::{
    APIError, AppState,
    authentication::{LoginResponse, Role, User},
};

use super::LogFilterQuery;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserLoggedInDetails {
    pub user_agent: String,
    pub logged_in_users_count: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UserLoggedOutDetails {
    pub session_duration: u64,
}

#[derive(
    Serialize,
    Deserialize,
    strum::Display,
    VariantNames,
    Clone,
    Debug,
    PartialEq,
    Eq,
    ToSchema,
    Default,
)]
#[serde(rename_all = "PascalCase", tag = "eventType")]
pub enum AuditEvent {
    UserLoggedIn(UserLoggedInDetails),
    UserLoggedOut(UserLoggedOutDetails),
    UserAccountUpdateFailed,
    UserAccountUpdateSuccess,
    UserSessionExtended,
    UserCreated(LoginResponse),
    UserUpdated(LoginResponse),
    #[default]
    UnknownEvent,
}

impl From<serde_json::Value> for AuditEvent {
    fn from(value: serde_json::Value) -> Self {
        serde_json::from_value(value).unwrap_or_default()
    }
}

#[derive(
    Serialize, Deserialize, VariantNames, Clone, Debug, PartialEq, Eq, Hash, ToSchema, Type,
)]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum AuditEventLevel {
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

#[derive(Serialize, Deserialize, Debug, FromRow, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogEvent {
    id: u32,
    #[schema(value_type = String)]
    time: DateTime<Utc>,
    event: AuditEvent,
    event_level: AuditEventLevel,
    message: Option<String>,
    workstation: Option<u32>,
    user_id: u32,
    username: String,
    #[schema(value_type = String)]
    ip: Ip,

    /// user defaults
    #[sqlx(skip)]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
    user_fullname: Option<String>,

    #[sqlx(skip)]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
    user_role: Option<Role>,
}

#[cfg(test)]
impl AuditLogEvent {
    pub fn event(&self) -> &AuditEvent {
        &self.event
    }

    pub fn event_level(&self) -> &AuditEventLevel {
        &self.event_level
    }

    pub fn message(&self) -> Option<&String> {
        self.message.as_ref()
    }

    pub fn user_id(&self) -> u32 {
        self.user_id
    }

    pub fn username(&self) -> &str {
        &self.username
    }

    pub fn ip(&self) -> Option<IpAddr> {
        self.ip.0
    }
}

#[derive(Clone)]
pub struct AuditLog(SqlitePool);

impl FromRef<AppState> for AuditLog {
    fn from_ref(state: &AppState) -> Self {
        Self(state.pool.clone())
    }
}

/// This struct is used to filter the audit log events
/// The values should always be validated using From<&LogFilterQuery>
pub struct LogFilter {
    pub limit: u32,
    pub offset: u32,
    pub level: Vec<String>,
    pub event: Vec<String>,
    pub user: Vec<u32>,
    pub since: Option<DateTime<Utc>>,
}

impl LogFilter {
    pub(crate) fn from_query(query: &LogFilterQuery) -> Self {
        let offset = (query.page - 1) * query.per_page;
        let limit = query.per_page;

        let level = query
            .level
            .clone()
            .into_iter()
            .filter(|s| AuditEventLevel::VARIANTS.contains(&s.as_str()))
            .collect();

        let event = query
            .event
            .clone()
            .into_iter()
            .filter(|s| AuditEvent::VARIANTS.contains(&s.as_str()))
            .collect();

        let since = query
            .since
            .as_ref()
            .and_then(|since| DateTime::parse_from_rfc3339(since).ok())
            .map(|dt| dt.to_utc());

        Self {
            limit,
            offset,
            level,
            event,
            user: query.user.clone(),
            since,
        }
    }

    /// We use json functions to filter the events based on the level and event type,
    /// since sqlx + sqlite does not support array types
    fn as_query_values(&self) -> Result<(Value, Value, Value, Option<i64>), serde_json::Error> {
        let level = serde_json::to_value(&self.level)?;
        let event = serde_json::to_value(&self.event)?;
        let user = serde_json::to_value(&self.user)?;
        let since = self.since.map(|t| t.timestamp());

        Ok((level, event, user, since))
    }
}

impl AuditLog {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub async fn create(
        &self,
        user: &User,
        event: &AuditEvent,
        event_level: AuditEventLevel,
        message: Option<String>,
        ip: Option<IpAddr>,
    ) -> Result<AuditLogEvent, APIError> {
        // TODO: set workstation id once we have one
        let workstation: Option<u32> = None;
        let event_name = event.to_string();
        let event = serde_json::to_value(event)?;
        let user_id = user.id();
        let username = user.username();
        let fullname = user.fullname();
        let role = user.role();
        let ip = ip.map(|ip| ip.to_string());

        let event = sqlx::query_as!(
            AuditLogEvent,
            r#"INSERT INTO audit_log (event, event_name, event_level, message, workstation, user_id, username, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
                id as "id: u32",
                time as "time: _",
                event as "event: serde_json::Value",
                event_level as "event_level: _",
                message,
                workstation as "workstation: _",
                user_id as "user_id: u32",
                username,
                ip as "ip: String",
                ? as "user_fullname?: String",
                ? as "user_role?: Role"
            "#,
            event,
            event_name,
            event_level,
            message,
            workstation,
            user_id,
            username,
            ip,
            fullname,
            role
        )
        .fetch_one(&self.0)
        .await?;

        Ok(event)
    }

    pub async fn list(&self, filter: &LogFilter) -> Result<Vec<AuditLogEvent>, APIError> {
        let (level, event, user, since) = filter.as_query_values()?;

        // The ordering is reversed when we choose a since date
        let events = sqlx::query_as!(
            AuditLogEvent,
            r#"SELECT
                audit_log.id as "id: u32",
                time as "time: _",
                event as "event: serde_json::Value",
                event_level as "event_level: _",
                message,
                workstation as "workstation: _",
                user_id as "user_id: u32",
                audit_log.username,
                ip as "ip: String",
                users.fullname as "user_fullname",
                users.role as "user_role?: Role"
            FROM audit_log
            LEFT JOIN users ON audit_log.user_id = users.id
            WHERE (json_array_length($1) = 0 OR event_level IN (SELECT value FROM json_each($1)))
            AND (json_array_length($2) = 0 OR event ->> 'eventType' IN (SELECT value FROM json_each($2)))
            AND (json_array_length($3) = 0 OR user_id IN (SELECT value FROM json_each($3)))
            AND ($4 IS NULL OR unixepoch(time) >= $4)
            ORDER BY
                CASE WHEN $4 IS NULL THEN time ELSE 1 END DESC,
                CASE WHEN $4 IS NULL THEN 1 ELSE time END ASC
            LIMIT $5 OFFSET $6
            "#,
            level,
            event,
            user,
            since,
            filter.limit,
            filter.offset,
        )
        .fetch_all(&self.0)
        .await?;

        Ok(events)
    }

    pub async fn count(&self, filter: &LogFilter) -> Result<u32, APIError> {
        let (level, event, user, since) = filter.as_query_values()?;

        let row_count = sqlx::query!(r#"
                SELECT COUNT(*) AS "count: u32"
                FROM audit_log
                WHERE (json_array_length($1) = 0 OR event_level IN (SELECT value FROM json_each($1)))
                    AND (json_array_length($2) = 0 OR event ->> 'eventType' IN (SELECT value FROM json_each($2)))
                    AND (json_array_length($3) = 0 OR user_id IN (SELECT value FROM json_each($3)))
                    AND ($4 IS NULL OR unixepoch(time) >= $4)
            "#,
            level,
            event,
            user,
            since,
        )
            .fetch_one(&self.0)
            .await?;

        Ok(row_count.count)
    }
}
