use serde::{Deserialize, Serialize};

use crate::{
    election::domain::{
        committee_session::CommitteeSession, election::ElectionWithPoliticalGroups,
        investigation::PollingStationInvestigation, polling_station::PollingStation,
    },
    pdf_gen::models::{PdfFileModel, PdfModel, ToPdfFileModel},
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelP2aInput {
    pub committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub investigations: Vec<(PollingStation, PollingStationInvestigation)>,
}

impl ToPdfFileModel for ModelP2aInput {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelP2a(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::BufReader};

    use super::*;

    #[test]
    fn test_json_matches_struct() {
        let reader = BufReader::new(File::open("templates/inputs/model-p-2a.json").unwrap());
        serde_json::from_reader::<_, ModelP2aInput>(reader)
            .expect("model-p-2a.json should deserialize to struct ModelP2aInput");
    }
}
