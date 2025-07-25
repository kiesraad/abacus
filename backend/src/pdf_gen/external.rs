use rand::{Rng, distr::Alphanumeric};
use std::{io::Write, path::PathBuf};
use zip::result::ZipError;

use super::{PdfGenResult, models::PdfModel};
use crate::{
    APIError,
    zip::{default_zip_options, slugify_filename},
};

/// Generates a PDF using an external typst binary.
/// Uses environment variables `ABACUS_TYPST_BIN` (`typst` by default)
/// and `ABACUS_TEMPLATES_DIR` (`./templates` by default) to
pub async fn generate_pdf(model: PdfModel) -> Result<PdfGenResult, APIError> {
    Ok(generate_pdf_internal(model).await?)
}

/// Generates a ZIP file containing the PDFs for the provided models.
pub async fn generate_pdfs_zip(models: Vec<PdfModel>) -> Result<Vec<u8>, APIError> {
    Ok(generate_pdfs_zip_inner(models).await?)
}

/// Generates a zip file containing the PDFs for the provided models.
pub async fn generate_pdfs_zip_inner(models: Vec<PdfModel>) -> Result<Vec<u8>, PdfGenError> {
    let mut data = vec![];
    let mut cursor = std::io::Cursor::new(&mut data);
    let mut zip = zip::ZipWriter::new(&mut cursor);
    let options = default_zip_options();

    for model in models.into_iter() {
        let file_name = model.get_filename();
        let content = generate_pdf_internal(model).await?;
        zip.start_file(slugify_filename(&file_name), options)?;
        zip.write_all(&content.buffer).map_err(ZipError::Io)?;
    }

    zip.finish()?;

    Ok(data)
}

/// Uses environment variables `ABACUS_TYPST_BIN` (`typst` by default) and `ABACUS_TEMPLATES_DIR` (`./templates` by
/// default) to generate a PDF using an external binary of typst.
async fn generate_pdf_internal(model: PdfModel) -> Result<PdfGenResult, PdfGenError> {
    // create a temporary copy of the template files
    let tmp_path = tokio::task::spawn_blocking(prep_tmp_templates_dir).await??;

    // write json data to model input file
    let json_path = {
        let mut full_path = tmp_path.clone();
        full_path.push(model.as_input_path());
        full_path
    };
    let json_data = model.get_input()?;
    tokio::fs::write(json_path, json_data).await?;

    // construct the typst command to run
    let typst_binary = std::env::var("ABACUS_TYPST_BIN").unwrap_or("typst".into());
    let mut command = tokio::process::Command::new(typst_binary);
    command
        .args([
            "compile",
            "--format",
            "pdf",
            "--ignore-system-fonts",
            "--font-path",
            "fonts/",
            model
                .as_template_path()
                .to_str()
                .expect("Model template path should always be UTF-8"),
            "-",
        ])
        .current_dir(&tmp_path);

    // get the command output
    let res = command.output().await?;

    // remove the temporary directory
    std::fs::remove_dir_all(&tmp_path)?;

    // return the result
    Ok(PdfGenResult { buffer: res.stdout })
}

/// Creates a temporary copy of the templates directory
fn prep_tmp_templates_dir() -> Result<PathBuf, std::io::Error> {
    let from_dir =
        PathBuf::from(&std::env::var("ABACUS_TEMPLATES_DIR").unwrap_or("./templates".into()));
    let temp_dir = {
        let mut temp_dir = std::env::temp_dir();
        let mut tmp_dir_name = "abacus-".to_string();
        for c in rand::rng()
            .sample_iter(Alphanumeric)
            .take(8)
            .map(char::from)
        {
            tmp_dir_name.push(c);
        }
        temp_dir.push(tmp_dir_name);
        temp_dir
    };
    copy_dir(&from_dir, &temp_dir)?;

    Ok(temp_dir)
}

/// Copy a directory recusively to another location
fn copy_dir(
    source: impl AsRef<std::path::Path>,
    dest: impl AsRef<std::path::Path>,
) -> Result<(), std::io::Error> {
    std::fs::create_dir_all(&dest)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            copy_dir(entry.path(), dest.as_ref().join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dest.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[derive(Debug)]
pub enum PdfGenError {
    Io(std::io::Error),
    Join(tokio::task::JoinError),
    Json(serde_json::Error),
    ZipError(ZipError),
}

impl From<std::io::Error> for PdfGenError {
    fn from(err: std::io::Error) -> Self {
        PdfGenError::Io(err)
    }
}

impl From<serde_json::Error> for PdfGenError {
    fn from(err: serde_json::Error) -> Self {
        PdfGenError::Json(err)
    }
}

impl From<tokio::task::JoinError> for PdfGenError {
    fn from(err: tokio::task::JoinError) -> Self {
        PdfGenError::Join(err)
    }
}

impl From<ZipError> for PdfGenError {
    fn from(err: ZipError) -> Self {
        PdfGenError::ZipError(err)
    }
}
