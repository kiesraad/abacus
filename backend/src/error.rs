use axum::{
    Json,
    extract::rejection::JsonRejection,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use hyper::header::InvalidHeaderValue;
use quick_xml::SeError;
use serde::{Deserialize, Serialize};
use sqlx::Error::RowNotFound;
use std::error::Error;
use tracing::error;
use utoipa::ToSchema;
use zip::result::ZipError;

use crate::{
    apportionment::ApportionmentError,
    authentication::error::AuthenticationError,
    data_entry::{DataError, status::DataEntryTransitionError},
    pdf_gen::PdfGenError,
};

/// Error reference used to show the corresponding error message to the end-user
#[derive(Serialize, Deserialize, Clone, Copy, ToSchema, PartialEq, Eq, Debug)]
pub enum ErrorReference {
    AllListsExhausted,
    ApportionmentNotAvailableUntilDataEntryFinalised,
    DatabaseError,
    DrawingOfLotsRequired,
    EntryNotFound,
    EntryNotUnique,
    EntryNumberNotSupported,
    InternalServerError,
    InvalidData,
    InvalidDataEntryNumber,
    InvalidJson,
    InvalidPassword,
    InvalidPoliticalGroup,
    InvalidSession,
    InvalidStateTransition,
    InvalidUsernameOrPassword,
    InvalidVoteCandidate,
    InvalidVoteGroup,
    PdfGenerationError,
    PollingStationDataValidation,
    PollingStationFirstEntryAlreadyFinalised,
    PollingStationFirstEntryNotFinalised,
    PollingStationRepeated,
    PollingStationResultsAlreadyFinalised,
    PollingStationSecondEntryAlreadyFinalised,
    PollingStationValidationErrors,
    UserNotFound,
    UsernameNotUnique,
    Unauthorized,
    PasswordRejection,
}

/// Response structure for errors
#[derive(Serialize, Deserialize, Clone, ToSchema, Debug)]
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
    BadRequest(String, ErrorReference),
    NotFound(String, ErrorReference),
    Conflict(String, ErrorReference),
    InvalidData(DataError),
    JsonRejection(JsonRejection),
    SerdeJsonError(serde_json::Error),
    SqlxError(sqlx::Error),
    InvalidHeaderValue,
    PdfGenError(PdfGenError),
    StdError(Box<dyn Error>),
    AddError(String, ErrorReference),
    XmlError(SeError),
    Authentication(AuthenticationError),
    ZipError(ZipError),
    Apportionment(ApportionmentError),
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
            APIError::BadRequest(message, reference) => {
                (StatusCode::BAD_REQUEST, to_error(&message, reference, true))
            }
            APIError::NotFound(message, reference) => {
                (StatusCode::NOT_FOUND, to_error(&message, reference, true))
            }
            APIError::Conflict(message, reference) => {
                (StatusCode::CONFLICT, to_error(&message, reference, false))
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
                    AuthenticationError::Unauthorized => (
                        StatusCode::UNAUTHORIZED,
                        to_error("Unauthorized", ErrorReference::Unauthorized, false),
                    ),
                    AuthenticationError::PasswordRejection => (
                        StatusCode::BAD_REQUEST,
                        to_error("Invalid password", ErrorReference::PasswordRejection, false),
                    ),
                    // server errors
                    AuthenticationError::Database(_)
                    | AuthenticationError::HashPassword(_)
                    | AuthenticationError::BackwardTimeTravel
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
            APIError::Apportionment(err) => {
                error!("Apportionment error: {:?}", err);

                match err {
                    ApportionmentError::AllListsExhausted => (
                        StatusCode::UNPROCESSABLE_ENTITY,
                        to_error(
                            "All lists are exhausted, not enough candidates to fill all seats",
                            ErrorReference::AllListsExhausted,
                            false,
                        ),
                    ),
                    ApportionmentError::ApportionmentNotAvailableUntilDataEntryFinalised => (
                        StatusCode::PRECONDITION_FAILED,
                        to_error(
                            "Election data entry first needs to be finalised",
                            ErrorReference::ApportionmentNotAvailableUntilDataEntryFinalised,
                            false,
                        ),
                    ),
                    ApportionmentError::DrawingOfLotsNotImplemented => (
                        StatusCode::UNPROCESSABLE_ENTITY,
                        to_error(
                            "Drawing of lots is required",
                            ErrorReference::DrawingOfLotsRequired,
                            false,
                        ),
                    ),
                }
            }
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

impl From<DataError> for APIError {
    fn from(err: DataError) -> Self {
        APIError::InvalidData(err)
    }
}

impl From<InvalidHeaderValue> for APIError {
    fn from(_: InvalidHeaderValue) -> Self {
        APIError::InvalidHeaderValue
    }
}

impl From<SeError> for APIError {
    fn from(err: SeError) -> Self {
        APIError::XmlError(err)
    }
}

impl From<DataEntryTransitionError> for APIError {
    fn from(err: DataEntryTransitionError) -> Self {
        Self::Conflict(err.to_string(), ErrorReference::InvalidStateTransition)
    }
}

impl From<AuthenticationError> for APIError {
    fn from(err: AuthenticationError) -> Self {
        APIError::Authentication(err)
    }
}

impl From<ZipError> for APIError {
    fn from(err: ZipError) -> Self {
        APIError::ZipError(err)
    }
}

impl From<ApportionmentError> for APIError {
    fn from(err: ApportionmentError) -> Self {
        APIError::Apportionment(err)
    }
}

impl From<Box<dyn Error>> for APIError {
    fn from(err: Box<dyn Error>) -> Self {
        APIError::StdError(err)
    }
}

#[derive(Debug, Serialize)]
pub struct JsonResponse<T>(T);

impl<T: Serialize> IntoResponse for JsonResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}
