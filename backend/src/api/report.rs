use apportionment::ApportionmentOutput;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use axum_extra::response::Attachment;
use chrono::{DateTime, Local, Utc};
use eml_nl::{EMLError, documents::election_count::ElectionCount, io::EMLWrite};
use pdf_gen::{
    generate_pdf,
    zip::{ZipResponse, ZipResponseError, slugify_filename, zip_single_file},
};
use serde::Serialize;
use sqlx::{SqliteConnection, SqlitePool};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::{
        apportionment::{ApportionmentInputData, map_candidate_nomination, map_seat_assignment},
        middleware::authentication::RouteAuthorization,
    },
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionError, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
        data_entry::DataEntrySource,
        election::{CommitteeCategory, ElectionId, ElectionWithPoliticalGroups},
        file::{File, FileType},
        investigation::PollingStationInvestigation,
        models::{
            ModelNa14_2Input, ModelNa31_2Input, ModelP2aInput, ModelP22_2Bijlage1Input,
            ModelP22_2Input, PdfFileModel, ToPdfFileModel,
            enriched_candidate_nomination::EnrichedCandidateNomination,
            enriched_seat_assignment::EnrichedSeatAssignment,
            votes_table::{VotesTables, VotesTablesWithPreviousVotes},
        },
        polling_station::PollingStation,
        results::{Results, political_group_candidate_votes::PoliticalGroupCandidateVotes},
        role::Role,
        summary::{ElectionSummary, ElectionSummaryCSB},
    },
    eml::EmlHash,
    error::ErrorReference,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
    repository::{
        committee_session_repo::{self, get_previous_session},
        data_entry_repo::{
            are_results_complete_for_committee_session, list_results_for_committee_session,
        },
        election_repo, file_repo,
        user_repo::User,
    },
    service::{FileAuditData, list_polling_stations_for_session},
};

/// Default date time format for reports
pub const DEFAULT_DATE_TIME_FORMAT: &str = "%d-%m-%Y %H:%M:%S %Z";

const EML_MIME_TYPE: &str = "text/xml";
const PDF_MIME_TYPE: &str = "application/pdf";

struct NewFile {
    committee_session_id: CommitteeSessionId,
    file_type: FileType,
    filename: String,
    data: Vec<u8>,
    mime_type: String,
    created_at: DateTime<Utc>,
}

pub struct GsbFiles {
    pub results_eml: Option<File>,
    pub results_pdf: Option<File>,
    pub overview_pdf: Option<File>,
}

impl GsbFiles {
    pub fn created_at(&self) -> DateTime<Utc> {
        self.results_eml
            .as_ref()
            .or(self.results_pdf.as_ref())
            .or(self.overview_pdf.as_ref())
            .map(|f| f.created_at)
            .expect("At least one file should be present")
    }

    pub fn needs_generation(
        &self,
        committee_session: &CommitteeSession,
        corrections: bool,
    ) -> bool {
        if committee_session.is_next_session() {
            if corrections {
                self.results_eml.is_none()
                    || self.results_pdf.is_none()
                    || self.overview_pdf.is_none()
            } else {
                self.overview_pdf.is_none()
            }
        } else {
            self.results_eml.is_none() || self.results_pdf.is_none()
        }
    }
}

pub struct CsbFiles {
    pub results_eml: Option<File>,
    pub results_pdf: Option<File>,
    pub attachment_pdf: Option<File>,
    pub total_counts_eml: Option<File>,
}

impl CsbFiles {
    pub fn created_at(&self) -> DateTime<Utc> {
        self.results_eml
            .as_ref()
            .or(self.results_pdf.as_ref())
            .or(self.attachment_pdf.as_ref())
            .or(self.total_counts_eml.as_ref())
            .map(|f| f.created_at)
            .expect("At least one file should be present")
    }

    pub fn needs_generation(&self) -> bool {
        self.results_eml.is_none()
            || self.results_pdf.is_none()
            || self.attachment_pdf.is_none()
            || self.total_counts_eml.is_none()
    }
}

