use serde::{Deserialize, Serialize};

use crate::{
    committee_session::CommitteeSession,
    data_entry::CommonPollingStationResults,
    election::ElectionWithPoliticalGroups,
    investigation::PollingStationInvestigation,
    pdf_gen::models::{PdfFileModel, PdfModel, ToPdfFileModel},
    polling_station::structs::PollingStation,
    summary::ElectionSummary,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa14_2Input {
    pub committee_session: CommitteeSession,
    pub previous_committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub previous_summary: ElectionSummary,
    pub summary: ElectionSummary,
    pub hash: String,
    pub creation_date_time: String,
}

impl ToPdfFileModel for ModelNa14_2Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        // let p2a = serde_json::to_string(&self).expect("ModelNa14_2Input should serialize to JSON");
        // let filename = format!("/tmp/na14_2-{}.json", self.hash.replace(" ", "_"));
        // std::fs::write(filename, p2a).expect("should write na14_2 json to /tmp");
        PdfFileModel::new(file_name, PdfModel::ModelNa14_2(Box::new(self)))
    }
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa14_2Bijlage1Input {
    pub election: ElectionWithPoliticalGroups,
    pub polling_station: PollingStation,
    pub previous_results: CommonPollingStationResults,
    pub investigation: PollingStationInvestigation,
}

impl ToPdfFileModel for ModelNa14_2Bijlage1Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa14_2Bijlage1(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::BufReader};

    use super::*;

    #[test]
    fn test_main_json_matches_struct() {
        let reader = BufReader::new(File::open("templates/inputs/model-na-14-2.json").unwrap());
        serde_json::from_reader::<_, ModelNa14_2Input>(reader)
            .expect("model-na-14-2.json should deserialize to struct ModelNa14_2Input");
    }

    #[test]
    fn test_bijlage_json_matches_struct() {
        let reader =
            BufReader::new(File::open("templates/inputs/model-na-14-2-bijlage1.json").unwrap());
        serde_json::from_reader::<_, ModelNa14_2Bijlage1Input>(reader).expect(
            "model-na-14-2-bijlage1.json should deserialize to struct ModelNa14_2Bijlage1Input",
        );
    }
}
