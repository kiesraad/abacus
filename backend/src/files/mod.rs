pub mod repository;

use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::audit_log::FileDetails;

/// File
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema, Type, FromRow)]
#[serde(deny_unknown_fields)]
pub struct File {
    pub id: u32,
    pub data: Vec<u8>,
    pub name: String,
    pub mime_type: String,
}

impl From<File> for FileDetails {
    fn from(file: File) -> Self {
        Self {
            file_id: file.id,
            file_name: file.name,
            file_mime_type: file.mime_type,
            file_size_bytes: file.data.len() as u64,
        }
    }
}
