mod model_n_10_2;
mod model_na_14_2;
mod model_na_31_2;
mod model_p_2a;

use std::{error::Error, path::PathBuf};

pub use model_n_10_2::*;
pub use model_na_14_2::*;
pub use model_na_31_2::*;
pub use model_p_2a::*;

use super::filter_input::replace_unsupported_glyphs;

pub trait ToPdfFileModel {
    fn to_pdf_file_model(self, file_name: String) -> PdfFileModel;
}

pub struct PdfFileModel {
    pub file_name: String,
    pub model: PdfModel,
}

impl PdfFileModel {
    pub fn new(file_name: String, model: PdfModel) -> Self {
        Self { file_name, model }
    }
}

/// Defines the available models and what their input parameters are.
pub enum PdfModel {
    ModelNa14_2(Box<ModelNa14_2Input>),
    ModelNa14_2Bijlage1(Box<ModelNa14_2Bijlage1Input>),
    ModelNa31_2(Box<ModelNa31_2Input>),
    ModelNa31_2Bijlage1(Box<ModelNa31_2Bijlage1Input>),
    ModelN10_2(Box<ModelN10_2Input>),
    ModelP2a(Box<ModelP2aInput>),
    #[cfg(test)]
    TeletexTest(),
}

impl PdfModel {
    /// Get the name for the input and template
    pub fn as_model_name(&self) -> &'static str {
        match self {
            Self::ModelNa14_2(_) => "model-na-14-2",
            Self::ModelNa14_2Bijlage1(_) => "model-na-14-2-bijlage1",
            Self::ModelNa31_2(_) => "model-na-31-2",
            Self::ModelNa31_2Bijlage1(_) => "model-na-31-2-bijlage1",
            Self::ModelN10_2(_) => "model-n-10-2",
            Self::ModelP2a(_) => "model-p-2a",
            #[cfg(test)]
            Self::TeletexTest() => "teletex-test",
        }
    }

    /// Get the path for the template of this model
    pub fn as_template_path(&self) -> PathBuf {
        let mut pb: PathBuf = [self.as_model_name()].iter().collect();
        pb.set_extension("typ");

        pb
    }

    /// Get the path for the input of this model
    pub fn as_input_path(&self) -> PathBuf {
        let mut pb: PathBuf = ["inputs", self.as_model_name()].iter().collect();
        pb.set_extension("json");

        pb
    }

    /// Get the input, serialized as json
    pub fn get_input(&self) -> serde_json::Result<String> {
        let data = match self {
            Self::ModelNa14_2(input) => serde_json::to_string(input),
            Self::ModelNa14_2Bijlage1(input) => serde_json::to_string(input),
            Self::ModelNa31_2(input) => serde_json::to_string(input),
            Self::ModelNa31_2Bijlage1(input) => serde_json::to_string(input),
            Self::ModelN10_2(input) => serde_json::to_string(input),
            Self::ModelP2a(input) => serde_json::to_string(input),
            #[cfg(test)]
            Self::TeletexTest() => {
                Ok(include_str!("../../../templates/inputs/teletex-test.json").to_string())
            }
        }?;

        Ok(replace_unsupported_glyphs(data))
    }

    pub fn from_name_with_input(name: &str, input: &str) -> Result<PdfModel, Box<dyn Error>> {
        use std::io::{Error, ErrorKind};

        match name {
            "model-na-14-2" => Ok(Self::ModelNa14_2(serde_json::from_str(input)?)),
            "model-na-14-2-bijlage1" => Ok(Self::ModelNa14_2Bijlage1(serde_json::from_str(input)?)),
            "model-na-31-2" => Ok(Self::ModelNa31_2(serde_json::from_str(input)?)),
            "model-na-31-2-bijlage1" => Ok(Self::ModelNa31_2Bijlage1(serde_json::from_str(input)?)),
            "model-n-10-2" => Ok(Self::ModelN10_2(serde_json::from_str(input)?)),
            "model-p-2a" => Ok(Self::ModelP2a(serde_json::from_str(input)?)),
            _ => Err(Error::new(ErrorKind::InvalidInput, "Unknown model").into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::pdf_gen::{
        CandidatesTables, VotesTables, VotesTablesWithOnlyPreviousVotes,
        VotesTablesWithPreviousVotes,
    };

    #[tokio::test]
    async fn test_recreate_votes_tables() {
        // model-na-14-2
        let na_14_2_content = tokio::fs::read_to_string("templates/inputs/model-na-14-2.json")
            .await
            .unwrap();
        let na_14_2_input: super::ModelNa14_2Input =
            serde_json::from_str(&na_14_2_content).unwrap();
        let updated_input = super::ModelNa14_2Input {
            votes_tables: VotesTablesWithPreviousVotes::new(
                &na_14_2_input.election,
                &na_14_2_input.summary,
                &na_14_2_input.previous_summary,
            )
            .unwrap(),
            ..na_14_2_input
        };
        let expected = serde_json::to_string_pretty(&updated_input).unwrap();
        assert_eq!(na_14_2_content, expected);

        // model-na-14-2-bijlage1
        let na_14_2_bijlage1_content =
            tokio::fs::read_to_string("templates/inputs/model-na-14-2-bijlage1.json")
                .await
                .unwrap();
        let na_14_2_bijlage1_input: super::ModelNa14_2Bijlage1Input =
            serde_json::from_str(&na_14_2_bijlage1_content).unwrap();
        let updated_input = super::ModelNa14_2Bijlage1Input {
            votes_tables: VotesTablesWithOnlyPreviousVotes::new(
                &na_14_2_bijlage1_input.election,
                &na_14_2_bijlage1_input.previous_results,
            )
            .unwrap(),
            ..na_14_2_bijlage1_input
        };
        let expected = serde_json::to_string_pretty(&updated_input).unwrap();
        assert_eq!(na_14_2_bijlage1_content, expected);

        // model-na-31-2
        let na_31_2_content = tokio::fs::read_to_string("templates/inputs/model-na-31-2.json")
            .await
            .unwrap();
        let na_31_2_input: super::ModelNa31_2Input =
            serde_json::from_str(&na_31_2_content).unwrap();
        let updated_input = super::ModelNa31_2Input {
            votes_tables: VotesTables::new(&na_31_2_input.election, &na_31_2_input.summary)
                .unwrap(),
            ..na_31_2_input
        };
        let expected = serde_json::to_string_pretty(&updated_input).unwrap();
        assert_eq!(na_31_2_content, expected);

        // model-na-31-2-bijlage1
        let na_31_2_bijlage1_content =
            tokio::fs::read_to_string("templates/inputs/model-na-31-2-bijlage1.json")
                .await
                .unwrap();
        let na_31_2_bijlage1_input: super::ModelNa31_2Bijlage1Input =
            serde_json::from_str(&na_31_2_bijlage1_content).unwrap();
        let updated_input = super::ModelNa31_2Bijlage1Input {
            candidates_tables: CandidatesTables::new(&na_31_2_bijlage1_input.election).unwrap(),
            ..na_31_2_bijlage1_input
        };
        let expected = serde_json::to_string_pretty(&updated_input).unwrap();
        assert_eq!(na_31_2_bijlage1_content, expected);

        // model-n-10-2
        let n_10_2_content = tokio::fs::read_to_string("templates/inputs/model-n-10-2.json")
            .await
            .unwrap();
        let n_10_2_input: super::ModelN10_2Input = serde_json::from_str(&n_10_2_content).unwrap();
        let updated_input = super::ModelN10_2Input {
            candidates_tables: CandidatesTables::new(&n_10_2_input.election).unwrap(),
            ..n_10_2_input
        };
        let expected = serde_json::to_string_pretty(&updated_input).unwrap();
        assert_eq!(n_10_2_content, expected);
    }
}
