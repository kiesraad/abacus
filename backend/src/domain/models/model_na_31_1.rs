use serde::{Deserialize, Serialize};

use crate::domain::{
    committee_session::CommitteeSession,
    election::Election,
    models::{PdfFileModel, PdfModel, ToPdfFileModel, votes_table::VotesTables},
    polling_station::PollingStation,
    summary::ElectionSummaryWithoutVotes,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa31_1Input {
    pub committee_session: CommitteeSession,
    pub election: Election,
    pub summary: ElectionSummaryWithoutVotes,
    pub polling_stations: Vec<PollingStation>,
    pub hash: String,
    pub creation_date_time: String,
    pub votes_tables: VotesTables,
}

impl ToPdfFileModel for ModelNa31_1Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa31_1(Box::new(self)))
    }
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa31_1InlegvelInput {
    pub election: Election,
}

impl ToPdfFileModel for ModelNa31_1InlegvelInput {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa31_1Inlegvel(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::BufReader};

    use super::*;

    #[test]
    fn test_main_json_variations_match_struct() {
        let mut reader = BufReader::new(
            File::open("templates/inputs/model-na-31-1-variations/model-na-31-1-GR.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelNa31_1Input>(reader)
            .expect("model-na-31-1-GR.json should deserialize to struct ModelNa31_1Input");

        reader = BufReader::new(
            File::open("templates/inputs/model-na-31-1-variations/model-na-31-1-PS.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelNa31_1Input>(reader)
            .expect("model-na-31-1-PS.json should deserialize to struct ModelNa31_1Input");

        reader = BufReader::new(
            File::open("templates/inputs/model-na-31-1-variations/model-na-31-1-WS.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelNa31_1Input>(reader)
            .expect("model-na-31-1-WS.json should deserialize to struct ModelNa31_1Input");
    }

    #[test]
    fn test_inlegvel_json_matches_struct() {
        let reader =
            BufReader::new(File::open("templates/inputs/model-na-31-1-inlegvel.json").unwrap());
        serde_json::from_reader::<_, ModelNa31_1InlegvelInput>(reader).expect(
            "model-na-31-1-inlegvel.json should deserialize to struct ModelNa31_1InlegvelInput",
        );
    }
}
