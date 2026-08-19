use serde::{Deserialize, Serialize};

use crate::domain::{
    committee_session::CommitteeSession,
    election::Election,
    investigation::PollingStationInvestigation,
    models::{PdfFileModel, PdfModel, ToPdfFileModel},
    polling_station::PollingStation,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelP2aInput {
    pub committee_session: CommitteeSession,
    pub election: Election,
    pub investigations: Vec<(PollingStation, PollingStationInvestigation)>,
}

impl ToPdfFileModel for ModelP2aInput {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelP2a(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs::File, io::BufReader};

    #[test]
    fn test_json_variations_match_struct() {
        let mut reader = BufReader::new(
            File::open("templates/inputs/model-p-2a-variations/model-p-2a-GR.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelP2aInput>(reader)
            .expect("model-p-2a.json should deserialize to struct ModelP2aInput");

        reader = BufReader::new(
            File::open("templates/inputs/model-p-2a-variations/model-p-2a-PS.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelP2aInput>(reader)
            .expect("model-p-2a-PS.json should deserialize to struct ModelP2aInput");

        reader = BufReader::new(
            File::open("templates/inputs/model-p-2a-variations/model-p-2a-WS.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelP2aInput>(reader)
            .expect("model-p-2a-WS.json should deserialize to struct ModelP2aInput");
    }
}
