mod model_na_31_2;

use std::{error::Error, path::PathBuf};

pub use model_na_31_2::*;

/// Defines the available models and what their input parameters are.
pub enum PdfModel {
    ModelNa31_2(Box<ModelNa31_2Input>),
    ModelNa21_2Bijlage1(Box<ModelNa31_2Bijlage1Input>),
}

impl PdfModel {
    /// Get the filename for the input and template
    pub fn as_filename(&self) -> &'static str {
        match self {
            Self::ModelNa31_2(_) => "model-na-31-2",
            Self::ModelNa21_2Bijlage1(_) => "model-na-31-2-bijlage1",
        }
    }

    /// Get the path for the template of this model
    pub fn as_template_path(&self) -> PathBuf {
        let mut pb: PathBuf = [self.as_filename()].iter().collect();
        pb.set_extension("typ");

        pb
    }

    /// Get the path for the input of this model
    pub fn as_input_path(&self) -> PathBuf {
        let mut pb: PathBuf = ["inputs", self.as_filename()].iter().collect();
        pb.set_extension("json");

        pb
    }

    /// Get the input, serialized as json
    pub fn get_input(&self) -> serde_json::Result<String> {
        let data = match self {
            Self::ModelNa31_2(input) => serde_json::to_string(input),
            Self::ModelNa21_2Bijlage1(input) => serde_json::to_string(input),
        }?;

        Ok(data)
    }

    pub fn from_name_with_input(name: &str, input: &str) -> Result<PdfModel, Box<dyn Error>> {
        use std::io::{Error, ErrorKind};

        match name {
            "model-na-31-2" => Ok(Self::ModelNa31_2(serde_json::from_str(input)?)),
            "model-na-31-2-bijlage1" => Ok(Self::ModelNa21_2Bijlage1(serde_json::from_str(input)?)),
            _ => Err(Error::new(ErrorKind::InvalidInput, "Unknown model").into()),
        }
    }
}
