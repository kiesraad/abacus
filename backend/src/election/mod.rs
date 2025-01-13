use axum::extract::{Path, State};
#[cfg(feature = "dev-database")]
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use axum_extra::response::Attachment;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use zip::result::ZipError;
use zip::write::SimpleFileOptions;

use self::repository::Elections;
pub use self::structs::*;
use crate::data_entry::repository::PollingStationResultsEntries;
use crate::data_entry::PollingStationResults;
use crate::eml::axum::Eml;
use crate::eml::{eml_document_hash, EMLDocument, EML510};
use crate::pdf_gen::generate_pdf;
use crate::pdf_gen::models::{ModelNa31_2Input, PdfModel};
use crate::polling_station::repository::PollingStations;
use crate::polling_station::structs::PollingStation;
use crate::summary::ElectionSummary;
use crate::{APIError, ErrorResponse};

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

impl IntoResponse for Election {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
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

/// Create an election. For test usage only!
#[utoipa::path(
    post,
    path = "/api/elections",
    request_body = ElectionRequest,
    responses(
        (status = 201, description = "Election created", body = Election),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
#[cfg(feature = "dev-database")]
pub async fn election_create(
    State(elections_repo): State<Elections>,
    Json(new_election): Json<ElectionRequest>,
) -> Result<(StatusCode, Election), APIError> {
    Ok((
        StatusCode::CREATED,
        elections_repo.create(new_election).await?,
    ))
}

struct ResultsInput {
    election: Election,
    polling_stations: Vec<PollingStation>,
    results: Vec<(PollingStation, PollingStationResults)>,
    summary: ElectionSummary,
    creation_date_time: chrono::DateTime<chrono::Local>,
}

impl ResultsInput {
    async fn new(
        election_id: u32,
        elections_repo: Elections,
        polling_stations_repo: PollingStations,
        polling_station_results_entries_repo: PollingStationResultsEntries,
    ) -> Result<ResultsInput, APIError> {
        let election = elections_repo.get(election_id).await?;
        let polling_stations = polling_stations_repo.list(election.id).await?;
        let results = polling_station_results_entries_repo
            .list_with_polling_stations(polling_stations_repo, election.id)
            .await?;

        Ok(ResultsInput {
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
        format!(
            "Telling_{}{}_{}.eml.xml",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            self.election.location.replace(" ", "_"),
        )
    }

    fn pdf_filename(&self) -> String {
        use chrono::Datelike;
        format!(
            "Model_Na31-2_{}{}_{}.pdf",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            self.election.location.replace(" ", "_"),
        )
    }

    fn zip_filename(&self) -> String {
        use chrono::Datelike;
        format!(
            "election_result_{}{}_{}.zip",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            self.election.location.replace(" ", "_"),
        )
    }

    fn into_pdf_model(self, xml_hash: impl Into<String>) -> PdfModel {
        PdfModel::ModelNa31_2(ModelNa31_2Input {
            polling_stations: self.polling_stations,
            summary: self.summary,
            election: self.election,
            hash: xml_hash.into(),
            creation_date_time: self.creation_date_time.format("%d-%m-%Y %H:%M").to_string(),
        })
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
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn election_download_zip_results(
    State(elections_repo): State<Elections>,
    State(polling_stations_repo): State<PollingStations>,
    State(polling_station_results_entries_repo): State<PollingStationResultsEntries>,
    Path(id): Path<u32>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    use std::io::Write;

    let input = ResultsInput::new(
        id,
        elections_repo,
        polling_stations_repo,
        polling_station_results_entries_repo,
    )
    .await?;
    let xml = input.as_xml();
    let xml_string = xml.to_xml_string()?;
    let pdf_filename = input.pdf_filename();
    let xml_filename = input.xml_filename();
    let zip_filename = input.zip_filename();
    let model = input.into_pdf_model(eml_document_hash(&xml_string, true));
    let content = generate_pdf(model)?;

    let mut buf = vec![];
    let mut cursor = std::io::Cursor::new(&mut buf);
    let mut zip = zip::ZipWriter::new(&mut cursor);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::DEFLATE)
        // zip file format does not support dates beyond 2107 or inserted leap (i.e. 61st) second
        .last_modified_time(
            chrono::Local::now()
                .naive_local()
                .try_into()
                .expect("Timestamp should be inside zip timestamp range"),
        )
        .unix_permissions(0o644);
    zip.start_file(xml_filename, options)?;
    zip.write_all(xml_string.as_bytes()).map_err(ZipError::Io)?;
    zip.start_file(pdf_filename, options)?;
    zip.write_all(&content.buffer).map_err(ZipError::Io)?;
    zip.finish()?;

    Ok(Attachment::new(buf)
        .filename(zip_filename)
        .content_type("application/zip"))
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
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn election_download_pdf_results(
    State(elections_repo): State<Elections>,
    State(polling_stations_repo): State<PollingStations>,
    State(polling_station_results_entries_repo): State<PollingStationResultsEntries>,
    Path(id): Path<u32>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let input = ResultsInput::new(
        id,
        elections_repo,
        polling_stations_repo,
        polling_station_results_entries_repo,
    )
    .await?;
    let xml = input.as_xml();
    let xml_string = xml.to_xml_string()?;
    let pdf_filename = input.pdf_filename();
    let model = input.into_pdf_model(eml_document_hash(&xml_string, true));
    let content = generate_pdf(model)?;

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
        (status = 404, description = "Not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("election_id" = u32, description = "Election database id"),
    ),
)]
pub async fn election_download_xml_results(
    State(elections_repo): State<Elections>,
    State(polling_stations_repo): State<PollingStations>,
    State(polling_station_results_entries_repo): State<PollingStationResultsEntries>,
    Path(id): Path<u32>,
) -> Result<Eml<EML510>, APIError> {
    let input = ResultsInput::new(
        id,
        elections_repo,
        polling_stations_repo,
        polling_station_results_entries_repo,
    )
    .await?;
    let xml = input.as_xml();
    Ok(Eml(xml))
}
