use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::domain::id::id;

id!(FileId);

/// File
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct File {
    pub id: FileId,
    pub data: Vec<u8>,
    pub name: String,
    pub mime_type: String,
    #[schema(value_type = String)]
    pub created_at: DateTime<Utc>,
}
