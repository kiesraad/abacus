mod sources;
#[cfg(test)]
mod typst_smoke_tests;
#[cfg(test)]
mod typst_tests;

use crate::domain::models::PdfFileModel;
use pdf_gen::zip::ZipResponseWriter;

/// Error type covering both pdf_gen crate errors and input serialization failures
#[derive(Debug)]
pub enum PdfGenError {
    Gen(pdf_gen::PdfGenError),
    Serialization(serde_json::Error),
}

impl From<pdf_gen::PdfGenError> for PdfGenError {
    fn from(err: pdf_gen::PdfGenError) -> Self {
        PdfGenError::Gen(err)
    }
}

impl From<serde_json::Error> for PdfGenError {
    fn from(err: serde_json::Error) -> Self {
        PdfGenError::Serialization(err)
    }
}

fn file_model_to_input(
    file_model: PdfFileModel,
) -> Result<pdf_gen::PdfGenInput, serde_json::Error> {
    Ok(pdf_gen::PdfGenInput {
        sources: sources::load_sources(),
        fonts: sources::load_fonts(),
        main_template_path: file_model.model.as_template_path_str(),
        input_path: file_model.model.as_input_path_str(),
        input_json: file_model.model.get_input()?,
        output_file_name: file_model.file_name,
    })
}

pub async fn generate_pdf(file_model: PdfFileModel) -> Result<pdf_gen::PdfGenResult, PdfGenError> {
    let input = file_model_to_input(file_model)?;
    Ok(pdf_gen::generate_pdf(input).await?)
}

pub async fn generate_pdfs(
    file_models: Vec<PdfFileModel>,
    zip_writer: ZipResponseWriter,
) -> Result<(), PdfGenError> {
    let inputs = file_models
        .into_iter()
        .map(file_model_to_input)
        .collect::<Result<Vec<_>, _>>()?;
    Ok(pdf_gen::generate_pdfs(inputs, zip_writer).await?)
}
