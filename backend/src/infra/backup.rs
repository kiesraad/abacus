use chrono::Local;
use sqlx::{
    Connection, Row, SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteConnection},
};
use std::{
    path::{Path, PathBuf},
    sync::Arc,
};
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct BackupConfig {
    pub directory: PathBuf,
    /// Mutex to prevent concurrent backup creation
    lock: Arc<Mutex<()>>,
}

impl BackupConfig {
    pub fn new(directory: PathBuf) -> Self {
        Self {
            directory,
            lock: Arc::new(Mutex::new(())),
        }
    }
}

pub struct BackupResult {
    pub filename: String,
    pub created_at: chrono::DateTime<Local>,
}

#[derive(Debug)]
pub enum BackupError {
    AlreadyExists,
    InvalidPath,
    IntegrityCheckFailed(String),
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
    let guard = backup_config.lock.lock().await;
    create_backup_directory(backup_config)?;
    let now = Local::now();
    let filename = format!("db_backup_{}.sqlite", now.format("%Y-%m-%d_%H-%M-%S"));
    let backup_path = backup_config.directory.join(&filename);
    if backup_path.exists() {
        return Err(BackupError::AlreadyExists);
    }
    if let Err(err) = write_and_verify_backup(pool, &backup_path).await {
        // try to delete the backup, ignore error if deleting fails
        let _ = std::fs::remove_file(&backup_path);
        return Err(err);
    }
    drop(guard);
    Ok(BackupResult {
        filename,
        created_at: now,
    })
}

fn create_backup_directory(backup_config: &BackupConfig) -> Result<(), BackupError> {
    std::fs::create_dir_all(&backup_config.directory)?;
    Ok(())
}

async fn write_and_verify_backup(pool: &SqlitePool, backup_path: &Path) -> Result<(), BackupError> {
    backup_database(pool, backup_path).await?;
    verify_backup(backup_path).await
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

/// Run SQLite integrity check on a separate read-only connection.
async fn verify_backup(backup_path: &Path) -> Result<(), BackupError> {
    let options = SqliteConnectOptions::new()
        .filename(backup_path)
        .read_only(true);
    let mut connection = SqliteConnection::connect_with(&options).await?;
    let result = sqlx::query("PRAGMA integrity_check")
        .fetch_one(&mut connection)
        .await;
    connection.close().await?;
    let message = result?.try_get::<String, _>(0)?;
    if message == "ok" {
        Ok(())
    } else {
        Err(BackupError::IntegrityCheckFailed(message))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_backup_config() -> (TempDir, BackupConfig) {
        let temp_dir = tempfile::tempdir().unwrap();
        let backup_config = BackupConfig::new(temp_dir.path().join("backups"));
        (temp_dir, backup_config)
    }

    #[tokio::test]
    async fn backup_directory_is_created_succesfully() {
        let (_temp_dir, backup_config) = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        assert!(backup_config.directory.exists());
    }

    #[tokio::test]
    async fn backup_directory_creation_is_idempotent() {
        let (_temp_dir, backup_config) = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_backup_directory(&backup_config).unwrap();
    }

    #[sqlx::test]
    async fn local_backup_is_successful(pool: SqlitePool) {
        let (_temp_dir, backup_config) = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        let result = create_local_backup(&pool, &backup_config).await.unwrap();
        assert!(backup_config.directory.join(&result.filename).exists());
    }

    #[tokio::test]
    async fn verify_backup_fails_on_corrupt_file() {
        let (_temp_dir, backup_config) = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        let backup_path = backup_config.directory.join("corrupt.sqlite");
        std::fs::write(&backup_path, b"corrupt database").unwrap();
        assert!(verify_backup(&backup_path).await.is_err());
    }
}
