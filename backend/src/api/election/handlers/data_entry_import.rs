use async_zip::base::read::mem::ZipFileReader;
use axum::{
    Json,
    extract::{FromRequest, Multipart, Path, Request, State},
};
use chrono::NaiveDate;
use eml_nl::{
    EMLError,
    common::AuthorityIdentifier,
    documents::election_count::ElectionCount,
    io::{EMLParsingMode, EMLRead},
};
use serde::{Deserialize, Serialize};
use sqlx::{SqliteConnection, SqlitePool};
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    api::election::check_hash,
    domain::{
        committee_session::CommitteeSessionId,
        committee_session_status::CommitteeSessionStatus,
        data_entry::{DataEntrySource, DataEntryStatus},
        election::{ElectionId, ElectionWithPoliticalGroups},
        results::{Results, gsb_results::GSBResults},
        sub_committee::{SubCommittee, SubCommitteeFirstSession},
        validate::ValidateRoot,
    },
    eml::{EMLImportError, RedactedEmlHash},
    error::ErrorReference,
    repository::{committee_session_repo, election_repo, sub_committee_repo},
};

#[derive(Debug)]
pub enum DataEntryImportError {
    EmlZipError(String),
    CommitteeSessionAlreadyCompleted,
    SubCommitteeDataEntryNotEmpty,
    ResultsHaveValidationErrors,
}

#[derive(Debug, ToSchema)]
pub struct CSBDataEntryImportValidateRequest {
    hash: Option<[String; crate::eml::hash::CHUNK_COUNT]>,
    #[schema(value_type = String, format = Binary)]
    data: Vec<u8>,
}

impl<S: Send + Sync> FromRequest<S> for CSBDataEntryImportValidateRequest {
    type Rejection = APIError;

    async fn from_request(request: Request, state: &S) -> Result<Self, Self::Rejection> {
        let (hash, data) = read_form_data(request, state).await?;
        Ok(Self { hash, data })
    }
}

#[derive(Debug, ToSchema)]
pub struct CSBDataEntryImportRequest {
    hash: [String; crate::eml::hash::CHUNK_COUNT],
    #[schema(value_type = String, format = Binary)]
    data: Vec<u8>,
}

impl<S: Send + Sync> FromRequest<S> for CSBDataEntryImportRequest {
    type Rejection = APIError;

    async fn from_request(request: Request, state: &S) -> Result<Self, Self::Rejection> {
        let (hash, data) = read_form_data(request, state).await?;
        let hash = hash.ok_or_else(|| invalid_form_data("Missing hash"))?;
        Ok(Self { hash, data })
    }
}

/// Read the ZIP file and hash from the multipart form data
async fn read_form_data<S: Send + Sync>(
    request: Request,
    state: &S,
) -> Result<(Option<[String; crate::eml::hash::CHUNK_COUNT]>, Vec<u8>), APIError> {
    let mut multipart = Multipart::from_request(request, state).await?;
    let mut hash = None;
    let mut data = None;

    while let Some(field) = multipart.next_field().await? {
        match field.name() {
            Some("hash") => {
                let json = field.text().await?;
                let chunks = serde_json::from_str(&json)
                    .map_err(|err| invalid_form_data(format!("Invalid hash: {err}")))?;
                hash = Some(chunks);
            }
            Some("data") => data = Some(field.bytes().await?.into()),
            name => {
                let name = name.unwrap_or_default();
                return Err(invalid_form_data(format!("Unexpected field \"{name}\"")));
            }
        }
    }

    Ok((
        hash,
        data.ok_or_else(|| invalid_form_data("Missing ZIP file"))?,
    ))
}

