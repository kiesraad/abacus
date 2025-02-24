use serde::{Deserialize, Serialize};
use sqlx::{prelude::FromRow, SqlitePool};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow, ToSchema)]
pub struct AuditLogEvent {
    id: u32,
}
pub struct AuditLogEvents(SqlitePool);

