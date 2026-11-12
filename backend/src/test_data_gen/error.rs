use std::fmt::{Display, Formatter};

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use tracing::error;

use crate::{
    AppError, ErrorResponse, error::ErrorReference, repository::common::DatabaseError,
    service::SubCommitteeServiceError,
};

#[derive(Debug)]
pub enum GenerateError {
    Database(sqlx::Error),
    DataIntegrity(String),
    Unsupported(String),
}

impl std::error::Error for GenerateError {}

impl Display for GenerateError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            GenerateError::Database(e) => write!(f, "{}", e),
            GenerateError::DataIntegrity(e) => write!(f, "{}", e),
            GenerateError::Unsupported(e) => write!(f, "{}", e),
        }
    }
}

impl GenerateError {
    pub(crate) fn unsupported(msg: impl Into<String>) -> Self {
        Self::Unsupported(msg.into())
    }
}

impl From<sqlx::Error> for GenerateError {
    fn from(err: sqlx::Error) -> Self {
        GenerateError::Database(err)
    }
}

impl From<DatabaseError> for GenerateError {
    fn from(err: DatabaseError) -> Self {
        match err {
            DatabaseError::Sqlx(e) => GenerateError::Database(e),
            DatabaseError::DataEntryAlreadyLinked => {
                GenerateError::DataIntegrity(String::from("Data entry already linked"))
            }
            DatabaseError::InvestigationIntegrityError => {
                GenerateError::DataIntegrity(String::from("Investigation integrity error"))
            }
        }
    }
}

impl From<SubCommitteeServiceError> for GenerateError {
    fn from(err: SubCommitteeServiceError) -> Self {
        match err {
            SubCommitteeServiceError::DatabaseError(e) => GenerateError::Database(e),
        }
    }
}

// For binary
impl From<GenerateError> for AppError {
    fn from(err: GenerateError) -> Self {
        match err {
            GenerateError::Database(e) => AppError::Database(e),
            GenerateError::DataIntegrity(msg) => AppError::DataIntegrity(msg),
            GenerateError::Unsupported(msg) => AppError::StdError(msg),
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
