use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use quick_xml::{DeError, SeError};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    NewElection,
    repository::Elections,
    structs::{Election, ElectionWithPoliticalGroups},
};
#[cfg(feature = "dev-database")]
use crate::audit_log::{AuditEvent, AuditService};
use crate::{
    APIError, AppState, ErrorResponse,
    authentication::{Admin, User},
    eml::{EML110, EML230, EMLDocument, EMLImportError, EmlHash, RedactedEmlHash},
    polling_station::{PollingStation, repository::PollingStations},
};

pub fn router() -> OpenApiRouter<AppState> {
    let router = OpenApiRouter::default()
        .routes(routes!(election_import_validate))
        .routes(routes!(election_import))
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
    pub election: ElectionWithPoliticalGroups,
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
    request_body = NewElection,
    responses(
        (status = 201, description = "Election created", body = ElectionWithPoliticalGroups),
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
    Json(new_election): Json<NewElection>,
) -> Result<(StatusCode, ElectionWithPoliticalGroups), APIError> {
    let election = elections_repo.create(new_election).await?;

    audit_service
        .log(&AuditEvent::ElectionCreated(election.clone().into()), None)
        .await?;

    Ok((StatusCode::CREATED, election))
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct ElectionAndCandidateDefinitionValidateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<Vec<String>>, nullable = false)]
    election_hash: Option<[String; crate::eml::hash::CHUNK_COUNT]>,
    election_data: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<Vec<String>>, nullable = false)]
    candidate_hash: Option<[String; crate::eml::hash::CHUNK_COUNT]>,
    candidate_data: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct ElectionDefinitionValidateResponse {
    hash: RedactedEmlHash,
    election: NewElection,
}

/// Uploads election definition, validates it and returns the associated election data and
/// a redacted hash, to be filled by the administrator.
#[utoipa::path(
    post,
    path = "/api/elections/import/validate",
    request_body = ElectionAndCandidateDefinitionValidateRequest,
    responses(
        (status = 200, description = "Election validated", body = ElectionDefinitionValidateResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn election_import_validate(
    _user: Admin,
    Json(edu): Json<ElectionAndCandidateDefinitionValidateRequest>,
) -> Result<Json<ElectionDefinitionValidateResponse>, APIError> {
    // parse and validate election
    if let Some(user_hash) = edu.election_hash {
        if user_hash != EmlHash::from(edu.election_data.as_bytes()).chunks {
            return Err(APIError::InvalidHashError);
        }
    }
    let mut hash = RedactedEmlHash::from(edu.election_data.as_bytes());
    let mut election = EML110::from_str(&edu.election_data)?.as_abacus_election()?;

    // parse and validate candidates, if available
    if let Some(data) = edu.candidate_data.clone() {
        if let Some(user_hash) = edu.candidate_hash {
            if user_hash != EmlHash::from(data.as_bytes()).chunks {
                return Err(APIError::InvalidHashError);
            }
        }

        hash = RedactedEmlHash::from(data.as_bytes());
        election = EML230::from_str(&data)?.add_candidate_lists(election)?;
    }

    Ok(Json(ElectionDefinitionValidateResponse { hash, election }))
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct ElectionAndCandidatesDefinitionImportRequest {
    election_hash: [String; crate::eml::hash::CHUNK_COUNT],
    election_data: String,
    candidate_hash: [String; crate::eml::hash::CHUNK_COUNT],
    candidate_data: String,
}

/// Uploads election definition, validates it, saves it to the database, and returns the created election
#[utoipa::path(
    post,
    path = "/api/elections/import",
    request_body = ElectionAndCandidatesDefinitionImportRequest,
    responses(
        (status = 201, description = "Election imported", body = ElectionWithPoliticalGroups),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn election_import(
    _user: Admin,
    State(elections_repo): State<Elections>,
    Json(edu): Json<ElectionAndCandidatesDefinitionImportRequest>,
) -> Result<(StatusCode, Json<ElectionWithPoliticalGroups>), APIError> {
    if edu.election_hash != EmlHash::from(edu.election_data.as_bytes()).chunks {
        return Err(APIError::InvalidHashError);
    }
    if edu.candidate_hash != EmlHash::from(edu.candidate_data.as_bytes()).chunks {
        return Err(APIError::InvalidHashError);
    }

    let mut new_election = EML110::from_str(&edu.election_data)?.as_abacus_election()?;
    new_election = EML230::from_str(&edu.candidate_data)?.add_candidate_lists(new_election)?;

    let election = elections_repo.create(new_election).await?;
    Ok((StatusCode::CREATED, Json(election)))
}

impl From<DeError> for APIError {
    fn from(err: DeError) -> Self {
        APIError::XmlDeError(err)
    }
}

impl From<SeError> for APIError {
    fn from(err: SeError) -> Self {
        APIError::XmlError(err)
    }
}

impl From<EMLImportError> for APIError {
    fn from(err: EMLImportError) -> Self {
        APIError::EmlImportError(err)
    }
}
