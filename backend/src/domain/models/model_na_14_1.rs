use serde::{Deserialize, Serialize};

use crate::domain::{
    committee_session::CommitteeSession,
    election::Election,
    investigation::PollingStationInvestigation,
    models::{
        PdfFileModel, PdfModel, ToPdfFileModel,
        votes_table::{CandidatesTables, VotesTablesWithOnlyPreviousVotes},
    },
    polling_station::PollingStation,
    results::common_polling_station_results::CommonPollingStationResultsWithoutVotes,
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

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa14_1Versie2Input {
    pub committee_session: CommitteeSession,
    pub election: Election,
    pub polling_station: PollingStation,
    pub previous_results: CommonPollingStationResultsWithoutVotes,
    pub investigation: PollingStationInvestigation,
    pub votes_tables: VotesTablesWithOnlyPreviousVotes,
}

impl ToPdfFileModel for ModelNa14_1Versie2Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa14_1Versie2(Box::new(self)))
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
                "templates/inputs/model-na-14-1-versie-1-variations/model-na-14-1-versie-1-PS1.json",
            )
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie1Input>(reader).expect(
            "model-na-14-1-versie-1-PS1.json should deserialize to struct ModelNa14_1Versie1Input",
        );

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-na-14-1-versie-1-variations/model-na-14-1-versie-1-PS2.json",
            )
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie1Input>(reader).expect(
            "model-na-14-1-versie-1-PS2.json should deserialize to struct ModelNa14_1Versie1Input",
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

    #[test]
    fn test_version_2_json_variations_match_struct() {
        let mut reader = BufReader::new(
            File::open(
                "templates/inputs/model-na-14-1-versie-2-variations/model-na-14-1-versie-2-GR.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie2Input>(reader).expect(
            "model-na-14-1-versie-2-GR.json should deserialize to struct ModelNa14_1Versie2Input",
        );

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-na-14-1-versie-2-variations/model-na-14-1-versie-2-PS1.json",
            )
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie2Input>(reader).expect(
            "model-na-14-1-versie-2-PS1.json should deserialize to struct ModelNa14_1Versie2Input",
        );

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-na-14-1-versie-2-variations/model-na-14-1-versie-2-PS2.json",
            )
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie2Input>(reader).expect(
            "model-na-14-1-versie-2-PS2.json should deserialize to struct ModelNa14_1Versie2Input",
        );

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-na-14-1-versie-2-variations/model-na-14-1-versie-2-WS.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelNa14_1Versie2Input>(reader).expect(
            "model-na-14-1-versie-2-WS.json should deserialize to struct ModelNa14_1Versie2Input",
        );
    }
}
