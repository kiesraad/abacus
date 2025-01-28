#[derive(Debug)]
pub enum AuthenticationError {
    UserNotFound,
    InvalidUsernameOrPassword,
    InvalidPassword,
    InvalidSessionDuration,
    SessionKeyNotFound,
    NoSessionCookie,
    Database(sqlx::Error),
    HashPassword(password_hash::Error),
    BackwardTimeTravel,
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
