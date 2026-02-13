use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use quick_xml::{DeError, SeError};
use serde::{Deserialize, Serialize};
use sqlx::{SqliteConnection, SqlitePool};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::{
        committee_session::create_committee_session,
        middleware::authentication::{Admin, AdminOrCoordinator},
        polling_station::create_imported_polling_stations,
    },
    domain::{
        committee_session::{
            CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionError,
        },
        committee_session_status::CommitteeSessionStatus,
        election::{
            Election, ElectionId, ElectionNumberOfVotersChangeRequest, ElectionRole,
            ElectionWithPoliticalGroups, NewElection, VoteCountingMethod,
        },
        investigation::PollingStationInvestigation,
        polling_station::{PollingStation, PollingStationRequest, PollingStationsRequest},
    },
    eml::{EML110, EML230, EMLDocument, EMLImportError, EmlHash, RedactedEmlHash},
    infra::audit_log::{AuditEvent, AuditService},
    repository::{
        committee_session_repo, election_repo, investigation_repo, polling_station_repo,
        user_repo::User,
    },
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(election_import_validate))
        .routes(routes!(election_import))
        .routes(routes!(election_list))
        .routes(routes!(election_details))
        .routes(routes!(election_number_of_voters_change))
}

/// Election list response
///
/// Also includes a list of the current committee session for each election.
/// Does not include the candidate list (political groups) to keep the response size small.
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct ElectionListResponse {
    pub committee_sessions: Vec<CommitteeSession>,
    pub elections: Vec<Election>,
}

/// Election details response, including the election's candidate list (political groups),
/// its polling stations and its committee sessions and current committee session
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct ElectionDetailsResponse {
    pub current_committee_session: CommitteeSession,
    pub committee_sessions: Vec<CommitteeSession>,
    pub election: ElectionWithPoliticalGroups,
    pub polling_stations: Vec<PollingStation>,
    pub investigations: Vec<PollingStationInvestigation>,
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
    security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
pub async fn election_list(
    _user: User,
    State(pool): State<SqlitePool>,
) -> Result<Json<ElectionListResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    let elections = election_repo::list(&mut conn).await?;
    let committee_sessions =
        committee_session_repo::get_committee_session_for_each_election(&mut conn).await?;
    Ok(Json(ElectionListResponse {
        committee_sessions,
        elections,
    }))
}

/// Get election details including the election's candidate list (political groups),
/// its polling stations and the current committee session and its investigations
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
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
pub async fn election_details(
    _user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<Json<ElectionDetailsResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_sessions =
        committee_session_repo::get_election_committee_session_list(&mut conn, election_id).await?;
    let current_committee_session = committee_sessions
        .first()
        .expect("There is always one committee session")
        .clone();
    let polling_stations =
        polling_station_repo::list(&mut conn, current_committee_session.id).await?;
    let investigations = investigation_repo::list_investigations_for_committee_session(
        &mut conn,
        current_committee_session.id,
    )
    .await?;

    Ok(Json(ElectionDetailsResponse {
        current_committee_session,
        committee_sessions,
        election,
        polling_stations,
        investigations,
    }))
}

/// Change the number of voters of an [Election].
#[utoipa::path(
    put,
    path = "/api/elections/{election_id}/voters",
    request_body = ElectionNumberOfVotersChangeRequest,
    responses(
        (status = 204, description = "Election number of voters changed successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
pub async fn election_number_of_voters_change(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(election_id): Path<ElectionId>,
    Json(request): Json<ElectionNumberOfVotersChangeRequest>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    election_repo::get(&mut tx, election_id).await?;
    let current_committee_session =
        committee_session_repo::get_election_committee_session(&mut tx, election_id).await?;

    // Only allow if this is a first and not yet started committee session
    if !current_committee_session.is_next_session()
        && (current_committee_session.status == CommitteeSessionStatus::Created
            || current_committee_session.status == CommitteeSessionStatus::InPreparation)
    {
        let election =
            election_repo::change_number_of_voters(&mut tx, election_id, request.number_of_voters)
                .await?;

        audit_service
            .log(
                &mut tx,
                &AuditEvent::ElectionUpdated(election.clone().into()),
                None,
            )
            .await?;

        tx.commit().await?;

        Ok(StatusCode::NO_CONTENT)
    } else {
        tx.rollback().await?;

        Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ))
    }
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]

