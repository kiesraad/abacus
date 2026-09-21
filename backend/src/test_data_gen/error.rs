use std::fmt::{Display, Formatter};

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use tracing::error;

use crate::{AppError, ErrorResponse, error::ErrorReference, service::SubCommitteeServiceError};

#[derive(Debug)]
pub enum GenerateError {
    DatabaseError(sqlx::Error),
    UnsupportedError(String),
}

impl std::error::Error for GenerateError {}

impl Display for GenerateError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            GenerateError::DatabaseError(e) => write!(f, "{}", e),
            GenerateError::UnsupportedError(e) => write!(f, "{}", e),
        }
    }
}

impl GenerateError {
    pub(crate) fn unsupported(msg: impl Into<String>) -> Self {
        Self::UnsupportedError(msg.into())
    }
}

impl From<sqlx::Error> for GenerateError {
    fn from(err: sqlx::Error) -> Self {
        GenerateError::DatabaseError(err)
    }
}

impl From<SubCommitteeServiceError> for GenerateError {
    fn from(err: SubCommitteeServiceError) -> Self {
        match err {
            SubCommitteeServiceError::DatabaseError(e) => GenerateError::DatabaseError(e),
        }
    }
}

// For binary
impl From<GenerateError> for AppError {
    fn from(err: GenerateError) -> Self {
        match err {
            GenerateError::DatabaseError(e) => AppError::Database(e),
            GenerateError::UnsupportedError(msg) => AppError::StdError(msg),
        }
    }
}

// For API endpoint
impl IntoResponse for GenerateError {
    fn into_response(self) -> Response {
        let error = self.to_string();
        error!("GenerateError: {error}");

        let body = ErrorResponse::new(error, ErrorReference::InternalServerError, true);
        let mut response = (StatusCode::INTERNAL_SERVER_ERROR, body.clone()).into_response();
        response.extensions_mut().insert(body);
        response
    }
}
