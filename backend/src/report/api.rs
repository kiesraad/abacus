use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use sqlx::{SqliteConnection, SqlitePool};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::Coordinator,
    committee_session::{
        CommitteeSession, CommitteeSessionError, CommitteeSessionFilesUpdateRequest,
        repository::{all_investigations_finished, change_files},
        status::CommitteeSessionStatus,
    },
    data_entry::PollingStationResults,
    election::ElectionWithPoliticalGroups,
    eml::{EML510, EMLDocument, EmlHash},
    error::ErrorReference,
    files::{
        File,
        repository::{create_file, get_file},
    },
    investigation::PollingStationInvestigation,
    pdf_gen::{
        generate_pdf,
        models::{ModelNa14_2Input, ModelNa31_2Input, ModelP2aInput, PdfFileModel, ToPdfFileModel},
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
}

#[derive(Debug)]
struct ResultsInput {
    committee_session: CommitteeSession,
    election: ElectionWithPoliticalGroups,
    polling_stations: Vec<PollingStation>,
    investigations: Vec<PollingStationInvestigation>,
    results: Vec<(PollingStation, PollingStationResults)>,
    summary: ElectionSummary,
    previous_summary: Option<ElectionSummary>,
    previous_committee_session: Option<CommitteeSession>,
    creation_date_time: chrono::DateTime<chrono::Local>,
}

