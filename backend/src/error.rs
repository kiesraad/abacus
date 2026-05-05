use std::error::Error;

use axum::{
    Json,
    extract::rejection::JsonRejection,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use eml_nl::EMLError;
use hyper::header::InvalidHeaderValue;
use pdf_gen::{PdfGenError, zip::ZipResponseError};
use quick_xml::{DeError, SeError};
use serde::{Deserialize, Serialize};
use tracing::error;
use utoipa::ToSchema;

use crate::{
    MAX_BODY_SIZE_MB,
    api::middleware::authentication::error::AuthenticationError,
    domain::{
        committee_session::CommitteeSessionError, role::RoleNotAuthorizedError, validate::DataError,
    },
    eml::EMLImportError,
    repository::polling_station_repo,
    service::{DataEntryServiceError, PollingStationServiceError, SubCommitteeServiceError},
};

/// Trait for error types that can be converted to HTTP response parts
pub trait ApiErrorResponse: std::fmt::Debug {
    /// Returns the HTTP status code and error response body for this error
    fn to_response_parts(&self) -> (StatusCode, ErrorResponse);

    /// Emit tracing logs for this error. Default implementation is a no-op.
    fn log(&self) {}
}

/// Error reference used to show the corresponding error message to the end-user
#[derive(Serialize, Deserialize, Clone, Copy, ToSchema, PartialEq, Eq, Debug)]
#[serde(deny_unknown_fields)]
pub enum ErrorReference {
    AirgapViolation,
    AlreadyInitialised,
    ApportionmentAllListsExhausted,
    ApportionmentCommitteeSessionNotCompleted,
    ApportionmentDrawingOfLotsRequired,
    ApportionmentZeroVotesCast,
    CommitteeSessionPaused,
    DatabaseError,
    DataEntryAlreadyClaimed,
    DataEntryAlreadyFinalised,
    DataEntryCannotBeDeleted,
    DataEntryGetNotAllowed,
    DataEntryNotAllowed,
    EmlImportError,
    EmlError,
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
    InvalidDataEntrySource,
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
    PasswordRejectionSameAsOld,
    PasswordRejectionSameAsUsername,
    PasswordRejectionTooShort,
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

impl ErrorResponse {
    pub fn new(error: impl ToString, reference: ErrorReference, fatal: bool) -> Self {
        Self {
            error: error.to_string(),
            reference,
            fatal,
        }
    }
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
    BadRequest(String, ErrorReference),
    Conflict(String, ErrorReference),
    Delegated(Box<dyn ApiErrorResponse>),
    ContentTooLarge(String, ErrorReference),
    DataIntegrityError(String),
    EmlImportError(EMLImportError),
    EmlError(EMLError),
    InvalidData(DataError),
    InvalidHeaderValue,
    InvalidHashError,
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

impl APIError {
    #[allow(clippy::too_many_lines)]
    #[allow(clippy::cognitive_complexity)]
    fn into_response_parts(self) -> (StatusCode, ErrorResponse) {
        match self {
            APIError::Delegated(err) => {
                err.log();
                err.to_response_parts()
            }
            APIError::AirgapViolation(message) => (
                StatusCode::SERVICE_UNAVAILABLE,
                ErrorResponse::new(message, ErrorReference::AirgapViolation, true),
            ),
            APIError::BadRequest(message, reference) => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new(message, reference, true),
            ),
            APIError::ContentTooLarge(message, reference) => (
                StatusCode::PAYLOAD_TOO_LARGE,
                ErrorResponse::new(message, reference, false),
            ),
            APIError::NotFound(message, reference) => (
                StatusCode::NOT_FOUND,
                ErrorResponse::new(message, reference, true),
            ),
            APIError::Conflict(message, reference) => (
                StatusCode::CONFLICT,
                ErrorResponse::new(message, reference, false),
            ),
            APIError::DataIntegrityError(message) => {
                error!("Data integrity error: {}", message);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse::new(
                        "Internal server error",
                        ErrorReference::DatabaseError,
                        true,
                    ),
                )
            }
            APIError::InvalidData(err) => {
                error!("Invalid data error: {}", err);
                (
                    StatusCode::UNPROCESSABLE_ENTITY,
                    ErrorResponse::new("Invalid data", ErrorReference::InvalidData, false),
                )
            }
            APIError::JsonRejection(rejection) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorResponse::new(rejection.body_text(), ErrorReference::InvalidJson, true),
            ),
            APIError::SerdeJsonError(err) => {
                error!("Serde JSON error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse::new("Internal server error", ErrorReference::InvalidJson, true),
                )
            }
            APIError::SqlxError(sqlx::Error::RowNotFound) => (
                StatusCode::NOT_FOUND,
                ErrorResponse::new("Resource not found", ErrorReference::EntryNotFound, true),
            ),
            APIError::SqlxError(err) => {
                error!("SQLx error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse::new(
                        "Internal server error",
                        ErrorReference::DatabaseError,
                        true,
                    ),
                )
            }
            APIError::InvalidHeaderValue => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(
                    "Internal server error",
                    ErrorReference::InternalServerError,
                    true,
                ),
            ),
            APIError::PdfGenError(err) => {
                error!("Pdf generation error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse::new(
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
                    ErrorResponse::new(
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
                    ErrorResponse::new("Internal server error", reference, false),
                )
            }
            APIError::InvalidHashError => {
                error!("Invalid hash");
                (
                    StatusCode::BAD_REQUEST,
                    ErrorResponse::new("Invalid hash", ErrorReference::InvalidHash, false),
                )
            }
            APIError::XmlError(err) => {
                error!("Could not serialize XML: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse::new(
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
                    ErrorResponse::new("Invalid XML", ErrorReference::InvalidXml, false),
                )
            }
            APIError::ZipError(err) => {
                error!("Error with zip file: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ErrorResponse::new(
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
                    ErrorResponse::new("EML import error", ErrorReference::EmlImportError, false),
                )
            }
            APIError::EmlError(err) => {
                error!("Error with EML file: {:?}", err);
                (
                    StatusCode::BAD_REQUEST,
                    ErrorResponse::new("EML error", ErrorReference::EmlError, false),
                )
            }
        }
    }
}

