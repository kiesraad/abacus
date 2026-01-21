use axum::{Json, extract::State, http::StatusCode};
use sqlx::{SqliteConnection, SqlitePool};

use crate::{
    APIError, ErrorResponse,
    api::{
        extractors::CurrentSessionPollingStationId,
        util::change_committee_session_status::change_committee_session_status,
    },
    domain::{
        committee_session::CommitteeSession,
        committee_session_status::{CommitteeSessionError, CommitteeSessionStatus},
        investigation::{
            PollingStationInvestigation, PollingStationInvestigationConcludeRequest,
            PollingStationInvestigationCreateRequest, PollingStationInvestigationUpdateRequest,
        },
    },
    error::ErrorReference,
    infra::{
        audit_log::{AuditEvent, AuditService},
        authentication::Coordinator,
        db::SqlitePoolExt,
    },
    repository::{
        committee_session_repo::get_election_committee_session,
        data_entry_repo::data_entry_exists,
        investigation_repo,
        investigation_repo::{
            conclude_polling_station_investigation, create_polling_station_investigation,
            delete_polling_station_investigation, get_polling_station_investigation,
            update_polling_station_investigation,
        },
        polling_station_repo,
        polling_station_result_repo::result_exists,
    },
    service::data_entry::delete_data_entry_and_result_for_polling_station,
};

/// Validate that the committee session is in a state that allows mutations
async fn validate_and_get_committee_session(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
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
    polling_station_id: u32,
) -> Result<(), APIError> {
    if let Some(investigation) =
        delete_polling_station_investigation(conn, polling_station_id).await?
    {
        audit_service
            .log(
                conn,
                &AuditEvent::PollingStationInvestigationDeleted(investigation),
                None,
            )
            .await?;

        if committee_session.status == CommitteeSessionStatus::DataEntryFinished {
            change_committee_session_status(
                conn,
                committee_session.id,
                CommitteeSessionStatus::DataEntryInProgress,
                audit_service.clone(),
            )
            .await?;
        }
    }
    Ok(())
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
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_investigation_create(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(polling_station_investigation): Json<PollingStationInvestigationCreateRequest>,
) -> Result<(StatusCode, PollingStationInvestigation), APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    let investigation = create_polling_station_investigation(
        &mut tx,
        polling_station_id,
        polling_station_investigation,
    )
    .await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationInvestigationCreated(investigation.clone()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::Created {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryNotStarted,
            audit_service,
        )
        .await?;
    } else if committee_session.status == CommitteeSessionStatus::DataEntryFinished {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryInProgress,
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
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_investigation_conclude(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(polling_station_investigation): Json<PollingStationInvestigationConcludeRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    let polling_station = polling_station_repo::get(&mut tx, polling_station_id).await?;
    if polling_station.id_prev_session.is_none() && !polling_station_investigation.corrected_results
    {
        return Err(APIError::Conflict(
            "Investigation requires corrected results, because the polling station is not part of a previous session".into(),
            ErrorReference::InvestigationRequiresCorrectedResults,
        ));
    }

    let investigation = conclude_polling_station_investigation(
        &mut tx,
        polling_station_id,
        polling_station_investigation,
    )
    .await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationInvestigationConcluded(investigation.clone()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::DataEntryNotStarted
        || committee_session.status == CommitteeSessionStatus::DataEntryFinished
    {
        change_committee_session_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryInProgress,
            audit_service,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(investigation)
}

async fn update_investigation(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: &CommitteeSession,
    investigation_update_request: PollingStationInvestigationUpdateRequest,
    polling_station_id: u32,
) -> Result<PollingStationInvestigation, APIError> {
    let investigation = update_polling_station_investigation(
        conn,
        polling_station_id,
        investigation_update_request,
    )
    .await?;

    audit_service
        .log(
            conn,
            &AuditEvent::PollingStationInvestigationUpdated(investigation.clone()),
            None,
        )
        .await?;

    if committee_session.status == CommitteeSessionStatus::DataEntryFinished {
        change_committee_session_status(
            conn,
            committee_session.id,
            CommitteeSessionStatus::DataEntryInProgress,
            audit_service.clone(),
        )
        .await?;
    }
    Ok(investigation)
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
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_investigation_update(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(investigation_update_request): Json<PollingStationInvestigationUpdateRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    let polling_station = polling_station_repo::get(&mut tx, polling_station_id).await?;
    if polling_station.id_prev_session.is_none()
        && investigation_update_request.corrected_results != Some(true)
    {
        return Err(APIError::Conflict(
            "Investigation requires corrected results, because it is not part of a previous session".into(),
            ErrorReference::InvestigationRequiresCorrectedResults,
        ));
    }

    // If corrected_results is changed from yes to no, check if there are data entries or results.
    // If deleting them is accepted, delete them. If not, return an error.
    if investigation_update_request.corrected_results == Some(false)
        && let Ok(current) = get_polling_station_investigation(&mut tx, polling_station_id).await
        && current.corrected_results == Some(true)
        && (data_entry_exists(&mut tx, polling_station_id).await?
            || result_exists(&mut tx, polling_station_id).await?)
    {
        if investigation_update_request.accept_data_entry_deletion == Some(true) {
            let polling_station = polling_station_repo::get(&mut tx, polling_station_id).await?;
            delete_data_entry_and_result_for_polling_station(
                &mut tx,
                &audit_service,
                &committee_session,
                polling_station.id,
            )
            .await?;
        } else {
            return Err(APIError::Conflict(
                "Investigation has data entries or results".into(),
                ErrorReference::InvestigationHasDataEntryOrResult,
            ));
        }
    }

    let investigation = update_investigation(
        &mut tx,
        &audit_service,
        &committee_session,
        investigation_update_request,
        polling_station_id,
    )
    .await?;

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
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_investigation_delete(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    get_polling_station_investigation(&mut tx, polling_station_id).await?;
    let polling_station = polling_station_repo::get(&mut tx, polling_station_id).await?;

    // Delete investigation
    delete_investigation_for_polling_station(
        &mut tx,
        &audit_service,
        &committee_session,
        polling_station_id,
    )
    .await?;

    // Delete potential data entry and result linked to the polling station
    delete_data_entry_and_result_for_polling_station(
        &mut tx,
        &audit_service,
        &committee_session,
        polling_station.id,
    )
    .await?;

    // Change committee session status if last investigation is deleted
    if investigation_repo::list_investigations_for_committee_session(&mut tx, committee_session.id)
        .await?
        .is_empty()
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

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_validation_ok(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let polling_station_id = 741; // session 4 (last)
        let res = super::validate_and_get_committee_session(&mut conn, polling_station_id).await;
        assert!(res.is_ok());

        let committee_session = res.unwrap();
        assert_eq!(committee_session.number, 4);
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_validation_err_not_last_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let polling_station_id = 731; // session 3 (out of 4)
        let res = super::validate_and_get_committee_session(&mut conn, polling_station_id).await;
        assert!(res.is_err());
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_validation_err_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        let polling_station_id = 33; // part of first and only session
        let res = super::validate_and_get_committee_session(&mut conn, polling_station_id).await;
        assert!(res.is_err());
    }
}
