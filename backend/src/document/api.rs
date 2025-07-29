use axum::extract::{Path, State};
use axum_extra::response::Attachment;
use chrono::Datelike;
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    authentication::AdminOrCoordinator,
    error::ErrorReference,
    pdf_gen::{
        generate_pdfs,
        models::{ModelNa31_2Bijlage1Input, PdfModel},
    },
    zip::ZipResponse,
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
    State(pool): State<SqlitePool>,
    Path(id): Path<u32>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let election = crate::election::repository::get(&pool, id).await?;
    let polling_stations = crate::polling_station::repository::list(&pool, election.id).await?;
    let response = ZipResponse::with_name(&format!(
        "{}{}_{}_na_31_2_bijlage1.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    ));

    if polling_stations.is_empty() {
        return Err(APIError::NotFound(
            "No polling stations found".into(),
            ErrorReference::EntryNotFound,
        ));
    }

    let models = polling_stations
        .iter()
        .map(|ps| {
            PdfModel::ModelNa21_2Bijlage1(Box::new(ModelNa31_2Bijlage1Input {
                election: election.clone(),
                polling_station: ps.clone(),
            }))
        })
        .collect::<Vec<_>>();

    let content = generate_pdfs(models).await?;

    let files = content
        .into_iter()
        .zip(polling_stations.iter())
        .map(|(pdf, polling_station)| {
            let name = format!(
                "Model_Na31-2_{}{}_Stembureau_{}_Bijlage_1.pdf",
                election.category.to_eml_code(),
                election.election_date.year(),
                polling_station.number
            );

            (name, pdf.buffer)
        })
        .collect::<Vec<_>>();

    response.create_zip(files)
}
