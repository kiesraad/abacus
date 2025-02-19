mod model_na_31_2;

use std::{error::Error, path::PathBuf};

pub use model_na_31_2::*;
use typst::foundations::Bytes;

/// Defines the available models and what their input parameters are.
pub enum PdfModel {
    ModelNa31_2(ModelNa31_2Input),
}

impl PdfModel {
    /// Get the filename for the input and template
    pub fn as_filename(&self) -> &'static str {
        match self {
            Self::ModelNa31_2(_) => "model-na-31-2",
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
    pub fn get_input(&self) -> serde_json::Result<Bytes> {
        let data = match self {
            Self::ModelNa31_2(input) => serde_json::to_string(input),
        }?;

        Ok(Bytes::from_string(data))
    }

    pub fn from_name_with_input(name: &str, input: &str) -> Result<PdfModel, Box<dyn Error>> {
        use std::io::{Error, ErrorKind};

        match name {
            "model-na-31-2" => Ok(Self::ModelNa31_2(serde_json::from_str(input)?)),
            _ => Err(Error::new(ErrorKind::InvalidInput, "Unknown model").into()),
        }
    }
}
