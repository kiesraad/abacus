use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use chrono::Datelike;
use sqlx::SqlitePool;
use tracing::error;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    authentication::AdminOrCoordinator,
    error::ErrorReference,
    pdf_gen::{
        generate_pdfs,
        models::{ModelN10_2Input, ModelNa31_2Bijlage1Input, ToPdfFileModel},
    },
    zip::ZipResponse,
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(election_download_na_31_2_bijlage1))
        .routes(routes!(election_download_n_10_2))
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
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn election_download_na_31_2_bijlage1(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<impl IntoResponse, APIError> {
    let election = crate::election::repository::get(&pool, election_id).await?;
    let current_committee_session =
        crate::committee_session::repository::get_election_committee_session(&pool, election.id)
            .await?;
    let polling_stations =
        crate::polling_station::repository::list(&pool, current_committee_session.id).await?;
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

    let (zip_response, zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Err(e) = generate_pdfs(models, zip_writer).await {
            error!("Failed to generate PDFs: {e:?}");
        }
    });

    Ok(zip_response)
}

#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_n_10_2",
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
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn election_download_n_10_2(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<impl IntoResponse, APIError> {
    let election = crate::election::repository::get(&pool, election_id).await?;
    let current_committee_session =
        crate::committee_session::repository::get_election_committee_session(&pool, election.id)
            .await?;
    let polling_stations =
        crate::polling_station::repository::list(&pool, current_committee_session.id).await?;

    let zip_filename = format!(
        "{}{}_{}_n_10_2.zip",
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
                "Model_N_10_2_{}{}_Stembureau_{}.pdf",
                election.category.to_eml_code(),
                election.election_date.year(),
                ps.number
            );

            ModelN10_2Input {
                election: election.clone(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name)
        })
        .collect::<Vec<_>>();

    let (zip_response, zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Err(e) = generate_pdfs(models, zip_writer).await {
            error!("Failed to generate PDFs: {e:?}");
        }
    });

    Ok(zip_response)
}
