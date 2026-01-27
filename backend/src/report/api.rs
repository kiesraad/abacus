use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::{DateTime, Local, Utc};
use sqlx::{SqliteConnection, SqlitePool};
use utoipa_axum::{router::OpenApiRouter, routes};

use super::DEFAULT_DATE_TIME_FORMAT;
use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::committee_session::CommitteeSessionError,
    domain::{
        committee_session::{
            CommitteeSession, CommitteeSessionFilesUpdateRequest, CommitteeSessionId,
        },
        committee_session_status::CommitteeSessionStatus,
        data_entry::PollingStationResults,
        election::{ElectionId, ElectionWithPoliticalGroups},
        file::{File, create_file},
        investigation::PollingStationInvestigation,
        models::{ModelNa14_2Input, ModelNa31_2Input, ModelP2aInput, PdfFileModel, ToPdfFileModel},
        votes_table::{VotesTables, VotesTablesWithPreviousVotes},
    },
    eml::{EML510, EMLDocument, EmlHash},
    error::ErrorReference,
    infra::{audit_log::AuditService, authentication::Coordinator, pdf_gen::generate_pdf},
    polling_station::{self, PollingStation},
    repository::{
        committee_session_repo,
        committee_session_repo::{change_files, get_previous_session},
        data_entry_repo::{
            are_results_complete_for_committee_session, list_results_for_committee_session,
        },
        election_repo, file_repo,
        investigation_repo::list_investigations_for_committee_session,
    },
    summary::ElectionSummary,
    zip::{ZipResponse, ZipResponseError, slugify_filename, zip_single_file},
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
    created_at: DateTime<Local>,
}

impl ResultsInput {
    async fn new(
        conn: &mut SqliteConnection,
        committee_session_id: CommitteeSessionId,
        created_at: DateTime<Local>,
    ) -> Result<ResultsInput, APIError> {
        let committee_session = committee_session_repo::get(conn, committee_session_id).await?;
        let election = election_repo::get(conn, committee_session.election_id).await?;
        let polling_stations = polling_station::list(conn, committee_session.id).await?;
        let results = list_results_for_committee_session(conn, committee_session.id).await?;

        // get investigations if this is not the first session
        let investigations = if committee_session.is_next_session() {
            list_investigations_for_committee_session(conn, committee_session.id).await?
        } else {
            vec![]
        };

        // get the previous committee session if this is not the first session
        let previous_committee_session = if committee_session.is_next_session() {
            get_previous_session(conn, committee_session.id).await?
        } else {
            None
        };

        // get the previous results summary from the previous committee session if it exists
        let previous_summary = if let Some(previous_committee_session) = &previous_committee_session
        {
            let previous_results =
                list_results_for_committee_session(conn, previous_committee_session.id).await?;
            let previous_summary = ElectionSummary::from_results(&election, &previous_results)?;
            Some(previous_summary)
        } else {
            None
        };

        Ok(ResultsInput {
            committee_session,
            previous_summary,
            summary: ElectionSummary::from_results(&election, &results)?,
            created_at,
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
            &self.committee_session,
            &self.results,
            &self.summary,
            &self.created_at,
        )
    }

    fn xml_filename(&self) -> String {
        use chrono::Datelike;
        let location_without_whitespace: String =
            self.election.location.split_whitespace().collect();
        slugify_filename(&format!(
            "Telling {}{} {}.eml.xml",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            location_without_whitespace
        ))
    }

    fn results_pdf_filename(&self) -> String {
        let name = if self.committee_session.is_next_session() {
            "Model Na14-2.pdf"
        } else {
            "Model Na31-2.pdf"
        };
        slugify_filename(name)
    }

    fn overview_pdf_filename(&self) -> Option<String> {
        if self.committee_session.is_next_session() {
            Some(slugify_filename("Leeg Model P2a.pdf"))
        } else {
            None
        }
    }

    fn get_p2a_pdf_file(&self, overview_filename: String) -> PdfFileModel {
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
        }
        .to_pdf_file_model(overview_filename)
    }

