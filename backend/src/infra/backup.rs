use sqlx::SqlitePool;
use std::error::Error;
use std::path::{Path, PathBuf};

pub struct BackupConfig {
    pub directory: PathBuf,
}

async fn backup_database(pool: &SqlitePool, destination: &Path) -> Result<(), Box<dyn Error>> {
    let destination = destination
        .to_str()
        .ok_or("error formatting string")?
        .to_string();
    let mut connection = pool.acquire().await?;
    sqlx::query("VACUUM INTO ?")
        .bind(destination)
        .execute(&mut *connection)
        .await?;
    Ok(())
}

async fn create_backup_directory(backupconfig: &BackupConfig) -> Result<(), Box<dyn Error>> {
    std::fs::create_dir_all(&backupconfig.directory)?;
    Ok(())
}

pub fn store_backup_directory_path(backupconfig: &mut BackupConfig) -> Result<(), Box<dyn Error>> {
    let executable_path = std::env::current_exe()?;
    let executable_directory = executable_path.parent().ok_or("parent does not exist")?;
    let backup_directory = executable_directory.join("database_backups");
    backupconfig.directory = backup_directory;
    Ok(())
}

pub async fn create_local_backup(
    pool: &SqlitePool,
    backupconfig: &BackupConfig,
) -> Result<(), Box<dyn Error>> {
    backup_database(pool, &backupconfig.directory).await?;
    Ok(())
}
