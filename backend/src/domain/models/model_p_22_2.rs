use serde::{Deserialize, Serialize};

use crate::domain::{
    committee_session::CommitteeSession,
    election::Election,
    models::{
        PdfFileModel, PdfModel, ToPdfFileModel, apportionment_footnotes::ApportionmentFootnotes,
        enriched_candidate_nomination::EnrichedCandidateNomination,
        enriched_seat_assignment::EnrichedSeatAssignment, votes_table::VotesTables,
    },
    tabulation::ElectionTotalsCSB,
};

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelP22_2Input {
    pub committee_session: CommitteeSession,
    pub election: Election,
    pub summary: ElectionTotalsCSB,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub footnotes: Option<ApportionmentFootnotes>,
    pub seat_assignment: EnrichedSeatAssignment,
    pub candidate_nomination: EnrichedCandidateNomination,
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
    #[allow(clippy::too_many_lines)]
    fn test_main_json_variations_match_struct() {
        let mut reader = BufReader::new(
            File::open("templates/inputs/model-p-22-2-variations/gte-19-seats.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader)
            .expect("gte-19-seats.json should deserialize to struct ModelP22_2Input");

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-p-22-2-variations/gte-19-seats-and-p7-drawing-lots.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader).expect(
            "gte-19-seats-and-p7-drawing-lots.json should deserialize to struct ModelP22_2Input",
        );

        reader = BufReader::new(
            File::open("templates/inputs/model-p-22-2-variations/gte-19-seats-and-p9.json")
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader)
            .expect("gte-19-seats-and-p9.json should deserialize to struct ModelP22_2Input");

        reader = BufReader::new(
            File::open("templates/inputs/model-p-22-2-variations/gte-19-seats-and-p9-drawing-lots-and-deceased-candidates.json")
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader)
            .expect("gte-19-seats-and-p9-drawing-lots-and-deceased-candidates.json should deserialize to struct ModelP22_2Input");

        reader = BufReader::new(
            File::open("templates/inputs/model-p-22-2-variations/gte-19-seats-and-p9-drawing-lots-and-p10-and-deceased-candidates.json")
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader)
            .expect("gte-19-seats-and-p9-drawing-lots-and-p10-and-deceased-candidates.json should deserialize to struct ModelP22_2Input");

        reader = BufReader::new(
            File::open("templates/inputs/model-p-22-2-variations/lt-19-seats.json").unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader)
            .expect("lt-19-seats.json should deserialize to struct ModelP22_2Input");

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-p-22-2-variations/lt-19-seats-and-p7-drawing-lots.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader).expect(
            "lt-19-seats-and-p7-drawing-lots.json should deserialize to struct ModelP22_2Input",
        );

        reader = BufReader::new(
            File::open("templates/inputs/model-p-22-2-variations/lt-19-seats-and-p9-and-p10.json")
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader)
            .expect("lt-19-seats-and-p9-and-p10.json should deserialize to struct ModelP22_2Input");

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-p-22-2-variations/lt-19-seats-and-p9-drawing-lots.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader).expect(
            "lt-19-seats-and-p9-drawing-lots.json should deserialize to struct ModelP22_2Input",
        );

        reader = BufReader::new(
            File::open("templates/inputs/model-p-22-2-variations/lt-19-seats-and-p10.json")
                .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader)
            .expect("lt-19-seats-and-p10.json should deserialize to struct ModelP22_2Input");

        reader = BufReader::new(
            File::open(
                "templates/inputs/model-p-22-2-variations/lt-19-seats-and-p15-drawing-lots.json",
            )
            .unwrap(),
        );
        serde_json::from_reader::<_, ModelP22_2Input>(reader).expect(
            "lt-19-seats-and-p15-drawing-lots.json should deserialize to struct ModelP22_2Input",
        );
    }

    #[test]
    fn test_bijlage_json_matches_struct() {
        let reader =
            BufReader::new(File::open("templates/inputs/model-p-22-2-bijlage-1.json").unwrap());
        serde_json::from_reader::<_, ModelP22_2Bijlage1Input>(reader).expect(
            "model-p-22-2-bijlage-1.json should deserialize to struct ModelP22_2Bijlage1Input",
        );
    }
}