    fn get_na14_2_pdf_file(
        &self,
        previous_summary: &ElectionSummary,
        previous_committee_session: &CommitteeSession,
        hash: String,
        creation_date_time: String,
        results_pdf_filename: String,
    ) -> Result<PdfFileModel, APIError> {
        let pdf_file: PdfFileModel = ModelNa14_2Input {
            votes_tables: VotesTablesWithPreviousVotes::new(
                &self.election,
                &self.summary,
                previous_summary,
            )?,
            committee_session: self.committee_session.clone(),
            election: self.election.clone().into(),
            summary: self.summary.clone().into(),
            previous_summary: previous_summary.clone().into(),
            previous_committee_session: previous_committee_session.clone(),
            hash,
            creation_date_time,
        }
        .to_pdf_file_model(results_pdf_filename);
        Ok(pdf_file)
    }

    fn get_na31_2_pdf_file(
        self,
        hash: String,
        creation_date_time: String,
        results_pdf_filename: String,
    ) -> Result<PdfFileModel, APIError> {
        let pdf_file: PdfFileModel = ModelNa31_2Input {
            votes_tables: VotesTables::new(&self.election, &self.summary)?,
            committee_session: self.committee_session,
            polling_stations: self.polling_stations,
            summary: self.summary.into(),
            election: self.election.into(),
            hash,
            creation_date_time,
        }
        .to_pdf_file_model(results_pdf_filename);
        Ok(pdf_file)
    }

    fn into_pdf_file_models(self, xml_hash: impl Into<String>) -> Result<PdfModelList, APIError> {
        let hash = xml_hash.into();
        let creation_date_time = self.created_at.format(DEFAULT_DATE_TIME_FORMAT).to_string();

        let overview_pdf = self
            .overview_pdf_filename()
            .map(|overview_filename| self.get_p2a_pdf_file(overview_filename));

        let results_pdf_filename = self.results_pdf_filename();
        let results_pdf = if self.committee_session.is_next_session() {
            let Some(previous_summary) = &self.previous_summary else {
                return Err(APIError::DataIntegrityError(
                "Previous summary is required for generating results PDF for next committee sessions"
                    .to_string(),
            ));
            };

            let Some(previous_committee_session) = &self.previous_committee_session else {
                return Err(APIError::DataIntegrityError(
                "Previous committee session is required for generating results PDF for next committee sessions"
                    .to_string(),
            ));
            };

            self.get_na14_2_pdf_file(
                previous_summary,
                previous_committee_session,
                hash,
                creation_date_time,
                results_pdf_filename,
            )?
        } else {
            self.get_na31_2_pdf_file(hash, creation_date_time, results_pdf_filename)?
        };

        Ok(PdfModelList {
            results: results_pdf,
            overview: overview_pdf,
        })
    }
}

struct PdfModelList {
    results: PdfFileModel,
    overview: Option<PdfFileModel>,
}

fn download_zip_filename(
    election: &ElectionWithPoliticalGroups,
    committee_session: &CommitteeSession,
    created_at: DateTime<Local>,
) -> String {
    use chrono::Datelike;
    let location = election.location.to_lowercase();
    let location_without_whitespace: String = location.split_whitespace().collect();
    slugify_filename(&format!(
        "{} {}{} {} gemeente {}-{}-{}.zip",
        if committee_session.is_next_session() {
            "correctie"
        } else {
            "definitieve-documenten"
        },
        election.category.to_eml_code().to_lowercase(),
        election.election_date.year(),
        location_without_whitespace,
        location.replace(" ", "-"),
        created_at.date_naive().format("%Y%m%d"),
        created_at.time().format("%H%M%S"),
    ))
}

fn xml_zip_filename(election: &ElectionWithPoliticalGroups) -> String {
    use chrono::Datelike;
    let location_without_whitespace: String = election.location.split_whitespace().collect();
    slugify_filename(&format!(
        "Telling {}{} {}.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        location_without_whitespace
    ))
}

