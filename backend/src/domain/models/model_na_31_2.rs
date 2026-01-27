use serde::{Deserialize, Serialize};

use crate::{
    domain::{
        committee_session::CommitteeSession,
        election::Election,
        models::{PdfFileModel, PdfModel, ToPdfFileModel},
        votes_table::{CandidatesTables, VotesTables},
    },
    polling_station::PollingStation,
    summary::ElectionSummaryWithoutVotes,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa31_2Input {
    pub committee_session: CommitteeSession,
    pub election: Election,
    pub summary: ElectionSummaryWithoutVotes,
    pub polling_stations: Vec<PollingStation>,
    pub hash: String,
    pub creation_date_time: String,
    pub votes_tables: VotesTables,
}

impl ToPdfFileModel for ModelNa31_2Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa31_2(Box::new(self)))
    }
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa31_2Bijlage1Input {
    pub election: Election,
    pub polling_station: PollingStation,
    pub candidates_tables: CandidatesTables,
}

impl ToPdfFileModel for ModelNa31_2Bijlage1Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa31_2Bijlage1(Box::new(self)))
    }
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa31_2InlegvelInput {
    pub election: Election,
}

impl ToPdfFileModel for ModelNa31_2InlegvelInput {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa31_2Inlegvel(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::BufReader};

    use super::*;

    #[test]
    fn test_main_json_matches_struct() {
        let reader = BufReader::new(File::open("templates/inputs/model-na-31-2.json").unwrap());
        serde_json::from_reader::<_, ModelNa31_2Input>(reader)
            .expect("model-na-31-2.json should deserialize to struct ModelNa31_2Input");
    }

    #[test]
    fn test_bijlage_json_matches_struct() {
        let reader =
            BufReader::new(File::open("templates/inputs/model-na-31-2-bijlage1.json").unwrap());
        serde_json::from_reader::<_, ModelNa31_2Bijlage1Input>(reader).expect(
            "model-na-31-2-bijlage1.json should deserialize to struct ModelNa31_2Bijlage1Input",
        );
    }

    #[test]
    fn test_inlegvel_json_matches_struct() {
        let reader =
            BufReader::new(File::open("templates/inputs/model-na-31-2-inlegvel.json").unwrap());
        serde_json::from_reader::<_, ModelNa31_2InlegvelInput>(reader).expect(
            "model-na-31-2-inlegvel.json should deserialize to struct ModelNa31_2InlegvelInput",
        );
    }
}
