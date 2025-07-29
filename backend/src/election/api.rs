use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use quick_xml::{DeError, SeError};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    NewElection,
    structs::{Election, ElectionWithPoliticalGroups},
};
use crate::{
    APIError, AppState, ErrorResponse,
    audit_log::{AuditEvent, AuditService},
    authentication::{Admin, User},
    committee_session::{CommitteeSession, CommitteeSessionCreateRequest},
    election::VoteCountingMethod,
    eml::{EML110, EML230, EMLDocument, EMLImportError, EmlHash, RedactedEmlHash},
    polling_station::PollingStation,
};

use crate::polling_station::PollingStationRequest;

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
/// Also includes a list of the current committee session for each election.
/// Does not include the candidate list (political groups) to keep the response size small.
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionListResponse {
    pub committee_sessions: Vec<CommitteeSession>,
    pub elections: Vec<Election>,
}

/// Election details response, including the election's candidate list (political groups),
/// its polling stations and the current committee session
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionDetailsResponse {
    pub committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub polling_stations: Vec<PollingStation>,
}

/// Get a list of all elections, without their candidate lists and
/// a list of the current committee session for each election
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
    State(pool): State<SqlitePool>,
) -> Result<Json<ElectionListResponse>, APIError> {
    let elections = crate::election::repository::list(&pool).await?;
    let committee_sessions =
        crate::committee_session::repository::get_committee_session_for_each_election(&pool)
            .await?;
    Ok(Json(ElectionListResponse {
        committee_sessions,
        elections,
    }))
}

/// Get election details including the election's candidate list (political groups),
/// its polling stations and the current committee session
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
    State(pool): State<SqlitePool>,
    Path(id): Path<u32>,
) -> Result<Json<ElectionDetailsResponse>, APIError> {
    let election = crate::election::repository::get(&pool, id).await?;
    let polling_stations = crate::polling_station::repository::list(&pool, id).await?;
    let committee_session =
        crate::committee_session::repository::get_election_committee_session(&pool, id).await?;
    Ok(Json(ElectionDetailsResponse {
        committee_session,
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
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
#[cfg(feature = "dev-database")]
pub async fn election_create(
    _user: Admin,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(new_election): Json<NewElection>,
) -> Result<(StatusCode, ElectionWithPoliticalGroups), APIError> {
    let election = crate::election::repository::create(&pool, new_election).await?;
    audit_service
        .log(&AuditEvent::ElectionCreated(election.clone().into()), None)
        .await?;

    // Create first committee session for the election
    let committee_session = crate::committee_session::repository::create(
        &pool,
        CommitteeSessionCreateRequest {
            number: 1,
            election_id: election.id,
            number_of_voters: 0,
        },
    )
    .await?;
    audit_service
        .log(
            &AuditEvent::CommitteeSessionCreated(committee_session.clone().into()),
            None,
        )
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

    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<String>, nullable = false)]
    polling_station_data: Option<String>,

    counting_method: Option<VoteCountingMethod>,

    number_of_voters: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct ElectionDefinitionValidateResponse {
    hash: RedactedEmlHash,
    election: NewElection,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    polling_stations: Option<Vec<PollingStationRequest>>,
    number_of_voters: u32,
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
        (status = 403, description = "Forbidden", body = ErrorResponse),
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

    // update counting method if available
    if let Some(cm) = edu.counting_method {
        election.counting_method = cm;
    }

    // parse and validate polling stations, and update number of voters
    let polling_stations;
    let mut number_of_voters = 0;
    if let Some(data) = edu.polling_station_data {
        polling_stations = Some(EML110::from_str(&data)?.get_polling_stations()?);
        number_of_voters = EML110::from_str(&data)?.get_number_of_voters()?;
    } else {
        polling_stations = None;
    }

    // override number of voters if provided
    if let Some(nov) = edu.number_of_voters {
        number_of_voters = nov;
    }

    Ok(Json(ElectionDefinitionValidateResponse {
        hash,
        election,
        polling_stations,
        number_of_voters,
    }))
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
pub struct ElectionAndCandidatesDefinitionImportRequest {
    election_hash: [String; crate::eml::hash::CHUNK_COUNT],
    election_data: String,
    candidate_hash: [String; crate::eml::hash::CHUNK_COUNT],
    candidate_data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<String>, nullable = false)]
    polling_station_data: Option<String>,
    counting_method: VoteCountingMethod,
    number_of_voters: u32,
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
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn election_import(
    _user: Admin,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
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

    // Process polling stations
    let mut polling_places = None;
    if let Some(polling_station_data) = edu.polling_station_data {
        polling_places = Some(EML110::from_str(&polling_station_data)?.get_polling_stations()?);
    }

    new_election.counting_method = edu.counting_method;

    // Create new election
    let election = crate::election::repository::create(&pool, new_election).await?;
    audit_service
        .log(&AuditEvent::ElectionCreated(election.clone().into()), None)
        .await?;

    // Create polling stations
    if let Some(places) = polling_places {
        crate::polling_station::repository::create_many(&pool, election.id, places).await?;
    }

    // Create first committee session for the election
    let committee_session = crate::committee_session::repository::create(
        &pool,
        CommitteeSessionCreateRequest {
            number: 1,
            election_id: election.id,
            number_of_voters: edu.number_of_voters,
        },
    )
    .await?;
    audit_service
        .log(
            &AuditEvent::CommitteeSessionCreated(committee_session.clone().into()),
            None,
        )
        .await?;

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
