use serde::{Deserialize, Serialize};

use crate::{
    committee_session::CommitteeSession,
    election::ElectionWithPoliticalGroups,
    pdf_gen::models::{PdfFileModel, PdfModel, ToPdfFileModel},
    polling_station::structs::PollingStation,
    summary::ElectionSummary,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa31_2Input {
    pub committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub summary: ElectionSummary,
    pub polling_stations: Vec<PollingStation>,
    pub hash: String,
    pub creation_date_time: String,
}

impl ToPdfFileModel for ModelNa31_2Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa31_2(Box::new(self)))
    }
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa31_2Bijlage1Input {
    pub election: ElectionWithPoliticalGroups,
    pub polling_station: PollingStation,
}

impl ToPdfFileModel for ModelNa31_2Bijlage1Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa21_2Bijlage1(Box::new(self)))
    }
}
