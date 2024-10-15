use std::error::Error;

use crate::data_entry::DataError;
use axum::extract::rejection::JsonRejection;
use axum::extract::FromRef;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{delete, get, post};
use axum::{Json, Router};
use hyper::header::InvalidHeaderValue;
#[cfg(feature = "memory-serve")]
use memory_serve::MemoryServe;
use serde::{Deserialize, Serialize};
use sqlx::Error::RowNotFound;
use sqlx::SqlitePool;
use tracing::error;
use typst::diag::SourceDiagnostic;
use utoipa::ToSchema;
#[cfg(feature = "openapi")]
use utoipa_swagger_ui::SwaggerUi;

pub mod data_entry;
pub mod election;
#[cfg(feature = "dev-database")]
pub mod fixtures;
pub mod pdf_gen;
pub mod polling_station;
pub mod validation;

#[derive(FromRef, Clone)]
pub struct AppState {
    pool: SqlitePool,
}

/// Axum router for the application
pub fn router(pool: SqlitePool) -> Result<Router, Box<dyn Error>> {
    let data_entry_routes = Router::new()
        .route(
            "/:entry_number",
            post(data_entry::polling_station_data_entry_save),
        )
        .route(
            "/:entry_number",
            get(data_entry::polling_station_data_entry_get),
        )
        .route(
            "/:entry_number",
            delete(data_entry::polling_station_data_entry_delete),
        )
        .route(
            "/:entry_number/finalise",
            post(data_entry::polling_station_data_entry_finalise),
        );

    let election_routes = Router::new()
        .route("/", get(election::election_list))
        .route("/:election_id", get(election::election_details))
        .route(
            "/:election_id/download_results",
            get(election::election_download_results),
        )
        .route("/:election_id/status", get(election::election_status));

    let app = Router::new().nest("/api/elections", election_routes).nest(
        "/api/polling_stations/:polling_station_id/data_entries",
        data_entry_routes,
    );

    #[cfg(feature = "memory-serve")]
    let app = {
        app.merge(
            MemoryServe::new()
                .index_file(Some("/index.html"))
                .fallback(Some("/index.html"))
                .into_router(),
        )
    };

    // Add a route to reset the database if the dev-database feature is enabled
    #[cfg(feature = "dev-database")]
    let app = app.route("/reset", post(fixtures::reset_database));

    // Add the state to the app
    let state = AppState { pool };
    let app = app.with_state(state);

    // Only include the OpenAPI spec if the feature is enabled
    #[cfg(feature = "openapi")]
    let app = {
        let openapi = create_openapi();
        app.merge(SwaggerUi::new("/api-docs").url("/api-docs/openapi.json", openapi.clone()))
    };

    Ok(app)
}

#[cfg(feature = "openapi")]
pub fn create_openapi() -> utoipa::openapi::OpenApi {
    use utoipa::OpenApi;

    #[derive(OpenApi)]
    #[openapi(
        paths(
            election::election_list,
            election::election_details,
            election::election_status,
            election::election_download_results,
            data_entry::polling_station_data_entry_save,
            data_entry::polling_station_data_entry_get,
            data_entry::polling_station_data_entry_delete,
            data_entry::polling_station_data_entry_finalise,
        ),
        components(
            schemas(
                ErrorResponse,
                data_entry::CandidateVotes,
                data_entry::SaveDataEntryRequest,
                data_entry::SaveDataEntryResponse,
                data_entry::GetDataEntryResponse,
                data_entry::DifferencesCounts,
                data_entry::PoliticalGroupVotes,
                data_entry::PollingStationResults,
                data_entry::VotersCounts,
                data_entry::VotersRecounts,
                data_entry::VotesCounts,
                election::Election,
                election::ElectionCategory,
                election::PoliticalGroup,
                election::Candidate,
                election::CandidateGender,
                election::ElectionListResponse,
                election::ElectionDetailsResponse,
                election::ElectionStatusResponse,
                polling_station::PollingStationType,
                polling_station::PollingStationStatusEntry,
                polling_station::PollingStationStatus,
                polling_station::PollingStation,
                validation::ValidationResult,
                validation::ValidationResultCode,
                validation::ValidationResults,
            ),
        ),
        tags(
            (name = "election", description = "Election API"),
            (name = "polling_station", description = "Polling station API"),
        )
    )]
    struct ApiDoc;
    ApiDoc::openapi()
}

/// Response structure for errors
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ErrorResponse {
    pub error: String,
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
    NotFound(String),
    Conflict(String),
    InvalidData(DataError),
    JsonRejection(JsonRejection),
    SerdeJsonError(serde_json::Error),
    SqlxError(sqlx::Error),
    InvalidHeaderValue,
    PdfGenError(Vec<SourceDiagnostic>),
    StdError(Box<dyn Error>),
    AddError(String),
}

impl IntoResponse for APIError {
    fn into_response(self) -> Response {
        fn to_error(error: String) -> ErrorResponse {
            ErrorResponse { error }
        }

        let (status, response) = match self {
            APIError::NotFound(message) => (StatusCode::NOT_FOUND, to_error(message)),
            APIError::Conflict(message) => (StatusCode::CONFLICT, to_error(message)),
            APIError::InvalidData(err) => {
                error!("Invalid data error: {}", err);
                (
                    StatusCode::UNPROCESSABLE_ENTITY,
                    to_error("Invalid data".to_string()),
                )
            }
            APIError::JsonRejection(rejection) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                to_error(rejection.body_text()),
            ),
            APIError::SerdeJsonError(err) => {
                error!("Serde JSON error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error".to_string()),
                )
            }
            APIError::SqlxError(RowNotFound) => (
                StatusCode::NOT_FOUND,
                to_error("Resource not found".to_string()),
            ),
            APIError::SqlxError(err) => {
                error!("SQLx error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error".to_string()),
                )
            }
            APIError::InvalidHeaderValue => (
                StatusCode::INTERNAL_SERVER_ERROR,
                to_error("Internal server error".to_string()),
            ),
            APIError::PdfGenError(err) => {
                error!("PDF generation error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error".into()),
                )
            }
            APIError::StdError(err) => {
                error!("Error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error".to_string()),
                )
            }
            APIError::AddError(err) => {
                error!("Error while adding totals: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error".into()),
                )
            }
        };

        (status, response).into_response()
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
        APIError::SqlxError(err)
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
