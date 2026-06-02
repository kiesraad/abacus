use chrono::Local;
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};

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

fn create_backup_directory(backupconfig: &BackupConfig) -> Result<(), BackupError> {
    std::fs::create_dir_all(&backupconfig.directory)?;
    Ok(())
}

pub async fn create_local_backup(
    pool: &SqlitePool,
    backupconfig: &BackupConfig,
) -> Result<(), BackupError> {
    create_backup_directory(backupconfig)?;
    let filename = format!("backup_{}.db", Local::now().format("%Y-%m-%d_%H-%M-%S"));
    let backup_path = backupconfig.directory.join(filename);
    backup_database(pool, &backup_path).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::sync::Mutex;

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

    #[test]
    fn backup_directory_is_created_succesfully() {
        let _lock = TEST_LOCK.lock().unwrap();
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        delete_backup_directory(&backup_config);
    }

    #[test]
    fn backup_directory_creation_is_idempotent() {
        let _lock = TEST_LOCK.lock().unwrap();
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
        let _lock = TEST_LOCK.lock().unwrap();
        let backup_config = setup_backup_config();
        create_backup_directory(&backup_config).unwrap();
        create_local_backup(&pool, &backup_config).await.unwrap();
        assert!(backup_config.directory.read_dir().unwrap().next().is_some());
        delete_backup_directory(&backup_config);
    }
}
