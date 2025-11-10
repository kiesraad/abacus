use std::error::Error;

use axum::{
    Json,
    extract::rejection::JsonRejection,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use hyper::header::InvalidHeaderValue;
use quick_xml::{DeError, SeError};
use serde::{Deserialize, Serialize};
use sqlx::Error::RowNotFound;
use tracing::error;
use utoipa::ToSchema;

use crate::{
    MAX_BODY_SIZE_MB, authentication::error::AuthenticationError,
    committee_session::CommitteeSessionError, data_entry::DataError, eml::EMLImportError,
    pdf_gen::PdfGenError, zip::ZipResponseError,
};

/// Error reference used to show the corresponding error message to the end-user
#[derive(Serialize, Deserialize, Clone, Copy, ToSchema, PartialEq, Eq, Debug)]
#[serde(deny_unknown_fields)]
pub enum ErrorReference {
    AirgapViolation,
    AlreadyInitialised,
    CommitteeSessionPaused,
    DatabaseError,
    DataEntryAlreadyClaimed,
    DataEntryAlreadyFinalised,
    DataEntryCannotBeDeleted,
    DataEntryGetNotAllowed,
    DataEntryNotAllowed,
    EmlImportError,
    EntryNotFound,
    EntryNotUnique,
    Forbidden,
    InternalServerError,
    InvalidCommitteeSessionStatus,
    InvalidData,
    InvalidHash,
    InvalidJson,
    InvalidPassword,
    InvalidPoliticalGroup,
    InvalidSession,
    InvalidStateTransition,
    InvalidUsernameOrPassword,
    InvalidVoteCandidate,
    InvalidVoteGroup,
    InvalidXml,
    InvestigationHasDataEntryOrResult,
    InvestigationRequiresCorrectedResults,
    NotInitialised,
    OwnAccountCannotBeDeleted,
    PasswordRejection,
    PdfGenerationError,
    PollingStationRepeated,
    PollingStationValidationErrors,
    RequestPayloadTooLarge,
    Unauthorized,
    UsernameNotUnique,
    UserNotFound,
}

/// Response structure for errors
#[derive(Serialize, Deserialize, Clone, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct ErrorResponse {
    pub error: String,
    pub fatal: bool,
    pub reference: ErrorReference,
}

