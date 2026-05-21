use sqlx::SqlitePool;

pub async fn backup_database(pool: &SqlitePool, destination: &str) -> Result<(), sqlx::Error> {
    let mut connection = pool.acquire().await?;
    sqlx::query("VACUUM INTO ?").bind(destination).execute(&mut *connection).await?;
    Ok(())
}