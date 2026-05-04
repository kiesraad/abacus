use argon2::password_hash;
use axum::http::StatusCode;
use tracing::error;

use crate::error::{ApiErrorResponse, ErrorReference, ErrorResponse, error_response};

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
                error_response(
                    "Invalid username and/or password",
                    ErrorReference::InvalidUsernameOrPassword,
                    false,
                ),
            ),
            AuthenticationError::UsernameAlreadyExists => (
                StatusCode::CONFLICT,
                error_response(
                    "Username already exists",
                    ErrorReference::UsernameNotUnique,
                    false,
                ),
            ),
            AuthenticationError::NotInitialised => (
                StatusCode::IM_A_TEAPOT,
                error_response(
                    "Application not initialised",
                    ErrorReference::NotInitialised,
                    false,
                ),
            ),
            AuthenticationError::AlreadyInitialised => (
                StatusCode::FORBIDDEN,
                error_response(
                    "Application already initialised",
                    ErrorReference::AlreadyInitialised,
                    false,
                ),
            ),
            AuthenticationError::UserNotFound => (
                StatusCode::UNAUTHORIZED,
                error_response("User not found", ErrorReference::UserNotFound, false),
            ),
            AuthenticationError::UserAlreadySetup => (
                StatusCode::CONFLICT,
                error_response("Invalid user state", ErrorReference::Forbidden, false),
            ),
            AuthenticationError::InvalidPassword => (
                StatusCode::UNAUTHORIZED,
                error_response(
                    "Invalid password provided",
                    ErrorReference::InvalidPassword,
                    false,
                ),
            ),
            AuthenticationError::SessionKeyNotFound | AuthenticationError::NoSessionCookie => (
                StatusCode::UNAUTHORIZED,
                error_response("Invalid session", ErrorReference::InvalidSession, false),
            ),
            AuthenticationError::Unauthorized | AuthenticationError::Unauthenticated => (
                StatusCode::UNAUTHORIZED,
                error_response("Unauthorized", ErrorReference::Unauthorized, false),
            ),
            AuthenticationError::Forbidden => (
                StatusCode::FORBIDDEN,
                error_response("Forbidden", ErrorReference::Forbidden, true),
            ),
            AuthenticationError::PasswordRejectionSameAsOld => (
                StatusCode::BAD_REQUEST,
                error_response(
                    "Invalid password",
                    ErrorReference::PasswordRejectionSameAsOld,
                    false,
                ),
            ),
            AuthenticationError::PasswordRejectionSameAsUsername => (
                StatusCode::BAD_REQUEST,
                error_response(
                    "Invalid password",
                    ErrorReference::PasswordRejectionSameAsUsername,
                    false,
                ),
            ),
            AuthenticationError::PasswordRejectionTooShort => (
                StatusCode::BAD_REQUEST,
                error_response(
                    "Invalid password",
                    ErrorReference::PasswordRejectionTooShort,
                    false,
                ),
            ),
            AuthenticationError::RoleNotAuthorizedError => (
                StatusCode::FORBIDDEN,
                error_response("Invalid role", ErrorReference::Forbidden, true),
            ),
            AuthenticationError::OwnAccountCannotBeDeleted => (
                StatusCode::FORBIDDEN,
                error_response(
                    "Cannot delete your own account",
                    ErrorReference::OwnAccountCannotBeDeleted,
                    false,
                ),
            ),
            AuthenticationError::Database(_)
            | AuthenticationError::HashPassword(_)
            | AuthenticationError::InvalidSessionDuration => (
                StatusCode::INTERNAL_SERVER_ERROR,
                error_response(
                    "Internal server error",
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