impl IntoResponse for ErrorResponse {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Generic error type, converted to an ErrorResponse by the IntoResponse
/// trait implementation
#[derive(Debug)]
pub enum APIError {
    AddError(String, ErrorReference),
    AirgapViolation(String),
    Authentication(AuthenticationError),
    BadRequest(String, ErrorReference),
    CommitteeSession(CommitteeSessionError),
    Conflict(String, ErrorReference),
    ContentTooLarge(String, ErrorReference),
    DataIntegrityError(String),
    EmlImportError(EMLImportError),
    InvalidData(DataError),
    InvalidHeaderValue,
    InvalidHashError,
    InvalidResultsType,
    JsonRejection(JsonRejection),
    NotFound(String, ErrorReference),
    PdfGenError(PdfGenError),
    SerdeJsonError(serde_json::Error),
    SqlxError(sqlx::Error),
    StdError(Box<dyn Error>),
    XmlDeError(DeError),
    XmlError(SeError),
    ZipError(ZipResponseError),
}

impl IntoResponse for APIError {
    fn into_response(self) -> Response {
        fn to_error(error: &str, reference: ErrorReference, fatal: bool) -> ErrorResponse {
            ErrorResponse {
                error: error.to_string(),
                reference,
                fatal,
            }
        }

        let (status, error_response) = match self {
            APIError::AirgapViolation(message) => (
                StatusCode::SERVICE_UNAVAILABLE,
                to_error(&message, ErrorReference::AirgapViolation, true),
            ),
            APIError::BadRequest(message, reference) => {
                (StatusCode::BAD_REQUEST, to_error(&message, reference, true))
            }
            APIError::ContentTooLarge(max_size, reference) => (
                StatusCode::PAYLOAD_TOO_LARGE,
                to_error(&max_size, reference, false),
            ),
            APIError::NotFound(message, reference) => {
                (StatusCode::NOT_FOUND, to_error(&message, reference, true))
            }
            APIError::Conflict(message, reference) => {
                (StatusCode::CONFLICT, to_error(&message, reference, false))
            }
            APIError::DataIntegrityError(message) => {
                error!("Data integrity error: {}", message);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error", ErrorReference::DatabaseError, true),
                )
            }
            APIError::InvalidData(err) => {
                error!("Invalid data error: {}", err);
                (
                    StatusCode::UNPROCESSABLE_ENTITY,
                    to_error("Invalid data", ErrorReference::InvalidData, false),
                )
            }
            APIError::JsonRejection(rejection) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                to_error(&rejection.body_text(), ErrorReference::InvalidJson, true),
            ),
            APIError::SerdeJsonError(err) => {
                error!("Serde JSON error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error", ErrorReference::InvalidJson, true),
                )
            }
            APIError::SqlxError(RowNotFound) => (
                StatusCode::NOT_FOUND,
                to_error("Resource not found", ErrorReference::EntryNotFound, true),
            ),
            APIError::SqlxError(err) => {
                error!("SQLx error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error", ErrorReference::DatabaseError, true),
                )
            }
            APIError::InvalidHeaderValue => (
                StatusCode::INTERNAL_SERVER_ERROR,
                to_error(
                    "Internal server error",
                    ErrorReference::InternalServerError,
                    true,
                ),
            ),
            APIError::PdfGenError(err) => {
                error!("Pdf generation error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error(
                        "Internal server error",
                        ErrorReference::PdfGenerationError,
                        false,
                    ),
                )
            }
            APIError::StdError(err) => {
                error!("Error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error(
                        "Internal server error",
                        ErrorReference::InternalServerError,
                        true,
                    ),
                )
            }
            APIError::AddError(err, reference) => {
                error!("Error while adding totals: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error", reference, false),
                )
            }
            APIError::InvalidHashError => {
                error!("Invalid hash");
                (
                    StatusCode::BAD_REQUEST,
                    to_error("Invalid hash", ErrorReference::InvalidHash, false),
                )
            }
            APIError::XmlError(err) => {
                error!("Could not serialize XML: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error(
                        "Internal server error",
                        ErrorReference::InternalServerError,
                        false,
                    ),
                )
            }
            APIError::XmlDeError(err) => {
                error!("Could not deserialize XML: {:?}", err);
                (
                    StatusCode::BAD_REQUEST,
                    to_error("Invalid XML", ErrorReference::InvalidXml, false),
                )
            }
            APIError::Authentication(err) => {
                // note that we don't log the UserNotFound error, as it is triggered for every whoami call
                if !matches!(err, AuthenticationError::UserNotFound) {
                    error!("Authentication error: {:?}", err);
                }

                match err {
                    // client errors
                    AuthenticationError::InvalidUsernameOrPassword => (
                        StatusCode::UNAUTHORIZED,
                        to_error(
                            "Invalid username and/or password",
                            ErrorReference::InvalidUsernameOrPassword,
                            false,
                        ),
                    ),
                    AuthenticationError::UsernameAlreadyExists => (
                        StatusCode::CONFLICT,
                        to_error(
                            "Username already exists",
                            ErrorReference::UsernameNotUnique,
                            false,
                        ),
                    ),
                    AuthenticationError::NotInitialised => (
                        StatusCode::IM_A_TEAPOT,
                        to_error(
                            "Application not initialised",
                            ErrorReference::NotInitialised,
                            false,
                        ),
                    ),
                    AuthenticationError::AlreadyInitialised => (
                        StatusCode::FORBIDDEN,
                        to_error(
                            "Application already initialised",
                            ErrorReference::AlreadyInitialised,
                            false,
                        ),
                    ),
                    AuthenticationError::UserNotFound => (
                        StatusCode::UNAUTHORIZED,
                        to_error("User not found", ErrorReference::UserNotFound, false),
                    ),
                    AuthenticationError::InvalidPassword => (
                        StatusCode::UNAUTHORIZED,
                        to_error(
                            "Invalid password provided",
                            ErrorReference::InvalidPassword,
                            false,
                        ),
                    ),
                    AuthenticationError::SessionKeyNotFound
                    | AuthenticationError::NoSessionCookie => (
                        StatusCode::UNAUTHORIZED,
                        to_error("Invalid session", ErrorReference::InvalidSession, false),
                    ),
                    AuthenticationError::Unauthorized | AuthenticationError::Unauthenticated => (
                        StatusCode::UNAUTHORIZED,
                        to_error("Unauthorized", ErrorReference::Unauthorized, false),
                    ),
                    AuthenticationError::Forbidden => (
                        StatusCode::FORBIDDEN,
                        to_error("Forbidden", ErrorReference::Forbidden, true),
                    ),
                    AuthenticationError::PasswordRejection => (
                        StatusCode::BAD_REQUEST,
                        to_error("Invalid password", ErrorReference::PasswordRejection, false),
                    ),
                    AuthenticationError::OwnAccountCannotBeDeleted => (
                        StatusCode::FORBIDDEN,
                        to_error(
                            "Cannot delete your own account",
                            ErrorReference::OwnAccountCannotBeDeleted,
                            false,
                        ),
                    ),
                    // server errors
                    AuthenticationError::Database(_)
                    | AuthenticationError::HashPassword(_)
                    | AuthenticationError::InvalidSessionDuration => (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        to_error(
                            "Internal server error",
                            ErrorReference::InternalServerError,
                            false,
                        ),
                    ),
                }
            }
            APIError::ZipError(err) => {
                error!("Error with zip file: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error(
                        "Internal server error",
                        ErrorReference::InternalServerError,
                        false,
                    ),
                )
            }
            APIError::EmlImportError(err) => {
                error!("Error importing EML file: {:?}", err);
                (
                    StatusCode::BAD_REQUEST,
                    to_error("EML import error", ErrorReference::EmlImportError, false),
                )
            }
            APIError::CommitteeSession(err) => {
                error!("Committee session status error: {:?}", err);

                match err {
                    CommitteeSessionError::CommitteeSessionPaused => (
                        StatusCode::CONFLICT,
                        to_error(
                            "Committee session data entry is paused",
                            ErrorReference::CommitteeSessionPaused,
                            true,
                        ),
                    ),
                    CommitteeSessionError::InvalidCommitteeSessionStatus => (
                        StatusCode::CONFLICT,
                        to_error(
                            "Invalid committee session status",
                            ErrorReference::InvalidCommitteeSessionStatus,
                            true,
                        ),
                    ),
                    CommitteeSessionError::InvalidDetails => (
                        StatusCode::BAD_REQUEST,
                        to_error("Invalid details", ErrorReference::InvalidData, false),
                    ),
                    CommitteeSessionError::InvalidStatusTransition => (
                        StatusCode::CONFLICT,
                        to_error(
                            "Invalid committee session state transition",
                            ErrorReference::InvalidStateTransition,
                            true,
                        ),
                    ),
                }
            }
            APIError::InvalidResultsType => (
                StatusCode::BAD_REQUEST,
                to_error(
                    "Internal server error",
                    ErrorReference::InternalServerError,
                    true,
                ),
            ),
        };

        let mut response = (status, error_response.clone()).into_response();
        response.extensions_mut().insert(error_response);

        response
    }
}

