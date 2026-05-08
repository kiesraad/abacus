use axum::http::StatusCode;
use tracing::error;

use crate::error::{ApiErrorResponse, ErrorReference, ErrorResponse};

/// Error type for models
#[derive(Debug)]
pub enum ModelsError {
    /// Data integrity violation in models
    DataIntegrityError(String),
}

impl ApiErrorResponse for ModelsError {
    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            ModelsError::DataIntegrityError(_message) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(
                    "Internal server error",
                    ErrorReference::InternalServerError,
                    true,
                ),
            ),
        }
    }

    fn log(&self) {
        match self {
            ModelsError::DataIntegrityError(message) => {
                error!("Models data integrity error: {}", message);
            }
        }
    }
}
