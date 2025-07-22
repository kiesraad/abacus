use axum::extract::{Path, State};
use axum_extra::response::Attachment;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    authentication::AdminOrCoordinator,
    election::repository::Elections,
    pdf_gen::{
        generate_pdf,
        models::{ModelNa31_2Bijlage1Input, PdfModel},
    },
    polling_station::repository::PollingStations,
    zip::{ZipContent, ZipResponse},
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default().routes(routes!(election_download_na_31_2_bijlage_1))
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_na_31_2_bijlage_1",
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
async fn election_download_na_31_2_bijlage_1(
    _user: AdminOrCoordinator,
    State(elections_repo): State<Elections>,
    State(polling_stations_repo): State<PollingStations>,
    Path(id): Path<u32>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let election = elections_repo.get(id).await?;
    let polling_stations = polling_stations_repo.list(election.id).await?;

    let response = ZipResponse::with_name(&format!("{}_na_31_2_bijlage_1", election.name));

    let mut files = Vec::new();

    for polling_station in polling_stations {
        let name = format!("{} {}", &election.name, &polling_station.name);
        let input = ModelNa31_2Bijlage1Input {
            election: election.clone(),
            polling_station,
        };
        let model = PdfModel::ModelNa21_2Bijlage1(Box::new(input));
        let content = generate_pdf(model).await?;

        files.push(ZipContent::Pdf(name, content.buffer));
    }

    response.create_zip(files)
}
