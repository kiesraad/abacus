use std::{any::Any, error::Error, fmt::Debug};

use axum::{
    Json,
    extract::{
        multipart::{MultipartError, MultipartRejection},
        rejection::JsonRejection,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
};
use eml_nl::EMLError;
use hyper::header::InvalidHeaderValue;
use pdf_gen::{PdfGenError, zip::ZipResponseError};
use serde::{Deserialize, Serialize};
use tracing::{error, warn};
use utoipa::ToSchema;

use crate::{
    MAX_BODY_SIZE_MB,
    api::{
        election::handlers::data_entry_import::DataEntryImportError,
        middleware::authentication::error::AuthenticationError,
    },
    domain::{
        election::InvalidElectionError, results::IncorrectResultsModel,
        role::RoleNotAuthorizedError, validate::DataError,
    },
    eml::EMLImportError,
    infra::backup::BackupError,
    repository::common as common_repo,
    service::{SigningServiceError, SubCommitteeServiceError},
};

/// Trait for error types that can be converted to HTTP response parts
pub trait ApiErrorResponse: Debug + Any {
    /// Returns the HTTP status code and error response body for this error
    fn to_response_parts(&self) -> (StatusCode, ErrorResponse);

    /// Emit tracing logs for this error. The default implementation logs the
    /// response message and reference: `error!` for 5xx, `warn!` otherwise.
    fn log(&self) {
        let (status, response) = self.to_response_parts();
        log_error_response(status, &response, self);
    }
}

/// Error reference used to show the corresponding error message to the end-user
#[derive(Serialize, Deserialize, Clone, Copy, ToSchema, PartialEq, Eq, Debug)]
#[serde(deny_unknown_fields)]
pub enum ErrorReference {
    AirgapViolation,
    AlreadyInitialised,
    BackupAlreadyExists,
    ApportionmentNotCompleted,
    ApportionmentCommitteeSessionNotCompleted,
    ApportionmentInvalidLotDrawing,
    CertificateAlreadyAdded,
    CertificateUnknownSubCommittee,
    CertificateWrongElection,
    CommitteeSessionPaused,
    DatabaseError,
    DataEntryAlreadyClaimed,
    DataEntryAlreadyImported,
    DataEntryAlreadyFinalised,
    DataEntryCannotBeReset,
    DataEntryGetNotAllowed,
    DataEntryNotAllowed,
    DataEntryValidationErrors,
    ElectionMismatch,
    EmlImportError,
    EmlError,
    EntryNotFound,
    EntryNotUnique,
    Forbidden,
    InternalServerError,
    InvalidApportionmentState,
    InvalidCertificate,
    InvalidCommitteeSessionStatus,
    InvalidCountType,
    InvalidData,
    InvalidDistrict,
    InvalidFullname,
    InvalidHash,
    InvalidJson,
    InvalidPassword,
    InvalidPoliticalGroup,
    InvalidDataEntrySource,
    InvalidSession,
    InvalidStateTransition,
    InvalidUsername,
    InvalidUsernameOrPassword,
    InvalidVoteCandidate,
    InvalidVoteGroup,
    InvestigationHasDataEntryOrResult,
    InvestigationRequiresCorrectedResults,
    LoginRateLimited,
    NotInitialised,
    OwnAccountCannotBeDeleted,
    PasswordRejectionSameAsOld,
    PasswordRejectionSameAsUsername,
    PasswordRejectionTooShort,
    PdfGenerationError,
    PollingStationRepeated,
    RequestPayloadTooLarge,
    SignatureMissing,
    SignatureUnknown,
    SubCommitteeHasNoCertificates,
    Unauthorized,
    UnknownCommittee,
    UsernameNotUnique,
    UserNotFound,
    ZipError,
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
    pub fn new(error: impl Into<String>, reference: ErrorReference, fatal: bool) -> Self {
        Self {
            error: error.into(),
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
    SigningError(String),
    SqlxError(sqlx::Error),
    StdError(Box<dyn Error>),
    Unprocessable(String, ErrorReference),
    ZipError(ZipResponseError),
}

impl APIError {
    #[expect(clippy::too_many_lines)]
    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            APIError::Delegated(err) => err.to_response_parts(),
            APIError::AirgapViolation(message) => (
                StatusCode::SERVICE_UNAVAILABLE,
                ErrorResponse::new(message, ErrorReference::AirgapViolation, true),
            ),
            APIError::BadRequest(message, reference) => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new(message, *reference, true),
            ),
            APIError::ContentTooLarge(message, reference) => (
                StatusCode::PAYLOAD_TOO_LARGE,
                ErrorResponse::new(message, *reference, false),
            ),
            APIError::NotFound(message, reference) => (
                StatusCode::NOT_FOUND,
                ErrorResponse::new(message, *reference, true),
            ),
            APIError::Conflict(message, reference) => (
                StatusCode::CONFLICT,
                ErrorResponse::new(message, *reference, false),
            ),
            APIError::Unprocessable(message, reference) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorResponse::new(message, *reference, false),
            ),
            APIError::DataIntegrityError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new("Internal server error", ErrorReference::DatabaseError, true),
            ),
            APIError::InvalidData(_) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorResponse::new("Invalid data", ErrorReference::InvalidData, false),
            ),
            APIError::JsonRejection(rejection) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                ErrorResponse::new(rejection.body_text(), ErrorReference::InvalidJson, true),
            ),
            APIError::SerdeJsonError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new("Internal server error", ErrorReference::InvalidJson, true),
            ),
            APIError::SigningError(msg) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(msg, ErrorReference::InternalServerError, true),
            ),
            APIError::SqlxError(sqlx::Error::RowNotFound) => (
                StatusCode::NOT_FOUND,
                ErrorResponse::new("Resource not found", ErrorReference::EntryNotFound, true),
            ),
            APIError::SqlxError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new("Internal server error", ErrorReference::DatabaseError, true),
            ),
            APIError::InvalidHeaderValue | APIError::StdError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(
                    "Internal server error",
                    ErrorReference::InternalServerError,
                    true,
                ),
            ),
            APIError::PdfGenError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(
                    "Internal server error",
                    ErrorReference::PdfGenerationError,
                    false,
                ),
            ),
            APIError::AddError(_, reference) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new("Internal server error", *reference, false),
            ),
            APIError::InvalidHashError => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new("Invalid hash", ErrorReference::InvalidHash, false),
            ),
            APIError::ZipError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ErrorResponse::new(
                    "Internal server error",
                    ErrorReference::InternalServerError,
                    false,
                ),
            ),
            APIError::EmlImportError(err) => {
                let reference = match err {
                    EMLImportError::InvalidCountType => ErrorReference::InvalidCountType,
                    EMLImportError::InvalidDistrict => ErrorReference::InvalidDistrict,
                    EMLImportError::MismatchElection => ErrorReference::ElectionMismatch,
                    EMLImportError::UnknownCommittee => ErrorReference::UnknownCommittee,
                    _ => ErrorReference::EmlImportError,
                };
                (
                    StatusCode::BAD_REQUEST,
                    ErrorResponse::new("EML import error", reference, false),
                )
            }
            APIError::EmlError(_) => (
                StatusCode::BAD_REQUEST,
                ErrorResponse::new("EML error", ErrorReference::EmlError, false),
            ),
        }
    }
}