pub enum ElectionCreationValidateRequest {
    GSB {
        election_and_candidates: ElectionAndCandidateData,
        gsb: GSBElectionCreationValidateRequest,
    },
    CSB {
        election_and_candidates: ElectionAndCandidateData,
    },
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ElectionAndCandidateData {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<Vec<String>>, nullable = false)]
    election_hash: Option<[String; crate::eml::hash::CHUNK_COUNT]>,
    election_data: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<Vec<String>>, nullable = false)]
    candidate_hash: Option<[String; crate::eml::hash::CHUNK_COUNT]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    candidate_data: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
/// GSB-specific election creation validation request fields
pub struct GSBElectionCreationValidateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    polling_station_data: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    counting_method: Option<VoteCountingMethod>,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    number_of_voters: Option<u32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    polling_station_file_name: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(tag = "role")]
pub enum ElectionDefinitionValidateResponse {
    GSB(GSBElectionDefinitionValidateResponse),
    CSB(CSBElectionDefinitionValidateResponse),
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct GSBElectionDefinitionValidateResponse {
    hash: RedactedEmlHash,
    election: NewElection,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    polling_stations: Option<Vec<PollingStationRequest>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub polling_station_definition_matches_election: Option<bool>,
    number_of_voters: u32,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CSBElectionDefinitionValidateResponse {
    hash: RedactedEmlHash,
    election: NewElection,
}

/// Uploads election definition, validates it and returns the associated election data and
/// a redacted hash, to be filled by the administrator.
#[utoipa::path(
    post,
    path = "/api/elections/import/validate",
    request_body = ElectionCreationValidateRequest,
    responses(
        (status = 200, description = "Election validated", body = ElectionDefinitionValidateResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(("cookie_auth" = ["administrator"])),
)]
pub async fn election_import_validate(
    _user: Admin,
    Json(request): Json<ElectionCreationValidateRequest>,
) -> Result<Json<ElectionDefinitionValidateResponse>, APIError> {
    match request {
        ElectionCreationValidateRequest::GSB {
            election_and_candidates,
            gsb,
        } => validate_gsb_election(election_and_candidates, gsb),
        ElectionCreationValidateRequest::CSB {
            election_and_candidates,
        } => validate_csb_election(election_and_candidates),
    }
}

/// Validate a GSB election
fn validate_gsb_election(
    ec: ElectionAndCandidateData,
    edu: GSBElectionCreationValidateRequest,
) -> Result<Json<ElectionDefinitionValidateResponse>, APIError> {
    check_hash(ec.election_data.as_bytes(), ec.election_hash.as_ref())?;
    if let Some(ref data) = ec.candidate_data {
        check_hash(data.as_bytes(), ec.candidate_hash.as_ref())?;
    }

    let mut hash = RedactedEmlHash::from(ec.election_data.as_bytes());
    let mut election =
        parse_election_candidates_eml(&ec.election_data, ec.candidate_data.as_deref())?;

    if let Some(ref data) = ec.candidate_data {
        hash = RedactedEmlHash::from(data.as_bytes());
    }

    if let Some(cm) = edu.counting_method {
        election.counting_method = cm;
    }

    // parse and validate polling stations, and update number of voters
    let polling_stations;
    let mut polling_station_definition_matches_election = None;
    let mut number_of_voters = 0;
    if let Some(data) = edu.polling_station_data {
        if edu.polling_station_file_name.is_none() {
            return Err(APIError::EmlImportError(EMLImportError::MissingFileName));
        }

        let eml110b = EML110::from_str(&data)?;
        polling_stations = Some(eml110b.get_polling_stations()?);
        number_of_voters = eml110b.get_number_of_voters().unwrap_or_default();
        polling_station_definition_matches_election =
            Some(EML110::from_str(&data)?.polling_station_definition_matches_election(&election)?);
    } else {
        polling_stations = None;
    }

    if let Some(nov) = edu.number_of_voters {
        number_of_voters = nov;
    }

    Ok(Json(ElectionDefinitionValidateResponse::GSB(
        GSBElectionDefinitionValidateResponse {
            hash,
            election,
            polling_stations,
            number_of_voters,
            polling_station_definition_matches_election,
        },
    )))
}

fn validate_csb_election(
    edu: ElectionAndCandidateData,
) -> Result<Json<ElectionDefinitionValidateResponse>, APIError> {
    check_hash(edu.election_data.as_bytes(), edu.election_hash.as_ref())?;
    if let Some(ref data) = edu.candidate_data {
        check_hash(data.as_bytes(), edu.candidate_hash.as_ref())?;
    }

    let mut hash = RedactedEmlHash::from(edu.election_data.as_bytes());
    let mut election =
        parse_election_candidates_eml(&edu.election_data, edu.candidate_data.as_deref())?;
    election.role = ElectionRole::CSB;

    if let Some(ref data) = edu.candidate_data {
        hash = RedactedEmlHash::from(data.as_bytes());
    }

    Ok(Json(ElectionDefinitionValidateResponse::CSB(
        CSBElectionDefinitionValidateResponse { hash, election },
    )))
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(tag = "role")]
pub enum ElectionCreationRequest {
    GSB(GSBElectionCreationRequest),
    CSB(CSBElectionCreationRequest),
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct GSBElectionCreationRequest {
    election_hash: [String; crate::eml::hash::CHUNK_COUNT],
    election_data: String,
    candidate_hash: [String; crate::eml::hash::CHUNK_COUNT],
    candidate_data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    polling_station_data: Option<String>,
    counting_method: VoteCountingMethod,
    number_of_voters: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    polling_station_file_name: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CSBElectionCreationRequest {
    election_hash: [String; crate::eml::hash::CHUNK_COUNT],
    election_data: String,
    candidate_hash: [String; crate::eml::hash::CHUNK_COUNT],
    candidate_data: String,
}

async fn create_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    new_election: NewElection,
    election_data_hash: [String; 16],
    candidate_data_hash: [String; 16],
) -> Result<ElectionWithPoliticalGroups, APIError> {
    let election = election_repo::create(conn, new_election).await?;
    let message = format!(
        "Election file hash: {}, candidates file hash: {}",
        election_data_hash.join(" "),
        candidate_data_hash.join(" ")
    );
    audit_service
        .log(
            conn,
            &AuditEvent::ElectionCreated(election.clone().into()),
            Some(message),
        )
        .await?;
    Ok(election)
}

/// Uploads election definition, validates it, saves it to the database, and returns the created election
#[utoipa::path(
    post,
    path = "/api/elections/import",
    request_body = ElectionCreationRequest,
    responses(
        (status = 201, description = "Election imported", body = ElectionWithPoliticalGroups),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    security(("cookie_auth" = ["administrator"])),
)]
pub async fn election_import(
    _user: Admin,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(request): Json<ElectionCreationRequest>,
) -> Result<(StatusCode, Json<ElectionWithPoliticalGroups>), APIError> {
    match request {
        ElectionCreationRequest::GSB(edu) => import_gsb_election(edu, &pool, &audit_service).await,
        ElectionCreationRequest::CSB(edu) => import_csb_election(edu, &pool, &audit_service).await,
    }
}

async fn import_gsb_election(
    edu: GSBElectionCreationRequest,
    pool: &SqlitePool,
    audit_service: &AuditService,
) -> Result<(StatusCode, Json<ElectionWithPoliticalGroups>), APIError> {
    let election_data_hash = check_hash(edu.election_data.as_bytes(), Some(&edu.election_hash))?;
    let candidate_data_hash = check_hash(edu.candidate_data.as_bytes(), Some(&edu.candidate_hash))?;

    let mut new_election =
        parse_election_candidates_eml(&edu.election_data, Some(&edu.candidate_data))?;

    // Validate polling stations
    if let Some(polling_station_data) = edu.polling_station_data.as_ref() {
        if edu.polling_station_file_name.is_none() {
            return Err(APIError::EmlImportError(EMLImportError::MissingFileName));
        }
        EML110::from_str(polling_station_data)?.get_polling_stations()?;
    }

    new_election.counting_method = edu.counting_method;
    new_election.number_of_voters = edu.number_of_voters;

    let mut tx = pool.begin_immediate().await?;
    let election = create_election_with_committee_session(
        &mut tx,
        audit_service,
        new_election,
        election_data_hash,
        candidate_data_hash,
    )
    .await?;

    if let Some(polling_station_data) = edu.polling_station_data {
        let polling_stations_request = PollingStationsRequest {
            file_name: edu
                .polling_station_file_name
                .ok_or(EMLImportError::MissingFileName)?,
            polling_stations: polling_station_data,
        };
        create_imported_polling_stations(
            &mut tx,
            audit_service.clone(),
            election.id,
            polling_stations_request,
        )
        .await?;
    }

    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(election)))
}

