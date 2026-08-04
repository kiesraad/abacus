use serde::{Deserialize, Serialize};

use crate::domain::{
    election::Election,
    models::{PdfFileModel, PdfModel, ToPdfFileModel, votes_table::CandidatesTables},
    polling_station::PollingStation,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelN10_1Input {
    pub election: Election,
    pub polling_station: PollingStation,
    pub candidates_tables: CandidatesTables,
}

impl ToPdfFileModel for ModelN10_1Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelN10_1(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::BufReader};

    use super::*;

    #[test]
    fn test_json_variations_match_struct() {
        let mut reader = BufReader::new(
            File::open("templates/inputs/model-n-10-1-variations/model-n-10-1-GR.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelN10_1Input>(reader)
            .expect("model-n-10-1-GR.json should deserialize to struct ModelN10_1Input");

        reader = BufReader::new(
            File::open("templates/inputs/model-n-10-1-variations/model-n-10-1-PS.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelN10_1Input>(reader)
            .expect("model-n-10-1-PS.json should deserialize to struct ModelN10_1Input");

        reader = BufReader::new(
            File::open("templates/inputs/model-n-10-1-variations/model-n-10-1-WS.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelN10_1Input>(reader)
            .expect("model-n-10-1-WS.json should deserialize to struct ModelN10_1Input");
    }
}
