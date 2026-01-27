use std::{path::PathBuf, time::Instant};

use rand::{Rng, distr::Alphanumeric};
use strum::Display;
use tracing::{error, info};

use super::PdfGenResult;
use crate::{
    pdf_gen::models::PdfFileModel,
    zip::{ZipResponseError, ZipResponseWriter},
};

async fn generate_file(
    file_name: &String,
    file_model: PdfFileModel,
) -> Result<PdfGenResult, PdfGenError> {
    let start = Instant::now();
    let content = generate_pdf(file_model).await?;

    info!(
        "Generated PDF {file_name} in {} ms",
        start.elapsed().as_millis()
    );
    Ok(content)
}

/// Create a PDF file for each model in the provided vector and send them through the provided channel.
pub async fn generate_pdfs(
    models: Vec<PdfFileModel>,
    mut zip_writer: ZipResponseWriter,
) -> Result<(), PdfGenError> {
    for file_model in models.into_iter() {
        let file_name = file_model.file_name.clone();
        let content = match generate_file(&file_name, file_model).await {
            Ok(content) => content,
            Err(e) => {
                error!("Failed to generate PDF {file_name}: {e:?}");
                continue;
            }
        };

        zip_writer.add_file(&file_name, &content.buffer).await?;
    }

    zip_writer.finish().await?;

    info!("All PDFs generated and sent to the channel");

    Ok::<(), PdfGenError>(())
}

/// Uses environment variables `ABACUS_TYPST_BIN` (`typst` by default) and `ABACUS_TEMPLATES_DIR` (`./templates` by
/// default) to generate a PDF using an external binary of typst.
pub async fn generate_pdf(file_model: PdfFileModel) -> Result<PdfGenResult, PdfGenError> {
    // create a temporary copy of the template files
    let tmp_path = tokio::task::spawn_blocking(prep_tmp_templates_dir).await??;

    // write JSON data to model input file
    let json_path = {
        let mut full_path = tmp_path.clone();
        full_path.push(file_model.model.as_input_path());
        full_path
    };
    let json_data = file_model.model.get_input()?;
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
            file_model
                .model
                .as_template_path()
                .to_str()
                .expect("Model template path should always be UTF-8"),
            "-",
        ])
        .current_dir(&tmp_path);

    // get the command output
    let res = command.output().await?;

    // check if the command was successful
    if !res.status.success() {
        return Err(PdfGenError::CompilationFailed(format!(
            "Typst command failed: {}",
            String::from_utf8_lossy(&res.stderr)
        )));
    }

    // remove the temporary directory
    tokio::fs::remove_dir_all(&tmp_path).await?;

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

/// Copy a directory recursively to another location
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

#[derive(Debug, Display)]
pub enum PdfGenError {
    Io(std::io::Error),
    Join(tokio::task::JoinError),
    Json(serde_json::Error),
    CompilationFailed(String),
    ZipError(ZipResponseError),
    ChannelClosed,
}

impl std::error::Error for PdfGenError {}

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

impl From<ZipResponseError> for PdfGenError {
    fn from(err: ZipResponseError) -> Self {
        PdfGenError::ZipError(err)
    }
}
