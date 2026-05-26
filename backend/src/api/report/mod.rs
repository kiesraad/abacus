use axum::http::StatusCode;
use tracing::error;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState,
    api::middleware::authentication::RouteAuthorization,
    domain::role::Role,
    error::{ApiErrorResponse, ErrorReference, ErrorResponse},
};

mod files;
mod handlers;
mod structs;

/// Default date time format for reports
pub const DEFAULT_DATE_TIME_FORMAT: &str = "%d-%m-%Y %H:%M:%S %Z";

#[derive(Debug, PartialEq)]
pub enum ReportApiError {
    ApportionmentStateNotFinalised,
}

impl ApiErrorResponse for ReportApiError {
    fn log(&self) {
        error!("Report error: {:?}", self);
    }

    fn to_response_parts(&self) -> (StatusCode, ErrorResponse) {
        match self {
            ReportApiError::ApportionmentStateNotFinalised => (
                StatusCode::PRECONDITION_FAILED,
                ErrorResponse::new(
                    "Apportionment state not finalised",
                    ErrorReference::InvalidApportionmentState,
                    false,
                ),
            ),
        }
    }
}

impl From<ReportApiError> for APIError {
    fn from(err: ReportApiError) -> Self {
        APIError::Delegated(Box::new(err))
    }
}

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    OpenApiRouter::default()
        .routes(routes!(handlers::election_download_zip_results_gsb).authorize(&[CoordinatorGSB]))
        .routes(routes!(handlers::election_download_zip_results_csb).authorize(&[CoordinatorCSB]))
        .routes(
            routes!(handlers::election_download_zip_attachment_csb).authorize(&[CoordinatorCSB]),
        )
        .routes(
            routes!(handlers::election_download_zip_total_counts_csb).authorize(&[CoordinatorCSB]),
        )
}
