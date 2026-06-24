use chrono::Local;
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};

/// Configuration for the local database backup system.
#[derive(Clone)]
pub struct BackupConfig {
    /// Directory where backup files are stored.
    pub directory: PathBuf,
}

impl BackupConfig {
    /// Creates a new `BackupConfig` using a `backups` directory
    /// in the same folder as the database file.
    pub fn new(database: &str) -> Result<Self, BackupError> {
        let database_path = Path::new(database);
        let working_directory = database_path
            .parent()
            .ok_or(BackupError::InvalidDatabasePath)?;
        let backup_directory = working_directory.join("backups");
        Ok(BackupConfig {
            directory: backup_directory,
        })
    }
}

/// Errors that can occur during backup operations.
#[derive(Debug)]
pub enum BackupError {
    InvalidPath,
    InvalidDatabasePath,
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
) -> Result<(), BackupError> {
    create_backup_directory(backup_config)?;
    let filename = format!("backup_{}.db", Local::now().format("%Y-%m-%d_%H-%M-%S"));
    let backup_path = backup_config.directory.join(filename);
    backup_database(pool, &backup_path).await?;
    Ok(())
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

    #[test]
    fn backup_path_ends_with_correct_directory_name() {
        let backup_config = BackupConfig::new("db.sqlite").unwrap();
        assert!(backup_config.directory.ends_with("backups"));
    }

    #[sqlx::test]
    async fn local_backup_is_succesfull(pool: SqlitePool) {
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_local_backup(&pool, &backup_config).await.unwrap();
        assert!(backup_config.directory.read_dir().unwrap().next().is_some());
        delete_backup_directory(&backup_config);
    }
}
