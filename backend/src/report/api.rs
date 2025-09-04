use axum::{
    extract::{Path, State},
    http::{HeaderValue, header},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use sqlx::SqlitePool;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    authentication::Coordinator,
    committee_session::{
        CommitteeSession, CommitteeSessionError, CommitteeSessionFilesUpdateRequest,
        repository::change_files, status::CommitteeSessionStatus,
    },
    data_entry::CSOFirstSessionResults,
    election::ElectionWithPoliticalGroups,
    eml::{EML510, EMLDocument, EmlHash},
    files::{
        File,
        repository::{create_file, get_file},
    },
    pdf_gen::{
        generate_pdf,
        models::{ModelNa31_2Input, PdfFileModel, ToPdfFileModel},
    },
    polling_station::structs::PollingStation,
    summary::ElectionSummary,
    zip::{ZipResponse, ZipResponseError, slugify_filename},
};

const EML_MIME_TYPE: &str = "text/xml";
const PDF_MIME_TYPE: &str = "application/pdf";

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
    results: Vec<(PollingStation, CSOFirstSessionResults)>,
    summary: ElectionSummary,
    creation_date_time: chrono::DateTime<chrono::Local>,
}

impl ResultsInput {
    async fn new(committee_session_id: u32, pool: SqlitePool) -> Result<ResultsInput, APIError> {
        let committee_session =
            crate::committee_session::repository::get(&pool, committee_session_id).await?;
        let election =
            crate::election::repository::get(&pool, committee_session.election_id).await?;
        let polling_stations =
            crate::polling_station::repository::list(&pool, committee_session.id).await?;
        let results =
            crate::data_entry::repository::list_entries_with_polling_stations_first_session(
                &pool,
                committee_session.id,
            )
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

fn zip_filename(election: ElectionWithPoliticalGroups) -> String {
    use chrono::Datelike;
    slugify_filename(&format!(
        "election_result_{}{}_{}.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        election.location
    ))
}

async fn generate_and_save_files(
    pool: SqlitePool,
    committee_session_id: u32,
) -> Result<(File, File), APIError> {
    let committee_session =
        crate::committee_session::repository::get(&pool, committee_session_id).await?;
    if committee_session.status != CommitteeSessionStatus::DataEntryFinished {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    let mut eml_file: Option<File> = None;
    let mut pdf_file: Option<File> = None;

    // Check if files exist, if so, get files from database
    if let Some(eml_id) = committee_session.results_eml {
        let file = get_file(&pool, eml_id).await?;
        eml_file = Some(file);
    }
    if let Some(pdf_id) = committee_session.results_pdf {
        let file = get_file(&pool, pdf_id).await?;
        pdf_file = Some(file);
    }

    // If one or both files don't exist, generate them and save them to the database
    if eml_file.is_none() || pdf_file.is_none() {
        let input = ResultsInput::new(committee_session.id, pool.clone()).await?;
        let xml = input.as_xml();
        let xml_string = xml.to_xml_string()?;
        let eml = create_file(
            &pool,
            xml_string.as_bytes(),
            input.xml_filename(),
            EML_MIME_TYPE.to_string(),
        )
        .await?;

        let pdf_filename = input.pdf_filename();
        let model = input.into_pdf_file_model(EmlHash::from(xml_string.as_bytes()));
        let content = generate_pdf(model).await?;
        let pdf = create_file(
            &pool,
            &content.buffer,
            pdf_filename,
            PDF_MIME_TYPE.to_string(),
        )
        .await?;

        change_files(
            &pool,
            committee_session.id,
            CommitteeSessionFilesUpdateRequest {
                results_eml: Some(eml.id),
                results_pdf: Some(pdf.id),
            },
        )
        .await?;

        eml_file = Some(eml);
        pdf_file = Some(pdf);
    }

    Ok((
        eml_file.expect("EML file should have been generated"),
        pdf_file.expect("PDF file should have been generated"),
    ))
}

/// Download a zip containing a PDF for the PV and the EML with election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results",
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
        ("committee_session_id" = u32, description = "Committee session database id"),
    ),
)]
async fn election_download_zip_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path((election_id, committee_session_id)): Path<(u32, u32)>,
) -> Result<impl IntoResponse, APIError> {
    let election = crate::election::repository::get(&pool, election_id).await?;

    let (eml_file, pdf_file) = generate_and_save_files(pool, committee_session_id).await?;
    let zip_filename = zip_filename(election);

    let (zip_response, mut zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        zip_writer
            .add_file(&pdf_file.filename, &pdf_file.data)
            .await?;
        zip_writer
            .add_file(&eml_file.filename, &eml_file.data)
            .await?;

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

/// Download a generated PDF with election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_pdf_results",
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
        ("committee_session_id" = u32, description = "Committee session database id"),
    ),
)]
async fn election_download_pdf_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path((_election_id, committee_session_id)): Path<(u32, u32)>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let (_, pdf_file) = generate_and_save_files(pool, committee_session_id).await?;

    Ok(Attachment::new(pdf_file.data)
        .filename(pdf_file.filename)
        .content_type(pdf_file.mime_type))
}

/// Download a generated EML_NL 510 XML file with election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_xml_results",
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
        ("committee_session_id" = u32, description = "Committee session database id"),
    ),
)]
async fn election_download_xml_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    Path((_election_id, committee_session_id)): Path<(u32, u32)>,
) -> Result<impl IntoResponse, APIError> {
    let (eml_file, _) = generate_and_save_files(pool, committee_session_id).await?;

    Ok((
        [(
            header::CONTENT_TYPE,
            HeaderValue::from_static(EML_MIME_TYPE),
        )],
        eml_file.data,
    ))
}
