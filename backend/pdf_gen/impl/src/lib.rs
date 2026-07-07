use std::time::Instant;

use chrono::{Datelike, Timelike};
use pdf_gen_types::{PdfGenError, PdfGenInput, PdfGenResult};
use tracing::{debug, info, warn};
use typst::{World, comemo, diag::SourceDiagnostic, ecow::EcoVec, foundations::Datetime};
use typst_pdf::{PdfOptions, PdfStandard, PdfStandards, Timestamp};

mod world;

/// Generates a PDF using the embedded typst library.
pub fn generate_pdf(input: &dyn PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    let world = world::PdfWorld::new(input)?;

    // Do not short-circuit error here because we always want to do the cache cleanup
    let result = compile_pdf(&world);

    // Evict the cache to free up memory + speed up next compile
    comemo::evict(0);

    result
}

fn get_pdf_options() -> PdfOptions {
    PdfOptions {
        standards: PdfStandards::new(&[PdfStandard::A_2b]).expect("PDF standards should be valid"),
        // https://github.com/typst/typst/blob/96dd67e011bb317cf78683bcf1edfdfca5e7b6b3/crates/typst-cli/src/compile.rs#L280
        timestamp: {
            let local_datetime = chrono::Local::now();
            convert_datetime(&local_datetime).and_then(|datetime| {
                Timestamp::new_local(datetime, local_datetime.offset().local_minus_utc() / 60)
            })
        },
        ..Default::default()
    }
}

/// Convert [`chrono::DateTime`] to [`Datetime`]
/// From <https://github.com/typst/typst/blob/96dd67e011bb317cf78683bcf1edfdfca5e7b6b3/crates/typst-cli/src/compile.rs#L305>
fn convert_datetime<Tz: chrono::TimeZone>(date_time: &chrono::DateTime<Tz>) -> Option<Datetime> {
    Datetime::from_ymd_hms(
        date_time.year(),
        date_time.month().try_into().ok()?,
        date_time.day().try_into().ok()?,
        date_time.hour().try_into().ok()?,
        date_time.minute().try_into().ok()?,
        date_time.second().try_into().ok()?,
    )
}

#[allow(clippy::cognitive_complexity)]
fn compile_pdf(world: &world::PdfWorld) -> Result<PdfGenResult, PdfGenError> {
    debug!(
        "Starting Typst compilation for {:?}",
        world.main().vpath().get_without_slash()
    );

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

    let document = result.output.map_err(error_from_typst)?;

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

    let buffer = result.map_err(error_from_typst)?;

    Ok(PdfGenResult { buffer })
}

fn error_from_typst(typst_errors: EcoVec<SourceDiagnostic>) -> PdfGenError {
    PdfGenError::Typst(
        typst_errors
            .into_iter()
            .map(|e| {
                format!(
                    "Typst error in {:?}: {}",
                    e.span
                        .id()
                        .map(|id| id.vpath().get_without_slash().to_string())
                        .unwrap_or_default(),
                    e.message
                )
            })
            .collect::<Vec<_>>()
            .join("\n"),
    )
}
