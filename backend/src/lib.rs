use std::error::Error;

use crate::polling_station::DataError;
use axum::extract::rejection::JsonRejection;
use axum::extract::FromRef;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::Error::RowNotFound;
use sqlx::SqlitePool;
use utoipa::ToSchema;
#[cfg(feature = "openapi")]
use utoipa_swagger_ui::SwaggerUi;

pub mod election;
pub mod polling_station;
pub mod validation;

#[derive(FromRef, Clone)]
pub struct AppState {
    pool: SqlitePool,
}

/// Axum router for the application
pub fn router(pool: SqlitePool) -> Result<Router, Box<dyn Error>> {
    let state = AppState { pool };

    let polling_station_routes = Router::new()
        .route(
            "/:polling_station_id/data_entries/:entry_number",
            post(polling_station::polling_station_data_entry),
        )
        .route(
            "/:polling_station_id/data_entries/:entry_number/finalise",
            post(polling_station::polling_station_data_entry_finalise),
        );

    let election_routes = Router::new()
        .route("/", get(election::election_list))
        .route("/:election_id", get(election::election_details))
        .route(
            "/:election_id/polling_stations",
            get(polling_station::polling_station_list),
        );

    let app: Router = Router::new()
        .nest("/api/elections", election_routes)
        .nest("/api/polling_stations", polling_station_routes)
        .with_state(state);

    // Always create an OpenAPI Json spec, but only provide a swagger frontend in release builds
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
            polling_station::polling_station_list,
            polling_station::polling_station_data_entry,
            polling_station::polling_station_data_entry_finalise,
        ),
        components(
            schemas(
                ErrorResponse,
                validation::ValidationResult,
                validation::ValidationResultCode,
                validation::ValidationResults,
                election::Election,
                election::ElectionCategory,
                election::PoliticalGroup,
                election::Candidate,
                election::CandidateGender,
                election::ElectionListResponse,
                election::ElectionDetailsResponse,
                polling_station::CandidateVotes,
                polling_station::DataEntryRequest,
                polling_station::DataEntryResponse,
                polling_station::DifferencesCounts,
                polling_station::PoliticalGroupVotes,
                polling_station::PollingStationResults,
                polling_station::PollingStationListResponse,
                polling_station::PollingStationType,
                polling_station::PollingStation,
                polling_station::VotersCounts,
                polling_station::VotersRecounts,
                polling_station::VotesCounts,
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
                println!("Invalid data error: {}", err);
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
                println!("Serde JSON error: {:?}", err);
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
                println!("SQLx error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    to_error("Internal server error".to_string()),
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

#[derive(Debug, Serialize)]
pub struct JsonResponse<T>(T);

impl<T: Serialize> IntoResponse for JsonResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}