async fn import_csb_election(
    edu: CSBElectionCreationRequest,
    pool: &SqlitePool,
    audit_service: &AuditService,
) -> Result<(StatusCode, Json<ElectionWithPoliticalGroups>), APIError> {
    let election_data_hash = check_hash(edu.election_data.as_bytes(), Some(&edu.election_hash))?;
    let candidate_data_hash = check_hash(edu.candidate_data.as_bytes(), Some(&edu.candidate_hash))?;

    let mut new_election =
        parse_election_candidates_eml(&edu.election_data, Some(&edu.candidate_data))?;
    new_election.role = ElectionRole::CSB;

    let mut tx = pool.begin_immediate().await?;
    let election = create_election_with_committee_session(
        &mut tx,
        audit_service,
        new_election,
        election_data_hash,
        candidate_data_hash,
    )
    .await?;

    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(election)))
}

/// Check if the user's entered hash matches the hash of given data
fn check_hash(
    data: &[u8],
    user_hash: Option<&[String; crate::eml::hash::CHUNK_COUNT]>,
) -> Result<[String; crate::eml::hash::CHUNK_COUNT], APIError> {
    let computed = EmlHash::from(data).chunks;
    if let Some(user_hash) = user_hash
        && *user_hash != computed
    {
        return Err(APIError::InvalidHashError);
    }
    Ok(computed)
}

/// Parse EML_NL 110 election definition and EML_NL 230 candidate list into a [`NewElection`]
fn parse_election_candidates_eml(
    election_eml_data: &str,
    candidate_eml_data: Option<&str>,
) -> Result<NewElection, APIError> {
    let mut election = EML110::from_str(election_eml_data)?.as_abacus_election()?;
    if let Some(candidate_data) = candidate_eml_data {
        election = EML230::from_str(candidate_data)?.add_candidate_lists(election)?;
    }
    Ok(election)
}

/// Create an election with a committee session
async fn create_election_with_committee_session(
    tx: &mut SqliteConnection,
    audit_service: &AuditService,
    new_election: NewElection,
    election_data_hash: [String; 16],
    candidate_data_hash: [String; 16],
) -> Result<ElectionWithPoliticalGroups, APIError> {
    let election = create_election(
        tx,
        audit_service,
        new_election,
        election_data_hash,
        candidate_data_hash,
    )
    .await?;
    create_committee_session(
        tx,
        audit_service,
        CommitteeSessionCreateRequest {
            number: 1,
            election_id: election.id,
        },
    )
    .await?;
    Ok(election)
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
