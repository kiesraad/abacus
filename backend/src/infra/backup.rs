use chrono::Local;
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};

#[derive(Clone)]
pub struct BackupConfig {
    pub directory: PathBuf,
}

pub struct BackupResult {
    pub filename: String,
    pub created_at: chrono::DateTime<Local>,
}

#[derive(Debug)]
pub enum BackupError {
    AlreadyExists,
    InvalidPath,
    Io(std::io::Error),
    Database(sqlx::Error),
}

impl From<std::io::Error> for BackupError {
    fn from(error: std::io::Error) -> Self {
        BackupError::Io(error)
    }
}

impl From<sqlx::Error> for BackupError {
    fn from(err: sqlx::Error) -> Self {
        BackupError::Database(err)
    }
}

pub async fn create_local_backup(
    pool: &SqlitePool,
    backup_config: &BackupConfig,
) -> Result<BackupResult, BackupError> {
    create_backup_directory(backup_config)?;
    let now = Local::now();
    let filename = format!("db_backup_{}.sqlite", now.format("%Y-%m-%d_%H-%M-%S"));
    let backup_path = backup_config.directory.join(&filename);
    if backup_path.exists() {
        return Err(BackupError::AlreadyExists);
    }
    backup_database(pool, &backup_path).await?;
    Ok(BackupResult {
        filename,
        created_at: now,
    })
}

fn create_backup_directory(backup_config: &BackupConfig) -> Result<(), BackupError> {
    std::fs::create_dir_all(&backup_config.directory)?;
    Ok(())
}

async fn backup_database(pool: &SqlitePool, destination: &Path) -> Result<(), BackupError> {
    let destination = destination
        .to_str()
        .ok_or(BackupError::InvalidPath)?
        .to_string();
    let mut connection = pool.acquire().await?;
    sqlx::query("VACUUM INTO ?")
        .bind(destination)
        .execute(&mut *connection)
        .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static TEST_ID: AtomicU32 = AtomicU32::new(0);

    fn setup_backup_config() -> BackupConfig {
        let id = TEST_ID.fetch_add(1, Ordering::Relaxed);
        let backup_directory =
            std::env::temp_dir().join(format!("backups_{}_{}", std::process::id(), id));
        BackupConfig {
            directory: backup_directory,
        }
    }

    fn delete_backup_directory(backup_config: &BackupConfig) {
        std::fs::remove_dir_all(&backup_config.directory).unwrap();
    }

    #[tokio::test]
    async fn backup_directory_is_created_succesfully() {
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        delete_backup_directory(&backup_config);
    }

    #[tokio::test]
    async fn backup_directory_creation_is_idempotent() {
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_backup_directory(&backup_config).unwrap();
        delete_backup_directory(&backup_config);
    }

    #[sqlx::test]
    async fn local_backup_is_successful(pool: SqlitePool) {
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        let result = create_local_backup(&pool, &backup_config).await.unwrap();
        assert!(backup_config.directory.join(&result.filename).exists());
        delete_backup_directory(&backup_config);
    }
}
