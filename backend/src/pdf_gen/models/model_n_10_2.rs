use serde::{Deserialize, Serialize};

use crate::{
    election::ElectionWithPoliticalGroups,
    pdf_gen::{
        models::{PdfFileModel, PdfModel, ToPdfFileModel},
        votes_table::CandidatesTables,
    },
    polling_station::structs::PollingStation,
};

#[derive(Serialize, Deserialize)]
pub struct ModelN10_2Input {
    pub election: ElectionWithPoliticalGroups,
    pub polling_station: PollingStation,
    pub candidates_tables: CandidatesTables,
}

impl ToPdfFileModel for ModelN10_2Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelN10_2(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::BufReader};

    use super::*;

    #[test]
    fn test_json_matches_struct() {
        let reader = BufReader::new(File::open("templates/inputs/model-n-10-2.json").unwrap());
        serde_json::from_reader::<_, ModelN10_2Input>(reader)
            .expect("model-n-10-2.json should deserialize to struct ModelN10_2Input");
    }
}
