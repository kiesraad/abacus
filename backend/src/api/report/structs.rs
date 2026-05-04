use apportionment::ApportionmentOutput;
use chrono::{DateTime, Local, Utc};
use eml_nl::{EMLError, documents::election_count::ElectionCount};
use serde::Serialize;
use sqlx::SqliteConnection;

use crate::{
    APIError,
    api::{
        apportionment::{map_candidate_nomination, map_seat_assignment},
        report::{DEFAULT_DATE_TIME_FORMAT, naming},
    },
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionId},
        data_entry::DataEntrySource,
        election::ElectionWithPoliticalGroups,
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
        summary::{ElectionSummary, ElectionSummaryCSB},
    },
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
    pub total_counts_eml: Option<File>,
    pub results_pdf: Option<File>,
    pub attachment_pdf: Option<File>,
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
            || self.total_counts_eml.is_none()
            || self.results_pdf.is_none()
            || self.attachment_pdf.is_none()
    }
}

pub struct PdfModelListGSB {
    pub results: PdfFileModel,
    pub overview: Option<PdfFileModel>,
}

pub struct PdfModelListCSB {
    pub results: PdfFileModel,
    pub attachment: PdfFileModel,
}

#[derive(Debug)]
pub struct ResultsInput {
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

impl ResultsInput {
    pub async fn new(
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

    pub fn as_xml(&self) -> Result<ElectionCount, EMLError> {
        self.election.as_count_eml(
            None,
            &self.committee_session,
            &self.results,
            &self.summary,
            self.created_at,
        )
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
        let pdf_file = ModelP22_2Input {
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
        let pdf_file = ModelP22_2Bijlage1Input {
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
        let pdf_file = ModelNa14_2Input {
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
        let pdf_file = ModelNa31_2Input {
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

    pub fn as_pdf_file_models_gsb(
        &self,
        xml_hash: impl Into<String>,
    ) -> Result<PdfModelListGSB, APIError> {
        let hash = xml_hash.into();
        let creation_date_time = self.created_at.format(DEFAULT_DATE_TIME_FORMAT).to_string();

        let overview_pdf = if self.committee_session.is_next_session() {
            Some(self.get_p2a_pdf_file(naming::filename_for(
                FileType::GsbOverviewPdf,
                &self.election,
                self.committee_session.is_next_session(),
            )))
        } else {
            None
        };

        let results_pdf_filename = naming::filename_for(
            FileType::GsbResultsPdf,
            &self.election,
            self.committee_session.is_next_session(),
        );
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

    pub fn as_pdf_file_models_csb(
        &self,
        apportionment_result: &ApportionmentOutput<'_, PoliticalGroupCandidateVotes>,
        xml_hash: impl Into<String>,
    ) -> Result<PdfModelListCSB, APIError> {
        let hash = xml_hash.into();
        let creation_date_time = self.created_at.format(DEFAULT_DATE_TIME_FORMAT).to_string();

        let results_pdf_filename =
            naming::filename_for(FileType::CsbResultsPdf, &self.election, false);
        let results_pdf = self.get_p22_2_pdf_file(
            apportionment_result,
            hash.clone(),
            creation_date_time.clone(),
            results_pdf_filename,
        )?;

        let attachment_pdf_filename =
            naming::filename_for(FileType::CsbAttachmentPdf, &self.election, false);
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
