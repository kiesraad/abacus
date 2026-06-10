pub use pdf_gen_types::*;
use tracing::error;

#[cfg(not(any(feature = "dev", feature = "static", feature = "stub")))]
compile_error!("either `dev`, `static`, or `stub` feature must be enabled");

#[cfg(all(not(feature = "dev"), not(feature = "static"), feature = "stub"))]
pub async fn generate_pdf(_input: impl PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    unimplemented!("pdf_gen wrapper built with `stub` feature; PDF generation is unavailable")
}

#[cfg(feature = "static")]
pub async fn generate_pdf(input: impl PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    tokio::task::spawn_blocking(move || pdf_gen_impl::generate_pdf(&input)).await?
}

#[cfg(all(not(feature = "static"), feature = "dev"))]
pub async fn generate_pdf(input: impl PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    tokio::task::spawn_blocking(move || pdf_gen_dylib::pdf_gen_dyn_generate_pdf(Box::new(input)))
        .await?
}

/// Generates a ZIP file containing the PDFs for the provided inputs.
/// Uses the embedded typst library to generate the PDFs.
pub async fn generate_pdfs(
    inputs: Vec<impl PdfGenInput>,
    mut zip_writer: zip::ZipResponseWriter,
) -> Result<(), PdfGenError> {
    for input in inputs.into_iter() {
        let file_name = input.output_file_name().to_string();

        let content = match generate_pdf(input).await {
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
