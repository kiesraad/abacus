use serde::{Deserialize, Serialize};

use crate::domain::{
    committee_session::CommitteeSession,
    election::Election,
    models::{PdfFileModel, PdfModel, ToPdfFileModel, votes_table::CandidatesTables},
    polling_station::PollingStation,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa14_1Versie1Input {
    pub committee_session: CommitteeSession,
    pub election: Election,
    pub polling_station: PollingStation,
    pub candidates_tables: CandidatesTables,
}

impl ToPdfFileModel for ModelNa14_1Versie1Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa14_1Versie1(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::BufReader};

    use super::*;

    #[test]
    fn test_version_1_json_variations_match_struct() {
        let mut reader = BufReader::new(
            File::open(
                "templates/inputs/model-na-14-1-versie-1-variations/model-na-14-1-versie-1-GR.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie1Input>(reader).expect(
            "model-na-14-1-versie-1-GR.json should deserialize to struct ModelNa14_1Versie1Input",
        );

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-na-14-1-versie-1-variations/model-na-14-1-versie-1-PS.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie1Input>(reader).expect(
            "model-na-14-1-versie-1-PS.json should deserialize to struct ModelNa14_1Versie1Input",
        );

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-na-14-1-versie-1-variations/model-na-14-1-versie-1-WS.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie1Input>(reader).expect(
            "model-na-14-1-versie-1-WS.json should deserialize to struct ModelNa14_1Versie1Input",
        );
    }
}
