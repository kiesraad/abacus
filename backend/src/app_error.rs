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
    // sqlite specifc
    DatabaseBusy(String),
    DatabaseNoMemory(String),
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

impl From<sqlx::migrate::MigrateError> for AppError {
    fn from(err: sqlx::migrate::MigrateError) -> Self {
        AppError::DatabaseMigration(err)
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
            AppError::DatabaseNoMemory(file) => {
                write!(
                    f,
                    "Cannot write to the database file \"{file}\". System is out of memory."
                )
            }
            AppError::DatabaseReadOnly(file) => {
                write!(
                    f,
                    "Cannot write to the database file \"{file}\". Please check file permissions."
                )
            }
            AppError::PortAlreadyInUse(port) => {
                write!(f, "Port {port} is in use. Is Abacus already running?")
            }
            AppError::StdError(e) => write!(f, "{}", e),
        }
    }
}
