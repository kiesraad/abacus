use serde::{Deserialize, Serialize};

use crate::domain::{
    apportionment::{CandidateNomination, SeatAssignment},
    committee_session::CommitteeSession,
    election::ElectionWithPoliticalGroups,
    models::{PdfFileModel, PdfModel, ToPdfFileModel},
    summary::ElectionSummary,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelP22_2Input {
    pub committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub summary: ElectionSummary,
    pub seat_assignment: SeatAssignment,
    pub candidate_nomination: CandidateNomination,
    pub hash: String,
    pub creation_date_time: String,
}

impl ToPdfFileModel for ModelP22_2Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelP22_2(Box::new(self)))
    }
}

#[cfg(test)]
mod tests {
    use std::{fs::File, io::BufReader};

    use super::*;

    #[test]
    fn test_json_matches_struct() {
        let reader = BufReader::new(File::open("templates/inputs/model-p-22-2.json").unwrap());
        serde_json::from_reader::<_, ModelP22_2Input>(reader)
            .expect("model-p-22-2.json should deserialize to struct ModelP22_2Input");
    }
}
