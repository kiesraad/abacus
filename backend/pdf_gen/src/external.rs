use std::{path::PathBuf, time::Instant};

use rand::{Rng, distr::Alphanumeric};
use strum::Display;
use tracing::{error, info};

use super::PdfGenResult;
use crate::{
    PdfGenInput,
    zip::{ZipResponseError, ZipResponseWriter},
};

async fn generate_file(input: PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    let start = Instant::now();
    let file_name = input.output_file_name.clone();
    let content = generate_pdf(input).await?;

    info!(
        "Generated PDF {file_name} in {} ms",
        start.elapsed().as_millis()
    );
    Ok(content)
}

/// Create a PDF file for each model in the provided vector and send them through the provided channel.
pub async fn generate_pdfs(
    inputs: Vec<PdfGenInput>,
    mut zip_writer: ZipResponseWriter,
) -> Result<(), PdfGenError> {
    for input in inputs.into_iter() {
        let file_name = input.output_file_name.clone();
        let content = match generate_file(input).await {
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

/// Uses environment variable `ABACUS_TYPST_BIN` (`typst` by default) to generate a PDF using an
/// external binary of typst. Sources, fonts and input data are provided via [`PdfGenInput`].
pub async fn generate_pdf(input: PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    // write sources, fonts and JSON input to a temporary directory
    let tmp_path = prep_tmp_dir(&input).await?;

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
            input.main_template_path,
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

/// Creates a temporary directory and writes sources, fonts and JSON input into it.
async fn prep_tmp_dir(input: &PdfGenInput) -> Result<PathBuf, std::io::Error> {
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

    // write source files
    for source in &input.sources {
        let full_path = temp_dir.join(source.path);
        if let Some(parent) = full_path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(&full_path, source.content).await?;
    }

    // write font files
    let fonts_dir = temp_dir.join("fonts");
    tokio::fs::create_dir_all(&fonts_dir).await?;
    for (i, font) in input.fonts.iter().enumerate() {
        let font_path = fonts_dir.join(format!("font_{i}.ttf"));
        tokio::fs::write(&font_path, font.0).await?;
    }

    // write JSON input file
    let json_path = temp_dir.join(input.input_path);
    if let Some(parent) = json_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    tokio::fs::write(&json_path, &input.input_json).await?;

    Ok(temp_dir)
}

#[derive(Debug, Display)]
pub enum PdfGenError {
    Io(std::io::Error),
    CompilationFailed(String),
    ZipError(ZipResponseError),
}

impl std::error::Error for PdfGenError {}

impl From<std::io::Error> for PdfGenError {
    fn from(err: std::io::Error) -> Self {
        PdfGenError::Io(err)
    }
}

impl From<ZipResponseError> for PdfGenError {
    fn from(err: ZipResponseError) -> Self {
        PdfGenError::ZipError(err)
    }
}