#[derive(Serialize)]
pub struct FileCreatedAuditData(pub FileAuditData);
impl AsAuditEvent for FileCreatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::FileCreated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    OpenApiRouter::default()
        .routes(routes!(election_download_zip_results_gsb).authorize(&[CoordinatorGSB]))
        .routes(routes!(election_download_pdf_results_gsb).authorize(&[CoordinatorGSB]))
        .routes(routes!(election_download_zip_results_csb).authorize(&[CoordinatorCSB]))
        .routes(routes!(election_download_zip_attachment_csb).authorize(&[CoordinatorCSB]))
        .routes(routes!(election_download_zip_total_counts_csb).authorize(&[CoordinatorCSB]))
}

#[derive(Debug)]
struct ResultsInput {
    committee_session: CommitteeSession,
    election: ElectionWithPoliticalGroups,
    polling_stations: Vec<PollingStation>,
    investigations: Vec<PollingStationInvestigation>,
    results: Vec<(DataEntrySource, Results)>,
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
        let session_pss = list_polling_stations_for_session(conn, &committee_session).await?;
        let investigations = session_pss.investigations();
        let polling_stations = session_pss.into_polling_stations();
        let results = list_results_for_committee_session(conn, committee_session.id).await?;

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

        let summary = ElectionSummary::from_results(&election, &results)?;

        Ok(ResultsInput {
            committee_session,
            previous_summary,
            summary,
            created_at,
            election,
            polling_stations,
            investigations,
            results,
            previous_committee_session,
        })
    }

    fn as_xml(&self) -> Result<ElectionCount, EMLError> {
        self.election.as_count_eml(
            None,
            &self.committee_session,
            &self.results,
            &self.summary,
            self.created_at,
        )
    }

    fn xml_filename(&self) -> String {
        use chrono::Datelike;
        let location_without_whitespace: String =
            self.election.location.split_whitespace().collect();
        slugify_filename(&format!(
            "{} {}{} {}.eml.xml",
            xml_count_base_name(&self.election),
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            location_without_whitespace
        ))
    }

    fn xml_results_filename(&self) -> String {
        use chrono::Datelike;
        let location_without_whitespace: String =
            self.election.location.split_whitespace().collect();
        slugify_filename(&format!(
            "Resultaat {}{} {}.eml.xml",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            location_without_whitespace
        ))
    }

    fn results_pdf_filename(&self) -> String {
        let name = match self.election.committee_category {
            CommitteeCategory::GSB => {
                if self.committee_session.is_next_session() {
                    "Model Na14-2.pdf"
                } else {
                    "Model Na31-2.pdf"
                }
            }
            CommitteeCategory::CSB => "Model P22-2.pdf",
        };
        slugify_filename(name)
    }

    // Used for CommitteeCategory::GSB only
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
            election: self.election.clone().into(),
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

    fn get_p22_2_pdf_file(
        &self,
        apportionment_result: &ApportionmentOutput<'_, PoliticalGroupCandidateVotes>,
        hash: String,
        creation_date_time: String,
        filename: String,
    ) -> Result<PdfFileModel, APIError> {
        let summary = ElectionSummaryCSB::new(&self.summary, &self.election.political_groups);
        let seat_assignment = map_seat_assignment(&apportionment_result.seat_assignment);
        let enriched_seat_assignment =
            EnrichedSeatAssignment::new(self.election.number_of_seats, &summary, &seat_assignment)?;
        let candidate_nomination = map_candidate_nomination(
            &apportionment_result.candidate_nomination,
            self.election.political_groups.clone(),
        );
        let enriched_candidate_nomination =
            EnrichedCandidateNomination::new(&self.election, &candidate_nomination)?;
        let pdf_file: PdfFileModel = ModelP22_2Input {
            committee_session: self.committee_session.clone(),
            election: self.election.clone(),
            summary,
            seat_assignment,
            enriched_seat_assignment,
            candidate_nomination: enriched_candidate_nomination,
            result_changes_full_seats: vec![],
            result_changes_residual_seats: vec![],
            hash,
            creation_date_time,
        }
        .to_pdf_file_model(filename);
        Ok(pdf_file)
    }

    fn get_p22_2_attachment_1_pdf_file(
        &self,
        hash: String,
        creation_date_time: String,
        filename: String,
    ) -> Result<PdfFileModel, APIError> {
        let votes_tables = VotesTables::new(&self.election, &self.summary)?;
        let pdf_file: PdfFileModel = ModelP22_2Bijlage1Input {
            election: self.election.clone().into(),
            votes_tables,
            hash,
            creation_date_time,
        }
        .to_pdf_file_model(filename);
        Ok(pdf_file)
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
        &self,
        hash: String,
        creation_date_time: String,
        results_pdf_filename: String,
    ) -> Result<PdfFileModel, APIError> {
        let pdf_file: PdfFileModel = ModelNa31_2Input {
            votes_tables: VotesTables::new(&self.election, &self.summary)?,
            committee_session: self.committee_session.clone(),
            polling_stations: self.polling_stations.clone(),
            summary: self.summary.clone().into(),
            election: self.election.clone().into(),
            hash,
            creation_date_time,
        }
        .to_pdf_file_model(results_pdf_filename);
        Ok(pdf_file)
    }

    fn as_pdf_file_models_gsb(
        &self,
        xml_hash: impl Into<String>,
    ) -> Result<PdfModelListGSB, APIError> {
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

        Ok(PdfModelListGSB {
            results: results_pdf,
            overview: overview_pdf,
        })
    }

    fn as_pdf_file_models_csb(
        &self,
        apportionment_result: &ApportionmentOutput<'_, PoliticalGroupCandidateVotes>,
        xml_hash: impl Into<String>,
    ) -> Result<PdfModelListCSB, APIError> {
        let hash = xml_hash.into();
        let creation_date_time = self.created_at.format(DEFAULT_DATE_TIME_FORMAT).to_string();

        let results_pdf_filename = self.results_pdf_filename();
        let results_pdf = self.get_p22_2_pdf_file(
            apportionment_result,
            hash.clone(),
            creation_date_time.clone(),
            results_pdf_filename,
        )?;

        let attachment_pdf_filename = "Model_P22-2_bijlage.pdf".to_string();
        let attachment_pdf = self.get_p22_2_attachment_1_pdf_file(
            hash,
            creation_date_time,
            attachment_pdf_filename,
        )?;

        Ok(PdfModelListCSB {
            results: results_pdf,
            attachment: attachment_pdf,
        })
    }
}

