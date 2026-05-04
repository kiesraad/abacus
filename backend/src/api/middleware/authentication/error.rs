use argon2::password_hash;
use axum::http::StatusCode;
use tracing::error;

use crate::error::{ApiErrorResponse, ErrorReference, ErrorResponse};

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
    PasswordRejectionSameAsOld,
    PasswordRejectionSameAsUsername,
    PasswordRejectionTooShort,
    RoleNotAuthorizedError,
    SessionKeyNotFound,
    Unauthenticated,
    Unauthorized,
    UserAlreadySetup,
    UsernameAlreadyExists,
    UserNotFound,
}

impl ApiErrorResponse for AuthenticationError {
    fn log(&self) {
        // note that we don't log the UserNotFound error, as it is triggered for every account call
        if !matches!(self, Self::UserNotFound) {
            error!("Authentication error: {:?}", self);
        }
    }

    #[allow(clippy::too_many_lines)]
    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            AuthenticationError::InvalidUsernameOrPassword => (
                StatusCode::UNAUTHORIZED,
                ErrorResponse::new(
                    String::from("Invalid username and/or password"),
                    ErrorReference::InvalidUsernameOrPassword,
                    false,
                ),
            ),
            AuthenticationError::UsernameAlreadyExists => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    String::from("Username already exists"),
                    ErrorReference::UsernameNotUnique,
                    false,
                ),
            ),
            AuthenticationError::NotInitialised => (
                StatusCode::IM_A_TEAPOT,
                ErrorResponse::new(
                    String::from("Application not initialised"),
                    ErrorReference::NotInitialised,
                    false,
                ),
            ),
            AuthenticationError::AlreadyInitialised => (
                StatusCode::FORBIDDEN,
                ErrorResponse::new(
                    String::from("Application already initialised"),
                    ErrorReference::AlreadyInitialised,
                    false,
                ),
            ),
            AuthenticationError::UserNotFound => (
                StatusCode::UNAUTHORIZED,
                ErrorResponse::new(
                    String::from("User not found"),
                    ErrorReference::UserNotFound,
                    false,
                ),
            ),
            AuthenticationError::UserAlreadySetup => (
                StatusCode::CONFLICT,
                ErrorResponse::new(
                    String::from("Invalid user state"),
                    ErrorReference::Forbidden,
                    false,
                ),
            ),
            AuthenticationError::InvalidPassword => (
                StatusCode::UNAUTHORIZED,
                ErrorResponse::new(
                    String::from("Invalid password provided"),
                    ErrorReference::InvalidPassword,
                    false,
                ),
            ),
            AuthenticationError::SessionKeyNotFound | AuthenticationError::NoSessionCookie => (
                StatusCode::UNAUTHORIZED,
                ErrorResponse::new(
                    String::from("Invalid session"),
                    ErrorReference::InvalidSession,
                    false,
                ),
            ),
            AuthenticationError::Unauthorized | AuthenticationError::Unauthenticated => (
                StatusCode::UNAUTHORIZED,
                ErrorResponse::new(
                    String::from("Unauthorized"),
                    ErrorReference::Unauthorized,
                    false,
                ),
            ),
            AuthenticationError::Forbidden => (
                StatusCode::FORBIDDEN,
                ErrorResponse::new(String::from("Forbidden"), ErrorReference::Forbidden, true),
            ),
            AuthenticationError::PasswordRejectionSameAsOld => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new(
                    String::from("Invalid password"),
                    ErrorReference::PasswordRejectionSameAsOld,
                    false,
                ),
            ),
            AuthenticationError::PasswordRejectionSameAsUsername => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new(
                    String::from("Invalid password"),
                    ErrorReference::PasswordRejectionSameAsUsername,
                    false,
                ),
            ),
            AuthenticationError::PasswordRejectionTooShort => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new(
                    String::from("Invalid password"),
                    ErrorReference::PasswordRejectionTooShort,
                    false,
                ),
            ),
            AuthenticationError::RoleNotAuthorizedError => (
                StatusCode::FORBIDDEN,
                ErrorResponse::new(
                    String::from("Invalid role"),
                    ErrorReference::Forbidden,
                    true,
                ),
            ),
            AuthenticationError::OwnAccountCannotBeDeleted => (
                StatusCode::FORBIDDEN,
                ErrorResponse::new(
                    String::from("Cannot delete your own account"),
                    ErrorReference::OwnAccountCannotBeDeleted,
                    false,
                ),
            ),
            AuthenticationError::Database(_)
            | AuthenticationError::HashPassword(_)
            | AuthenticationError::InvalidSessionDuration => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(
                    String::from("Internal server error"),
                    ErrorReference::InternalServerError,
                    false,
                ),
            ),
        }
    }
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
