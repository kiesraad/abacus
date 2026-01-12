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

use super::{
    ElectionId, ElectionNumberOfVotersChangeRequest, NewElection, VoteCountingMethod,
    structs::{Election, ElectionWithPoliticalGroups},
};
use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::{Admin, AdminOrCoordinator, User},
    committee_session::{
        CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionError,
        create_committee_session, status::CommitteeSessionStatus,
    },
    eml::{EML110, EML230, EMLDocument, EMLImportError, EmlHash, RedactedEmlHash},
    investigation::PollingStationInvestigation,
    polling_station,
    polling_station::{
        PollingStation, PollingStationRequest, PollingStationsRequest,
        create_imported_polling_stations,
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
    let elections = crate::election::repository::list(&mut conn).await?;
    let committee_sessions =
        crate::committee_session::repository::get_committee_session_for_each_election(&mut conn)
            .await?;
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
    let election = crate::election::repository::get(&mut conn, election_id).await?;
    let committee_sessions =
        crate::committee_session::repository::get_election_committee_session_list(
            &mut conn,
            election_id,
        )
        .await?;
    let current_committee_session = committee_sessions
        .first()
        .expect("There is always one committee session")
        .clone();
    let polling_stations = polling_station::list(&mut conn, current_committee_session.id).await?;
    let investigations = crate::investigation::list_investigations_for_committee_session(
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

    crate::election::repository::get(&mut tx, election_id).await?;
    let current_committee_session =
        crate::committee_session::repository::get_election_committee_session(&mut tx, election_id)
            .await?;

    // Only allow if this is a first and not yet started committee session
    if !current_committee_session.is_next_session()
        && (current_committee_session.status == CommitteeSessionStatus::Created
            || current_committee_session.status == CommitteeSessionStatus::InPreparation)
    {
        let election = crate::election::repository::change_number_of_voters(
            &mut tx,
            election_id,
            request.number_of_voters,
        )
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
#[serde(deny_unknown_fields)]
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

    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<VoteCountingMethod>, nullable = false)]
    counting_method: Option<VoteCountingMethod>,

    #[schema(nullable = false)]
    #[serde(skip_serializing_if = "Option::is_none")]
    number_of_voters: Option<u32>,

    #[schema(nullable = false)]
    #[serde(skip_serializing_if = "Option::is_none")]
    polling_station_file_name: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct ElectionDefinitionValidateResponse {
    hash: RedactedEmlHash,
    election: NewElection,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    polling_stations: Option<Vec<PollingStationRequest>>,

    #[schema(nullable = false)]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub polling_station_definition_matches_election: Option<bool>,

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
    security(("cookie_auth" = ["administrator"])),
)]
pub async fn election_import_validate(
    _user: Admin,
    Json(edu): Json<ElectionAndCandidateDefinitionValidateRequest>,
) -> Result<Json<ElectionDefinitionValidateResponse>, APIError> {
    // parse and validate election
    if let Some(user_hash) = edu.election_hash
        && user_hash != EmlHash::from(edu.election_data.as_bytes()).chunks
    {
        return Err(APIError::InvalidHashError);
    }
    let mut hash = RedactedEmlHash::from(edu.election_data.as_bytes());
    let mut election = EML110::from_str(&edu.election_data)?.as_abacus_election()?;

    // parse and validate candidates, if available
    if let Some(data) = edu.candidate_data.clone() {
        if let Some(user_hash) = edu.candidate_hash
            && user_hash != EmlHash::from(data.as_bytes()).chunks
        {
            return Err(APIError::InvalidHashError);
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
    let mut polling_station_definition_matches_election = None;
    let mut number_of_voters = 0;
    if let Some(data) = edu.polling_station_data {
        // If polling stations are submitted, file name must be also
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

    // override number of voters if provided
    if let Some(nov) = edu.number_of_voters {
        number_of_voters = nov;
    }

    Ok(Json(ElectionDefinitionValidateResponse {
        hash,
        election,
        polling_stations,
        number_of_voters,
        polling_station_definition_matches_election,
    }))
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
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
    #[schema(nullable = false)]
    #[serde(skip_serializing_if = "Option::is_none")]
    polling_station_file_name: Option<String>,
}

async fn create_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    new_election: NewElection,
    election_data_hash: [String; 16],
    candidate_data_hash: [String; 16],
) -> Result<ElectionWithPoliticalGroups, APIError> {
    let election = crate::election::repository::create(conn, new_election).await?;
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
    request_body = ElectionAndCandidatesDefinitionImportRequest,
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
    Json(edu): Json<ElectionAndCandidatesDefinitionImportRequest>,
) -> Result<(StatusCode, Json<ElectionWithPoliticalGroups>), APIError> {
    let election_data_hash = EmlHash::from(edu.election_data.as_bytes()).chunks;
    if edu.election_hash != election_data_hash {
        return Err(APIError::InvalidHashError);
    }
    let candidate_data_hash = EmlHash::from(edu.candidate_data.as_bytes()).chunks;
    if edu.candidate_hash != candidate_data_hash {
        return Err(APIError::InvalidHashError);
    }

    let mut new_election = EML110::from_str(&edu.election_data)?.as_abacus_election()?;
    new_election = EML230::from_str(&edu.candidate_data)?.add_candidate_lists(new_election)?;

    // Validate polling stations
    if let Some(polling_station_data) = edu.polling_station_data.as_ref() {
        // If polling stations are submitted, file name must be also
        if edu.polling_station_file_name.is_none() {
            return Err(APIError::EmlImportError(EMLImportError::MissingFileName));
        }
        EML110::from_str(polling_station_data)?.get_polling_stations()?;
    }

    // Set counting method
    // Note: not used yet in the frontend, only CSO is implemented for now
    new_election.counting_method = edu.counting_method;

    // Set number of voters based on input
    new_election.number_of_voters = edu.number_of_voters;

    // Create new election
    let mut tx = pool.begin_immediate().await?;
    let election = create_election(
        &mut tx,
        &audit_service,
        new_election,
        election_data_hash,
        candidate_data_hash,
    )
    .await?;

    // Create first committee session for the election
    create_committee_session(
        &mut tx,
        &audit_service,
        CommitteeSessionCreateRequest {
            number: 1,
            election_id: election.id,
        },
    )
    .await?;

    // Create polling stations
    if let Some(polling_station_data) = edu.polling_station_data {
        let polling_stations_request = PollingStationsRequest {
            file_name: edu
                .polling_station_file_name
                .ok_or(EMLImportError::MissingFileName)?,
            polling_stations: polling_station_data,
        };
        create_imported_polling_stations(
            &mut tx,
            audit_service,
            election.id,
            polling_stations_request,
        )
        .await?;
    }

    tx.commit().await?;

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
