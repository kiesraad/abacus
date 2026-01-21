use chrono::{DateTime, Local};

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
    infra::pdf_gen::{VotesTables, VotesTablesWithPreviousVotes},
};

/// Default date time format for reports
pub const DEFAULT_DATE_TIME_FORMAT: &str = "%d-%m-%Y %H:%M:%S %Z";

pub struct PdfModelList {
    pub results: PdfFileModel,
    pub overview: Option<PdfFileModel>,
}

#[derive(Debug)]
pub struct ResultsInput {
    pub committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub polling_stations: Vec<PollingStation>,
    pub investigations: Vec<PollingStationInvestigation>,
    pub results: Vec<(PollingStation, PollingStationResults)>,
    pub summary: ElectionSummary,
    pub previous_summary: Option<ElectionSummary>,
    pub previous_committee_session: Option<CommitteeSession>,
    pub created_at: DateTime<Local>,
}

impl ResultsInput {
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

/// Slugify a filename by replacing spaces with underscores and slashes with dashes.
pub fn slugify_filename(filename: &str) -> String {
    filename.replace(" ", "_").replace("/", "-")
}
