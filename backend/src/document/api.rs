use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use chrono::Datelike;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    authentication::AdminOrCoordinator,
    election::repository::Elections,
    error::ErrorReference,
    pdf_gen::{
        generate_pdfs,
        models::{ModelNa31_2Bijlage1Input, ToPdfFileModel},
    },
    polling_station::repository::PollingStations,
    zip::ZipStream,
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default().routes(routes!(election_download_na_31_2_bijlage1))
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_na_31_2_bijlage1",
    responses(
        (
            status = 200,
            description = "ZIP",
            content_type = "application/zip",
            headers(
                ("Content-Disposition", description = "attachment; filename=\"filename.zip\"")
            )
        ),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn election_download_na_31_2_bijlage1(
    _user: AdminOrCoordinator,
    State(elections_repo): State<Elections>,
    State(polling_stations_repo): State<PollingStations>,
    Path(id): Path<u32>,
) -> Result<impl IntoResponse, APIError> {
    let election = elections_repo.get(id).await?;
    let polling_stations = polling_stations_repo.list(election.id).await?;
    let zip_filename = format!(
        "{}{}_{}_na_31_2_bijlage1.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    );

    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let models = polling_stations
        .iter()
        .map(|ps| {
            let name = format!(
                "Model_Na31-2_{}{}_Stembureau_{}_Bijlage_1.pdf",
                election.category.to_eml_code(),
                election.election_date.year(),
                ps.number
            );

            ModelNa31_2Bijlage1Input {
                election: election.clone(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name)
        })
        .collect::<Vec<_>>();

    let zip_stream = ZipStream::new(&zip_filename).await;

    generate_pdfs(models, zip_stream.sender());

    Ok(zip_stream)
}