/// Log an error response once: `error!` for server errors (5xx), `warn!` for
/// everything else (4xx). The `Debug` output of the error is included.
fn log_error_response(status: StatusCode, response: &ErrorResponse, err: &(impl Debug + ?Sized)) {
    let ErrorResponse {
        error, reference, ..
    } = response;
    if status.is_server_error() {
        error!("API error {status}: {error} ({reference:?}): {err:?}");
    } else {
        warn!("API error {status}: {error} ({reference:?}): {err:?}");
    }
}

impl IntoResponse for APIError {
    fn into_response(self) -> Response {
        let (status, body) = self.to_response_parts();
        match &self {
            APIError::Delegated(err) => err.log(),
            _ => log_error_response(status, &body, &self),
        }
        let mut response = (status, body.clone()).into_response();
        response.extensions_mut().insert(body);
        response
    }
}

impl<T: ApiErrorResponse> From<T> for APIError {
    fn from(err: T) -> Self {
        APIError::Delegated(Box::new(err))
    }
}

impl From<JsonRejection> for APIError {
    fn from(rejection: JsonRejection) -> Self {
        APIError::JsonRejection(rejection)
    }
}

impl From<MultipartRejection> for APIError {
    fn from(rejection: MultipartRejection) -> Self {
        APIError::BadRequest(rejection.body_text(), ErrorReference::InvalidData)
    }
}

