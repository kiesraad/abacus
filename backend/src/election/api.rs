use super::structs::Election;
use crate::APIError;
#[cfg(feature = "dev-database")]
use crate::audit_log::{AuditEvent, AuditService};
#[cfg(feature = "dev-database")]
use crate::authentication::Admin;
use crate::authentication::User;
use crate::election::ElectionRequest;
use crate::election::repository::Elections;
use crate::eml::{EML110, EMLDocument, eml_document_hash};
use crate::polling_station::PollingStation;
use crate::polling_station::repository::PollingStations;
use crate::{AppState, ErrorResponse};
use axum::extract::Path;
#[cfg(feature = "dev-database")]
use axum::{Json, extract::State, http::StatusCode};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::router::OpenApiRouter;
use utoipa_axum::routes;

pub fn router() -> OpenApiRouter<AppState> {
    let router = OpenApiRouter::default()
        .routes(routes!(election_import_validate))
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
pub async fn election_list(
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
pub async fn election_details(
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
pub async fn election_create(
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

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ElectionDefinitionUploadRequest {
    data: String,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct ElectionDefinitionUploadResponse {
    hash: String,
}

/// Create an election. For test usage only!
#[utoipa::path(
    post,
    path = "/api/elections/validate",
    request_body = ElectionRequest,
    responses(
        (status = 201, description = "Election validated", body = ElectionDefinitionUploadResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn election_import_validate(
    //_user: Admin,
    Json(edu): Json<ElectionDefinitionUploadRequest>,
) -> Result<Json<ElectionDefinitionUploadResponse>, APIError> {
    let _ = EML110::from_str(&edu.data)?;
    let hash = eml_document_hash(&edu.data, true);
    Ok(Json(ElectionDefinitionUploadResponse { hash }))
}