fn xml_count_base_name(election: &ElectionWithPoliticalGroups) -> &'static str {
    match election.committee_category {
        CommitteeCategory::GSB => "Telling",
        CommitteeCategory::CSB => "Totaaltelling",
    }
}

struct PdfModelListGSB {
    results: PdfFileModel,
    overview: Option<PdfFileModel>,
}

struct PdfModelListCSB {
    results: PdfFileModel,
    attachment: PdfFileModel,
}

fn download_zip_filename(
    election: &ElectionWithPoliticalGroups,
    created_at: DateTime<Local>,
    base_name: &str,
) -> String {
    use chrono::Datelike;
    let location = election.location.to_lowercase();
    let location_without_whitespace: String = location.split_whitespace().collect();
    slugify_filename(&format!(
        "{} {}{} {} gemeente {}-{}-{}.zip",
        base_name,
        election.category.to_eml_code().to_lowercase(),
        election.election_date.year(),
        location_without_whitespace,
        location.replace(" ", "-"),
        created_at.date_naive().format("%Y%m%d"),
        created_at.time().format("%H%M%S"),
    ))
}

fn zip_file_base_name_gsb(committee_session: &CommitteeSession) -> &'static str {
    if committee_session.is_next_session() {
        "correctie"
    } else {
        "definitieve-documenten"
    }
}

fn xml_zip_filename(election: &ElectionWithPoliticalGroups) -> String {
    use chrono::Datelike;
    let location_without_whitespace: String = election.location.split_whitespace().collect();
    slugify_filename(&format!(
        "{} {}{} {}.zip",
        xml_count_base_name(election),
        election.category.to_eml_code(),
        election.election_date.year(),
        location_without_whitespace
    ))
}

fn xml_results_zip_filename(election: &ElectionWithPoliticalGroups) -> String {
    use chrono::Datelike;
    let location_without_whitespace: String = election.location.split_whitespace().collect();
    slugify_filename(&format!(
        "Resultaat {}{} {}.zip",
        election.category.to_eml_code(),
        election.election_date.year(),
        location_without_whitespace
    ))
}

