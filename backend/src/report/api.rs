use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    authentication::Coordinator,
    committee_session::{CommitteeSession, CommitteeSessionError, status::CommitteeSessionStatus},
    data_entry::PollingStationResults,
    election::ElectionWithPoliticalGroups,
    eml::{EML510, EMLDocument, EmlHash, axum::Eml},
    pdf_gen::{
        generate_pdf,
        models::{ModelNa31_2Input, PdfFileModel, ToPdfFileModel},
    },
    polling_station::structs::PollingStation,
    summary::ElectionSummary,
    zip::{ZipStream, slugify_filename},
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(election_download_zip_results))
        .routes(routes!(election_download_pdf_results))
        .routes(routes!(election_download_xml_results))
}

struct ResultsInput {
    committee_session: CommitteeSession,
    election: ElectionWithPoliticalGroups,
    polling_stations: Vec<PollingStation>,
    results: Vec<(PollingStation, PollingStationResults)>,
    summary: ElectionSummary,
    creation_date_time: chrono::DateTime<chrono::Local>,
}

impl ResultsInput {
    async fn new(election_id: u32, pool: SqlitePool) -> Result<ResultsInput, APIError> {
        let election = crate::election::repository::get(&pool, election_id).await?;
        let committee_session =
            crate::committee_session::repository::get_election_committee_session(
                &pool,
                election_id,
            )
            .await?;
        let polling_stations = crate::polling_station::repository::list(&pool, election.id).await?;
        let results =
            crate::data_entry::repository::list_entries_with_polling_stations(&pool, election.id)
                .await?;

        Ok(ResultsInput {
            committee_session,
            summary: ElectionSummary::from_results(&election, &results)?,
            creation_date_time: chrono::Local::now(),
            election,
            polling_stations,
            results,
        })
    }

    fn as_xml(&self) -> EML510 {
        EML510::from_results(
            &self.election,
            &self.results,
            &self.summary,
            &self.creation_date_time,
        )
    }

    fn xml_filename(&self) -> String {
        use chrono::Datelike;
        slugify_filename(&format!(
            "Telling_{}{}_{}.eml.xml",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            self.election.location
        ))
    }

    fn pdf_filename(&self) -> String {
        use chrono::Datelike;
        slugify_filename(&format!(
            "Model_Na31-2_{}{}_{}.pdf",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            self.election.location
        ))
    }

    fn zip_name(&self) -> String {
        use chrono::Datelike;
        slugify_filename(&format!(
            "election_result_{}{}_{}.zip",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            self.election.location
        ))
    }

    fn into_pdf_file_model(self, xml_hash: impl Into<String>) -> PdfFileModel {
        let file_name = self.pdf_filename();
        ModelNa31_2Input {
            committee_session: self.committee_session,
            polling_stations: self.polling_stations,
            summary: self.summary,
            election: self.election,
            hash: xml_hash.into(),
            creation_date_time: self.creation_date_time.format("%d-%m-%Y %H:%M").to_string(),
        }
        .to_pdf_file_model(file_name)
    }
}

/// Download a zip containing a PDF for the PV and the EML with election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_zip_results",
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
async fn election_download_zip_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<impl IntoResponse, APIError> {
    let committee_session =
        crate::committee_session::repository::get_election_committee_session(&pool, election_id)
            .await?;
    if committee_session.status != CommitteeSessionStatus::DataEntryFinished {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    let input = ResultsInput::new(election_id, pool).await?;
    let xml = input.as_xml();
    let xml_string = xml.to_xml_string()?;
    let pdf_filename = input.pdf_filename();
    let xml_filename = input.xml_filename();
    let zip_filename = input.zip_name();

    let model = input.into_pdf_file_model(EmlHash::from(xml_string.as_bytes()));
    let content = generate_pdf(model).await?;

    let zip_stream = ZipStream::new(&zip_filename).await;

    zip_stream
        .add_file(pdf_filename.clone(), content.buffer)
        .await?;
    zip_stream
        .add_file(xml_filename.clone(), xml_string.into_bytes())
        .await?;

    zip_stream.finish().await?;

    Ok(zip_stream)
}

/// Download a generated PDF with election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_pdf_results",
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
        ("election_id" = u32, description = "Election database id"),
    ),
)]
async fn election_download_pdf_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let committee_session =
        crate::committee_session::repository::get_election_committee_session(&pool, election_id)
            .await?;
    if committee_session.status != CommitteeSessionStatus::DataEntryFinished {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    let input = ResultsInput::new(election_id, pool).await?;
    let xml = input.as_xml();
    let xml_string = xml.to_xml_string()?;
    let pdf_filename = input.pdf_filename();
    let model = input.into_pdf_file_model(EmlHash::from(xml_string.as_bytes()));
    let content = generate_pdf(model).await?;

    Ok(Attachment::new(content.buffer)
        .filename(pdf_filename)
        .content_type("application/pdf"))
}

/// Download a generated EML_NL 510 XML file with election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/download_xml_results",
    responses(
        (
            status = 200,
            description = "XML",
            content_type = "text/xml",
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
async fn election_download_xml_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path(election_id): Path<u32>,
) -> Result<Eml<EML510>, APIError> {
    let committee_session =
        crate::committee_session::repository::get_election_committee_session(&pool, election_id)
            .await?;
    if committee_session.status != CommitteeSessionStatus::DataEntryFinished {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    let input = ResultsInput::new(election_id, pool).await?;
    let xml = input.as_xml();
    Ok(Eml(xml))
}
