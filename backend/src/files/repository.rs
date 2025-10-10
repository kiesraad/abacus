use sqlx::{SqliteConnection, query_as};

use super::File;

/// Get a single file
pub async fn get_file(conn: &mut SqliteConnection, id: u32) -> Result<File, sqlx::Error> {
    query_as!(
        File,
        r#"
        SELECT
            id AS "id: u32",
            data,
            name,
            mime_type
        FROM files
        WHERE id = $1
        "#,
        id
    )
    .fetch_one(conn)
    .await
}

/// Create a single file
pub async fn create_file(
    conn: &mut SqliteConnection,
    filename: String,
    data: &[u8],
    mime_type: String,
) -> Result<File, sqlx::Error> {
    query_as!(
        File,
        r#"
        INSERT INTO files (
            data,
            name,
            mime_type
        ) VALUES (?, ?, ?)
        RETURNING
            id AS "id: u32",
            data,
            name,
            mime_type
        "#,
        data,
        filename,
        mime_type
    )
    .fetch_one(conn)
    .await
}

/// Delete a single file
pub async fn delete_file(
    conn: &mut SqliteConnection,
    id: u32,
) -> Result<Option<File>, sqlx::Error> {
    query_as!(
        File,
        r#"DELETE FROM files WHERE id = ? RETURNING id AS "id: u32", data, name, mime_type "#,
        id
    )
    .fetch_optional(conn)
    .await
}
