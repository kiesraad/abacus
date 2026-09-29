use async_zip::base::read::mem::ZipFileReader;
use axum::{
    Json,
    extract::{FromRequest, Multipart, Path, Request, State},
};
use chrono::NaiveDate;
use eml_nl::{
    EMLError,
    documents::election_count::ElectionCount,
    io::{EMLParsingMode, EMLRead},
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse,
    api::election::check_hash,
    domain::{
        data_entry::{DataEntrySource, DataEntryStatus},
        election::ElectionId,
        sub_committee::SubCommittee,
    },
    eml::{EMLImportError, RedactedEmlHash},
    error::ErrorReference,
    repository::{committee_session_repo, election_repo, sub_committee_repo},
};

#[derive(Debug, ToSchema)]
pub struct CSBDataEntryImportValidateRequest {
    hash: Option<[String; crate::eml::hash::CHUNK_COUNT]>,
    #[schema(value_type = String, format = Binary)]
    data: Vec<u8>,
}

impl<S: Send + Sync> FromRequest<S> for CSBDataEntryImportValidateRequest {
    type Rejection = APIError;

    async fn from_request(request: Request, state: &S) -> Result<Self, Self::Rejection> {
        let mut multipart = Multipart::from_request(request, state).await?;
        let mut hash = None;
        let mut data = None;

        while let Some(field) = multipart.next_field().await? {
            match field.name() {
                Some("hash") => {
                    let json = field.text().await?;
                    let chunks = serde_json::from_str(&json).map_err(|err| {
                        APIError::BadRequest(
                            format!("Invalid hash: {err}"),
                            ErrorReference::InvalidData,
                        )
                    })?;
                    hash = Some(chunks);
                }
                Some("data") => data = Some(field.bytes().await?.into()),
                name => {
                    let name = name.unwrap_or_default();
                    return Err(APIError::BadRequest(
                        format!("Unexpected field \"{name}\""),
                        ErrorReference::InvalidData,
                    ));
                }
            }
        }

        Ok(Self {
            hash,
            data: data.ok_or_else(|| {
                APIError::BadRequest("Missing zip file".to_string(), ErrorReference::InvalidData)
            })?,
        })
    }
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
        (status = 413, description = "Payload too large", body = ErrorResponse),
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
    let eml = read_eml_from_zip(request.data).await?;
    check_hash(eml.as_bytes(), request.hash.as_ref())?;
    let definition = ElectionCount::parse_eml(&eml, EMLParsingMode::Strict).ok()?;

    let election_identifier = &definition.count.election.identifier;
    let eml_election_id = election_identifier.id.value()?;
    let eml_election_date = election_identifier.election_date.copied_value()?.date;

    let authority_identifier = &definition.managing_authority.authority_identifier;
    let authority_id = authority_identifier.id.value()?;
    let authority_name = authority_identifier.name.as_deref();

    let mut conn = pool.acquire().await?;

    let election = election_repo::get(&mut conn, election_id).await?;
    if election.election_id != eml_election_id.value() {
        return Err(APIError::EmlImportError(EMLImportError::MismatchElection));
    }
    if election.election_date != eml_election_date {
        return Err(APIError::EmlImportError(
            EMLImportError::MismatchElectionDate,
        ));
    }

    let committee_session =
        committee_session_repo::get_election_committee_session(&mut conn, election_id).await?;
    let (sub_committee, status) =
        sub_committee_repo::list_first_session_with_status(&mut conn, committee_session.id)
            .await?
            .into_iter()
            .find_map(|entry| match entry.source {
                DataEntrySource::SubCommittee(source)
                    if source.sub_committee.authority_id == authority_id.value()
                        && authority_name
                            .is_none_or(|name| source.sub_committee.authority_name == name) =>
                {
                    Some((source.sub_committee, entry.status))
                }
                _ => None,
            })
            .ok_or(EMLImportError::MismatchSubCommittee)?;

    if status != DataEntryStatus::Empty {
        // TODO #3905 Throw different error when results have already been *imported*, otherwise the following one
        return Err(APIError::EmlImportError(
            EMLImportError::SubCommitteeDataEntryNotEmpty,
        ));
    }

    Ok(Json(CSBDataEntryImportValidateResponse {
        hash: RedactedEmlHash::from(eml.as_bytes()),
        election_name: election.name,
        election_date: election.election_date,
        sub_committee,
    }))
}

/// Read the contents of the single `*.eml.xml` file that is expected in the ZIP-file.
/// If the ZIP file does not contain exactly one `*.eml.xml` file, an error is returned.
async fn read_eml_from_zip(zip_data: Vec<u8>) -> Result<String, APIError> {
    // TODO #4024 Validate signature
    let reader = ZipFileReader::new(zip_data)
        .await
        .map_err(EMLImportError::InvalidZipFile)?;

    let files = reader.file().entries().iter().enumerate();
    let mut eml_files = files.filter(|(_, entry)| {
        entry
            .filename()
            .as_str()
            .is_ok_and(|name| name.to_ascii_lowercase().ends_with(".eml.xml"))
    });

    let (index, entry) = eml_files
        .next()
        .ok_or(EMLImportError::MissingEmlFileInZip)?;
    if eml_files.next().is_some() {
        return Err(EMLImportError::MultipleEmlFilesInZip.into());
    }

    // Protect against ZIP bombs, max 128 MB
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
        .map_err(EMLImportError::InvalidZipFile)?
        .read_to_end_checked(&mut eml_data)
        .await
        .map_err(EMLImportError::InvalidZipFile)?;

    let eml_string =
        String::from_utf8(eml_data).map_err(|_| EMLError::custom("EML file is not valid UTF-8"))?;

    Ok(eml_string)
}
