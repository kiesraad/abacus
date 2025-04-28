use crate::APIError;

#[derive(Debug)]
pub enum AuthenticationError {
    UserNotFound,
    InvalidUsernameOrPassword,
    InvalidPassword,
    InvalidSessionDuration,
    UsernameAlreadyExists,
    SessionKeyNotFound,
    NoSessionCookie,
    Database(sqlx::Error),
    HashPassword(password_hash::Error),
    Unauthorized,
    Unauthenticated,
    PasswordRejection,
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

impl From<AuthenticationError> for APIError {
    fn from(err: AuthenticationError) -> Self {
        APIError::Authentication(err)
    }
}
