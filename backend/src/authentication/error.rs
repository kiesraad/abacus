#[derive(Debug)]
pub enum AuthenticationError {
    AlreadyInitialised,
    Database(sqlx::Error),
    Forbidden,
    HashPassword(password_hash::Error),
    InvalidPassword,
    InvalidSessionDuration,
    InvalidUsernameOrPassword,
    NoSessionCookie,
    NotInitialised,
    OwnAccountCannotBeDeleted,
    PasswordRejection,
    SessionKeyNotFound,
    Unauthenticated,
    Unauthorized,
    UsernameAlreadyExists,
    UserNotFound,
}

impl From<password_hash::Error> for AuthenticationError {
    fn from(err: password_hash::Error) -> Self {
        AuthenticationError::HashPassword(err)
    }
}

impl From<sqlx::Error> for AuthenticationError {
    fn from(err: sqlx::Error) -> Self {
        AuthenticationError::Database(err)
    }
}
