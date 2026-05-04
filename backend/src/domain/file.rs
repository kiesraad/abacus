use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Type};
use utoipa::ToSchema;

use crate::domain::{committee_session::CommitteeSessionId, identifier::id};

id!(FileId);

/// File type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema, Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum FileType {
    /// GSB results EML (510b)
    GsbResultsEml,
    /// GSB results PDF (Model Na 31-2 for first session, Model Na 14-2 for next session)
    GsbResultsPdf,
    /// GSB overview PDF for next session (Model P 2a)
    GsbOverviewPdf,
    /// CSB results EML (520)
    CsbResultsEml,
    /// CSB total counts EML (510d)
    CsbTotalCountsEml,
    /// CSB results PDF (Model P 22-2)
    CsbResultsPdf,
    /// CSB attachment PDF (Model P 22-2 Bijlage 1)
    CsbAttachmentPdf,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub committee_session_id: Option<CommitteeSessionId>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub file_type: Option<FileType>,
}
