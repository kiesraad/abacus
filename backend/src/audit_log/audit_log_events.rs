use std::net::IpAddr;

use axum::extract::FromRef;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{SqlitePool, Type, prelude::FromRow};
use strum::VariantNames;
use utoipa::ToSchema;

use super::{AuditEvent, AuditLogUser, LogFilterQuery};
use crate::{
    APIError, AppState,
    authentication::{Role, User},
};

#[derive(
    Serialize, Deserialize, VariantNames, Clone, Copy, Debug, PartialEq, Eq, Hash, ToSchema, Type,
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

#[derive(Serialize, Deserialize, Debug)]
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
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    workstation: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    user_id: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    user_fullname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    user_role: Option<Role>,
    #[schema(value_type = String)]
    ip: Ip,
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

    pub fn user_id(&self) -> Option<u32> {
        self.user_id
    }

    pub fn username(&self) -> Option<&str> {
        self.username.as_deref()
    }

    pub fn ip(&self) -> Option<IpAddr> {
        self.ip.0
    }
}

#[derive(Clone)]
pub struct AuditLog(pub SqlitePool);

impl FromRef<AppState> for AuditLog {
    fn from_ref(state: &AppState) -> Self {
        Self(state.pool.clone())
    }
}

/// This struct is used to filter the audit log events
/// The values should always be validated using From<&LogFilterQuery>
#[derive(Default)]
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
            .and_then(|since| DateTime::from_timestamp(*since, 0))
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
        event: &AuditEvent,
        user: Option<&User>,
        message: Option<String>,
        ip: Option<IpAddr>,
    ) -> Result<AuditLogEvent, APIError> {
        // TODO: set workstation id
        let workstation: Option<u32> = None;
        let event_name = event.to_string();
        let event_level = event.level();
        let event = serde_json::to_value(event)?;
        let user_id = user.map(|u| u.id());
        let username = user.map(|u| u.username().to_string());
        let fullname = user.map(|u| u.fullname().unwrap_or_default().to_string());
        let role = user.map(|u| u.role());
        let ip = ip.map(|ip| ip.to_string());

        let event = sqlx::query_as!(
            AuditLogEvent,
            r#"INSERT INTO audit_log (event, event_name, event_level, message, workstation, user_id, username, user_fullname, user_role, ip)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
                id as "id: u32",
                time as "time: _",
                event as "event: serde_json::Value",
                event_level as "event_level: _",
                message,
                workstation as "workstation: _",
                user_id as "user_id: u32",
                username,
                ip,
                user_fullname,
                user_role as "user_role: Role"
            "#,
            event,
            event_name,
            event_level,
            message,
            workstation,
            user_id,
            username,
            fullname,
            role,
            ip
        )
        .fetch_one(&self.0)
        .await?;

        Ok(event)
    }

    #[cfg(test)]
    pub async fn list_all(&self) -> Result<Vec<AuditLogEvent>, APIError> {
        sqlx::query_as!(
            AuditLogEvent,
            r#"SELECT
                audit_log.id as "id: u32",
                time as "time: _",
                event as "event: serde_json::Value",
                event_level as "event_level: _",
                message,
                workstation as "workstation: _",
                ip as "ip: String",
                user_id as "user_id: u32",
                username,
                user_fullname,
                user_role as "user_role: Role"
            FROM audit_log
            ORDER BY time DESC
            "#,
        )
        .fetch_all(&self.0)
        .await
        .map_err(APIError::from)
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
                ip as "ip: String",
                user_id as "user_id: u32",
                audit_log.username,
                user_fullname,
                user_role as "user_role: Role"
            FROM audit_log
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

    pub async fn list_users(&self) -> Result<Vec<AuditLogUser>, APIError> {
        let users = sqlx::query_as!(
            AuditLogUser,
            r#"SELECT
                user_id as "id!: u32",
                user_fullname as "fullname!: String",
                username as "username!: String",
                user_role as "role!: Role"
            FROM audit_log
            WHERE user_id IS NOT NULL
            AND user_fullname IS NOT NULL
            AND username IS NOT NULL
            AND user_role IS NOT NULL
            GROUP BY user_id
            ORDER BY username"#
        )
        .fetch_all(&self.0)
        .await?;

        Ok(users)
    }
}
