use async_zip::base::read::mem::ZipFileReader;
use axum::{
    Json,
    extract::{FromRequest, Multipart, Path, Request, State},
};
use chrono::NaiveDate;
use eml_nl::{
    EMLError,
    common::AuthorityIdentifier,
    documents::election_count::{CountType, ElectionCount},
    io::{EMLParsingMode, EMLRead},
};
use serde::{Deserialize, Serialize};
use sqlx::{SqliteConnection, SqlitePool};
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    api::{data_entry::DataEntryAuditData, election::check_hash},
    domain::{
        committee_session::CommitteeSessionId,
        committee_session_status::CommitteeSessionStatus,
        data_entry::{DataEntryOrigin, DataEntrySource, DataEntryStatus, DataEntryTransitionError},
        election::{ElectionId, ElectionWithPoliticalGroups},
        results::{Results, gsb_results::GSBResults},
        sub_committee::{SubCommitteeFirstSession, SubCommitteeId},
    },
    eml::{EMLImportError, RedactedEmlHash},
    error::ErrorReference,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{
        committee_session_repo, data_entry_repo, election_repo, sub_committee_repo, user_repo::User,
    },
};

#[derive(Debug)]
pub enum DataEntryImportError {
    EmlZipError(String),
    CommitteeSessionAlreadyCompleted,
    SubCommitteeDataEntryAlreadyImported,
    SubCommitteeDataEntryNotEmpty,
    ResultsHaveValidationErrors,
}

#[derive(Serialize)]
struct DataEntryImportedAuditData {
    election_id: ElectionId,
    sub_committee_id: SubCommitteeId,
    authority_id: String,
    #[serde(flatten)]
    data_entry: DataEntryAuditData,
}

impl AsAuditEvent for DataEntryImportedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::DataEntryImported;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

#[derive(Debug, ToSchema)]
pub struct CSBDataEntryImportValidateRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = Option<Vec<String>>, nullable = false)]
    pub hash: Option<[String; crate::eml::hash::CHUNK_COUNT]>,
    #[schema(value_type = String, format = Binary)]
    pub data: Vec<u8>,
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
    pub hash: [String; crate::eml::hash::CHUNK_COUNT],
    #[schema(value_type = String, format = Binary)]
    pub data: Vec<u8>,
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
    sub_committee: SubCommitteeFirstSession,
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
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    request: CSBDataEntryImportValidateRequest,
) -> Result<Json<CSBDataEntryImportValidateResponse>, APIError> {
    let mut conn = pool.acquire().await?;
    let hash = request.hash.as_ref();
    let import = validate_import(&mut conn, &user, election_id, request.data, hash).await?;

    Ok(Json(CSBDataEntryImportValidateResponse {
        hash: import.hash,
        election_name: import.election.name,
        election_date: import.election.election_date,
        sub_committee: import.sub_committee,
    }))
}

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CSBDataEntryImportResponse {
    election_name: String,
    #[schema(value_type = String, format = "date")]
    election_date: NaiveDate,
    sub_committee: SubCommitteeFirstSession,
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
    user: User,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    audit_service: AuditService,
    request: CSBDataEntryImportRequest,
) -> Result<Json<CSBDataEntryImportResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;
    let hash = Some(&request.hash);
    let import = validate_import(&mut tx, &user, election_id, request.data, hash).await?;

    let data_entry = data_entry_repo::update(
        &mut tx,
        import.sub_committee.data_entry_id,
        &import.new_state,
    )
    .await?;

    audit_service
        .log(
            &mut tx,
            &DataEntryImportedAuditData {
                election_id: import.election.id,
                sub_committee_id: import.sub_committee.id,
                authority_id: import.sub_committee.authority_id.clone(),
                data_entry: data_entry.into(),
            },
            Some(format!(
                "Election count file hash: {}",
                request.hash.join(" ")
            )),
        )
        .await?;

    tx.commit().await?;

    Ok(Json(CSBDataEntryImportResponse {
        election_name: import.election.name,
        election_date: import.election.election_date,
        sub_committee: import.sub_committee,
    }))
}

/// Information collected during validation
#[derive(Debug)]
struct ValidatedImport {
    election: ElectionWithPoliticalGroups,
    sub_committee: SubCommitteeFirstSession,
    hash: RedactedEmlHash,
    new_state: DataEntryStatus,
}