fn invalid_form_data(message: impl Into<String>) -> APIError {
    APIError::BadRequest(message.into(), ErrorReference::InvalidData)
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CSBDataEntryImportValidateResponse {
    hash: RedactedEmlHash,
    election_name: String,
    #[schema(value_type = String, format = "date")]
    election_date: NaiveDate,
    sub_committee: SubCommittee,
}

/// Validates uploaded data entry results
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/data_entry/import/validate",
    request_body(content = CSBDataEntryImportValidateRequest, content_type = "multipart/form-data"),
    responses(
        (status = 200, description = "Election count validated", body = CSBDataEntryImportValidateResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 413, description = "Payload too large", body = ErrorResponse),
        (status = 422, description = "Import not possible", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn election_data_entry_import_validate(
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    request: CSBDataEntryImportValidateRequest,
) -> Result<Json<CSBDataEntryImportValidateResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    let import =
        validate_import(&mut conn, election_id, request.data, request.hash.as_ref()).await?;

    Ok(Json(CSBDataEntryImportValidateResponse {
        hash: import.hash,
        election_name: import.election.name,
        election_date: import.election.election_date,
        sub_committee: import.sub_committee.sub_committee,
    }))
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CSBDataEntryImportResponse {
    election_name: String,
    #[schema(value_type = String, format = "date")]
    election_date: NaiveDate,
    sub_committee: SubCommittee,
}

/// Imports uploaded data entry results
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/data_entry/import",
    request_body(content = CSBDataEntryImportRequest, content_type = "multipart/form-data"),
    responses(
        (status = 200, description = "Election count imported", body = CSBDataEntryImportResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Election not found", body = ErrorResponse),
        (status = 413, description = "Payload too large", body = ErrorResponse),
        (status = 422, description = "Import not possible", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn election_data_entry_import(
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    request: CSBDataEntryImportRequest,
) -> Result<Json<CSBDataEntryImportResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;
    let import = validate_import(&mut tx, election_id, request.data, Some(&request.hash)).await?;

    // TODO #3905 Store origin of data entry
    // TODO #3906 Save data entry results

    tx.commit().await?;

    Ok(Json(CSBDataEntryImportResponse {
        election_name: import.election.name,
        election_date: import.election.election_date,
        sub_committee: import.sub_committee.sub_committee,
    }))
}

/// Information collected during validation
struct ValidatedImport {
    election: ElectionWithPoliticalGroups,
    sub_committee: SubCommitteeFirstSession,
    hash: RedactedEmlHash,
}

/// Validate uploaded data: hash, ZIP and EML
async fn validate_import(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
    zip_data: Vec<u8>,
    hash: Option<&[String; crate::eml::hash::CHUNK_COUNT]>,
) -> Result<ValidatedImport, APIError> {
    let eml = read_eml_from_zip(zip_data).await?;
    check_hash(eml.as_bytes(), hash)?;
    let definition = ElectionCount::parse_eml(&eml, EMLParsingMode::Strict).ok()?;

    let election_identifier = &definition.count.election.identifier;
    let eml_election_id = election_identifier.id.value()?;
    let eml_election_date = election_identifier.election_date.copied_value()?.date;

    let election = election_repo::get(conn, election_id).await?;
    if election.election_id != eml_election_id.value() {
        return Err(APIError::EmlImportError(EMLImportError::MismatchElection));
    }
    if election.election_date != eml_election_date {
        return Err(APIError::EmlImportError(
            EMLImportError::MismatchElectionDate,
        ));
    }

    let committee_session =
        committee_session_repo::get_election_committee_session(conn, election_id).await?;
    if committee_session.status == CommitteeSessionStatus::Completed {
        return Err(DataEntryImportError::CommitteeSessionAlreadyCompleted.into());
    }

    let authority_identifier = &definition.managing_authority.authority_identifier;
    let (sub_committee, status) =
        find_sub_committee(conn, committee_session.id, authority_identifier).await?;
    if status != DataEntryStatus::Empty {
        // TODO #3905 Throw different error when results have already been *imported*, otherwise the following one
        return Err(DataEntryImportError::SubCommitteeDataEntryNotEmpty.into());
    }

    let results = Results::GSB(GSBResults::from_eml_count(&definition)?);
    let validation_results = results.start_validate(&election)?;
    if validation_results.has_errors() {
        return Err(DataEntryImportError::ResultsHaveValidationErrors.into());
    }

    Ok(ValidatedImport {
        election,
        sub_committee,
        hash: RedactedEmlHash::from(eml.as_bytes()),
    })
}

/// Find the sub committee based on the managing authority
async fn find_sub_committee(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    authority: &AuthorityIdentifier,
) -> Result<(SubCommitteeFirstSession, DataEntryStatus), APIError> {
    let authority_id = authority.id.value()?;
    let authority_name = authority.name.as_deref();

    sub_committee_repo::list_first_session_with_status(conn, committee_session_id)
        .await?
        .into_iter()
        .find_map(|entry| match entry.source {
            DataEntrySource::SubCommittee(source)
                if source.sub_committee.authority_id == authority_id.value()
                    && authority_name
                        .is_none_or(|name| source.sub_committee.authority_name == name) =>
            {
                Some((source, entry.status))
            }
            _ => None,
        })
        .ok_or_else(|| EMLImportError::UnknownCommittee.into())
}

/// Read the contents of the single `*.eml.xml` file that is expected in the ZIP-file.
/// If the ZIP file does not contain exactly one `*.eml.xml` file, an error is returned.
async fn read_eml_from_zip(zip_data: Vec<u8>) -> Result<String, APIError> {
    // TODO #4024 Validate signature
    let reader = ZipFileReader::new(zip_data)
        .await
        .map_err(|_| DataEntryImportError::EmlZipError("Failed to read ZIP file".to_string()))?;

    let files = reader.file().entries().iter().enumerate();
    let mut eml_files = files.filter(|(_, entry)| {
        entry
            .filename()
            .as_str()
            .is_ok_and(|name| name.to_ascii_lowercase().ends_with(".eml.xml"))
    });

    let (index, entry) = eml_files.next().ok_or(DataEntryImportError::EmlZipError(
        "Missing EML file in ZIP".to_string(),
    ))?;
    if eml_files.next().is_some() {
        return Err(
            DataEntryImportError::EmlZipError("Multiple EML files in ZIP".to_string()).into(),
        );
    }

    // Protect against ZIP bombs, max 128 MB after decompression
    let max_size = 128 * 1024 * 1024;
    if entry.uncompressed_size() > max_size {
        return Err(APIError::ContentTooLarge(
            "EML file too large".to_string(),
            ErrorReference::RequestPayloadTooLarge,
        ));
    }

    let mut eml_data = Vec::new();
    reader
        .reader_with_entry(index)
        .await
        .map_err(|_| DataEntryImportError::EmlZipError("Invalid ZIP file".to_string()))?
        .read_to_end_checked(&mut eml_data)
        .await
        .map_err(|_| DataEntryImportError::EmlZipError("Invalid ZIP file".to_string()))?;

    let eml_string =
        String::from_utf8(eml_data).map_err(|_| EMLError::custom("EML file is not valid UTF-8"))?;

    Ok(eml_string)
}