impl IntoResponse for APIError {
    fn into_response(self) -> Response {
        let (status, body) = self.into_response_parts();
        let mut response = (status, body.clone()).into_response();
        response.extensions_mut().insert(body);
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
            sqlx::Error::RowNotFound => {
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

impl From<CommitteeSessionError> for APIError {
    fn from(err: CommitteeSessionError) -> Self {
        APIError::Delegated(Box::new(err))
    }
}

impl From<DataEntryServiceError> for APIError {
    fn from(err: DataEntryServiceError) -> Self {
        match err {
            DataEntryServiceError::DatabaseError(e) => e.into(),
            DataEntryServiceError::DataEntryAlreadyLinked => {
                APIError::DataIntegrityError(String::from("Data entry is already linked"))
            }
        }
    }
}

impl From<PollingStationServiceError> for APIError {
    fn from(err: PollingStationServiceError) -> Self {
        match err {
            PollingStationServiceError::DatabaseError(e) => e.into(),
        }
    }
}

impl From<RoleNotAuthorizedError> for APIError {
    fn from(_: RoleNotAuthorizedError) -> Self {
        AuthenticationError::RoleNotAuthorizedError.into()
    }
}

impl From<SubCommitteeServiceError> for APIError {
    fn from(err: SubCommitteeServiceError) -> Self {
        match err {
            SubCommitteeServiceError::DatabaseError(e) => e.into(),
        }
    }
}

impl From<polling_station_repo::CreateDataEntryError> for APIError {
    fn from(err: polling_station_repo::CreateDataEntryError) -> Self {
        match err {
            polling_station_repo::CreateDataEntryError::Sqlx(e) => e.into(),
            polling_station_repo::CreateDataEntryError::DataEntryAlreadyLinked => {
                APIError::DataIntegrityError(String::from("Data entry is already linked"))
            }
        }
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