async fn generate_and_save_files(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: CommitteeSession,
    corrections: bool,
    input: ResultsInput,
) -> Result<(Option<File>, Option<File>, Option<File>), APIError> {
    let mut eml_file: Option<File> = None;
    let mut pdf_file: Option<File> = None;
    let mut overview_pdf_file: Option<File> = None;
    let created_at = input.created_at.with_timezone(&Utc);
    let xml_string = input.as_xml().to_xml_string()?;

    let xml_hash = EmlHash::from(xml_string.as_bytes());
    let xml_filename = input.xml_filename();
    let pdf_files = input.into_pdf_file_models(xml_hash)?;

    // For the first session, or if there are corrections, we also store the EML and count PDF
    // For next sessions without corrections, we don't store these
    if !committee_session.is_next_session() || corrections {
        let eml = create_file(
            conn,
            audit_service,
            xml_filename,
            xml_string.as_bytes(),
            EML_MIME_TYPE.to_string(),
            created_at,
        )
        .await?;

        let pdf = create_file(
            conn,
            audit_service,
            pdf_files.results.file_name.clone(),
            &generate_pdf(pdf_files.results).await?.buffer,
            PDF_MIME_TYPE.to_string(),
            created_at,
        )
        .await?;

        eml_file = Some(eml);
        pdf_file = Some(pdf);
    }

    // Store the overview PDF for next sessions
    if let Some(overview_pdf) = pdf_files.overview {
        let overview_pdf = create_file(
            conn,
            audit_service,
            overview_pdf.file_name.clone(),
            &generate_pdf(overview_pdf).await?.buffer,
            PDF_MIME_TYPE.to_string(),
            created_at,
        )
        .await?;

        overview_pdf_file = Some(overview_pdf);
    }
    change_files(
        conn,
        committee_session.id,
        CommitteeSessionFilesUpdateRequest {
            results_eml: eml_file.as_ref().map(|eml| eml.id),
            results_pdf: pdf_file.as_ref().map(|pdf| pdf.id),
            overview_pdf: overview_pdf_file.as_ref().map(|overview| overview.id),
        },
    )
    .await?;

    Ok((eml_file, pdf_file, overview_pdf_file))
}

async fn get_existing_files(
    conn: &mut SqliteConnection,
    committee_session: &CommitteeSession,
) -> Result<(Option<File>, Option<File>, Option<File>, DateTime<Utc>), APIError> {
    let mut created_at = Utc::now();
    let mut eml_file: Option<File> = None;
    let mut pdf_file: Option<File> = None;
    let mut overview_pdf_file: Option<File> = None;
    if let Some(eml_id) = committee_session.results_eml {
        let file = file_repo::get(conn, eml_id).await?;
        created_at = file.created_at;
        eml_file = Some(file);
    }
    if let Some(pdf_id) = committee_session.results_pdf {
        let file = file_repo::get(conn, pdf_id).await?;
        created_at = file.created_at;
        pdf_file = Some(file);
    }
    if let Some(overview_pdf_id) = committee_session.overview_pdf {
        let file = file_repo::get(conn, overview_pdf_id).await?;
        created_at = file.created_at;
        overview_pdf_file = Some(file);
    }
    Ok((eml_file, pdf_file, overview_pdf_file, created_at))
}