impl From<JsonRejection> for APIError {
    fn from(rejection: JsonRejection) -> Self {
        APIError::JsonRejection(rejection)
    }
}

impl From<serde_json::Error> for APIError {
    fn from(err: serde_json::Error) -> Self {
        APIError::SerdeJsonError(err)
    }
}

impl From<PdfGenError> for APIError {
    fn from(err: PdfGenError) -> Self {
        APIError::PdfGenError(err)
    }
}

impl From<ZipResponseError> for APIError {
    fn from(err: ZipResponseError) -> Self {
        APIError::ZipError(err)
    }
}

impl From<sqlx::Error> for APIError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            RowNotFound => {
                APIError::NotFound("Item not found".to_string(), ErrorReference::EntryNotFound)
            }
            sqlx::Error::Database(db_error) => match db_error.kind() {
                sqlx::error::ErrorKind::UniqueViolation => APIError::Conflict(
                    "Item is not unique".to_string(),
                    ErrorReference::EntryNotUnique,
                ),
                sqlx::error::ErrorKind::ForeignKeyViolation => {
                    APIError::InvalidData(DataError::new("Invalid associated item"))
                }
                sqlx::error::ErrorKind::NotNullViolation => {
                    APIError::InvalidData(DataError::new("Missing field"))
                }
                _ => APIError::SqlxError(err),
            },
            _ => APIError::SqlxError(err),
        }
    }
}

impl From<InvalidHeaderValue> for APIError {
    fn from(_: InvalidHeaderValue) -> Self {
        APIError::InvalidHeaderValue
    }
}

impl From<Box<dyn Error>> for APIError {
    fn from(err: Box<dyn Error>) -> Self {
        APIError::StdError(err)
    }
}

/// Map common internal errors to user-friendly error messages
pub async fn map_error_response(response: Response) -> Response {
    if response.status() == StatusCode::PAYLOAD_TOO_LARGE {
        APIError::ContentTooLarge(
            MAX_BODY_SIZE_MB.to_string(),
            ErrorReference::RequestPayloadTooLarge,
        )
        .into_response()
    } else {
        response
    }
}
