use serde::{Deserialize, Serialize};

use crate::domain::{
    election::Election,
    models::{PdfFileModel, PdfModel, ToPdfFileModel},
};

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
    fn test_inlegvel_json_matches_struct() {
        let reader =
            BufReader::new(File::open("templates/inputs/model-na-31-1-inlegvel.json").unwrap());
        serde_json::from_reader::<_, ModelNa31_1InlegvelInput>(reader).expect(
            "model-na-31-1-inlegvel.json should deserialize to struct ModelNa31_1InlegvelInput",
        );
    }
}
