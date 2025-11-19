use chrono::{Datelike, Timelike};
use std::{fmt::Debug, time::Instant};
use strum::Display;
use tracing::{debug, error, info, warn};
use typst::{comemo, diag::SourceDiagnostic, ecow::EcoVec, foundations::Datetime};
use typst_pdf::{PdfOptions, PdfStandard, PdfStandards, Timestamp};

use crate::zip::{ZipResponseError, ZipResponseWriter};

use super::{
    PdfGenResult,
    models::{PdfFileModel, PdfModel},
};

mod world;

/// Generates a PDF using the embedded typst library.
pub async fn generate_pdf(file_model: PdfFileModel) -> Result<PdfGenResult, PdfGenError> {
    tokio::task::spawn_blocking(move || {
        let result = compile_pdf(&mut world::PdfWorld::new(), file_model.model);

        // Evict the cache to free up memory + speed up next compile
        comemo::evict(0);

        result
    })
    .await
    .map_err(PdfGenError::from)?
}

/// Generates a ZIP file containing the PDFs for the provided models.
/// Uses the embedded typst library to generate the PDFs.
pub async fn generate_pdfs(
    models: Vec<PdfFileModel>,
    mut zip_writer: ZipResponseWriter,
) -> Result<(), PdfGenError> {
    for file_model in models.into_iter() {
        let file_name = file_model.file_name.clone();

        let content = match generate_pdf(file_model).await {
            Ok(content) => content,
            Err(e) => {
                error!("Failed to generate PDF {file_name}: {e:?}");
                continue;
            }
        };

        zip_writer.add_file(&file_name, &content.buffer).await?;
    }

    zip_writer.finish().await?;

    Ok::<(), PdfGenError>(())
}

fn get_pdf_options() -> PdfOptions<'static> {
    PdfOptions {
        standards: PdfStandards::new(&[PdfStandard::A_2b]).expect("PDF standards should be valid"),
        // https://github.com/typst/typst/blob/96dd67e011bb317cf78683bcf1edfdfca5e7b6b3/crates/typst-cli/src/compile.rs#L280
        timestamp: {
            let local_datetime = chrono::Local::now();
            convert_datetime(local_datetime).and_then(|datetime| {
                Timestamp::new_local(datetime, local_datetime.offset().local_minus_utc() / 60)
            })
        },
        ..Default::default()
    }
}

/// Convert [`chrono::DateTime`] to [`Datetime`]
/// From https://github.com/typst/typst/blob/96dd67e011bb317cf78683bcf1edfdfca5e7b6b3/crates/typst-cli/src/compile.rs#L305
fn convert_datetime<Tz: chrono::TimeZone>(date_time: chrono::DateTime<Tz>) -> Option<Datetime> {
    Datetime::from_ymd_hms(
        date_time.year(),
        date_time.month().try_into().ok()?,
        date_time.day().try_into().ok()?,
        date_time.hour().try_into().ok()?,
        date_time.minute().try_into().ok()?,
        date_time.second().try_into().ok()?,
    )
}

fn compile_pdf(world: &mut world::PdfWorld, model: PdfModel) -> Result<PdfGenResult, PdfGenError> {
    debug!("Starting Typst compilation for {}", model.as_model_name());

    world.set_input_model(model)?;

    let compile_start = Instant::now();

    let result = typst::compile(world);
    info!(
        "Compile took {} ms, {} warnings",
        compile_start.elapsed().as_millis(),
        result.warnings.len()
    );
    result.warnings.iter().for_each(|warning| {
        warn!("Warning: {:?}", warning);
    });

    let document = result.output.map_err(PdfGenError::from_typst)?;

    let pdf_gen_start = Instant::now();
    let result = typst_pdf::pdf(&document, &get_pdf_options());
    debug!(
        "PDF generation took {} ms, {}",
        pdf_gen_start.elapsed().as_millis(),
        if result.is_err() {
            "failed"
        } else {
            "succeeded"
        }
    );

    let buffer = result.map_err(PdfGenError::from_typst)?;

    Ok(PdfGenResult { buffer })
}

#[derive(Debug, Display)]
pub enum PdfGenError {
    Typst(String),
    Join(tokio::task::JoinError),
    Json(serde_json::Error),
    TemplateNotFound(String),
    ZipError(ZipResponseError),
}

impl std::error::Error for PdfGenError {}

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

impl From<ZipResponseError> for PdfGenError {
    fn from(err: ZipResponseError) -> Self {
        PdfGenError::ZipError(err)
    }
}
