use sqlx::{query, query_as};

use super::File;
use crate::DbConnLike;

/// Get a single file
pub async fn get_file(conn: impl DbConnLike<'_>, id: u32) -> Result<File, sqlx::Error> {
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
pub async fn delete_file(conn: impl DbConnLike<'_>, id: u32) -> Result<bool, sqlx::Error> {
    let mut tx = conn.begin_immediate().await?;

    let rows_affected = query!(r#"DELETE FROM files WHERE id = ?"#, id,)
        .execute(&mut *tx)
        .await?
        .rows_affected();

    tx.commit().await?;

    Ok(rows_affected > 0)
}
