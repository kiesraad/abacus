use axum::{
    Json,
    extract::{FromRef, FromRequestParts, Path, State},
    http::{StatusCode, request::Parts},
};
use axum_extra::response::Attachment;
use chrono::Datelike;
use pdf_gen::generate_pdf;
use serde::Serialize;
use sqlx::{SqliteConnection, SqlitePool};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::{
        data_entry::delete_data_entry_for_polling_station,
        middleware::authentication::CoordinatorGSB,
    },
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionError},
        committee_session_status::CommitteeSessionStatus,
        data_entry::PollingStationResults,
        election::ElectionWithPoliticalGroups,
        investigation::{
            InvestigationStatus, InvestigationTransitionError, PollingStationInvestigation,
            PollingStationInvestigationConcludeRequest, PollingStationInvestigationCreateRequest,
            PollingStationInvestigationUpdateRequest,
        },
        models::{ModelNa14_2Bijlage1Input, ToPdfFileModel},
        polling_station::{PollingStation, PollingStationId},
        votes_table::VotesTablesWithOnlyPreviousVotes,
    },
    error::ErrorReference,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{
        committee_session_repo::get_election_committee_session,
        data_entry_repo::{data_entry_exists, previous_results_for_polling_station},
        election_repo, investigation_repo, polling_station_repo,
    },
    service::{change_committee_session_status, create_empty_data_entry},
};

#[derive(Serialize)]
struct InvestigationCreatedAuditData(pub PollingStationInvestigation);
impl AsAuditEvent for InvestigationCreatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::InvestigationCreated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

#[derive(Serialize)]
struct InvestigationConcludedAuditData(pub PollingStationInvestigation);
impl AsAuditEvent for InvestigationConcludedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::InvestigationConcluded;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

#[derive(Serialize)]
struct InvestigationUpdatedAuditData(pub PollingStationInvestigation);
impl AsAuditEvent for InvestigationUpdatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::InvestigationUpdated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

#[derive(Serialize)]
struct InvestigationDeletedAuditData(pub PollingStationInvestigation);
impl AsAuditEvent for InvestigationDeletedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::InvestigationDeleted;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Info;
}

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(polling_station_investigation_create))
        .routes(routes!(polling_station_investigation_conclude))
        .routes(routes!(polling_station_investigation_update))
        .routes(routes!(polling_station_investigation_delete))
        .routes(routes!(
            polling_station_investigation_download_corrigendum_pdf
        ))
}

/// Validate that the committee session is in a state that allows mutations
async fn validate_and_get_committee_session(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<CommitteeSession, APIError> {
    let polling_station = polling_station_repo::get(conn, polling_station_id).await?;

    // Get latest committee session for the election
    let committee_session =
        get_election_committee_session(conn, polling_station.election_id).await?;

    // Ensure this is not the first session and that the polling station is part of the last session
    if !committee_session.is_next_session()
        || polling_station.committee_session_id != committee_session.id
    {
        return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
    }

    Ok(committee_session)
}

pub async fn delete_investigation_for_polling_station(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: &CommitteeSession,
    polling_station_id: PollingStationId,
) -> Result<(), APIError> {
    if let Some(old_status) = investigation_repo::delete(conn, polling_station_id).await? {
        let investigation = PollingStationInvestigation::from((polling_station_id, &old_status));
        audit_service
            .log(conn, &InvestigationDeletedAuditData(investigation), None)
            .await?;

        if committee_session.status == CommitteeSessionStatus::Completed {
            change_committee_session_status(
                conn,
                committee_session.id,
                CommitteeSessionStatus::DataEntry,
                audit_service.clone(),
            )
            .await?;
        }
    }
    Ok(())
}

impl From<InvestigationTransitionError> for APIError {
    fn from(err: InvestigationTransitionError) -> Self {
        match err {
            InvestigationTransitionError::Invalid => APIError::Conflict(
                "Invalid investigation state transition".into(),
                ErrorReference::InvalidStateTransition,
            ),
            InvestigationTransitionError::RequiresCorrectedResults => APIError::Conflict(
                "Investigation requires corrected results, because the polling station newly created in this committee session".into(),
                ErrorReference::InvestigationRequiresCorrectedResults,
            ),
        }
    }
}

pub struct CurrentSessionPollingStationId(pub PollingStationId);

impl<S> FromRequestParts<S> for CurrentSessionPollingStationId
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let path_extractor = Path::<PollingStationId>::from_request_parts(parts, state).await;
        let pool = SqlitePool::from_ref(state);
        let mut conn = pool.acquire().await?;

        if let Ok(Path(id)) = path_extractor
            && polling_station_repo::get(&mut conn, id).await.is_ok()
        {
            return Ok(CurrentSessionPollingStationId(id));
        }

        Err(APIError::NotFound(
            "Polling station not found for the current committee session".to_string(),
            ErrorReference::EntryNotFound,
        ))
    }
}

