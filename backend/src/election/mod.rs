#[cfg(feature = "dev-database")]
use axum::http::StatusCode;
use axum::{
    Json,
    extract::{Path, State},
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use self::repository::Elections;
pub use self::structs::*;
use crate::{
    APIError, AppState, ErrorResponse,
    authentication::User,
    polling_station::{repository::PollingStations, structs::PollingStation},
};
#[cfg(feature = "dev-database")]
use crate::{
    audit_log::{AuditEvent, AuditService},
    authentication::Admin,
};
pub(crate) mod repository;
pub mod structs;

pub fn router() -> OpenApiRouter<AppState> {
    let router = OpenApiRouter::default()
        .routes(routes!(election_list))
        .routes(routes!(election_details));

    #[cfg(feature = "dev-database")]
    let router = router.routes(routes!(election_create));

    router
}

/// Election list response
///
/// Does not include the candidate list (political groups) to keep the response size small.
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionListResponse {
    pub elections: Vec<Election>,
}

/// Election details response, including the election's candidate list (political groups) and its polling stations
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionDetailsResponse {
    pub election: Election,
    pub polling_stations: Vec<PollingStation>,
}

impl IntoResponse for Election {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

/// Get a list of all elections, without their candidate lists
#[utoipa::path(
    get,
    path = "/api/elections",
    responses(
        (status = 200, description = "Election list", body = ElectionListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn election_list(
    _user: User,
    State(elections_repo): State<Elections>,
) -> Result<Json<ElectionListResponse>, APIError> {
    let elections = elections_repo.list().await?;
    Ok(Json(ElectionListResponse { elections }))
}

/// Get election details including the election's candidate list (political groups) and its polling stations
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}",
    responses(
        (status = 200, description = "Election", body = ElectionDetailsResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn election_details(
    _user: User,
    State(elections_repo): State<Elections>,
    State(polling_stations): State<PollingStations>,
    Path(id): Path<u32>,
) -> Result<Json<ElectionDetailsResponse>, APIError> {
    let election = elections_repo.get(id).await?;
    let polling_stations = polling_stations.list(id).await?;
    Ok(Json(ElectionDetailsResponse {
        election,
        polling_stations,
    }))
}

/// Create an election. For test usage only!
#[utoipa::path(
    post,
    path = "/api/elections",
    request_body = ElectionRequest,
    responses(
        (status = 201, description = "Election created", body = Election),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
#[cfg(feature = "dev-database")]
async fn election_create(
    _user: Admin,
    State(elections_repo): State<Elections>,
    audit_service: AuditService,
    Json(new_election): Json<ElectionRequest>,
) -> Result<(StatusCode, Election), APIError> {
    let election = elections_repo.create(new_election).await?;

    audit_service
        .log(&AuditEvent::ElectionCreated(election.clone().into()), None)
        .await?;

    Ok((StatusCode::CREATED, election))
}
