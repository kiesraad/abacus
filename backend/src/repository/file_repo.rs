use chrono::{DateTime, Utc};
use sqlx::{SqliteConnection, query_as};

use crate::domain::{
    committee_session::CommitteeSessionId,
    file::{File, FileId, FileType},
};

/// Get a single file
pub async fn get(conn: &mut SqliteConnection, id: FileId) -> Result<File, sqlx::Error> {
    query_as!(
        File,
        r#"
        SELECT
            id AS "id: FileId",
            data,
            name,
            mime_type,
            created_at AS "created_at: _",
            committee_session_id AS "committee_session_id: _",
            file_type AS "file_type: _"
        FROM files
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(conn)
    .await
}

/// Get a file for a committee session by file type
pub async fn get_for_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    file_type: FileType,
) -> Result<Option<File>, sqlx::Error> {
    query_as!(
        File,
        r#"
        SELECT
            id AS "id: FileId",
            data,
            name,
            mime_type,
            created_at AS "created_at: _",
            committee_session_id AS "committee_session_id: _",
            file_type AS "file_type: _"
        FROM files
        WHERE committee_session_id = ? AND file_type = ?
        "#,
        committee_session_id,
        file_type
    )
    .fetch_optional(conn)
    .await
}

/// Create a file associated with a committee session
pub async fn create(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    file_type: FileType,
    filename: String,
    data: &[u8],
    mime_type: String,
    created_at: DateTime<Utc>,
) -> Result<File, sqlx::Error> {
    query_as!(
        File,
        r#"
        INSERT INTO files (
            data,
            name,
            mime_type,
            created_at,
            committee_session_id,
            file_type
        ) VALUES (?, ?, ?, ?, ?, ?)
        RETURNING
            id AS "id: FileId",
            data,
            name,
            mime_type,
            created_at AS "created_at: _",
            committee_session_id AS "committee_session_id: _",
            file_type AS "file_type: _"
        "#,
        data,
        filename,
        mime_type,
        created_at,
        committee_session_id,
        file_type
    )
    .fetch_one(conn)
    .await
}

/// Delete all files associated with a committee session, returning the deleted files
pub async fn delete_for_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<File>, sqlx::Error> {
    query_as!(
        File,
        r#"
        DELETE FROM files
        WHERE committee_session_id = ?
        RETURNING
            id AS "id: FileId",
            data,
            name,
            mime_type,
            created_at AS "created_at: _",
            committee_session_id AS "committee_session_id: _",
            file_type AS "file_type: _"
        "#,
        committee_session_id
    )
    .fetch_all(conn)
    .await
}
