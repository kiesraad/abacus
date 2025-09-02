use crate::DbConnLike;
use sqlx::query_as;

use super::File;

/// Get a single file
pub async fn get_file(conn: impl DbConnLike<'_>, id: u32) -> Result<File, sqlx::Error> {
    query_as!(
        File,
        r#"
        SELECT
            id AS "id: u32",
            data,
            filename,
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
    conn: impl DbConnLike<'_>,
    data: &[u8],
    filename: String,
    mime_type: String,
) -> Result<File, sqlx::Error> {
    query_as!(
        File,
        r#"
        INSERT INTO files (
            data,
            filename,
            mime_type
        ) VALUES (?, ?, ?)
        RETURNING
            id AS "id: u32",
            data,
            filename,
            mime_type
        "#,
        data,
        filename,
        mime_type
    )
    .fetch_one(conn)
    .await
}
