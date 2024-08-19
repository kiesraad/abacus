use std::{path::PathBuf, time::Instant};

use serde::{Deserialize, Serialize};
use typst::{
    diag::eco_format,
    eval::Tracer,
    foundations::{Bytes, Smart},
    model::Document,
};

use crate::APIError;

use self::world::PdfWorld;

mod world;

struct PdfGenResult<'a> {
    buffer: Vec<u8>,
    filename: &'a str,
}

fn generate<'a>(model: PdfModel) -> Result<PdfGenResult<'a>, APIError> {
    let start = Instant::now();
    let filename = model.as_filename();
    let mut world = PdfWorld::new();
    world.set_input_model(model);

    let compile_start = Instant::now();
    let mut tracer = Tracer::new();
    let result = typst::compile(&world, &mut tracer);
    println!("Compile took {} ms", compile_start.elapsed().as_millis());

    let warnings = &tracer.warnings();
    println!("{} warnings", warnings.len());
    warnings.iter().for_each(|warning| {
        println!("Warning: {:?}", warning);
    });

    let buffer = match result {
        Ok(document) => {
            println!("Generating PDF...");
            let pdf_gen_start = Instant::now();
            let buffer: Vec<u8> = typst_pdf::pdf(&document, Smart::Auto, None);
            println!(
                "PDF generation took {} ms",
                pdf_gen_start.elapsed().as_millis()
            );
            Ok(buffer)
        }
        Err(err) => {
            eprintln!("{:?}", err);
            // TODO: Improve this error
            Err(APIError::PdfGenError("PDF generation error".to_string()))
        }
    }?;

    println!("Finished in {} ms", start.elapsed().as_millis());
    Ok(PdfGenResult { buffer, filename })
}

/// Defines the available models and what their input parameters are.
pub enum PdfModel {
    ModelP22_1(ModelP22_1Input),
}

#[derive(Serialize, Deserialize)]
pub struct ModelP22_1Input {
    gen_datum: String,
    version: String,
    leden_van: String,
    datum: String,
}

impl PdfModel {
    /// Get the filename for the input and template
    pub fn as_filename(&self) -> &'static str {
        match self {
            Self::ModelP22_1(_) => "model-p-22-1",
        }
    }

    /// Get the path for the template of this model
    pub fn as_template_path(&self) -> PathBuf {
        let mut pb: PathBuf = ["templates", self.as_filename()].iter().collect();
        pb.set_extension("typ");

        pb
    }

    /// Get the path for the input of this model
    pub fn as_input_path(&self) -> PathBuf {
        let mut pb: PathBuf = ["templates", "inputs", self.as_filename()].iter().collect();
        pb.set_extension("json");

        pb
    }

    /// Get the input, serialized as json
    pub fn get_input(&self) -> serde_json::Result<Bytes> {
        let data = match self {
            Self::ModelP22_1(input) => serde_json::to_string(input),
        }?;

        Ok(Bytes::from(data.as_bytes()))
    }

    pub fn from_name_with_input(
        name: &str,
        input: &str,
    ) -> Result<PdfModel, Box<dyn std::error::Error>> {
        match name {
            "model-p-22-1" => Ok(Self::ModelP22_1(serde_json::from_str(input)?)),
            _ => Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, "Unknown model").into()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_generates_a_pdf() {
        let pdf_result = generate(PdfModel::ModelP22_1(ModelP22_1Input {
            gen_datum: "15-08-2024".to_string(),
            version: "0.0.1".to_string(),
            leden_van: "Staten Generaal".to_string(),
            datum: "16-08-2024".to_string(),
        }))
        .unwrap();

        assert_eq!(pdf_result.filename, "model-p-22-1.pdf");
    }
}
