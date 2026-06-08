use chrono::Local;
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
use tokio::time::Duration;

const AMOUNT_OF_BACKUP_FILES_ALLOWED: usize = 5;
const BACKUP_INTERVAL_IN_MINUTES: u64 = 5;

#[derive(Clone)]
pub struct BackupConfig {
    pub directory: PathBuf,
}

impl BackupConfig {
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
    let backup_path = &backup_config.directory.join(filename);
    backup_database(pool, &backup_path).await?;
    if count_backups(&backup_config)? > AMOUNT_OF_BACKUP_FILES_ALLOWED {
        remove_oldest_backup(&backup_config)?;
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
    let count = directory_entries.filter_map(|f| Some(f.ok()?)).count();
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
    use tokio::time::Duration;
    use tokio::{sync::Mutex, time::sleep};

    static TEST_LOCK: Mutex<()> = Mutex::const_new(());

    fn setup_backup_config() -> BackupConfig {
        let parent_directory = std::env::temp_dir();
        let backup_directory = parent_directory.join("database_backups");
        BackupConfig {
            directory: backup_directory,
        }
    }

    fn delete_backup_directory(backup_config: &BackupConfig) {
        std::fs::remove_dir_all(&backup_config.directory).unwrap();
    }

    #[tokio::test]
    async fn backup_directory_is_created_succesfully() {
        let _lock = TEST_LOCK.lock().await;
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        delete_backup_directory(&backup_config);
    }

    #[tokio::test]
    async fn backup_directory_creation_is_idempotent() {
        let _lock = TEST_LOCK.lock().await;
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
        let _lock = TEST_LOCK.lock().await;
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_local_backup(&pool, &backup_config).await.unwrap();
        assert!(backup_config.directory.read_dir().unwrap().next().is_some());
        delete_backup_directory(&backup_config);
    }

    #[sqlx::test]
    async fn local_backup_count_is_correct(pool: SqlitePool) {
        let _lock = TEST_LOCK.lock().await;
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_local_backup(&pool, &backup_config).await.unwrap();
        assert_eq!(count_backups(&backup_config).unwrap(), 1);
        delete_backup_directory(&backup_config);
    }

    #[sqlx::test]
    async fn oldest_backup_is_removed_when_limit_is_exceeded(pool: SqlitePool) {
        let _lock = TEST_LOCK.lock().await;
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
        let _lock = TEST_LOCK.lock().await;
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_local_backup(&pool, &backup_config).await.unwrap();
        remove_oldest_backup(&backup_config).unwrap();
        assert!(backup_config.directory.read_dir().unwrap().next().is_none());
        delete_backup_directory(&backup_config);
    }
}
