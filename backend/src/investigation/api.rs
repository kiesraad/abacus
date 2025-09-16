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
        get_polling_station_investigation,
    },
    structs::{
        PollingStationInvestigation, PollingStationInvestigationConcludeRequest,
        PollingStationInvestigationCreateRequest,
    },
};
use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::Coordinator,
    data_entry::{
        CSOFirstSessionResults, PollingStationResults, VotesCounts,
        repository::most_recent_results_for_polling_station,
    },
    election::ElectionWithPoliticalGroups,
    investigation::{
        repository::update_polling_station_investigation,
        structs::{CurrentSessionPollingStationId, PollingStationInvestigationUpdateRequest},
    },
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
        most_recent_results_for_polling_station(&mut conn, id).await?
    } else {
        Some(PollingStationResults::CSOFirstSession(
            CSOFirstSessionResults {
                extra_investigation: Default::default(),
                counting_differences_polling_station: Default::default(),
                voters_counts: Default::default(),
                votes_counts: VotesCounts {
                    political_group_total_votes:
                        CSOFirstSessionResults::default_political_group_total_votes(
                            &election.political_groups,
                        ),
                    ..Default::default()
                },
                differences_counts: Default::default(),
                political_group_votes: CSOFirstSessionResults::default_political_group_votes(
                    &election.political_groups,
                ),
            },
        ))
    };

    let name = format!(
        "Model_Na14-2_{}{}_Stembureau_{}_Bijlage_1.pdf",
        election.category.to_eml_code(),
        election.election_date.year(),
        polling_station.number
    );

    let content = generate_pdf(
        ModelNa14_2Bijlage1Input {
            election: election.clone(),
            polling_station: polling_station.clone(),
            previous_results: previous_results.expect("Previous results should exist"),
            investigation: investigation.clone(),
        }
        .to_pdf_file_model(name.clone()),
    )
    .await?;

    Ok(Attachment::new(content.buffer)
        .filename(&name)
        .content_type("application/pdf"))
}