#[expect(clippy::too_many_lines)]
async fn generate_and_save_files_gsb_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: CommitteeSession,
    corrections: bool,
    input: ResultsInput,
) -> Result<GsbFiles, APIError> {
    if input.election.committee_category != CommitteeCategory::GSB {
        return Err(APIError::DataIntegrityError(
            "Generating GSB files can only be done for GSB elections".to_string(),
        ));
    }

    let mut files = GsbFiles {
        results_eml: None,
        results_pdf: None,
        overview_pdf: None,
    };

    let created_at = input.created_at.with_timezone(&Utc);
    let xml_string = input.as_xml()?.write_eml_root_str(true, true)?;

    let xml_hash = EmlHash::from(xml_string.as_bytes());
    let xml_filename = input.xml_filename();
    let pdf_files = input.as_pdf_file_models_gsb(xml_hash)?;

    // For the first session, or if there are corrections, we also store the EML and count PDF
    // For next sessions without corrections, we don't store these
    if !committee_session.is_next_session() || corrections {
        files.results_eml = Some(
            create_file(
                conn,
                audit_service,
                NewFile {
                    committee_session_id: committee_session.id,
                    file_type: FileType::GsbResultsEml,
                    filename: xml_filename,
                    data: xml_string.into_bytes(),
                    mime_type: EML_MIME_TYPE.to_string(),
                    created_at,
                },
            )
            .await?,
        );

        files.results_pdf = Some(
            create_file(
                conn,
                audit_service,
                NewFile {
                    committee_session_id: committee_session.id,
                    file_type: FileType::GsbResultsPdf,
                    filename: pdf_files.results.file_name.clone(),
                    data: generate_pdf(&pdf_files.results).await?.buffer,
                    mime_type: PDF_MIME_TYPE.to_string(),
                    created_at,
                },
            )
            .await?,
        );
    }

    // Store the overview PDF for next sessions
    if let Some(overview_pdf) = pdf_files.overview {
        files.overview_pdf = Some(
            create_file(
                conn,
                audit_service,
                NewFile {
                    committee_session_id: committee_session.id,
                    file_type: FileType::GsbOverviewPdf,
                    filename: overview_pdf.file_name.clone(),
                    data: generate_pdf(&overview_pdf).await?.buffer,
                    mime_type: PDF_MIME_TYPE.to_string(),
                    created_at,
                },
            )
            .await?,
        );
    }

    Ok(files)
}

#[expect(clippy::too_many_lines)]
async fn generate_and_save_files_csb_election(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: CommitteeSession,
    input: ResultsInput,
) -> Result<CsbFiles, APIError> {
    if input.election.committee_category != CommitteeCategory::CSB {
        return Err(APIError::DataIntegrityError(
            "Generating CSB files can only be done for CSB elections".to_string(),
        ));
    }

    let created_at = input.created_at.with_timezone(&Utc);

    let xml_counts_string = input.as_xml()?.write_eml_root_str(true, true)?;
    let xml_counts_filename = input.xml_filename();

    let apportionment_input = ApportionmentInputData {
        number_of_seats: input.election.number_of_seats,
        list_votes: &input.summary.political_group_votes,
    };
    let apportionment_result = apportionment::process(&apportionment_input)?;

    let eml_results_data = input.election.as_result_eml(
        None,
        created_at,
        &apportionment_result.candidate_nomination,
    )?;
    let xml_results_string = eml_results_data.write_eml_root_str(true, true)?;
    let xml_results_hash = EmlHash::from(xml_results_string.as_bytes());
    let xml_results_filename = input.xml_results_filename();

    let pdf_files = input.as_pdf_file_models_csb(&apportionment_result, xml_results_hash)?;

    let results_eml = create_file(
        conn,
        audit_service,
        NewFile {
            committee_session_id: committee_session.id,
            file_type: FileType::CsbResultsEml,
            filename: xml_results_filename,
            data: xml_results_string.into_bytes(),
            mime_type: EML_MIME_TYPE.to_string(),
            created_at,
        },
    )
    .await?;

    let results_pdf = create_file(
        conn,
        audit_service,
        NewFile {
            committee_session_id: committee_session.id,
            file_type: FileType::CsbResultsPdf,
            filename: pdf_files.results.file_name.clone(),
            data: generate_pdf(&pdf_files.results).await?.buffer,
            mime_type: PDF_MIME_TYPE.to_string(),
            created_at,
        },
    )
    .await?;

    let attachment_pdf = create_file(
        conn,
        audit_service,
        NewFile {
            committee_session_id: committee_session.id,
            file_type: FileType::CsbAttachmentPdf,
            filename: pdf_files.attachment.file_name.clone(),
            data: generate_pdf(&pdf_files.attachment).await?.buffer,
            mime_type: PDF_MIME_TYPE.to_string(),
            created_at,
        },
    )
    .await?;

    let total_counts_eml = create_file(
        conn,
        audit_service,
        NewFile {
            committee_session_id: committee_session.id,
            file_type: FileType::CsbTotalCountsEml,
            filename: xml_counts_filename,
            data: xml_counts_string.into_bytes(),
            mime_type: EML_MIME_TYPE.to_string(),
            created_at,
        },
    )
    .await?;

    Ok(CsbFiles {
        results_eml: Some(results_eml),
        results_pdf: Some(results_pdf),
        attachment_pdf: Some(attachment_pdf),
        total_counts_eml: Some(total_counts_eml),
    })
}

