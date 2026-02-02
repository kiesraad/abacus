#[derive(Debug)]
pub enum AppError {
    // wrapped errors
    Database(sqlx::Error),
    DatabaseMigration(sqlx::migrate::MigrateError),
    Io(std::io::Error),
    Environment(tracing_subscriber::filter::FromEnvError),
    StdError(Box<dyn std::error::Error>),
    // server specific
    PortAlreadyInUse(u16),
    PermissionDeniedToBindPort(u16),
    // sqlite specific
    DatabaseBusy(String),
    DatabaseReadOnly(String),
    DatabaseDiskFull(String),
}

impl std::error::Error for AppError {}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err)
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err)
    }
}

#[derive(Debug)]
pub struct DatabaseErrorWithPath {
    error: sqlx::Error,
    db_path: String,
}

impl DatabaseErrorWithPath {
    pub fn with_path(db_path: &str) -> impl FnOnce(sqlx::Error) -> Self {
        |e| Self {
            error: e,
            db_path: db_path.to_string(),
        }
    }
}

impl From<DatabaseErrorWithPath> for AppError {
    fn from(DatabaseErrorWithPath { error, db_path }: DatabaseErrorWithPath) -> Self {
        if let Some(db_error) = error.as_database_error() {
            let db_path = db_path.to_string();
            // see https://sqlite.org/rescode.html
            match db_error.code().unwrap_or_default().as_ref() {
                "5" => AppError::DatabaseBusy(db_path),
                "8" => AppError::DatabaseReadOnly(db_path),
                "13" => AppError::DatabaseDiskFull(db_path),
                _ => AppError::Database(error),
            }
        } else {
            AppError::Database(error)
        }
    }
}

impl From<sqlx::migrate::MigrateError> for AppError {
    fn from(err: sqlx::migrate::MigrateError) -> Self {
        AppError::DatabaseMigration(err)
    }
}

#[derive(Debug)]
pub struct DatabaseMigrationErrorWithPath {
    error: sqlx::migrate::MigrateError,
    db_path: String,
}

impl DatabaseMigrationErrorWithPath {
    pub fn with_path(db_path: &str) -> impl FnOnce(sqlx::migrate::MigrateError) -> Self {
        |e| Self {
            error: e,
            db_path: db_path.to_string(),
        }
    }
}

impl From<DatabaseMigrationErrorWithPath> for AppError {
    fn from(
        DatabaseMigrationErrorWithPath { error, db_path }: DatabaseMigrationErrorWithPath,
    ) -> Self {
        match error {
            sqlx::migrate::MigrateError::Execute(err)
            | sqlx::migrate::MigrateError::ExecuteMigration(err, _) => DatabaseErrorWithPath {
                error: err,
                db_path,
            }
            .into(),
            other => AppError::DatabaseMigration(other),
        }
    }
}

impl From<tracing_subscriber::filter::FromEnvError> for AppError {
    fn from(err: tracing_subscriber::filter::FromEnvError) -> Self {
        AppError::Environment(err)
    }
}

impl From<Box<dyn std::error::Error>> for AppError {
    fn from(err: Box<dyn std::error::Error>) -> Self {
        AppError::StdError(err)
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Io(e) => write!(f, "IO error: {}", e),
            AppError::Environment(e) => write!(f, "Environment error: {}", e),
            AppError::Database(e) => write!(f, "Database error: {}", e),
            AppError::DatabaseBusy(file) => {
                write!(
                    f,
                    "The database file \"{file:?}\" is busy. Is Abacus already running?"
                )
            }
            AppError::DatabaseDiskFull(file) => {
                write!(
                    f,
                    "Cannot write to the database file \"{file}\". Disk full."
                )
            }
            AppError::DatabaseMigration(e) => write!(f, "Database migration error: {}", e),
            AppError::DatabaseReadOnly(file) => {
                write!(
                    f,
                    "Cannot write to the database file \"{file}\". Please check file permissions."
                )
            }
            AppError::PortAlreadyInUse(port) => {
                write!(f, "Port {port} is in use. Is Abacus already running?")
            }
            AppError::PermissionDeniedToBindPort(port) => {
                write!(
                    f,
                    "Permission denied to bind to port {port}. On Unix systems, binding to ports below 1024 requires elevated privileges."
                )
            }
            AppError::StdError(e) => write!(f, "{}", e),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::{borrow::Cow, fmt};

    use sqlx::error::ErrorKind;

    use super::*;

    #[derive(Debug)]
    struct MockDatabaseError {
        code: Option<&'static str>,
        message: &'static str,
    }

    impl fmt::Display for MockDatabaseError {
        fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
            write!(f, "{}", self.message)
        }
    }

    impl std::error::Error for MockDatabaseError {}

    impl sqlx::error::DatabaseError for MockDatabaseError {
        fn message(&self) -> &str {
            self.message
        }

