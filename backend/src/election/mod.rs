use axum::extract::{Path, State};
use axum::Json;
use axum_extra::response::Attachment;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use self::repository::Elections;
pub use self::structs::*;
use crate::data_entry::repository::PollingStationResultsEntries;
use crate::pdf_gen::generate_pdf;
use crate::pdf_gen::models::{ModelNa31_2Input, ModelNa31_2Summary, PdfModel};
use crate::polling_station::repository::PollingStations;
use crate::polling_station::structs::{PollingStation, PollingStationStatusEntry};
use crate::APIError;

pub(crate) mod repository;
pub mod structs;

/// Election list response
///
/// Does not include the candidate list (political groups) to keep the response size small.
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionListResponse {
    pub elections: Vec<Election>,
}

/// Election details response, including the election's candidate list (political groups) and its polling stations
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionDetailsResponse {
    pub election: Election,
    pub polling_stations: Vec<PollingStation>,
}

/// Election polling stations data entry statuses response
#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ElectionStatusResponse {
    pub statuses: Vec<PollingStationStatusEntry>,
}

/// Get a list of all elections, without their candidate lists
#[utoipa::path(
    get,
    path = "/api/elections",
    responses(
        (status = 200, description = "Election list", body = ElectionListResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn election_list(
    State(elections_repo): State<Elections>,
) -> Result<Json<ElectionListResponse>, APIError> {
    let elections = elections_repo.list().await?;
    Ok(Json(ElectionListResponse { elections }))
}

/// Get election details including the election's candidate list (political groups) and its polling stations
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}",
    responses(
        (status = 200, description = "Election", body = ElectionDetailsResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn election_details(
    State(elections_repo): State<Elections>,
    State(polling_stations): State<PollingStations>,
    Path(id): Path<u32>,
) -> Result<Json<ElectionDetailsResponse>, APIError> {
    let election = elections_repo.get(id).await?;
    let polling_stations = polling_stations.list(id).await?;
    Ok(Json(ElectionDetailsResponse {
        election,
        polling_stations,
    }))
}

/// Get election polling stations data entry statuses
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/status",
    responses(
        (status = 200, description = "Election", body = ElectionStatusResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn election_status(
    State(polling_station_repo): State<PollingStations>,
    Path(id): Path<u32>,
) -> Result<Json<ElectionStatusResponse>, APIError> {
    let statuses = polling_station_repo.status(id).await?;
    Ok(Json(ElectionStatusResponse { statuses }))
}

/// Download a generated PDF with election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_results",
    responses(
        (
            status = 200,
            description = "PDF",
            content_type="application/pdf",
            headers(
                ("Content-Type", description = "application/pdf"),
                ("Content-Disposition", description = "attachment; filename=\"filename.pdf\"")
            )
        ),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn election_download_results(
    State(elections_repo): State<Elections>,
    State(polling_stations_repo): State<PollingStations>,
    State(polling_station_results_entries_repo): State<PollingStationResultsEntries>,
    Path(id): Path<u32>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let election = elections_repo.get(id).await?;
    let polling_stations = polling_stations_repo.list(election.id).await?;
    let results = polling_station_results_entries_repo
        .list_with_polling_stations(election.id)
        .await?;
    let summary = ModelNa31_2Summary::from_results(&election, &results)?;

    let model = PdfModel::ModelNa31_2(ModelNa31_2Input {
        polling_stations,
        summary,
        election,
    });
    let mut filename: String = model.as_filename().to_string();
    filename.push_str(".pdf");
    let content = generate_pdf(model)?;

    Ok(Attachment::new(content.buffer)
        .filename(filename)
        .content_type("application/pdf"))
}