async fn get_files(
    pool: &SqlitePool,
    audit_service: AuditService,
    committee_session_id: CommitteeSessionId,
) -> Result<(Option<File>, Option<File>, Option<File>, DateTime<Utc>), APIError> {
    let mut conn = pool.acquire().await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let investigations =
        list_investigations_for_committee_session(&mut conn, committee_session.id).await?;
    let corrections = investigations
        .iter()
        .any(|inv| matches!(inv.corrected_results, Some(true)));

    // Only generate files if the committee session is completed and has all the data needed
    if committee_session.status != CommitteeSessionStatus::Completed
        || committee_session.start_date_time.is_none()
        || !are_results_complete_for_committee_session(&mut conn, committee_session.id).await?
    {
        return Err(APIError::CommitteeSession(
            CommitteeSessionError::InvalidCommitteeSessionStatus,
        ));
    }

    // Check if files exist, if so, get files from database
    let (mut eml_file, mut pdf_file, mut overview_pdf_file, mut created_at) =
        get_existing_files(&mut conn, &committee_session).await?;
    drop(conn);

    // Determine if we need to generate any of the files
    let generate_files = if committee_session.is_next_session() {
        if corrections {
            eml_file.is_none() || pdf_file.is_none() || overview_pdf_file.is_none()
        } else {
            overview_pdf_file.is_none()
        }
    } else {
        eml_file.is_none() || pdf_file.is_none()
    };

    // If one of the files doesn't exist, generate all and save them to the database
    if generate_files {
        created_at = Utc::now();
        let mut tx = pool.begin_immediate().await?;
        let input = ResultsInput::new(
            &mut tx,
            committee_session.id,
            created_at.with_timezone(&Local),
        )
        .await?;
        (eml_file, pdf_file, overview_pdf_file) = generate_and_save_files(
            &mut tx,
            &audit_service,
            committee_session,
            corrections,
            input,
        )
        .await?;
        tx.commit().await?;
    }

    Ok((eml_file, pdf_file, overview_pdf_file, created_at))
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
        ("election_id" = ElectionId, description = "Election database id"),
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn election_download_zip_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let (eml_file, pdf_file, overview_file, created_at) =
        get_files(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = download_zip_filename(
        &election,
        &committee_session,
        created_at.with_timezone(&Local),
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(pdf_file) = pdf_file {
            zip_writer.add_file(&pdf_file.name, &pdf_file.data).await?;
        }

        if let Some(eml_file) = eml_file {
            let xml_zip_filename = xml_zip_filename(&election);
            let xml_zip = zip_single_file(&eml_file.name, &eml_file.data).await?;
            zip_writer.add_file(&xml_zip_filename, &xml_zip).await?;
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
        ("election_id" = ElectionId, description = "Election database id"),
        ("committee_session_id" = CommitteeSessionId, description = "Committee session database id"),
    ),
    security(("cookie_auth" = ["coordinator"])),
)]
async fn election_download_pdf_results(
    _user: Coordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((_election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let (_, pdf_file, _, _) = get_files(&pool, audit_service, committee_session_id).await?;

    let pdf_file = pdf_file.ok_or(APIError::BadRequest(
        "PDF results are not generated".to_string(),
        ErrorReference::PdfGenerationError,
    ))?;

    Ok(Attachment::new(pdf_file.data)
        .filename(pdf_file.name)
        .content_type(pdf_file.mime_type))
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::{domain::file::FileId, infra::audit_log::list_event_names};

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_get_files_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let (eml, pdf, overview, _) =
                get_files(&pool, audit_service.clone(), CommitteeSessionId::from(5))
                    .await
                    .expect("should return files");
            let eml = eml.expect("should have generated eml");
            let pdf = pdf.expect("should have generated pdf");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(pdf.name, "Model_Na31-2.pdf");
            assert_eq!(pdf.id, FileId::from(2));
            assert!(overview.is_none());

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_get_files_next_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let (eml, pdf, overview, _) =
                get_files(&pool, audit_service.clone(), CommitteeSessionId::from(703))
                    .await
                    .expect("should return files");

            let eml = eml.expect("should have generated eml");
            let pdf = pdf.expect("should have generated pdf");
            let overview = overview.expect("should have generated overview");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(pdf.name, "Model_Na14-2.pdf");
            assert_eq!(pdf.id, FileId::from(2));
            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, FileId::from(3));

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_get_files_next_session_without_corrections(pool: SqlitePool) {
        let audit_service = AuditService::new(None, None);
        let mut conn = pool.acquire().await.unwrap();

        // Update investigations, set no corrections
        sqlx::query("UPDATE polling_station_investigations SET corrected_results = false")
            .execute(&mut *conn)
            .await
            .unwrap();

        // File should be generated exactly once
        for _ in 1..=2 {
            let (eml, pdf, overview, _) =
                get_files(&pool, audit_service.clone(), CommitteeSessionId::from(703))
                    .await
                    .expect("should return files");

            // No EML and no model PDF should be generated at all
            assert_eq!(eml, None);
            assert_eq!(pdf, None);
            let overview = overview.expect("should have generated overview");

            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, FileId::from(1));

            assert_eq!(list_event_names(&mut conn).await.unwrap(), ["FileCreated"]);
        }
    }
}
