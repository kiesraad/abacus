pub mod repository;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqliteConnection, Type};
use utoipa::ToSchema;

use crate::{
    APIError,
    audit_log::{AuditEvent, AuditService, FileDetails},
    util::id,
};

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

pub async fn create_file(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    filename: String,
    data: &[u8],
    mime_type: String,
    created_at: DateTime<Utc>,
) -> Result<File, APIError> {
    let file = repository::create(conn, filename, data, mime_type, created_at).await?;

    audit_service
        .log(conn, &AuditEvent::FileCreated(file.clone().into()), None)
        .await?;
    Ok(file)
}

pub async fn delete_file(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    id: FileId,
) -> Result<(), APIError> {
    if let Some(file) = repository::delete(conn, id).await? {
        audit_service
            .log(conn, &AuditEvent::FileDeleted(file.into()), None)
            .await?;
    }
    Ok(())
}
