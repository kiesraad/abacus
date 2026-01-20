use axum::extract::State;
use axum_extra::response::Attachment;
use chrono::Datelike;
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse,
    domain::{
        election::ElectionWithPoliticalGroups,
        investigation::{CurrentSessionPollingStationId, PollingStationInvestigation},
        models::{ModelNa14_2Bijlage1Input, ToPdfFileModel},
        polling_station::PollingStation,
        polling_station_results::PollingStationResults,
    },
    error::ErrorReference,
    infra::authentication::Coordinator,
    repository::{
        election_repo, investigation_repo::get_polling_station_investigation, polling_station_repo,
        polling_station_result_repo::previous_results_for_polling_station,
    },
    service::pdf_gen::{VotesTablesWithOnlyPreviousVotes, generate_pdf},
};

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
    security(("cookie_auth" = ["coordinator"])),
)]
pub async fn polling_station_investigation_download_corrigendum_pdf(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    CurrentSessionPollingStationId(polling_station_id): CurrentSessionPollingStationId,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let mut conn = pool.acquire().await?;
    let investigation: PollingStationInvestigation =
        get_polling_station_investigation(&mut conn, polling_station_id).await?;
    let polling_station: PollingStation =
        polling_station_repo::get(&mut conn, polling_station_id).await?;
    let election: ElectionWithPoliticalGroups =
        election_repo::get(&mut conn, polling_station.election_id).await?;

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
