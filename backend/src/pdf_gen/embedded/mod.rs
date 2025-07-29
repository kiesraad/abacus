use std::{fmt::Debug, time::Instant};
use tokio::{sync::mpsc::Sender, task::JoinHandle};
use tracing::{debug, error, info, warn};
use typst::{comemo, diag::SourceDiagnostic, ecow::EcoVec};
use typst_pdf::{PdfOptions, PdfStandard, PdfStandards};

use super::{PdfGenResult, models::PdfModel};
use crate::{APIError, pdf_gen::models::PdfFileModel, zip::FileEntry};

mod world;

/// Generates a PDF using the embedded typst library.
pub async fn generate_pdf(file_model: PdfFileModel) -> Result<PdfGenResult, APIError> {
    Ok(tokio::task::spawn_blocking(move || {
        let result = compile_pdf(&mut world::PdfWorld::new(), file_model.model);

        // Evict the cache to free up memory + speed up next compile
        comemo::evict(0);

        result
    })
    .await
    .map_err(PdfGenError::from)??)
}

/// Generates a ZIP file containing the PDFs for the provided models.
/// Uses the embedded typst library to generate the PDFs.
pub fn generate_pdfs(
    models: Vec<PdfFileModel>,
    sender: Sender<FileEntry>,
) -> JoinHandle<Result<(), PdfGenError>> {
    tokio::task::spawn_blocking(move || {
        if let Err(e) = generate_pdfs_inner(models, sender) {
            if matches!(e, PdfGenError::ChannelClosed) {
                error!("Failed to send PDF: {e:?} - the client might have closed the connection");
            } else {
                error!("Error generating PDFs: {e:?}");
            }

            return Err(e);
        }

        Ok(())
    })
}

pub fn generate_pdfs_inner(
    models: Vec<PdfFileModel>,
    sender: Sender<FileEntry>,
) -> Result<(), PdfGenError> {
    let mut world = world::PdfWorld::new();

    for file_model in models.into_iter() {
        let file_name = file_model.file_name;
        let result = compile_pdf(&mut world, file_model.model);

        // Evict the cache to free up memory + speed up next compile
        comemo::evict(0);

        let content = result?;

        sender
            .blocking_send(Some((file_name, content.buffer)))
            .map_err(|_| PdfGenError::ChannelClosed)?;
    }

    sender
        .blocking_send(None)
        .map_err(|_| PdfGenError::ChannelClosed)?;

    Ok(())
}

fn get_pdf_options() -> PdfOptions<'static> {
    PdfOptions {
        standards: PdfStandards::new(&[PdfStandard::A_2b]).expect("PDF standards should be valid"),
        ..Default::default()
    }
}

fn compile_pdf(world: &mut world::PdfWorld, model: PdfModel) -> Result<PdfGenResult, PdfGenError> {
    world.set_input_model(model)?;

    let compile_start = Instant::now();
    let result = typst::compile(world);
    let document = result.output.map_err(PdfGenError::from_typst)?;
    info!(
        "Compile took {} ms, {} warnings",
        compile_start.elapsed().as_millis(),
        result.warnings.len()
    );

    result.warnings.iter().for_each(|warning| {
        warn!("Warning: {:?}", warning);
    });

    let pdf_gen_start = Instant::now();
    let buffer = typst_pdf::pdf(&document, &get_pdf_options()).map_err(PdfGenError::from_typst)?;
    debug!(
        "PDF generation took {} ms",
        pdf_gen_start.elapsed().as_millis()
    );

    Ok(PdfGenResult { buffer })
}

#[derive(Debug)]
pub enum PdfGenError {
    Typst(String),
    Join(tokio::task::JoinError),
    Json(serde_json::Error),
    TemplateNotFound(String),
    ChannelClosed,
}

impl PdfGenError {
    fn from_typst(typst_errors: EcoVec<SourceDiagnostic>) -> PdfGenError {
        PdfGenError::Typst(
            typst_errors
                .into_iter()
                .map(|e| {
                    format!(
                        "Typst error in {:?}: {}",
                        e.span
                            .id()
                            .map(|id| id.vpath().as_rootless_path().display().to_string())
                            .unwrap_or_default(),
                        e.message
                    )
                })
                .collect::<Vec<_>>()
                .join("\n"),
        )
    }
}

impl From<tokio::task::JoinError> for PdfGenError {
    fn from(err: tokio::task::JoinError) -> Self {
        PdfGenError::Join(err)
    }
}

impl From<serde_json::Error> for PdfGenError {
    fn from(err: serde_json::Error) -> Self {
        PdfGenError::Json(err)
    }
}
