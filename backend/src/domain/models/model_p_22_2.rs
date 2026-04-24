use serde::{Deserialize, Serialize};

use crate::domain::{
    apportionment::{ChosenCandidate, SeatAssignment},
    committee_session::CommitteeSession,
    election::{Election, ElectionWithPoliticalGroups},
    models::{
        PdfFileModel, PdfModel, ToPdfFileModel,
        enriched_candidate_nomination::EnrichedCandidateNomination, seats_table::InitialSeatsTable,
        votes_table::VotesTables,
    },
    summary::ElectionSummaryCSB,
};

/// Contains the result changes that have occurred in the apportionment.
#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ResultChange {
    pub list_number: u32,
    pub increase: u32,
    pub decrease: u32,
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelP22_2Input {
    pub committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub summary: ElectionSummaryCSB,
    pub seat_assignment: SeatAssignment,
    pub initial_seats_table: InitialSeatsTable,
    pub enriched_candidate_nomination: EnrichedCandidateNomination,
    pub chosen_candidates: Vec<ChosenCandidate>,
    pub result_changes_full_seats: Vec<ResultChange>,
    pub result_changes_residual_seats: Vec<ResultChange>,
    pub hash: String,
    pub creation_date_time: String,
}

impl ToPdfFileModel for ModelP22_2Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelP22_2(Box::new(self)))
    }
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelP22_2Bijlage1Input {
    pub election: Election,
    pub votes_tables: VotesTables,
    pub hash: String,
    pub creation_date_time: String,
}

impl ToPdfFileModel for ModelP22_2Bijlage1Input {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel {
        PdfFileModel::new(file_name, PdfModel::ModelP22_2Bijlage1(Box::new(self)))
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

    #[test]
    fn test_bijlage_json_matches_struct() {
        let reader =
            BufReader::new(File::open("templates/inputs/model-p-22-2-bijlage1.json").unwrap());
        serde_json::from_reader::<_, ModelP22_2Bijlage1Input>(reader).expect(
            "model-p-22-2-bijlage1.json should deserialize to struct ModelP22_2Bijlage1Input",
        );
    }
}