        fn code(&self) -> Option<Cow<'_, str>> {
            self.code.map(Cow::Borrowed)
        }

        fn as_error(&self) -> &(dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn as_error_mut(&mut self) -> &mut (dyn std::error::Error + Send + Sync + 'static) {
            self
        }

        fn into_error(self: Box<Self>) -> Box<dyn std::error::Error + Send + Sync + 'static> {
            self
        }

        fn kind(&self) -> ErrorKind {
            ErrorKind::Other
        }
    }

    fn mock_sqlx_error(code: Option<&'static str>, message: &'static str) -> sqlx::Error {
        sqlx::Error::Database(Box::new(MockDatabaseError { code, message }))
    }

    #[test]
    fn database_error_with_path_maps_busy_code() {
        let db_path = "/tmp/abacus.db";
        let sqlx_error = mock_sqlx_error(Some("5"), "database is locked");
        let app_error: AppError = DatabaseErrorWithPath::with_path(db_path)(sqlx_error).into();
        let rendered = app_error.to_string();

        match app_error {
            AppError::DatabaseBusy(path) => assert_eq!(path, db_path),
            other => panic!("expected DatabaseBusy, got {other:?}"),
        }

        assert_eq!(
            rendered,
            "The database file \"\"/tmp/abacus.db\"\" is busy. Is Abacus already running?"
        );
    }

    #[test]
    fn database_error_with_path_maps_read_only_code() {
        let db_path = "/tmp/abacus.db";
        let sqlx_error = mock_sqlx_error(Some("8"), "attempt to write a readonly database");
        let app_error: AppError = DatabaseErrorWithPath::with_path(db_path)(sqlx_error).into();
        let rendered = app_error.to_string();

        match app_error {
            AppError::DatabaseReadOnly(path) => assert_eq!(path, db_path),
            other => panic!("expected DatabaseReadOnly, got {other:?}"),
        }

        assert_eq!(
            rendered,
            "Cannot write to the database file \"/tmp/abacus.db\". Please check file permissions."
        );
    }

    #[test]
    fn database_error_with_path_maps_disk_full_code() {
        let db_path = "/tmp/abacus.db";
        let sqlx_error = mock_sqlx_error(Some("13"), "database or disk is full");
        let app_error: AppError = DatabaseErrorWithPath::with_path(db_path)(sqlx_error).into();
        let rendered = app_error.to_string();

        match app_error {
            AppError::DatabaseDiskFull(path) => assert_eq!(path, db_path),
            other => panic!("expected DatabaseDiskFull, got {other:?}"),
        }

        assert_eq!(
            rendered,
            "Cannot write to the database file \"/tmp/abacus.db\". Disk full."
        );
    }

    #[test]
    fn database_error_with_path_falls_back_to_database_error() {
        let sqlx_error = mock_sqlx_error(Some("999"), "unrecognized error");
        let app_error: AppError =
            DatabaseErrorWithPath::with_path("/tmp/abacus.db")(sqlx_error).into();
        let rendered = app_error.to_string();

        match app_error {
            AppError::Database(err) => assert_eq!(
                err.to_string(),
                "error returned from database: unrecognized error"
            ),
            other => panic!("expected Database, got {other:?}"),
        }

        assert_eq!(
            rendered,
            "Database error: error returned from database: unrecognized error"
        );
    }

    #[test]
    fn migration_error_with_path_maps_execute_variant() {
        let db_path = "/tmp/abacus.db";
        let sqlx_error = mock_sqlx_error(Some("8"), "attempt to write a readonly database");
        let migrate_error = sqlx::migrate::MigrateError::Execute(sqlx_error);
        let app_error: AppError =
            DatabaseMigrationErrorWithPath::with_path(db_path)(migrate_error).into();
        let rendered = app_error.to_string();

        match app_error {
            AppError::DatabaseReadOnly(path) => assert_eq!(path, db_path),
            other => panic!("expected DatabaseReadOnly, got {other:?}"),
        }

        assert_eq!(
            rendered,
            "Cannot write to the database file \"/tmp/abacus.db\". Please check file permissions."
        );
    }

    #[test]
    fn migration_error_with_path_maps_execute_migration_variant() {
        let db_path = "/tmp/abacus.db";
        let sqlx_error = mock_sqlx_error(Some("5"), "database is locked");
        let migrate_error = sqlx::migrate::MigrateError::ExecuteMigration(sqlx_error, 7);
        let app_error: AppError =
            DatabaseMigrationErrorWithPath::with_path(db_path)(migrate_error).into();
        let rendered = app_error.to_string();

        match app_error {
            AppError::DatabaseBusy(path) => assert_eq!(path, db_path),
            other => panic!("expected DatabaseBusy, got {other:?}"),
        }

        assert_eq!(
            rendered,
            "The database file \"\"/tmp/abacus.db\"\" is busy. Is Abacus already running?"
        );
    }
}