/// Create an investigation for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/investigation",
    request_body = PollingStationInvestigationCreateRequest,
    responses(
        (status = 201, description = "Polling station investigation created successfully", body = PollingStationInvestigation),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator_gsb"])),
)]
async fn polling_station_investigation_create(
    _user: CoordinatorGSB,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(request): Json<PollingStationInvestigationCreateRequest>,
) -> Result<(StatusCode, PollingStationInvestigation), APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    let status = InvestigationStatus::new(request.reason);

    investigation_repo::create(&mut tx, polling_station_id, &status)
        .await
        .map_err(|err| match err {
            sqlx::Error::RowNotFound => APIError::Conflict(
                "Investigation already exists for this polling station".into(),
                ErrorReference::EntryNotUnique,
            ),
            other => other.into(),
        })?;

    let investigation = PollingStationInvestigation::from((polling_station_id, &status));
    audit_service
        .log(
            &mut tx,
            &InvestigationCreatedAuditData(investigation.clone()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Created {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::InPreparation,
            audit_service,
        )
        .await?;
    } else if committee_session.status == CommitteeSessionStatus::Completed {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntry,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok((StatusCode::CREATED, investigation))
}

/// Conclude an investigation for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/investigation/conclude",
    request_body = PollingStationInvestigationConcludeRequest,
    responses(
        (status = 200, description = "Polling station investigation concluded successfully", body = PollingStationInvestigation),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Investigation not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator_gsb"])),
)]
async fn polling_station_investigation_conclude(
    _user: CoordinatorGSB,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(request): Json<PollingStationInvestigationConcludeRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    let current = investigation_repo::get(&mut tx, polling_station_id)
        .await?
        .ok_or_else(|| {
            APIError::NotFound(
                "Investigation not found".into(),
                ErrorReference::EntryNotFound,
            )
        })?;

    let status = if request.corrected_results {
        let ps = create_empty_data_entry(&mut tx, polling_station_id).await?;
        let data_entry_id = ps
            .data_entry_id
            .expect("create_empty_data_entry should set data_entry_id");
        current.conclude_with_new_results(request.findings, data_entry_id)?
    } else {
        let polling_station = polling_station_repo::get(&mut tx, polling_station_id).await?;
        let has_prev = polling_station.prev_data_entry_id.is_some();
        current.conclude_without_new_results(request.findings, has_prev)?
    };

    investigation_repo::save(&mut tx, polling_station_id, &status).await?;

    let investigation = PollingStationInvestigation::from((polling_station_id, &status));
    audit_service
        .log(
            &mut tx,
            &InvestigationConcludedAuditData(investigation.clone()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::InPreparation
        || committee_session.status == CommitteeSessionStatus::Completed
    {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntry,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(investigation)
}

/// Determine the correct state transition based on the current state and request
async fn apply_update(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: &CommitteeSession,
    polling_station_id: PollingStationId,
    current: InvestigationStatus,
    request: PollingStationInvestigationUpdateRequest,
) -> Result<InvestigationStatus, APIError> {
    match (&current, request.corrected_results) {
        // InProgress: text-only update
        (InvestigationStatus::InProgress(_), None) => {
            let mut status = current;
            status.update_in_progress(request.reason)?;
            Ok(status)
        }
        // InProgress + corrected_results set: invalid (must use conclude endpoint)
        (InvestigationStatus::InProgress(_), Some(_)) => {
            Err(InvestigationTransitionError::Invalid.into())
        }
        // Concluded + corrected_results omitted -> reopen to InProgress
        (
            InvestigationStatus::ConcludedWithoutNewResults(_)
            | InvestigationStatus::ConcludedWithNewResults(_),
            None,
        ) => {
            reopen_investigation(
                conn,
                audit_service,
                committee_session,
                polling_station_id,
                current,
                &request,
            )
            .await
        }
        // ConcludedWithoutNewResults: same-state text update
        (InvestigationStatus::ConcludedWithoutNewResults(_), Some(false)) => {
            let ps = polling_station_repo::get(conn, polling_station_id).await?;
            let findings = request.findings.unwrap_or_default();
            Ok(current.switch_to_without_new_results(
                request.reason,
                findings,
                ps.prev_data_entry_id.is_some(),
            )?)
        }
        // ConcludedWithoutNewResults -> ConcludedWithNewResults
        (InvestigationStatus::ConcludedWithoutNewResults(_), Some(true)) => {
            switch_to_with_new_results(conn, polling_station_id, current, request).await
        }
        // ConcludedWithNewResults: same-state text update
        (InvestigationStatus::ConcludedWithNewResults(_), Some(true)) => {
            create_empty_data_entry(conn, polling_station_id).await?;
            let ps = polling_station_repo::get(conn, polling_station_id).await?;
            let de_id = ps
                .data_entry_id
                .expect("data entry should exist after create_empty_data_entry");
            let findings = request.findings.unwrap_or_default();
            Ok(current.switch_to_with_new_results(request.reason, findings, de_id)?)
        }
        // ConcludedWithNewResults -> ConcludedWithoutNewResults
        (InvestigationStatus::ConcludedWithNewResults(_), Some(false)) => {
            switch_to_without_new_results(
                conn,
                audit_service,
                committee_session,
                polling_station_id,
                current,
                request,
            )
            .await
        }
    }
}

/// Reopen a concluded investigation back to InProgress
///
/// Deletes linked data entries if present (requires `accept_data_entry_deletion`).
async fn reopen_investigation(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: &CommitteeSession,
    polling_station_id: PollingStationId,
    current: InvestigationStatus,
    request: &PollingStationInvestigationUpdateRequest,
) -> Result<InvestigationStatus, APIError> {
    if data_entry_exists(conn, polling_station_id).await? {
        if request.accept_data_entry_deletion == Some(true) {
            delete_data_entry_for_polling_station(
                conn,
                audit_service,
                committee_session,
                polling_station_id,
            )
            .await?;
        } else {
            return Err(APIError::Conflict(
                "Investigation has data entries or results".into(),
                ErrorReference::InvestigationHasDataEntryOrResult,
            ));
        }
    }
    let mut status = current.reopen()?;
    status.update_in_progress(request.reason.clone())?;
    Ok(status)
}

/// Switch a concluded investigation to ConcludedWithoutNewResults
async fn switch_to_without_new_results(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: &CommitteeSession,
    polling_station_id: PollingStationId,
    current: InvestigationStatus,
    request: PollingStationInvestigationUpdateRequest,
) -> Result<InvestigationStatus, APIError> {
    if data_entry_exists(conn, polling_station_id).await? {
        if request.accept_data_entry_deletion == Some(true) {
            delete_data_entry_for_polling_station(
                conn,
                audit_service,
                committee_session,
                polling_station_id,
            )
            .await?;
        } else {
            return Err(APIError::Conflict(
                "Investigation has data entries or results".into(),
                ErrorReference::InvestigationHasDataEntryOrResult,
            ));
        }
    }

    let polling_station = polling_station_repo::get(conn, polling_station_id).await?;
    let has_prev = polling_station.prev_data_entry_id.is_some();
    let findings = request.findings.unwrap_or_default();
    let status = current.switch_to_without_new_results(request.reason, findings, has_prev)?;
    Ok(status)
}

/// Switch a concluded investigation to ConcludedWithNewResults
async fn switch_to_with_new_results(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    current: InvestigationStatus,
    request: PollingStationInvestigationUpdateRequest,
) -> Result<InvestigationStatus, APIError> {
    let ps = create_empty_data_entry(conn, polling_station_id).await?;
    let de_id = ps
        .data_entry_id
        .expect("create_empty_data_entry should set data_entry_id");

    let findings = request.findings.unwrap_or_default();
    let status = current.switch_to_with_new_results(request.reason, findings, de_id)?;
    Ok(status)
}

/// Update an investigation for a polling station
#[utoipa::path(
    put,
    path = "/api/polling_stations/{polling_station_id}/investigation",
    request_body = PollingStationInvestigationUpdateRequest,
    responses(
        (status = 200, description = "Polling station investigation updated successfully", body = PollingStationInvestigation),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Investigation not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator_gsb"])),
)]
async fn polling_station_investigation_update(
    _user: CoordinatorGSB,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(request): Json<PollingStationInvestigationUpdateRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    let polling_station = polling_station_repo::get(&mut tx, polling_station_id).await?;
    if polling_station.prev_data_entry_id.is_none() && request.corrected_results != Some(true) {
        return Err(APIError::Conflict(
            "Investigation requires corrected results, because it is not part of a previous session".into(),
            ErrorReference::InvestigationRequiresCorrectedResults,
        ));
    }

    let current = investigation_repo::get(&mut tx, polling_station_id)
        .await?
        .ok_or_else(|| {
            APIError::NotFound(
                "Investigation not found".into(),
                ErrorReference::EntryNotFound,
            )
        })?;

    let status = apply_update(
        &mut tx,
        &audit_service,
        &committee_session,
        polling_station_id,
        current,
        request,
    )
    .await?;

    investigation_repo::save(&mut tx, polling_station_id, &status).await?;

    let investigation = PollingStationInvestigation::from((polling_station_id, &status));
    audit_service
        .log(
            &mut tx,
            &InvestigationUpdatedAuditData(investigation.clone()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Completed {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntry,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(investigation)
}

/// Delete an investigation for a polling station
#[utoipa::path(
    delete,
    path = "/api/polling_stations/{polling_station_id}/investigation",
    responses(
        (status = 204, description = "Polling station investigation deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Investigation not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator_gsb"])),
)]
async fn polling_station_investigation_delete(
    _user: CoordinatorGSB,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    // Delete investigation (returns old status, or None if none existed)
    let old_status = investigation_repo::delete(&mut tx, polling_station_id)
        .await?
        .ok_or_else(|| {
            APIError::NotFound(
                "Investigation not found".into(),
                ErrorReference::EntryNotFound,
            )
        })?;

    let investigation = PollingStationInvestigation::from((polling_station_id, &old_status));
    audit_service
        .log(&mut tx, &InvestigationDeletedAuditData(investigation), None)
        .await?;

    if committee_session.status == CommitteeSessionStatus::Completed {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntry,
            audit_service.clone(),
        )
        .await?;
    }

    // Delete potential data entry linked to the polling station
    delete_data_entry_for_polling_station(
        &mut tx,
        &audit_service,
        &committee_session,
        polling_station_id,
    )
    .await?;

    // Change committee session status if last investigation is deleted
    if !investigation_repo::has_investigations_for_committee_session(&mut tx, committee_session.id)
        .await?
    {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::Created,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(StatusCode::NO_CONTENT)
}

/// Download a corrigendum for a polling station
#[utoipa::path(
    get,
    path = "/api/polling_stations/{polling_station_id}/investigation/download_corrigendum_pdf",
    responses(
        (
            status = 200,
            description = "PDF",
            content_type = "application/pdf",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.pdf\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator_gsb"])),
)]
async fn polling_station_investigation_download_corrigendum_pdf(
    _user: CoordinatorGSB,
    State(pool): State<SqlitePool>,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let mut conn = pool.acquire().await?;

    let status = investigation_repo::get(&mut conn, polling_station_id)
        .await?
        .ok_or_else(|| {
            APIError::NotFound(
                "Investigation not found".into(),
                ErrorReference::EntryNotFound,
            )
        })?;
    let investigation = PollingStationInvestigation::from((polling_station_id, &status));

    let polling_station: PollingStation =
        polling_station_repo::get(&mut conn, polling_station_id).await?;
    let election: ElectionWithPoliticalGroups =
        election_repo::get(&mut conn, polling_station.election_id).await?;

    let previous_results = match polling_station.prev_data_entry_id {
        Some(_) => {
            match previous_results_for_polling_station(&mut conn, polling_station_id).await {
                Ok(results) => results,
                Err(_) => {
                    return Err(APIError::NotFound(
                        "Previous results not found for the current polling station".to_string(),
                        ErrorReference::EntryNotFound,
                    ));
                }
            }
        }
        None => PollingStationResults::empty_cso_first_session(&election.political_groups),
    };

    let name = format!(
        "Model_Na14-2_{}{}_Stembureau_{}_Bijlage_1.pdf",
        election.category.to_eml_code(),
        election.election_date.year(),
        polling_station.number
    );

    let votes_tables =
        VotesTablesWithOnlyPreviousVotes::new(&election, &previous_results.as_common())?;

    let input = ModelNa14_2Bijlage1Input {
        votes_tables,
        election: election.into(),
        polling_station,
        previous_results: previous_results.as_common().into(),
        investigation,
    }
    .to_pdf_file_model(name.clone());

    let content = generate_pdf(&input).await?;

    Ok(Attachment::new(content.buffer)
        .filename(&name)
        .content_type("application/pdf"))
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use crate::domain::polling_station::PollingStationId;

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_validation_ok(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let polling_station_id = PollingStationId::from(741); // session 4 (last)
        let res = super::validate_and_get_committee_session(&mut conn, polling_station_id).await;
        assert!(res.is_ok());

        let committee_session = res.unwrap();
        assert_eq!(committee_session.number, 4);
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_validation_err_not_last_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let polling_station_id = PollingStationId::from(731); // session 3 (out of 4)
        let res = super::validate_and_get_committee_session(&mut conn, polling_station_id).await;
        assert!(res.is_err());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
    async fn test_validation_err_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let polling_station_id = PollingStationId::from(33); // part of first and only session
        let res = super::validate_and_get_committee_session(&mut conn, polling_station_id).await;
        assert!(res.is_err());
    }
}
