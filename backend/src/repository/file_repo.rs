use chrono::{DateTime, Utc};
use sqlx::{SqliteConnection, query_as};

use crate::domain::file::{File, FileId};

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
            created_at AS "created_at: _"
        FROM files
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(conn)
    .await
}

/// Create a single file
pub async fn create(
    conn: &mut SqliteConnection,
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
            created_at
        ) VALUES (?, ?, ?, ?)
        RETURNING
            id AS "id: FileId",
            data,
            name,
            mime_type,
            created_at AS "created_at: _"
        "#,
        data,
        filename,
        mime_type,
        created_at
    )
    .fetch_one(conn)
    .await
}

/// Delete a single file
pub async fn delete(conn: &mut SqliteConnection, id: FileId) -> Result<Option<File>, sqlx::Error> {
    query_as!(
        File,
        r#"DELETE FROM files WHERE id = ? RETURNING id AS "id: FileId", data, name, mime_type, created_at AS "created_at: _" "#,
        id
    )
    .fetch_optional(conn)
    .await
}
