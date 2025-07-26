use std::time::Instant;
use tokio::{sync::mpsc::Sender, task::JoinHandle};
use tracing::{debug, info, warn};
use typst::{diag::SourceDiagnostic, ecow::EcoVec};
use typst_pdf::{PdfOptions, PdfStandard, PdfStandards};

use super::{PdfGenResult, models::PdfModel};
use crate::{APIError, zip::FileEntry};

mod world;

/// Generates a PDF using the embedded typst library.
pub async fn generate_pdf(model: PdfModel) -> Result<PdfGenResult, APIError> {
    Ok(
        tokio::task::spawn_blocking(move || compile_pdf(&mut world::PdfWorld::new(), model))
            .await
            .map_err(PdfGenError::from)??,
    )
}

/// Generates a ZIP file containing the PDFs for the provided models.
/// Uses the embedded typst library to generate the PDFs.
pub async fn generate_pdfs(
    models: Vec<PdfModel>,
    sender: Sender<FileEntry>,
) -> JoinHandle<Result<(), PdfGenError>> {
    tokio::task::spawn_blocking(move || generate_pdfs_zip_inner(models, sender))
}

pub fn generate_pdfs_zip_inner(
    models: Vec<PdfModel>,
    sender: Sender<FileEntry>,
) -> Result<(), PdfGenError> {
    let mut world = world::PdfWorld::new();

    for model in models.into_iter() {
        let file_name = model.get_filename();
        let content = compile_pdf(&mut world, model)?;

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
    Typst(Vec<SourceDiagnostic>),
    Join(tokio::task::JoinError),
    Json(serde_json::Error),
    TemplateNotFound(String),
    ChannelClosed,
}

impl PdfGenError {
    fn from_typst(typst_errors: EcoVec<SourceDiagnostic>) -> PdfGenError {
        PdfGenError::Typst(typst_errors.to_vec())
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
