use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::Datelike;
use sqlx::SqlitePool;
use tracing::error;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    authentication::AdminOrCoordinator,
    election::ElectionId,
    error::ErrorReference,
    pdf_gen::{
        CandidatesTables, generate_pdf, generate_pdfs,
        models::{
            ModelN10_2Input, ModelNa31_2Bijlage1Input, ModelNa31_2InlegvelInput, ToPdfFileModel,
        },
    },
    polling_station,
    zip::ZipResponse,
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(election_download_n_10_2))
        .routes(routes!(election_download_na_31_2_bijlage1))
        .routes(routes!(election_download_na_31_2_inlegvel))
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
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
async fn election_download_n_10_2(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = crate::election::repository::get(&mut conn, election_id).await?;
    let current_committee_session =
        crate::committee_session::repository::get_election_committee_session(
            &mut conn,
            election.id,
        )
        .await?;
    let polling_stations = polling_station::list(&mut conn, current_committee_session.id).await?;
    drop(conn);

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

            Ok(ModelN10_2Input {
                election: election.clone(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name))
        })
        .collect::<Result<Vec<_>, APIError>>()?;

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
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
async fn election_download_na_31_2_bijlage1(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = crate::election::repository::get(&mut conn, election_id).await?;
    let current_committee_session =
        crate::committee_session::repository::get_election_committee_session(
            &mut conn,
            election.id,
        )
        .await?;
    let polling_stations = polling_station::list(&mut conn, current_committee_session.id).await?;
    drop(conn);

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

            Ok(ModelNa31_2Bijlage1Input {
                candidates_tables: CandidatesTables::new(&election)?,
                election: election.clone().into(),
                polling_station: ps.clone(),
            }
            .to_pdf_file_model(name))
        })
        .collect::<Result<Vec<_>, APIError>>()?;

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
    path = "/api/elections/{election_id}/download_na_31_2_inlegvel",
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
        ("election_id" = ElectionId, description = "Election database id"),
    ),
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
async fn election_download_na_31_2_inlegvel(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<ElectionId>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = crate::election::repository::get(&mut conn, election_id).await?;
    drop(conn);

    let name = "Model_Na_31_2_Inlegvel.pdf".to_string();

    let input = ModelNa31_2InlegvelInput {
        election: election.into(),
    }
    .to_pdf_file_model(name.clone());

    let content = generate_pdf(input).await?;

    Ok(Attachment::new(content.buffer)
        .filename(&name)
        .content_type("application/pdf"))
}
