mod model_n_10_2;

mod model_na_14_2;

mod model_na_31_2;

use std::{error::Error, path::PathBuf};

pub use model_n_10_2::*;
pub use model_na_14_2::*;
pub use model_na_31_2::*;

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
        }?;

        Ok(data)
    }

    pub fn from_name_with_input(name: &str, input: &str) -> Result<PdfModel, Box<dyn Error>> {
        use std::io::{Error, ErrorKind};

        match name {
            "model-na-14-2" => Ok(Self::ModelNa14_2(serde_json::from_str(input)?)),
            "model-na-14-2-bijlage1" => Ok(Self::ModelNa14_2Bijlage1(serde_json::from_str(input)?)),
            "model-na-31-2" => Ok(Self::ModelNa31_2(serde_json::from_str(input)?)),
            "model-na-31-2-bijlage1" => Ok(Self::ModelNa31_2Bijlage1(serde_json::from_str(input)?)),
            "model-n-10-2" => Ok(Self::ModelN10_2(serde_json::from_str(input)?)),
            _ => Err(Error::new(ErrorKind::InvalidInput, "Unknown model").into()),
        }
    }
}
