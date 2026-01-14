use serde::{Deserialize, Serialize};

use crate::{
    data_entry::domain::polling_station_results::common_polling_station_results::CommonPollingStationResultsWithoutVotes,
    election::domain::{
        committee_session::CommitteeSession, election::Election,
        investigation::PollingStationInvestigation, polling_station::PollingStation,
    },
    pdf_gen::{
        models::{PdfFileModel, PdfModel, ToPdfFileModel},
        summary::ElectionSummaryWithoutVotes,
        votes_table::{VotesTablesWithOnlyPreviousVotes, VotesTablesWithPreviousVotes},
    },
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa14_2Input {
    pub committee_session: CommitteeSession,
    pub previous_committee_session: CommitteeSession,
    pub election: Election,
    pub previous_summary: ElectionSummaryWithoutVotes,
    pub summary: ElectionSummaryWithoutVotes,
    pub hash: String,
    pub creation_date_time: String,
    pub votes_tables: VotesTablesWithPreviousVotes,
}

impl ToPdfFileModel for ModelNa14_2Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelNa14_2(Box::new(self)))
    }
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelNa14_2Bijlage1Input {
    pub election: Election,
    pub polling_station: PollingStation,
    pub previous_results: CommonPollingStationResultsWithoutVotes,
    pub investigation: PollingStationInvestigation,
    pub votes_tables: VotesTablesWithOnlyPreviousVotes,
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
