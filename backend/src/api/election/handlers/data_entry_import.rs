use axum::{
    Json,
    extract::{Path, State},
};
use chrono::NaiveDate;
use eml_nl::{
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
    repository::{committee_session_repo, election_repo, sub_committee_repo},
};

#[derive(Debug, Deserialize, Serialize, Clone, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CSBDataEntryImportValidateRequest {
    hash: Option<[String; crate::eml::hash::CHUNK_COUNT]>,
    data: String,
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

/// Uploads data entry results, validates it and returns a redacted hash
#[utoipa::path(
    post,
    path = "/api/elections/{election_id}/data_entry/import/validate",
    request_body = CSBDataEntryImportValidateRequest,
    responses(
        (status = 200, description = "Election count validated", body = CSBDataEntryImportValidateResponse),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = ElectionId, description = "Election database id"),
    ),
)]
pub async fn election_data_entry_import_validate(
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
    Json(request): Json<CSBDataEntryImportValidateRequest>,
) -> Result<Json<CSBDataEntryImportValidateResponse>, APIError> {
    check_hash(request.data.as_bytes(), request.hash.as_ref())?;

    let definition = ElectionCount::parse_eml(&request.data, EMLParsingMode::Strict).ok()?;

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
        hash: RedactedEmlHash::from(request.data.as_bytes()),
        election_name: election.name,
        election_date: election.election_date,
        sub_committee,
    }))
}
