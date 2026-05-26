pub use pdf_gen_types::*;
use tracing::error;

#[cfg(not(any(feature = "dev", feature = "static")))]
compile_error!("either `dev` or `static` feature must be enabled");

#[cfg(feature = "static")]
pub async fn generate_pdf(input: impl PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    tokio::task::spawn_blocking(move || pdf_gen_impl::generate_pdf(Box::new(input))).await?
}

#[cfg(all(not(feature = "static"), feature = "dev"))]
pub fn lib() -> &'static libloading::Library {
    use libloading::{Library, library_filename};
    use std::sync::OnceLock;

    static LIB: OnceLock<Library> = OnceLock::new();

    LIB.get_or_init(|| unsafe {
        Library::new(library_filename("pdf_gen_dylib")).expect("failed to load dylib")
    })
}

#[cfg(all(not(feature = "static"), feature = "dev"))]
pub async fn generate_pdf(input: impl PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    use libloading::Symbol;

    type PdfGenFn = fn(Box<dyn PdfGenInput>) -> Result<PdfGenResult, PdfGenError>;

    let lib = lib();
    let func: Symbol<PdfGenFn> = unsafe { lib.get(b"pdf_gen_dyn_generate_pdf\0") }
        .expect("symbol 'pdf_gen_dyn_generate_pdf' not found");

    let input = Box::new(input);
    tokio::task::spawn_blocking(move || func(input)).await?
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