impl ResultsInput {
    async fn new(
        conn: &mut SqliteConnection,
        committee_session_id: u32,
    ) -> Result<ResultsInput, APIError> {
        let committee_session =
            crate::committee_session::repository::get(conn, committee_session_id).await?;
        let election =
            crate::election::repository::get(conn, committee_session.election_id).await?;
        let polling_stations =
            crate::polling_station::repository::list(conn, committee_session.id).await?;
        let results = crate::data_entry::repository::list_entries_for_committee_session(
            conn,
            committee_session.id,
        )
        .await?;

        // get investigations if this is not the first session
        let investigations = if committee_session.is_next_session() {
            crate::investigation::list_investigations_for_committee_session(
                conn,
                committee_session.id,
            )
            .await?
        } else {
            vec![]
        };

        // get the previous committee session if this is not the first session
        let previous_committee_session = if committee_session.is_next_session() {
            crate::committee_session::repository::get_previous_session(conn, committee_session.id)
                .await?
        } else {
            None
        };

        // get the previous results summary from the previous committee session if it exists
        let previous_summary = if let Some(previous_committee_session) = &previous_committee_session
        {
            let previous_results =
                crate::data_entry::repository::list_entries_for_committee_session(
                    conn,
                    previous_committee_session.id,
                )
                .await?;
            let previous_summary = ElectionSummary::from_results(&election, &previous_results)?;
            Some(previous_summary)
        } else {
            None
        };

        Ok(ResultsInput {
            committee_session,
            previous_summary,
            summary: ElectionSummary::from_results(&election, &results)?,
            creation_date_time: chrono::Local::now(),
            election,
            polling_stations,
            investigations,
            results,
            previous_committee_session,
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

    fn results_pdf_filename(&self) -> String {
        use chrono::Datelike;
        let name = if self.committee_session.is_next_session() {
            format!(
                "Model_Na14-2_{}{}_{}.pdf",
                self.election.category.to_eml_code(),
                self.election.election_date.year(),
                self.election.location
            )
        } else {
            format!(
                "Model_Na31-2_{}{}_{}.pdf",
                self.election.category.to_eml_code(),
                self.election.election_date.year(),
                self.election.location
            )
        };
        slugify_filename(&name)
    }

    fn overview_pdf_filename(&self) -> Option<String> {
        use chrono::Datelike;
        if self.committee_session.is_next_session() {
            Some(slugify_filename(&format!(
                "Model_P2a_{}{}_{}.pdf",
                self.election.category.to_eml_code(),
                self.election.election_date.year(),
                self.election.location
            )))
        } else {
            None
        }
    }

    fn into_pdf_file_models(self, xml_hash: impl Into<String>) -> PdfModelList {
        let hash = xml_hash.into();
        let creation_date_time = self.creation_date_time.format("%d-%m-%Y %H:%M").to_string();

        let overview_pdf = if let Some(overview_filename) = self.overview_pdf_filename() {
            Some(
                ModelP2aInput {
                    committee_session: self.committee_session.clone(),
                    election: self.election.clone(),
                    investigations: self
                        .investigations
                        .iter()
                        .map(|inv| {
                            let ps = self
                                .polling_stations
                                .iter()
                                .find(|ps| ps.id == inv.polling_station_id)
                                .cloned()
                                .expect("Polling station for investigation should exist");
                            (ps, inv.clone())
                        })
                        .collect(),
                    hash: hash.clone(),
                    creation_date_time: creation_date_time.clone(),
                }
                .to_pdf_file_model(overview_filename),
            )
        } else {
            None
        };

        let results_pdf_filename = self.results_pdf_filename();
        let results_pdf = if self.committee_session.is_next_session() {
            ModelNa14_2Input {
                committee_session: self.committee_session,
                election: self.election,
                summary: self.summary,
                previous_summary: self
                    .previous_summary
                    .expect("Previous summary should exist for committee sessions after the first"),
                previous_committee_session: self.previous_committee_session.expect(
                    "Previous committee session should exist for committee sessions after the first",
                ),
                hash,
                creation_date_time,
            }
            .to_pdf_file_model(results_pdf_filename)
        } else {
            ModelNa31_2Input {
                committee_session: self.committee_session,
                polling_stations: self.polling_stations,
                summary: self.summary,
                election: self.election,
                hash,
                creation_date_time,
            }
            .to_pdf_file_model(results_pdf_filename)
        };

        PdfModelList {
            results: results_pdf,
            overview: overview_pdf,
        }
    }
}

struct PdfModelList {
    results: PdfFileModel,
    overview: Option<PdfFileModel>,
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
    pool: &SqlitePool,
    audit_service: AuditService,
    committee_session_id: u32,
) -> Result<(Option<File>, Option<File>, Option<File>), APIError> {
    let mut conn = pool.acquire().await?;
    let committee_session =
        crate::committee_session::repository::get(&mut conn, committee_session_id).await?;
    let investigations = crate::investigation::list_investigations_for_committee_session(
        &mut conn,
        committee_session.id,
    )
    .await?;
    let corrections = investigations
        .iter()
        .any(|inv| matches!(inv.corrected_results, Some(true)));

    // Only generate files if the committee session is finished and has all the data needed
    if committee_session.status != CommitteeSessionStatus::DataEntryFinished
        || committee_session.start_date_time.is_none()
        || !all_investigations_finished(&mut conn, committee_session.id).await?
    {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    let mut eml_file: Option<File> = None;
    let mut pdf_file: Option<File> = None;
    let mut overview_pdf_file: Option<File> = None;

    // Check if files exist, if so, get files from database
    if let Some(eml_id) = committee_session.results_eml {
        let file = get_file(&mut conn, eml_id).await?;
        eml_file = Some(file);
    }
    if let Some(pdf_id) = committee_session.results_pdf {
        let file = get_file(&mut conn, pdf_id).await?;
        pdf_file = Some(file);
    }
    if let Some(overview_pdf_id) = committee_session.overview_pdf {
        let file = get_file(&mut conn, overview_pdf_id).await?;
        overview_pdf_file = Some(file);
    }
    drop(conn);

    // Determine if we need to generate any of the files
    let generate_files = if committee_session.is_next_session() {
        if corrections {
            eml_file.is_some() || pdf_file.is_some() || overview_pdf_file.is_some()
        } else {
            overview_pdf_file.is_some()
        }
    } else {
        eml_file.is_some() || pdf_file.is_some()
    };

    // If one of the files doesn't exist, generate all and save them to the database
    if generate_files {
        let mut tx = pool.begin_immediate().await?;

        let input = ResultsInput::new(&mut tx, committee_session.id).await?;
        let xml = input.as_xml();
        let xml_string = xml.to_xml_string()?;

        let xml_hash = EmlHash::from(xml_string.as_bytes());
        let xml_filename = input.xml_filename();
        let pdf_files = input.into_pdf_file_models(xml_hash);

        // For the first session, or if there are corrections, we also store the EML and count PDF
        // For next sessions without corrections, we don't store these
        if !committee_session.is_next_session() || corrections {
            let eml = create_file(
                &mut tx,
                xml_filename,
                xml_string.as_bytes(),
                EML_MIME_TYPE.to_string(),
            )
            .await?;

            audit_service
                .log(&mut tx, &AuditEvent::FileCreated(eml.clone().into()), None)
                .await?;

            let pdf = create_file(
                &mut tx,
                pdf_files.results.file_name.clone(),
                &generate_pdf(pdf_files.results).await?.buffer,
                PDF_MIME_TYPE.to_string(),
            )
            .await?;

            audit_service
                .log(&mut tx, &AuditEvent::FileCreated(pdf.clone().into()), None)
                .await?;

            change_files(
                &mut tx,
                committee_session.id,
                CommitteeSessionFilesUpdateRequest {
                    results_eml: Some(eml.id),
                    results_pdf: Some(pdf.id),
                    overview_pdf: overview_pdf_file.as_ref().map(|overview| overview.id),
                },
            )
            .await?;

            eml_file = Some(eml);
            pdf_file = Some(pdf);
        }

        // Store the overview PDF for next sessions
        if let Some(overview_pdf) = pdf_files.overview {
            let overview_pdf = create_file(
                &mut tx,
                overview_pdf.file_name.clone(),
                &generate_pdf(overview_pdf).await?.buffer,
                PDF_MIME_TYPE.to_string(),
            )
            .await?;
            audit_service
                .log(
                    &mut tx,
                    &AuditEvent::FileCreated(overview_pdf.clone().into()),
                    None,
                )
                .await?;
            overview_pdf_file = Some(overview_pdf);
        }

        tx.commit().await?;
    }

    Ok((eml_file, pdf_file, overview_pdf_file))
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
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(u32, u32)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = crate::election::repository::get(&mut conn, election_id).await?;
    let (eml_file, pdf_file, overview_file) =
        generate_and_save_files(&pool, audit_service, committee_session_id).await?;
    drop(conn);

    let zip_filename = zip_filename(election);

    let (zip_response, mut zip_writer) = ZipResponse::new(&zip_filename);

    tokio::spawn(async move {
        if let Some(pdf_file) = pdf_file {
            zip_writer.add_file(&pdf_file.name, &pdf_file.data).await?;
        }

        if let Some(eml_file) = eml_file {
            zip_writer.add_file(&eml_file.name, &eml_file.data).await?;
        }

        if let Some(overview_file) = overview_file {
            zip_writer
                .add_file(&overview_file.name, &overview_file.data)
                .await?;
        }

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
    audit_service: AuditService,
    Path((_election_id, committee_session_id)): Path<(u32, u32)>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let (_, pdf_file, _) =
        generate_and_save_files(&pool, audit_service, committee_session_id).await?;

    let pdf_file = pdf_file.ok_or(APIError::BadRequest(
        "PDF results is not generated".to_string(),
        ErrorReference::PdfGenerationError,
    ))?;

    Ok(Attachment::new(pdf_file.data)
        .filename(pdf_file.name)
        .content_type(pdf_file.mime_type))
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::audit_log::list_event_names;
    use test_log::test;

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_generate_and_save_files_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let (eml, pdf, overview) = generate_and_save_files(&pool, audit_service.clone(), 5)
                .await
                .expect("should return files");
            let eml = eml.expect("should have generated eml");
            let pdf = pdf.expect("should have generated pdf");

            assert_eq!(eml.name, "Telling_GR2026_Grote_Stad.eml.xml");
            assert_eq!(eml.id, 1);
            assert_eq!(pdf.name, "Model_Na31-2_GR2026_Grote_Stad.pdf");
            assert_eq!(pdf.id, 2);
            assert!(overview.is_none());

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(
        path = "../../fixtures",
        scripts("election_8_four_sessions_with_results.sql")
    )))]
    async fn test_generate_and_save_files_next_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let (eml, pdf, overview) = generate_and_save_files(&pool, audit_service.clone(), 703)
                .await
                .expect("should return files");

            let eml = eml.expect("should have generated eml");
            let pdf = pdf.expect("should have generated pdf");

            let overview = overview.expect("should have generated overview");

            assert_eq!(eml.name, "Telling_GR2026_Grote_Stad.eml.xml");
            assert_eq!(eml.id, 1);
            assert_eq!(pdf.name, "Model_Na14-2_GR2026_Grote_Stad.pdf");
            assert_eq!(pdf.id, 3);
            assert_eq!(overview.name, "Model_P2a_GR2026_Grote_Stad.pdf");
            assert_eq!(overview.id, 2);

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated"]
            );
        }
    }
}
