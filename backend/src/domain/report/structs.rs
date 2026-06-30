use apportionment::ApportionmentDetails;
use chrono::{DateTime, Datelike, Local, Utc};
use eml_nl::{EMLError, documents::election_count::ElectionCount, io::EMLWrite};
use pdf_gen::{generate_pdf, zip::slugify_filename};
use serde::Serialize;
use sqlx::SqliteConnection;

use crate::{
    APIError,
    api::apportionment::{map_candidate_nomination, map_seat_assignment},
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionId},
        data_entry::DataEntrySource,
        election::{CommitteeCategory, ElectionWithPoliticalGroups},
        file::{File, FileType},
        investigation::PollingStationInvestigation,
        models::{
            ModelNa14_2Input, ModelNa31_2Input, ModelP2aInput, ModelP22_2Bijlage1Input,
            ModelP22_2Input, PdfFileModel, ToPdfFileModel,
            apportionment_footnotes::ApportionmentFootnotes,
            enriched_candidate_nomination::EnrichedCandidateNomination,
            enriched_seat_assignment::EnrichedSeatAssignment,
            votes_table::{VotesTables, VotesTablesWithPreviousVotes},
        },
        polling_station::PollingStation,
        report::DEFAULT_DATE_TIME_FORMAT,
        results::{Results, political_group_candidate_votes::PoliticalGroupCandidateVotes},
        summary::{ElectionSummary, ElectionSummaryCSB},
    },
    eml::EmlHash,
    infra::audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType},
    repository::{
        committee_session_repo::{self, get_previous_session},
        data_entry_repo::list_results_for_committee_session,
        election_repo,
    },
    service::{FileAuditData, list_polling_stations_for_session},
};

#[derive(Serialize)]
pub struct FileCreatedAuditData(pub FileAuditData);
impl AsAuditEvent for FileCreatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::FileCreated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

pub struct GeneratedFile {
    pub file_type: FileType,
    pub filename: String,
    pub content: Vec<u8>,
}

pub struct GsbGeneratedFiles {
    pub results_eml: GeneratedFile,
    pub results_pdf: GeneratedFile,
    pub overview_pdf: Option<GeneratedFile>,
    pub results_csv: GeneratedFile,
}

pub struct GsbFiles {
    pub results_eml: Option<File>,
    pub results_pdf: Option<File>,
    pub overview_pdf: Option<File>,
    pub results_csv: Option<File>,
}

impl GsbFiles {
    pub fn created_at(&self) -> DateTime<Utc> {
        self.results_eml
            .as_ref()
            .or(self.results_pdf.as_ref())
            .or(self.overview_pdf.as_ref())
            .or(self.results_csv.as_ref())
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
                    || self.results_csv.is_none()
            } else {
                self.overview_pdf.is_none()
            }
        } else {
            self.results_eml.is_none() || self.results_pdf.is_none() || self.results_csv.is_none()
        }
    }
}

pub struct CsbGeneratedFiles {
    pub results_eml: GeneratedFile,
    pub total_counts_eml: GeneratedFile,
    pub results_pdf: GeneratedFile,
    pub attachment_pdf: GeneratedFile,
    pub csv_counts: GeneratedFile,
}

#[derive(Debug)]
pub struct CsbFiles {
    pub results_eml: Option<File>,
    pub total_counts_eml: Option<File>,
    pub results_pdf: Option<File>,
    pub attachment_pdf: Option<File>,
    pub csv_counts: Option<File>,
}

impl CsbFiles {
    pub fn created_at(&self) -> DateTime<Utc> {
        self.results_eml
            .as_ref()
            .or(self.results_pdf.as_ref())
            .or(self.attachment_pdf.as_ref())
            .or(self.total_counts_eml.as_ref())
            .or(self.csv_counts.as_ref())
            .map(|f| f.created_at)
            .expect("At least one file should be present")
    }

    pub fn needs_generation(&self) -> bool {
        self.results_eml.is_none()
            || self.total_counts_eml.is_none()
            || self.results_pdf.is_none()
            || self.attachment_pdf.is_none()
            || self.csv_counts.is_none()
    }
}

