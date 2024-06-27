use std::error::Error;

use axum::extract::rejection::JsonRejection;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::Error::RowNotFound;
use sqlx::SqlitePool;
use utoipa::{OpenApi, ToSchema};

pub mod election;
pub mod polling_station;
pub mod validation;

/// Axum router for the application
pub fn router(pool: SqlitePool) -> Result<Router, Box<dyn Error>> {
    let openapi = create_openapi();
    let app = Router::new()
        .route("/api-docs/openapi.json", get(Json(openapi)))
        .route("/api/elections/:id", get(election::election_details))
        .route("/api/elections", get(election::election_list))
        .route(
            "/api/polling_stations/:id/data_entries/:entry_number",
            post(polling_station::polling_station_data_entry),
        )
        .with_state(pool);
    Ok(app)
}

pub fn create_openapi() -> utoipa::openapi::OpenApi {
    #[derive(OpenApi)]
    #[openapi(
        paths(
            election::election_list,
            election::election_details,
            polling_station::polling_station_data_entry,
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
                polling_station::DataEntryRequest,
                polling_station::DataEntryResponse,
                polling_station::PollingStationResults,
                polling_station::VotersCounts,
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
pub enum APIError {
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

#[derive(Debug, Serialize)]
pub struct JsonResponse<T>(T);

impl<T: Serialize> IntoResponse for JsonResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}