impl From<MultipartError> for APIError {
    fn from(err: MultipartError) -> Self {
        if err.status() == StatusCode::PAYLOAD_TOO_LARGE {
            APIError::ContentTooLarge(
                MAX_BODY_SIZE_MB.to_string(),
                ErrorReference::RequestPayloadTooLarge,
            )
        } else {
            APIError::BadRequest(
                format!("Invalid form data: {}", err.body_text()),
                ErrorReference::InvalidData,
            )
        }
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

impl From<BackupError> for APIError {
    fn from(err: BackupError) -> Self {
        match err {
            BackupError::AlreadyExists => APIError::Conflict(
                "A backup with this filename already exists".to_string(),
                ErrorReference::BackupAlreadyExists,
            ),
            BackupError::InvalidPath => {
                APIError::StdError(Box::new(std::io::Error::other("invalid backup path")))
            }
            BackupError::IntegrityCheckFailed(output) => APIError::StdError(Box::new(
                std::io::Error::other(format!("backup integrity check failed: {output}")),
            )),
            BackupError::Io(err) => APIError::StdError(Box::new(err)),
            BackupError::Database(err) => APIError::SqlxError(err),
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

impl From<DataEntryImportError> for APIError {
    fn from(err: DataEntryImportError) -> Self {
        match err {
            DataEntryImportError::EmlZipError(message) => {
                APIError::Unprocessable(message, ErrorReference::ZipError)
            }
            DataEntryImportError::InvalidCommitteeSessionStatus => APIError::Unprocessable(
                "Invalid committee session status".into(),
                ErrorReference::InvalidCommitteeSessionStatus,
            ),
            DataEntryImportError::SubCommitteeDataEntryAlreadyImported => APIError::Unprocessable(
                "Sub committee data entry already imported".into(),
                ErrorReference::DataEntryAlreadyImported,
            ),
            DataEntryImportError::SubCommitteeDataEntryNotEmpty => APIError::Unprocessable(
                "Sub committee data entry not empty".into(),
                ErrorReference::DataEntryNotAllowed,
            ),
            DataEntryImportError::ResultsHaveValidationErrors => APIError::Unprocessable(
                "Results have validation errors".into(),
                ErrorReference::DataEntryValidationErrors,
            ),
            DataEntryImportError::SignatureMissing => APIError::Unprocessable(
                "Signature matching EML missing".into(),
                ErrorReference::SignatureMissing,
            ),
            DataEntryImportError::SignatureUnknown => APIError::Unprocessable(
                "Signature does not match public key of subcommittee".into(),
                ErrorReference::SignatureUnknown,
            ),
            DataEntryImportError::SubCommitteeHasNoCertificates => APIError::Unprocessable(
                "Subcommittee does not have any certificates".into(),
                ErrorReference::SubCommitteeHasNoCertificates,
            ),
        }
    }
}

impl From<InvalidElectionError> for APIError {
    fn from(err: InvalidElectionError) -> Self {
        APIError::DataIntegrityError(err.0)
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

impl From<IncorrectResultsModel> for APIError {
    fn from(_: IncorrectResultsModel) -> Self {
        APIError::DataIntegrityError("Incorrect results model".to_string())
    }
}

impl From<common_repo::DatabaseError> for APIError {
    fn from(err: common_repo::DatabaseError) -> Self {
        match err {
            common_repo::DatabaseError::Sqlx(e) => e.into(),
            common_repo::DatabaseError::DataEntryAlreadyLinked => {
                APIError::DataIntegrityError(String::from("Data entry is already linked"))
            }
            common_repo::DatabaseError::InvestigationIntegrityError => {
                APIError::DataIntegrityError(String::from("Investigation integrity error"))
            }
        }
    }
}

impl From<SigningServiceError> for APIError {
    fn from(err: SigningServiceError) -> Self {
        match err {
            SigningServiceError::DatabaseError(e) => e.into(),
            SigningServiceError::JoinError(e) => APIError::StdError(Box::new(e)),
            SigningServiceError::InvalidElectionError(msg) => APIError::SigningError(msg),
            SigningServiceError::EmlSignatureError(msg) => APIError::SigningError(msg),
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

/// Assert that the `APIError::Delegated` contains the expected boxed `ApiErrorResponse`
#[cfg(test)]
pub fn assert_delegated<T: ApiErrorResponse + PartialEq>(api_error: APIError, expected: &T) {
    let APIError::Delegated(boxed) = api_error else {
        panic!("Unexpected APIError variant {api_error:?}");
    };

    let boxed_any: Box<dyn Any> = boxed;
    let actual = boxed_any
        .downcast_ref::<T>()
        .expect("should downcast to type T");

    assert_eq!(actual, expected);
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use tracing_subscriber::fmt::{MakeWriter, writer::MutexGuardWriter};

    use super::*;

    #[derive(Clone, Default)]
    struct CapturedLogs(Arc<Mutex<Vec<u8>>>);

    impl<'a> MakeWriter<'a> for CapturedLogs {
        type Writer = MutexGuardWriter<'a, Vec<u8>>;

        fn make_writer(&'a self) -> Self::Writer {
            self.0.make_writer()
        }
    }

    /// Convert the error into a response and return the emitted log output
    fn log_output(err: APIError) -> String {
        let logs = CapturedLogs::default();
        let subscriber = tracing_subscriber::fmt()
            .with_writer(logs.clone())
            .with_ansi(false)
            .without_time()
            .with_target(false)
            .finish();
        tracing::subscriber::with_default(subscriber, || err.into_response());
        let output =
            String::from_utf8(logs.0.lock().expect("lock poisoned").clone()).expect("valid utf-8");
        output.trim().to_owned()
    }

    #[test]
    fn client_error_is_logged_as_warning() {
        let output = log_output(APIError::Unprocessable(
            "Signature does not match public key of subcommittee".into(),
            ErrorReference::SignatureUnknown,
        ));
        assert_eq!(
            output,
            "WARN API error 422 Unprocessable Entity: Signature does not match public key of subcommittee (SignatureUnknown): Unprocessable(\"Signature does not match public key of subcommittee\", SignatureUnknown)"
        );
    }

    #[test]
    fn server_error_is_logged_as_error_with_details() {
        let output = log_output(APIError::SqlxError(sqlx::Error::PoolTimedOut));
        assert_eq!(
            output,
            "ERROR API error 500 Internal Server Error: Internal server error (DatabaseError): SqlxError(PoolTimedOut)"
        );
    }

    #[test]
    fn delegated_error_can_override_log() {
        let output = log_output(AuthenticationError::UserNotFound.into());
        assert!(output.is_empty(), "expected no log output, got {output:?}");
    }
}