async fn create_file(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    new_file: NewFile,
) -> Result<File, APIError> {
    let file = file_repo::create(
        conn,
        new_file.committee_session_id,
        new_file.file_type,
        new_file.filename,
        &new_file.data,
        new_file.mime_type,
        new_file.created_at,
    )
    .await?;

    audit_service
        .log(conn, &FileCreatedAuditData(file.clone().into()), None)
        .await?;
    Ok(file)
}

async fn get_existing_gsb_files(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<GsbFiles, APIError> {
    use FileType::*;
    Ok(GsbFiles {
        results_eml: file_repo::get_for_session(conn, committee_session_id, GsbResultsEml).await?,
        results_pdf: file_repo::get_for_session(conn, committee_session_id, GsbResultsPdf).await?,
        overview_pdf: file_repo::get_for_session(conn, committee_session_id, GsbOverviewPdf)
            .await?,
    })
}

async fn get_existing_csb_files(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<CsbFiles, APIError> {
    use FileType::*;
    Ok(CsbFiles {
        results_eml: file_repo::get_for_session(conn, committee_session_id, CsbResultsEml).await?,
        results_pdf: file_repo::get_for_session(conn, committee_session_id, CsbResultsPdf).await?,
        attachment_pdf: file_repo::get_for_session(conn, committee_session_id, CsbAttachmentPdf)
            .await?,
        total_counts_eml: file_repo::get_for_session(conn, committee_session_id, CsbTotalCountsEml)
            .await?,
    })
}

async fn get_files_gsb_election(
    pool: &SqlitePool,
    audit_service: AuditService,
    committee_session_id: CommitteeSessionId,
) -> Result<GsbFiles, APIError> {
    let mut conn = pool.acquire().await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let session_pss = list_polling_stations_for_session(&mut conn, &committee_session).await?;
    let corrections = session_pss.has_corrections();

    // Only generate files if the committee session is completed and has all the data needed
    if committee_session.status != CommitteeSessionStatus::Completed
        || committee_session.start_date_time.is_none()
        || !are_results_complete_for_committee_session(&mut conn, committee_session.id).await?
    {
        return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
    }

    // Check if files exist, if so, get files from database
    let mut files = get_existing_gsb_files(&mut conn, committee_session.id).await?;
    drop(conn);

    // If one of the files doesn't exist, generate all and save them to the database
    if files.needs_generation(&committee_session, corrections) {
        let mut tx = pool.begin_immediate().await?;
        let input = ResultsInput::new(&mut tx, committee_session.id, Local::now()).await?;
        files = generate_and_save_files_gsb_election(
            &mut tx,
            &audit_service,
            committee_session,
            corrections,
            input,
        )
        .await?;
        tx.commit().await?;
    }

    Ok(files)
}

async fn get_files_csb_election(
    pool: &SqlitePool,
    audit_service: AuditService,
    committee_session_id: CommitteeSessionId,
) -> Result<CsbFiles, APIError> {
    let mut conn = pool.acquire().await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;

    // Only generate files if the committee session is completed and has all the data needed
    if committee_session.status != CommitteeSessionStatus::Completed
        || committee_session.start_date_time.is_none()
        || !are_results_complete_for_committee_session(&mut conn, committee_session.id).await?
    {
        return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
    }

    // Check if files exist, if so, get files from database
    let mut files = get_existing_csb_files(&mut conn, committee_session.id).await?;
    drop(conn);

    // If one of the files doesn't exist, generate all and save them to the database
    if files.needs_generation() {
        let mut tx = pool.begin_immediate().await?;
        let input = ResultsInput::new(&mut tx, committee_session.id, Local::now()).await?;
        files =
            generate_and_save_files_csb_election(&mut tx, &audit_service, committee_session, input)
                .await?;
        tx.commit().await?;
    }

    Ok(files)
}

/// Download a zip containing a PDF for the PV and the EML with GSB election results
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
)]
async fn election_download_zip_results_gsb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let files = get_files_gsb_election(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = download_zip_filename(
        &election,
        files.created_at().with_timezone(&Local),
        zip_file_base_name_gsb(&committee_session),
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(pdf_file) = files.results_pdf {
            zip_writer.add_file(&pdf_file.name, &pdf_file.data).await?;
        }

        if let Some(eml_file) = files.results_eml {
            let xml_zip_filename = xml_zip_filename(&election);
            let xml_zip = zip_single_file(&eml_file.name, &eml_file.data).await?;
            zip_writer.add_file(&xml_zip_filename, &xml_zip).await?;
        }

        if let Some(overview_file) = files.overview_pdf {
            zip_writer
                .add_file(&overview_file.name, &overview_file.data)
                .await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

/// Download a generated PDF with GSB election results
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
)]
async fn election_download_pdf_results_gsb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((_election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let files = get_files_gsb_election(&pool, audit_service, committee_session_id).await?;

    let pdf_file = files.results_pdf.ok_or(APIError::BadRequest(
        "PDF results are not generated".to_string(),
        ErrorReference::PdfGenerationError,
    ))?;

    Ok(Attachment::new(pdf_file.data)
        .filename(pdf_file.name)
        .content_type(pdf_file.mime_type))
}

/// Download a zip containing a PDF for the PV and the EML with CSB election results
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_results_csb",
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
)]
async fn election_download_zip_results_csb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let files = get_files_csb_election(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = download_zip_filename(
        &election,
        files.created_at().with_timezone(&Local),
        "vaststelling-uitslag",
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(pdf_file) = files.results_pdf {
            zip_writer.add_file(&pdf_file.name, &pdf_file.data).await?;
        }

        if let Some(eml_results_file) = files.results_eml {
            let xml_zip_filename = xml_results_zip_filename(&election);
            let xml_zip = zip_single_file(&eml_results_file.name, &eml_results_file.data).await?;
            zip_writer.add_file(&xml_zip_filename, &xml_zip).await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

/// Download a zip containing a PDF with model P 22-2 Bijlage 1 for CSB
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_attachment_csb",
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
)]
async fn election_download_zip_attachment_csb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let files = get_files_csb_election(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = download_zip_filename(
        &election,
        files.created_at().with_timezone(&Local),
        "model-p22-2-bijlage",
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(attachment_pdf_file) = files.attachment_pdf {
            zip_writer
                .add_file(&attachment_pdf_file.name, &attachment_pdf_file.data)
                .await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

/// Download a zip containing a zip with the EML with CSB total counts
#[utoipa::path(
    get,
    path = "/api/elections/{election_id}/committee_sessions/{committee_session_id}/download_zip_total_counts_csb",
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
)]
async fn election_download_zip_total_counts_csb(
    user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path((election_id, committee_session_id)): Path<(ElectionId, CommitteeSessionId)>,
) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;

    let committee_category =
        committee_session_repo::get_committee_category(&mut conn, committee_session_id).await?;
    user.role().is_authorized(&committee_category)?;

    let election = election_repo::get(&mut conn, election_id).await?;
    let committee_session = committee_session_repo::get(&mut conn, committee_session_id).await?;
    let files = get_files_csb_election(&pool, audit_service, committee_session.id).await?;
    drop(conn);

    let download_zip_filename = download_zip_filename(
        &election,
        files.created_at().with_timezone(&Local),
        "definitieve-documenten",
    );

    let (zip_response, mut zip_writer) = ZipResponse::new(&download_zip_filename);

    tokio::spawn(async move {
        if let Some(total_counts_eml_file) = files.total_counts_eml {
            let xml_zip_filename = xml_zip_filename(&election);
            let xml_zip =
                zip_single_file(&total_counts_eml_file.name, &total_counts_eml_file.data).await?;
            zip_writer.add_file(&xml_zip_filename, &xml_zip).await?;
        }

        zip_writer.finish().await?;

        Ok::<(), ZipResponseError>(())
    });

    Ok(zip_response)
}

#[cfg(test)]
mod tests {
    use chrono::NaiveDateTime;
    use test_log::test;

    use super::*;
    use crate::{
        domain::{
            file::FileId,
            investigation::{InvestigationConcludedWithoutNewResults, InvestigationStatus},
            polling_station::PollingStationId,
        },
        infra::audit_log::list_event_names,
        repository::{
            committee_session_repo::{self, change_status},
            investigation_repo,
        },
    };

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_error_get_files_gsb_election_not_completed(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        let result =
            get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(6)).await;
        assert!(result.is_err());

        // Change committee session status to completed
        change_status(
            &mut conn,
            CommitteeSessionId::from(6),
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        let result =
            get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(6)).await;
        assert!(result.is_err());

        // Change committee session details
        committee_session_repo::update(
            &mut conn,
            CommitteeSessionId::from(6),
            "Juinen".to_string(),
            NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
        )
        .await
        .unwrap();

        let result =
            get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(6)).await;
        assert!(result.is_ok());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
    async fn test_get_files_gsb_election_first_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(5))
                    .await
                    .expect("should return files");
            let eml = files.results_eml.expect("should have generated eml");
            let pdf = files.results_pdf.expect("should have generated pdf");

            assert_eq!(eml.name, "Telling_GR2026_GroteStad.eml.xml");
            assert_eq!(eml.id, FileId::from(1));
            assert_eq!(pdf.name, "Model_Na31-2.pdf");
            assert_eq!(pdf.id, FileId::from(2));
            assert!(files.overview_pdf.is_none());

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated"]
            );
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_get_files_gsb_election_next_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(703))
                    .await
                    .expect("should return files");

            let eml = files.results_eml.expect("should have generated eml");
            let pdf = files.results_pdf.expect("should have generated pdf");
            let overview = files.overview_pdf.expect("should have generated overview");

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
    async fn test_get_files_gsb_election_next_session_without_corrections(pool: SqlitePool) {
        let audit_service = AuditService::new(None, None);
        let mut conn = pool.acquire().await.unwrap();

        // Update investigations, set no corrections (ConcludedWithoutNewResults)
        let status = InvestigationStatus::ConcludedWithoutNewResults(
            InvestigationConcludedWithoutNewResults {
                reason: "reason".into(),
                findings: "findings".into(),
            },
        );
        investigation_repo::save(&mut conn, PollingStationId::from(721), &status)
            .await
            .unwrap();
        investigation_repo::save(&mut conn, PollingStationId::from(732), &status)
            .await
            .unwrap();

        // File should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_gsb_election(&pool, audit_service.clone(), CommitteeSessionId::from(703))
                    .await
                    .expect("should return files");

            // No EML and no model PDF should be generated at all
            assert_eq!(files.results_eml, None);
            assert_eq!(files.results_pdf, None);
            let overview = files.overview_pdf.expect("should have generated overview");

            assert_eq!(overview.name, "Leeg_Model_P2a.pdf");
            assert_eq!(overview.id, FileId::from(1));

            assert_eq!(list_event_names(&mut conn).await.unwrap(), ["FileCreated"]);
        }
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_8_csb_with_results"))))]
    async fn test_error_get_files_csb_election_not_completed(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        let result =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await;
        assert!(result.is_err());

        // Change committee session status to completed
        change_status(
            &mut conn,
            CommitteeSessionId::from(801),
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        let result =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await;
        assert!(result.is_err());

        // Change committee session details
        committee_session_repo::update(
            &mut conn,
            CommitteeSessionId::from(801),
            "Juinen".to_string(),
            NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
        )
        .await
        .unwrap();

        let result =
            get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                .await;
        assert!(result.is_ok());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_8_csb_with_results"))))]
    async fn test_get_files_csb_election(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let audit_service = AuditService::new(None, None);

        // Change committee session status to completed
        change_status(
            &mut conn,
            CommitteeSessionId::from(801),
            CommitteeSessionStatus::Completed,
        )
        .await
        .unwrap();

        // Change committee session details
        committee_session_repo::update(
            &mut conn,
            CommitteeSessionId::from(801),
            "Juinen".to_string(),
            NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
        )
        .await
        .unwrap();

        // Files should be generated exactly once
        for _ in 1..=2 {
            let files =
                get_files_csb_election(&pool, audit_service.clone(), CommitteeSessionId::from(801))
                    .await
                    .expect("should return files");
            let pdf = files.results_pdf.expect("should have generated pdf");
            let attachment_pdf = files
                .attachment_pdf
                .expect("should have generated attachment pdf");
            let eml_total_counts = files
                .total_counts_eml
                .expect("should have generated total counts eml");
            let eml_results = files
                .results_eml
                .expect("should have generated results eml");

            assert_eq!(eml_results.name, "Resultaat_GR2024_Juinen.eml.xml");
            assert_eq!(eml_results.id, FileId::from(1));

            assert_eq!(pdf.name, "Model_P22-2.pdf");
            assert_eq!(pdf.id, FileId::from(2));

            assert_eq!(attachment_pdf.name, "Model_P22-2_bijlage.pdf");
            assert_eq!(attachment_pdf.id, FileId::from(3));

            assert_eq!(eml_total_counts.name, "Totaaltelling_GR2024_Juinen.eml.xml");
            assert_eq!(eml_total_counts.id, FileId::from(4));

            assert_eq!(
                list_event_names(&mut conn).await.unwrap(),
                ["FileCreated", "FileCreated", "FileCreated", "FileCreated"]
            );
        }
    }

    mod authorization {
        use axum::{
            extract::{Path, State},
            response::{IntoResponse, Response},
        };
        use test_log::test;

        use super::*;
        use crate::{
            api::tests::{
                assert_committee_category_authorization_err,
                assert_committee_category_authorization_ok,
            },
            domain::role::Role,
            repository::user_repo::{User, UserId},
        };

        async fn call_handlers_gsb(
            pool: SqlitePool,
            coordinator_role: Role,
        ) -> Vec<(&'static str, Response)> {
            let user = User::test_user(coordinator_role, UserId::from(1));
            let audit = AuditService::new(Some(user.clone()), None);
            let election_id = ElectionId::from(5);
            let committee_session_id = CommitteeSessionId::from(5);

            #[rustfmt::skip]
            let results = vec![
                ("download_pdf_results", election_download_pdf_results_gsb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
                ("download_zip_results", election_download_zip_results_gsb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
            ];
            results
        }

        async fn call_handlers_csb(
            pool: SqlitePool,
            coordinator_role: Role,
        ) -> Vec<(&'static str, Response)> {
            let mut conn = pool.acquire().await.unwrap();
            let user = User::test_user(coordinator_role, UserId::from(1));
            let audit = AuditService::new(Some(user.clone()), None);
            let election_id = ElectionId::from(8);
            let committee_session_id = CommitteeSessionId::from(801);

            // Change committee session status to completed
            change_status(
                &mut conn,
                committee_session_id,
                CommitteeSessionStatus::Completed,
            )
            .await
            .unwrap();

            // Change committee session details
            committee_session_repo::update(
                &mut conn,
                committee_session_id,
                "Juinen".to_string(),
                NaiveDateTime::parse_from_str("2026-03-19T09:15", "%Y-%m-%dT%H:%M").unwrap(),
            )
            .await
            .unwrap();

            #[rustfmt::skip]
            let results = vec![
                ("download_zip_results_csb", election_download_zip_results_csb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
                ("download_zip_attachment_csb", election_download_zip_attachment_csb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
                ("download_zip_total_counts_csb", election_download_zip_total_counts_csb(user.clone(), State(pool.clone()), audit.clone(), Path((election_id, committee_session_id))).await.into_response()),
            ];
            results
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn test_gsb_election_committee_category_authorization_err(pool: SqlitePool) {
            let results = call_handlers_gsb(pool, Role::CoordinatorCSB).await;
            assert_committee_category_authorization_err(results).await;
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_5_with_results"))))]
        async fn test_gsb_election_committee_category_authorization_ok(pool: SqlitePool) {
            let results = call_handlers_gsb(pool, Role::CoordinatorGSB).await;
            assert_committee_category_authorization_ok(results);
        }

        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_8_csb_with_results")
        )))]
        async fn test_csb_election_committee_category_authorization_err(pool: SqlitePool) {
            let results = call_handlers_csb(pool, Role::CoordinatorGSB).await;
            assert_committee_category_authorization_err(results).await;
        }

        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_8_csb_with_results")
        )))]
        async fn test_csb_election_committee_category_authorization_ok(pool: SqlitePool) {
            let results = call_handlers_csb(pool, Role::CoordinatorCSB).await;
            assert_committee_category_authorization_ok(results);
        }
    }
}
