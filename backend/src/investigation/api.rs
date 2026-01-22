use axum::{Json, extract::State, http::StatusCode};
use axum_extra::response::Attachment;
use chrono::Datelike;
use sqlx::{SqliteConnection, SqlitePool};
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    repository::{
        conclude_polling_station_investigation, create_polling_station_investigation,
        delete_polling_station_investigation, get_polling_station_investigation,
        list_investigations_for_committee_session, update_polling_station_investigation,
    },
    structs::{
        CurrentSessionPollingStationId, PollingStationInvestigation,
        PollingStationInvestigationConcludeRequest, PollingStationInvestigationCreateRequest,
        PollingStationInvestigationUpdateRequest,
    },
};
use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::Coordinator,
    committee_session::{
        CommitteeSession, CommitteeSessionError,
        repository::get_election_committee_session,
        status::{CommitteeSessionStatus, change_committee_session_status},
    },
    data_entry::{
        PollingStationResults, delete_data_entry_and_result_for_polling_station,
        repository::{data_entry_exists, previous_results_for_polling_station, result_exists},
    },
    election::ElectionWithPoliticalGroups,
    error::ErrorReference,
    pdf_gen::{
        VotesTablesWithOnlyPreviousVotes, generate_pdf,
        models::{ModelNa14_2Bijlage1Input, ToPdfFileModel},
    },
    polling_station::{self, PollingStation, PollingStationId},
};

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
    let polling_station = polling_station::get(conn, polling_station_id).await?;

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
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_investigation_create(
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
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_investigation_conclude(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(polling_station_investigation): Json<PollingStationInvestigationConcludeRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    let polling_station = polling_station::get(&mut tx, polling_station_id).await?;
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

async fn update_investigation(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: &CommitteeSession,
    investigation_update_request: PollingStationInvestigationUpdateRequest,
    polling_station_id: PollingStationId,
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

    if committee_session.status == CommitteeSessionStatus::Completed {
        change_committee_session_status(
            conn,
            committee_session.id,
            CommitteeSessionStatus::DataEntry,
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
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_investigation_update(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(investigation_update_request): Json<PollingStationInvestigationUpdateRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    let polling_station = polling_station::get(&mut tx, polling_station_id).await?;
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
            let polling_station = polling_station::get(&mut tx, polling_station_id).await?;
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
        ("polling_station_id" = PollingStationId, description = "Polling station database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_investigation_delete(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let committee_session = validate_and_get_committee_session(&mut tx, polling_station_id).await?;

    get_polling_station_investigation(&mut tx, polling_station_id).await?;
    let polling_station = polling_station::get(&mut tx, polling_station_id).await?;

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
    if list_investigations_for_committee_session(&mut tx, committee_session.id)
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
    security(("cookie_auth" = ["coordinator"])),
)]
async fn polling_station_investigation_download_corrigendum_pdf(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let mut conn = pool.acquire().await?;
    let investigation: PollingStationInvestigation =
        get_polling_station_investigation(&mut conn, polling_station_id).await?;
    let polling_station: PollingStation =
        polling_station::get(&mut conn, polling_station_id).await?;
    let election: ElectionWithPoliticalGroups =
        crate::election::repository::get(&mut conn, polling_station.election_id).await?;

    let previous_results = match polling_station.id_prev_session {
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

    let content = generate_pdf(input).await?;

    Ok(Attachment::new(content.buffer)
        .filename(&name)
        .content_type("application/pdf"))
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use crate::polling_station::PollingStationId;

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
