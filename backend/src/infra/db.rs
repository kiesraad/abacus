use std::str::FromStr;

use sqlx::{
    Sqlite, SqliteConnection, SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode},
};
use tracing::info;

use crate::{
    AppError,
    app_error::{DatabaseErrorWithPath, DatabaseMigrationErrorWithPath},
    fixtures,
    infra::audit_log,
};

/// Extension trait for SqlitePool to add begin_immediate functionality
pub trait SqlitePoolExt {
    /// Acquire a connection and start a transaction with "BEGIN IMMEDIATE",
    /// which is needed to prevent database is busy errors.
    /// See https://sqlite.org/isolation.html for details.
    fn begin_immediate(
        &self,
    ) -> impl Future<Output = Result<sqlx::Transaction<'_, Sqlite>, sqlx::Error>> + Send;
}

impl SqlitePoolExt for SqlitePool {
    async fn begin_immediate(&self) -> Result<sqlx::Transaction<'_, Sqlite>, sqlx::Error> {
        self.begin_with("BEGIN IMMEDIATE").await
    }
}

/// Create a SQLite database if needed, then connect to it and run migrations.
/// Return a connection pool.
pub async fn create_sqlite_pool(
    database: &str,
    #[cfg(feature = "dev-database")] reset_database: bool,
    #[cfg(feature = "dev-database")] seed_data: bool,
) -> Result<SqlitePool, AppError> {
    let db = format!("sqlite://{database}");
    let opts = SqliteConnectOptions::from_str(&db)?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .busy_timeout(std::time::Duration::from_secs(20));

    #[cfg(feature = "dev-database")]
    if reset_database {
        // remove the file, ignoring any errors that occurred (such as the file not existing)
        let _ = tokio::fs::remove_file(opts.get_filename()).await;
        info!("removed database file");
    }

    let pool = SqlitePool::connect_with(opts).await?;

    // run database migrations, this creates the necessary tables if they don't exist yet
    sqlx::migrate!()
        .run(&pool)
        .await
        .map_err(DatabaseMigrationErrorWithPath::with_path(database))?;

    #[cfg(feature = "dev-database")]
    if seed_data {
        fixtures::seed_fixture_data(&pool).await?;
    }

    // log startup event and verify the database is writeable
    let mut connection = pool.acquire().await?;
    log_app_started(&mut connection, database).await?;

    Ok(pool)
}

/// Log that the application started and thereby check that the database is writeable
/// This maps common sqlite errors to an AppError
async fn log_app_started(conn: &mut SqliteConnection, db_path: &str) -> Result<(), AppError> {
    Ok(audit_log::create(
        conn,
        &audit_log::AuditEvent::ApplicationStarted(audit_log::ApplicationStartedDetails {
            version: env!("ABACUS_GIT_VERSION").to_string(),
            commit: env!("ABACUS_GIT_REV").to_string(),
        }),
        None,
        None,
        None,
    )
    .await
    .map_err(DatabaseErrorWithPath::with_path(db_path))?)
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

    #[test(tokio::test)]
    async fn test_readonly_database_error() {
        // Create a read-only in-memory database
        let db_url = "sqlite::memory:?mode=ro";
        let result = create_sqlite_pool(
            db_url,
            #[cfg(feature = "dev-database")]
            false,
            #[cfg(feature = "dev-database")]
            false,
        )
        .await;

        assert!(matches!(result, Err(AppError::DatabaseReadOnly(_))));
    }
}
