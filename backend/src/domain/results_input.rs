use chrono::{DateTime, Local};
use sqlx::SqliteConnection;

use crate::{
    APIError,
    domain::{
        committee_session::CommitteeSession,
        election::ElectionWithPoliticalGroups,
        investigation::PollingStationInvestigation,
        models::{ModelNa14_2Input, ModelNa31_2Input, ModelP2aInput, PdfFileModel, ToPdfFileModel},
        polling_station::PollingStation,
        polling_station_results::PollingStationResults,
        summary::ElectionSummary,
    },
    eml::EML510,
    infra::zip::slugify_filename,
    repository::{
        committee_session_repo::get_previous_session, election_repo,
        investigation_repo::list_investigations_for_committee_session, polling_station_repo,
        polling_station_result_repo,
    },
    service::{
        pdf_gen::{VotesTables, VotesTablesWithPreviousVotes},
        report::DEFAULT_DATE_TIME_FORMAT,
    },
};

pub struct PdfModelList {
    pub results: PdfFileModel,
    pub overview: Option<PdfFileModel>,
}

#[derive(Debug)]
pub struct ResultsInput {
    committee_session: CommitteeSession,
    election: ElectionWithPoliticalGroups,
    polling_stations: Vec<PollingStation>,
    investigations: Vec<PollingStationInvestigation>,
    results: Vec<(PollingStation, PollingStationResults)>,
    summary: ElectionSummary,
    previous_summary: Option<ElectionSummary>,
    previous_committee_session: Option<CommitteeSession>,
    pub created_at: DateTime<Local>,
}

impl ResultsInput {
    pub async fn new(
        conn: &mut SqliteConnection,
        committee_session_id: u32,
        created_at: DateTime<Local>,
    ) -> Result<ResultsInput, APIError> {
        let committee_session =
            crate::repository::committee_session_repo::get(conn, committee_session_id).await?;
        let election = election_repo::get(conn, committee_session.election_id).await?;
        let polling_stations = polling_station_repo::list(conn, committee_session.id).await?;
        let results = polling_station_result_repo::list_results_for_committee_session(
            conn,
            committee_session.id,
        )
        .await?;

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
            let previous_results = polling_station_result_repo::list_results_for_committee_session(
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
            created_at,
            election,
            polling_stations,
            investigations,
            results,
            previous_committee_session,
        })
    }

    pub fn as_xml(&self) -> EML510 {
        EML510::from_results(
            &self.election,
            &self.committee_session,
            &self.results,
            &self.summary,
            &self.created_at,
        )
    }

    pub fn xml_filename(&self) -> String {
        use chrono::Datelike;

        use crate::infra::zip::slugify_filename;
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

    pub fn into_pdf_file_models(
        self,
        xml_hash: impl Into<String>,
    ) -> Result<PdfModelList, APIError> {
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
