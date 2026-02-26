use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::{
    domain::id::id,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType},
};

id!(FileId);

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct FileDetails {
    pub file_id: FileId,
    pub file_name: String,
    pub file_mime_type: String,
    pub file_size_bytes: u64,
    #[schema(value_type = String)]
    pub file_created_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub struct FileCreated(pub FileDetails);
impl AsAuditEvent for FileCreated {
    const EVENT_TYPE: AuditEventType = AuditEventType::FileCreated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}
#[derive(Serialize)]
pub struct FileDeleted(pub FileDetails);
impl AsAuditEvent for FileDeleted {
    const EVENT_TYPE: AuditEventType = AuditEventType::FileDeleted;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Info;
}

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

impl From<File> for FileDetails {
    fn from(file: File) -> Self {
        Self {
            file_id: file.id,
            file_name: file.name,
            file_mime_type: file.mime_type,
            file_size_bytes: file.data.len() as u64,
            file_created_at: file.created_at,
        }
    }
}
