use chrono::Local;
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
use tokio::time::Duration;

const AMOUNT_OF_BACKUP_FILES_ALLOWED: usize = 5;
const BACKUP_INTERVAL_IN_MINUTES: u64 = 5;

/// Configuration for the local database backup system.
#[derive(Clone)]
pub struct BackupConfig {
    /// Directory where backup files are stored.
    pub directory: PathBuf,
}

impl BackupConfig {
    /// Creates a new `BackupConfig` using a `database_backups` directory
    /// adjacent to the running executable.
    pub fn new() -> Result<Self, BackupError> {
        let executable_path = std::env::current_exe()?;
        let executable_directory = executable_path
            .parent()
            .ok_or(BackupError::NoExecutableDirectory)?;
        let backup_directory = executable_directory.join("database_backups");
        Ok(BackupConfig {
            directory: backup_directory,
        })
    }
}

/// Errors that can occur during backup operations.
#[derive(Debug)]
pub enum BackupError {
    InvalidPath,
    NoExecutableDirectory,
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

/// Runs the periodic backup scheduler, creating a local backup every
/// [`BACKUP_INTERVAL_IN_MINUTES`] minutes. Runs indefinitely, intended to be
/// spawned as a background task. Backup errors are logged but do not stop the loop.
pub async fn run_backup_scheduler(backup_pool: SqlitePool, backup_config: BackupConfig) {
    let mut interval = tokio::time::interval(Duration::from_mins(BACKUP_INTERVAL_IN_MINUTES));
    loop {
        interval.tick().await;
        if let Err(e) = create_local_backup(&backup_pool, &backup_config).await {
            tracing::error!("Backup failed: {e:?}");
        }
    }
}

async fn create_local_backup(
    pool: &SqlitePool,
    backup_config: &BackupConfig,
) -> Result<(), BackupError> {
    create_backup_directory(backup_config)?;
    let filename = format!("backup_{}.db", Local::now().format("%Y-%m-%d_%H-%M-%S"));
    let backup_path = backup_config.directory.join(filename);
    backup_database(pool, &backup_path).await?;
    if count_backups(backup_config)? > AMOUNT_OF_BACKUP_FILES_ALLOWED {
        remove_oldest_backup(backup_config)?;
    }
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

fn count_backups(backup_config: &BackupConfig) -> Result<usize, BackupError> {
    let directory_entries = std::fs::read_dir(&backup_config.directory)?;
    let count = directory_entries.filter_map(|f| f.ok()).count();
    Ok(count)
}

fn remove_oldest_backup(backup_config: &BackupConfig) -> Result<(), BackupError> {
    let directory_entries = std::fs::read_dir(&backup_config.directory)?;
    let oldest_backup = directory_entries.filter_map(|f| Some(f.ok()?.path())).min();
    if let Some(oldest_backup) = oldest_backup {
        std::fs::remove_file(oldest_backup)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};
    use tokio::time::{Duration, sleep};

    static TEST_ID: AtomicU32 = AtomicU32::new(0);

    fn setup_backup_config() -> BackupConfig {
        let id = TEST_ID.fetch_add(1, Ordering::Relaxed);
        let backup_directory =
            std::env::temp_dir().join(format!("database_backups_{}_{}", std::process::id(), id));
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
        let backup_config = BackupConfig::new().unwrap();
        assert!(backup_config.directory.ends_with("database_backups"));
    }

    #[sqlx::test]
    async fn local_backup_is_succesfull(pool: SqlitePool) {
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_local_backup(&pool, &backup_config).await.unwrap();
        assert!(backup_config.directory.read_dir().unwrap().next().is_some());
        delete_backup_directory(&backup_config);
    }

    #[sqlx::test]
    async fn local_backup_count_is_correct(pool: SqlitePool) {
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_local_backup(&pool, &backup_config).await.unwrap();
        assert_eq!(count_backups(&backup_config).unwrap(), 1);
        delete_backup_directory(&backup_config);
    }

    #[sqlx::test]
    async fn oldest_backup_is_removed_when_limit_is_exceeded(pool: SqlitePool) {
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        for _ in 0..6 {
            create_local_backup(&pool, &backup_config).await.unwrap();
            sleep(Duration::from_secs(1)).await;
        }
        assert_eq!(count_backups(&backup_config).unwrap(), 5);
        delete_backup_directory(&backup_config);
    }

    #[sqlx::test]
    async fn local_backup_deletion_is_succesfull(pool: SqlitePool) {
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_local_backup(&pool, &backup_config).await.unwrap();
        remove_oldest_backup(&backup_config).unwrap();
        assert!(backup_config.directory.read_dir().unwrap().next().is_none());
        delete_backup_directory(&backup_config);
    }
}