/// Validate uploaded data and get the resulting data entry state
async fn validate_import(
    conn: &mut SqliteConnection,
    user: &User,
    election_id: ElectionId,
    zip_data: Vec<u8>,
    hash: Option<&[String; crate::eml::hash::CHUNK_COUNT]>,
) -> Result<ValidatedImport, APIError> {
    let election = election_repo::get(conn, election_id).await?;
    user.role().is_authorized(election.committee_category)?;

    let eml = read_eml_from_zip(zip_data).await?;
    check_hash(eml.as_bytes(), hash)?;
    let definition = ElectionCount::parse_eml(&eml, EMLParsingMode::Strict).ok()?;

    // We only support 510b counts for now
    if definition.count_type != CountType::Municipal {
        return Err(EMLImportError::InvalidCountType.into());
    }

    let election_identifier = &definition.count.election.identifier;
    let eml_election_id = election_identifier.id.value()?;
    let eml_election_date = election_identifier.election_date.copied_value()?.date;

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
    let (sub_committee, data_entry_status) =
        find_sub_committee(conn, committee_session.id, authority_identifier).await?;

    if data_entry_status.get_first_entry_origin() == Some(DataEntryOrigin::Import) {
        return Err(DataEntryImportError::SubCommitteeDataEntryAlreadyImported.into());
    }
    if data_entry_status != DataEntryStatus::Empty {
        return Err(DataEntryImportError::SubCommitteeDataEntryNotEmpty.into());
    }

    // The state machine validates results, report validation errors as import errors
    let results = Results::GSB(GSBResults::from_eml_count(&definition, election.category)?);
    let new_state = data_entry_status
        .import_first_entry(&election, results)
        .map_err(|err| match err {
            DataEntryTransitionError::ValidationError(_) => {
                APIError::from(DataEntryImportError::ResultsHaveValidationErrors)
            }
            DataEntryTransitionError::ValidatorError(err) => APIError::from(err),
            err => APIError::from(err),
        })?;

    Ok(ValidatedImport {
        election,
        sub_committee,
        hash: RedactedEmlHash::from(eml.as_bytes()),
        new_state,
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
            DataEntrySource::SubCommittee(sc)
                if sc.authority_id == authority_id.value()
                    && authority_name.is_none_or(|name| sc.authority_name == name) =>
            {
                Some((sc, entry.status))
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::tabulation::ElectionTotals;
    use async_zip::{Compression, ZipEntryBuilder, tokio::write::ZipFileWriter};
    use chrono::Local;
    use std::assert_matches;

    /// Create a zip file in memory containing the given files
    pub async fn zip_with_files(files: &[(&str, &[u8])]) -> Vec<u8> {
        let mut writer = ZipFileWriter::with_tokio(Vec::new());
        for (name, data) in files {
            let entry = ZipEntryBuilder::new(name.to_string().into(), Compression::Deflate);
            writer.write_entry_whole(entry, data).await.unwrap();
        }
        writer.close().await.unwrap().into_inner()
    }

    mod multipart_request {
        use super::*;
        use axum::body::Body;
        use reqwest::multipart::{Form, Part};
        use test_log::test;

        /// Create a multipart request with the given form fields
        fn multipart_request(fields: &[(&str, &[u8])]) -> Request {
            let form = fields.iter().fold(Form::new(), |form, (name, value)| {
                form.part(name.to_string(), Part::bytes(value.to_vec()))
            });

            let request = reqwest::Client::new()
                .post("http://localhost")
                .multipart(form)
                .build()
                .unwrap();

            Request::try_from(request).unwrap().map(Body::new)
        }

        #[test(tokio::test)]
        async fn test_from_request() {
            // Repeat abcd to fill all chunks
            let hash = serde_json::to_vec(&vec!["abcd"; crate::eml::hash::CHUNK_COUNT]).unwrap();
            let request = CSBDataEntryImportValidateRequest::from_request(
                multipart_request(&[("hash", &hash), ("data", b"zip")]),
                &(),
            )
            .await
            .unwrap();

            assert_eq!(
                request.hash,
                Some(std::array::from_fn(|_| "abcd".to_string()))
            );
            assert_eq!(request.data, b"zip");
        }

        #[test(tokio::test)]
        async fn test_from_request_without_hash() {
            let request = CSBDataEntryImportValidateRequest::from_request(
                multipart_request(&[("data", b"zip")]),
                &(),
            )
            .await
            .unwrap();

            assert_eq!(request.hash, None);
        }

        #[test(tokio::test)]
        async fn test_from_request_import_without_hash() {
            let request = multipart_request(&[("data", b"zip")]);

            assert_matches!(
                CSBDataEntryImportRequest::from_request(request, &()).await,
                Err(APIError::BadRequest(_, ErrorReference::InvalidData))
            );
        }

        #[test(tokio::test)]
        async fn test_from_request_invalid_hash() {
            // Missing chunks in the hash
            let request = multipart_request(&[("hash", br#"["abcd"]"#), ("data", b"zip")]);

            assert_matches!(
                CSBDataEntryImportValidateRequest::from_request(request, &()).await,
                Err(APIError::BadRequest(_, ErrorReference::InvalidData))
            );
        }

        #[test(tokio::test)]
        async fn test_from_request_without_data() {
            let request = multipart_request(&[]);

            assert_matches!(
                CSBDataEntryImportValidateRequest::from_request(request, &()).await,
                Err(APIError::BadRequest(_, ErrorReference::InvalidData))
            );
        }

        #[test(tokio::test)]
        async fn test_from_request_unexpected_field() {
            let request = multipart_request(&[("data", b"zip"), ("other", b"value")]);

            assert_matches!(
                CSBDataEntryImportValidateRequest::from_request(request, &()).await,
                Err(APIError::BadRequest(_, ErrorReference::InvalidData))
            );
        }
    }

    mod read_eml_from_zip {
        use super::*;
        use test_log::test;

        #[test(tokio::test)]
        async fn test_valid_zip() {
            let zip = zip_with_files(&[
                ("Telling_GR2026_Heemdamseburg.eml.xml", b"<EML/>"),
                (
                    "Telling_GR2026_Heemdamseburg.eml.xml.signature",
                    b"signature",
                ),
            ])
            .await;

            assert_eq!(read_eml_from_zip(zip).await.unwrap(), "<EML/>");
        }

        #[test(tokio::test)]
        async fn test_invalid_zip() {
            assert_matches!(
                read_eml_from_zip(b"not a zip file".to_vec()).await,
                Err(APIError::Unprocessable(_, ErrorReference::ZipError))
            );
        }

        #[test(tokio::test)]
        async fn test_without_eml_file() {
            let zip = zip_with_files(&[("Telling_GR2026_Heemdamseburg.xml", b"<EML/>")]).await;

            assert_matches!(
                read_eml_from_zip(zip).await,
                Err(APIError::Unprocessable(_, ErrorReference::ZipError))
            );
        }

        #[test(tokio::test)]
        async fn test_with_multiple_eml_files() {
            let zip = zip_with_files(&[
                ("Telling_GR2026_Heemdamseburg.eml.xml", b"<EML/>"),
                ("Telling_GR2026_Juinen.eml.xml", b"<EML/>"),
            ])
            .await;

            assert_matches!(
                read_eml_from_zip(zip).await,
                Err(APIError::Unprocessable(_, ErrorReference::ZipError))
            );
        }

        #[test(tokio::test)]
        async fn test_too_large() {
            let entry = ZipEntryBuilder::new("count.eml.xml".into(), Compression::Deflate)
                .uncompressed_size(128 * 1024 * 1024 + 1u64);
            let mut writer = ZipFileWriter::with_tokio(Vec::new());
            writer
                .write_entry_whole_precompressed(entry, b"")
                .await
                .unwrap();
            let zip = writer.close().await.unwrap().into_inner();

            assert_matches!(
                read_eml_from_zip(zip).await,
                Err(APIError::ContentTooLarge(
                    _,
                    ErrorReference::RequestPayloadTooLarge
                ))
            );
        }
    }

    /// Generate the count EML (510b) for the given election
    async fn count_eml(conn: &mut SqliteConnection, election_id: ElectionId) -> String {
        let election = election_repo::get(conn, election_id).await.unwrap();
        let committee_session =
            committee_session_repo::get_election_committee_session(conn, election_id)
                .await
                .unwrap();
        let results =
            data_entry_repo::list_results_for_committee_session(conn, committee_session.id)
                .await
                .unwrap();
        let totals = ElectionTotals::tabulate(&election, &results).unwrap();
        let count = election
            .as_count_eml(None, &committee_session, &results, &totals, Local::now())
            .unwrap();

        String::try_from(count).unwrap()
    }

    mod validate_import {
        use eml_nl::{
            documents::election_count::UncountedVotesReason,
            utils::{AuthorityId, StringValue},
        };
        use test_log::test;

        use super::*;
        use crate::{
            domain::{
                data_entry::{DataEntryId, DataEntryOrigin, FirstEntryFinalised},
                role::Role,
            },
            eml::EmlHash,
            repository::{data_entry_repo, user_repo::UserId},
        };

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_valid_import(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let csb_election_id = ElectionId::from(8);
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;
            let hash = EmlHash::from(eml.as_bytes()).chunks;
            let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

            // Empty CSB fixture data entry
            data_entry_repo::update(&mut conn, DataEntryId::from(801), &DataEntryStatus::Empty)
                .await
                .unwrap();

            let import = validate_import(&mut conn, &user, csb_election_id, zip, Some(&hash))
                .await
                .unwrap();

            assert_eq!(import.election.id, csb_election_id);
            assert_eq!(import.sub_committee.authority_id, "0035");
            assert_matches!(
                import.new_state,
                DataEntryStatus::FirstEntryFinalised(FirstEntryFinalised {
                    first_entry_origin: DataEntryOrigin::Import,
                    finalised_first_entry: Results::GSB(_),
                    ..
                })
            );
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_wrong_hash(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;
            let wrong_hash = std::array::from_fn(|_| "0000".to_string());
            let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

            assert_matches!(
                validate_import(
                    &mut conn,
                    &user,
                    ElectionId::from(8),
                    zip,
                    Some(&wrong_hash)
                )
                .await,
                Err(APIError::InvalidHashError)
            );
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_invalid_count_type(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;
            let mut count = ElectionCount::parse_eml(&eml, EMLParsingMode::Strict)
                .ok()
                .unwrap();

            // Only count type municipal (510b) is allowed for now
            for count_type in [
                CountType::PollingStation,
                CountType::District,
                CountType::Central,
            ] {
                count.count_type = count_type;
                let eml = String::try_from(count.clone()).unwrap();
                let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

                assert_matches!(
                    validate_import(&mut conn, &user, ElectionId::from(8), zip, None).await,
                    Err(APIError::EmlImportError(EMLImportError::InvalidCountType)),
                    "{count_type:?}"
                );
            }
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_10_csb")
        )))]
        async fn test_other_election(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;
            let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

            assert_matches!(
                validate_import(&mut conn, &user, ElectionId::from(10), zip, None).await,
                Err(APIError::EmlImportError(EMLImportError::MismatchElection))
            );
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_unknown_sub_committee(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;
            let mut count = ElectionCount::parse_eml(&eml, EMLParsingMode::Strict)
                .ok()
                .unwrap();

            // An authority that is not a sub committee of the CSB election
            count.managing_authority.authority_identifier =
                AuthorityIdentifier::new(AuthorityId::new("0001").unwrap());
            let eml = String::try_from(count).unwrap();
            let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

            assert_matches!(
                validate_import(&mut conn, &user, ElectionId::from(8), zip, None).await,
                Err(APIError::EmlImportError(EMLImportError::UnknownCommittee))
            );
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_data_entry_not_empty(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;
            let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

            assert_matches!(
                validate_import(&mut conn, &user, ElectionId::from(8), zip, None).await,
                Err(APIError::Unprocessable(
                    _,
                    ErrorReference::DataEntryNotAllowed
                ))
            );
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_completed_committee_session(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;
            committee_session_repo::change_status(
                &mut conn,
                CommitteeSessionId::from(801),
                CommitteeSessionStatus::Completed,
            )
            .await
            .unwrap();
            let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

            assert_matches!(
                validate_import(&mut conn, &user, ElectionId::from(8), zip, None).await,
                Err(APIError::Unprocessable(
                    _,
                    ErrorReference::InvalidCommitteeSessionStatus
                ))
            );
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_results_with_validation_errors(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;

            let mut count = ElectionCount::parse_eml(&eml, EMLParsingMode::Strict)
                .ok()
                .unwrap();

            // Insert wrong data
            let contest = &mut count.count.election.contests[0];
            let uncounted_votes = &mut contest.total_votes.as_mut().unwrap().uncounted_votes;
            uncounted_votes.insert(
                UncountedVotesReason::ValidPollCards,
                StringValue::from_value(1),
            );
            let eml = String::try_from(count).unwrap();
            let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

            // Empty CSB fixture data entry
            data_entry_repo::update(&mut conn, DataEntryId::from(801), &DataEntryStatus::Empty)
                .await
                .unwrap();

            assert_matches!(
                validate_import(&mut conn, &user, ElectionId::from(8), zip, None).await,
                Err(APIError::Unprocessable(
                    _,
                    ErrorReference::DataEntryValidationErrors
                ))
            );
        }
    }

    mod import {
        use test_log::test;

        use super::*;
        use crate::{
            domain::{
                data_entry::{DataEntryId, DataEntryOrigin},
                election::ElectionCategory,
                role::Role,
            },
            eml::EmlHash,
            infra::audit_log,
            repository::{data_entry_repo, user_repo::UserId},
        };

        async fn import_count(
            pool: SqlitePool,
            eml: &str,
        ) -> Result<Json<CSBDataEntryImportResponse>, APIError> {
            let user = User::test_user(Role::CoordinatorCSB, UserId::from(1));
            let audit_service = AuditService::new(Some(user.clone()), None);
            let hash = EmlHash::from(eml.as_bytes()).chunks;
            let zip = zip_with_files(&[("count.eml.xml", eml.as_bytes())]).await;

            election_data_entry_import(
                user,
                State(pool),
                Path(ElectionId::from(8)),
                audit_service,
                CSBDataEntryImportRequest { hash, data: zip },
            )
            .await
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_import_saves_results_and_logs_audit_event(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let data_entry_id = DataEntryId::from(801);
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;

            // Empty CSB fixture data entry
            data_entry_repo::update(&mut conn, data_entry_id, &DataEntryStatus::Empty)
                .await
                .unwrap();

            let response = import_count(pool, &eml).await.expect("should be Ok");
            assert_eq!(response.sub_committee.data_entry_id, data_entry_id);

            let data_entry = data_entry_repo::get(&mut conn, data_entry_id)
                .await
                .unwrap();
            let DataEntryStatus::FirstEntryFinalised(state) = &data_entry.state.0 else {
                panic!("expected FirstEntryFinalised, got {:?}", data_entry.state.0);
            };
            assert_eq!(state.first_entry_origin, DataEntryOrigin::Import);

            let count = ElectionCount::parse_eml(&eml, EMLParsingMode::Strict)
                .ok()
                .unwrap();
            let expected = GSBResults::from_eml_count(&count, ElectionCategory::Municipal).unwrap();
            assert_eq!(state.finalised_first_entry, Results::GSB(expected));

            audit_log::assert_last_event(
                &mut conn,
                AuditEventType::DataEntryImported,
                AuditEventLevel::Success,
                serde_json::json!({
                    "election_id": 8,
                    "sub_committee_id": 811,
                    "authority_id": "0035",
                    "data_entry_id": 801,
                    "data_entry_status": "first_entry_finalised",
                    "first_entry_origin": { "type": "Import" }
                }),
            )
            .await;
        }

        #[test(sqlx::test(fixtures(
            path = "../../../../fixtures",
            scripts("election_5_with_results", "election_8_csb_with_results")
        )))]
        async fn test_import_twice_not_allowed(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let eml = count_eml(&mut conn, ElectionId::from(5)).await;

            // Empty CSB fixture data entry
            data_entry_repo::update(&mut conn, DataEntryId::from(801), &DataEntryStatus::Empty)
                .await
                .unwrap();

            assert_matches!(import_count(pool.clone(), &eml).await, Ok(_));
            assert_matches!(
                import_count(pool, &eml).await,
                Err(APIError::Unprocessable(
                    _,
                    ErrorReference::DataEntryAlreadyImported
                ))
            );
        }
    }
}
