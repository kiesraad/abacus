use axum::{
    Json,
    extract::{Path, State},
};
use axum_extra::response::Attachment;
use chrono::Datelike;
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{
    repository::{
        conclude_polling_station_investigation, create_polling_station_investigation,
        get_polling_station_investigation, update_polling_station_investigation,
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
    committee_session::status::{CommitteeSessionStatus, change_committee_session_status},
    data_entry::{PollingStationResults, repository::most_recent_results_for_polling_station},
    election::ElectionWithPoliticalGroups,
    error::ErrorReference,
    pdf_gen::{
        generate_pdf,
        models::{ModelNa14_2Bijlage1Input, ToPdfFileModel},
    },
    polling_station::PollingStation,
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(polling_station_investigation_create))
        .routes(routes!(polling_station_investigation_conclude))
        .routes(routes!(polling_station_investigation_update))
        .routes(routes!(
            polling_station_investigation_download_corrigendum_pdf
        ))
}

/// Create an investigation for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/investigation",
    request_body = PollingStationInvestigationCreateRequest,
    responses(
        (status = 200, description = "Polling station investigation added successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Polling station not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_investigation_create(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(polling_station_investigation): Json<PollingStationInvestigationCreateRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

    // Check if the polling station and its committee session exist, will respond with NOT_FOUND otherwise
    let polling_station =
        crate::polling_station::repository::get(&mut tx, polling_station_id).await?;
    let committee_session =
        crate::committee_session::repository::get(&mut tx, polling_station.committee_session_id)
            .await?;

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
    };

    tx.commit().await?;

    Ok(investigation)
}

/// Conclude an investigation for a polling station
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/investigation/conclude",
    request_body = PollingStationInvestigationConcludeRequest,
    responses(
        (status = 200, description = "Polling station investigation concluded successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Investigation not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_investigation_conclude(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(polling_station_investigation): Json<PollingStationInvestigationConcludeRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

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

    tx.commit().await?;

    Ok(investigation)
}

/// Update an investigation for a polling station
#[utoipa::path(
    put,
    path = "/api/polling_stations/{polling_station_id}/investigation",
    request_body = PollingStationInvestigationUpdateRequest,
    responses(
        (status = 200, description = "Polling station investigation updated successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Investigation not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_investigation_update(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
    Json(polling_station_investigation): Json<PollingStationInvestigationUpdateRequest>,
) -> Result<PollingStationInvestigation, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let investigation = update_polling_station_investigation(
        &mut tx,
        polling_station_id,
        polling_station_investigation,
    )
    .await?;

    audit_service
        .log(
            &mut tx,
            &AuditEvent::PollingStationInvestigationUpdated(investigation.clone()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(investigation)
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
        ("polling_station_id" = u32, description = "Polling station database id"),
    ),
)]
async fn polling_station_investigation_download_corrigendum_pdf(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(polling_station_id): Path<u32>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let mut conn = pool.acquire().await?;
    let investigation: PollingStationInvestigation =
        get_polling_station_investigation(&mut conn, polling_station_id).await?;
    let polling_station: PollingStation =
        crate::polling_station::repository::get(&mut conn, polling_station_id).await?;
    let election: ElectionWithPoliticalGroups =
        crate::election::repository::get(&mut conn, polling_station.election_id).await?;

    let previous_results = if let Some(id) = polling_station.id_prev_session {
        let Some(results) = most_recent_results_for_polling_station(&mut conn, id).await? else {
            return Err(APIError::NotFound(
                "Previous results not found for the current polling station".to_string(),
                ErrorReference::EntryNotFound,
            ));
        };
        results
    } else {
        PollingStationResults::empty_cso_first_session(&election.political_groups)
    };

    let name = format!(
        "Model_Na14-2_{}{}_Stembureau_{}_Bijlage_1.pdf",
        election.category.to_eml_code(),
        election.election_date.year(),
        polling_station.number
    );

    let content = generate_pdf(
        ModelNa14_2Bijlage1Input {
            election,
            polling_station,
            previous_results: previous_results.as_common(),
            investigation,
        }
        .to_pdf_file_model(name.clone()),
    )
    .await?;

    Ok(Attachment::new(content.buffer)
        .filename(&name)
        .content_type("application/pdf"))
}