#[derive(Debug)]
pub struct ResultsInputData {
    pub committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub polling_stations: Vec<PollingStation>,
    pub investigations: Vec<PollingStationInvestigation>,
    pub results: Vec<(DataEntrySource, Results)>,
    pub summary: ElectionSummary,
    pub previous_summary: Option<ElectionSummary>,
    pub previous_committee_session: Option<CommitteeSession>,
    pub created_at: DateTime<Local>,
}

impl ResultsInputData {
    pub async fn new(
        conn: &mut SqliteConnection,
        committee_session_id: CommitteeSessionId,
        created_at: DateTime<Local>,
    ) -> Result<Self, APIError> {
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

        Ok(ResultsInputData {
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

    pub fn as_xml(&self) -> Result<ElectionCount, EMLError> {
        self.election.as_count_eml(
            None,
            &self.committee_session,
            &self.results,
            &self.summary,
            self.created_at,
        )
    }

    /// Generates a filename for the given election and file extension
    /// E.g. "{base}_GR2026_GemeenteNaam.{ext}"
    fn election_filename(&self, base: &str, ext: &str) -> String {
        let location_without_whitespace: String =
            self.election.location.split_whitespace().collect();

        format!(
            "{base} {}{} {}.{ext}",
            self.election.category.to_eml_code(),
            self.election.election_date.year(),
            location_without_whitespace,
        )
    }

    fn csv_filename(&self) -> String {
        format!(
            "osv4-3_telling_{}{}_{}.csv",
            self.election.category.to_eml_code().to_lowercase(),
            self.election.election_date.year(),
            self.election
                .location
                .split_whitespace()
                .collect::<String>()
                .to_lowercase(),
        )
    }

    fn generated_file(&self, file_type: FileType, content: Vec<u8>) -> GeneratedFile {
        GeneratedFile {
            file_type,
            filename: self.filename_for(file_type),
            content,
        }
    }

    fn filename_for(&self, file_type: FileType) -> String {
        use FileType::*;

        let filename = match file_type {
            GsbResultsEml => self.election_filename("Telling", "eml.xml"),
            GsbResultsPdf => {
                if self.committee_session.is_next_session() {
                    "Model Na14-2.pdf".to_string()
                } else {
                    "Model Na31-2.pdf".to_string()
                }
            }
            GsbOverviewPdf => "Leeg Model P2a.pdf".to_string(),
            CsbResultsEml => self.election_filename("Resultaat", "eml.xml"),
            CsbTotalCountsEml => self.election_filename("Totaaltelling", "eml.xml"),
            CsbResultsPdf => "Model P22-2.pdf".to_string(),
            CsbAttachmentPdf => "Model P22-2 bijlage.pdf".to_string(),
            CsbCsvCounts => self.csv_filename(),
            GsbCsvCounts => self.csv_filename(),
        };

        slugify_filename(&filename)
    }
}

#[derive(Debug)]
pub struct ResultsInputCSB {
    pub data: ResultsInputData,
}

impl ResultsInputCSB {
    pub async fn new(
        conn: &mut SqliteConnection,
        committee_session_id: CommitteeSessionId,
        created_at: DateTime<Local>,
    ) -> Result<Self, APIError> {
        let data = ResultsInputData::new(conn, committee_session_id, created_at).await?;
        if data.election.committee_category != CommitteeCategory::CSB {
            return Err(APIError::DataIntegrityError(
                "Generating CSB files can only be done for CSB elections".to_string(),
            ));
        }

        Ok(Self { data })
    }

    pub async fn generate_csb_files(
        &self,
        apportionment_result: &ApportionmentDetails<'_, PoliticalGroupCandidateVotes>,
    ) -> Result<CsbGeneratedFiles, APIError> {
        let data = &self.data;
        let creation_date_time = data.created_at.format(DEFAULT_DATE_TIME_FORMAT).to_string();

        let xml_results_data = data.election.as_result_eml(
            None,
            data.created_at,
            &apportionment_result.candidate_nomination,
        )?;
        let xml_results_string = xml_results_data.write_eml_root_str(true, true)?;
        let xml_results_bytes = xml_results_string.as_bytes();
        let xml_results_hash: String = EmlHash::from(xml_results_bytes).into();

        let results_eml = data.generated_file(FileType::CsbResultsEml, xml_results_bytes.to_vec());

        let xml_counts = data.as_xml()?;
        let xml_counts_string = xml_counts.write_eml_root_str(true, true)?;
        let xml_counts_bytes = xml_counts_string.as_bytes();

        let csv_counts_string = xml_counts.as_osv4_3_csv(&data.election, true, false)?;
        let csv_counts = data.generated_file(
            FileType::CsbCsvCounts,
            csv_counts_string.as_bytes().to_vec(),
        );

        let total_counts_eml =
            data.generated_file(FileType::CsbTotalCountsEml, xml_counts_bytes.to_vec());

        let results_pdf_model = self.get_p22_2_pdf_file(
            apportionment_result,
            xml_results_hash.clone(),
            creation_date_time.clone(),
            data.filename_for(FileType::CsbResultsPdf),
        )?;
        let results_pdf_content = generate_pdf(results_pdf_model).await?.buffer;
        let results_pdf = data.generated_file(FileType::CsbResultsPdf, results_pdf_content);

        let attachment_pdf_model = self.get_p22_2_attachment_1_pdf_file(
            xml_results_hash,
            creation_date_time,
            data.filename_for(FileType::CsbAttachmentPdf),
        )?;
        let attachment_pdf_content = generate_pdf(attachment_pdf_model).await?.buffer;
        let attachment_pdf =
            data.generated_file(FileType::CsbAttachmentPdf, attachment_pdf_content);

        Ok(CsbGeneratedFiles {
            results_eml,
            total_counts_eml,
            results_pdf,
            attachment_pdf,
            csv_counts,
        })
    }

    fn get_p22_2_pdf_file(
        &self,
        apportionment_result: &ApportionmentDetails<'_, PoliticalGroupCandidateVotes>,
        hash: String,
        creation_date_time: String,
        filename: String,
    ) -> Result<PdfFileModel, APIError> {
        let data = &self.data;

        let summary = ElectionSummaryCSB::new(&data.summary, &data.election.political_groups);
        let seat_assignment = map_seat_assignment(&apportionment_result.seat_assignment);
        let enriched_seat_assignment =
            EnrichedSeatAssignment::new(data.election.number_of_seats, &summary, &seat_assignment)?;
        let candidate_nomination = map_candidate_nomination(
            &apportionment_result.candidate_nomination,
            &data.election.political_groups.clone(),
        );
        let enriched_candidate_nomination =
            EnrichedCandidateNomination::new(&data.election, &candidate_nomination)?;
        let footnotes =
            ApportionmentFootnotes::new(&data.election.political_groups, &seat_assignment)?;
        let pdf_file: PdfFileModel = ModelP22_2Input {
            committee_session: data.committee_session.clone(),
            election: data.election.clone().into(),
            summary,
            footnotes,
            seat_assignment: enriched_seat_assignment,
            candidate_nomination: enriched_candidate_nomination,
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
        let data = &self.data;

        let votes_tables = VotesTables::new(&data.election, &data.summary)?;
        let pdf_file = ModelP22_2Bijlage1Input {
            election: data.election.clone().into(),
            votes_tables,
            hash,
            creation_date_time,
        }
        .to_pdf_file_model(filename);
        Ok(pdf_file)
    }
}

#[derive(Debug)]
pub struct ResultsInputGSB {
    pub data: ResultsInputData,
}

impl ResultsInputGSB {
    pub async fn new(
        conn: &mut SqliteConnection,
        committee_session_id: CommitteeSessionId,
        created_at: DateTime<Local>,
    ) -> Result<Self, APIError> {
        let data = ResultsInputData::new(conn, committee_session_id, created_at).await?;
        if data.election.committee_category != CommitteeCategory::GSB {
            return Err(APIError::DataIntegrityError(
                "Generating GSB files can only be done for GSB elections".to_string(),
            ));
        }

        Ok(Self { data })
    }

    pub async fn generate_gsb_files(&self) -> Result<GsbGeneratedFiles, APIError> {
        let data = &self.data;
        let creation_date_time = data.created_at.format(DEFAULT_DATE_TIME_FORMAT).to_string();

        let xml = data.as_xml()?;
        let xml_string = xml.write_eml_root_str(true, true)?;
        let xml_bytes = xml_string.as_bytes();
        let xml_hash = EmlHash::from(xml_bytes).into();
        let csv_string = xml.as_osv4_3_csv(&data.election, true, false)?;

        let results_eml = data.generated_file(FileType::GsbResultsEml, xml_bytes.to_vec());
        let results_csv = data.generated_file(FileType::GsbCsvCounts, csv_string.into_bytes());

        let overview_pdf = if data.committee_session.is_next_session() {
            let pdf_model = self.get_p2a_pdf_file(data.filename_for(FileType::GsbOverviewPdf));
            let content: Vec<u8> = generate_pdf(pdf_model).await?.buffer;
            Some(data.generated_file(FileType::GsbOverviewPdf, content))
        } else {
            None
        };

        let results_pdf_file_type = FileType::GsbResultsPdf;
        let results_pdf_model = if data.committee_session.is_next_session() {
            let Some(previous_summary) = &data.previous_summary else {
                return Err(APIError::DataIntegrityError(
                "Previous summary is required for generating results PDF for next committee sessions"
                    .to_string(),
            ));
            };

            let Some(previous_committee_session) = &data.previous_committee_session else {
                return Err(APIError::DataIntegrityError(
                "Previous committee session is required for generating results PDF for next committee sessions"
                    .to_string(),
            ));
            };

            self.get_na14_2_pdf_file(
                previous_summary,
                previous_committee_session,
                xml_hash,
                creation_date_time,
                data.filename_for(results_pdf_file_type),
            )?
        } else {
            self.get_na31_2_pdf_file(
                xml_hash,
                creation_date_time,
                data.filename_for(results_pdf_file_type),
            )?
        };
        let results_pdf_content = generate_pdf(results_pdf_model).await?.buffer;
        let results_pdf = data.generated_file(results_pdf_file_type, results_pdf_content);

        Ok(GsbGeneratedFiles {
            results_eml,
            results_pdf,
            overview_pdf,
            results_csv,
        })
    }

    fn get_na14_2_pdf_file(
        &self,
        previous_summary: &ElectionSummary,
        previous_committee_session: &CommitteeSession,
        hash: String,
        creation_date_time: String,
        results_pdf_filename: String,
    ) -> Result<PdfFileModel, APIError> {
        let data = &self.data;

        let pdf_file = ModelNa14_2Input {
            votes_tables: VotesTablesWithPreviousVotes::new(
                &data.election,
                &data.summary,
                previous_summary,
            )?,
            committee_session: data.committee_session.clone(),
            election: data.election.clone().into(),
            summary: data.summary.clone().into(),
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
        let data = &self.data;

        let pdf_file = ModelNa31_2Input {
            votes_tables: VotesTables::new(&data.election, &data.summary)?,
            committee_session: data.committee_session.clone(),
            polling_stations: data.polling_stations.clone(),
            summary: data.summary.clone().into(),
            election: data.election.clone().into(),
            hash,
            creation_date_time,
        }
        .to_pdf_file_model(results_pdf_filename);
        Ok(pdf_file)
    }

    fn get_p2a_pdf_file(&self, overview_filename: String) -> PdfFileModel {
        let data = &self.data;

        ModelP2aInput {
            committee_session: data.committee_session.clone(),
            election: data.election.clone().into(),
            investigations: data
                .investigations
                .iter()
                .map(|inv| {
                    let ps = data
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
}
