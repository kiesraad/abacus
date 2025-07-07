mod world;

use std::time::Instant;

use tracing::{debug, info, warn};
use typst::{diag::SourceDiagnostic, ecow::EcoVec};
use typst_pdf::{PdfOptions, PdfStandard, PdfStandards};

use super::{PdfGenResult, models::PdfModel};
use crate::APIError;

pub async fn generate_pdf(model: PdfModel) -> Result<PdfGenResult, APIError> {
    Ok(
        tokio::task::spawn_blocking(move || generate_pdf_internal(model))
            .await
            .map_err(PdfGenError::from)??,
    )
}

fn generate_pdf_internal(model: PdfModel) -> Result<PdfGenResult, PdfGenError> {
    let start = Instant::now();
    let mut world = world::PdfWorld::new();
    world.set_input_model(model);

    let compile_start = Instant::now();
    let result = typst::compile(&world);
    let document = result.output.map_err(PdfGenError::from_typst)?;
    info!("Compile took {} ms", compile_start.elapsed().as_millis());

    info!("{} warnings", result.warnings.len());
    result.warnings.iter().for_each(|warning| {
        warn!("Warning: {:?}", warning);
    });

    debug!("Generating PDF...");
    let pdf_gen_start = Instant::now();
    let pdf_standards =
        PdfStandards::new(&[PdfStandard::A_2b]).expect("PDF standards should be valid");
    let pdf_options = PdfOptions {
        standards: pdf_standards,
        ..Default::default()
    };
    let buffer = typst_pdf::pdf(&document, &pdf_options).map_err(PdfGenError::from_typst)?;
    debug!(
        "PDF generation took {} ms",
        pdf_gen_start.elapsed().as_millis()
    );

    info!("Finished in {} ms", start.elapsed().as_millis());
    Ok(PdfGenResult { buffer })
}

#[derive(Debug)]
pub enum PdfGenError {
    Typst(Vec<SourceDiagnostic>),
    Join(tokio::task::JoinError),
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
