#[cfg(feature = "embed-typst")]
mod embedded;

#[cfg(not(feature = "embed-typst"))]
mod external;

pub mod zip;

#[cfg(feature = "embed-typst")]
pub use embedded::{PdfGenError, generate_pdf, generate_pdfs};
#[cfg(not(feature = "embed-typst"))]
pub use external::{PdfGenError, generate_pdf, generate_pdfs};

/// A source file for Typst compilation
pub struct SourceFile {
    pub path: &'static str,
    pub content: &'static str,
}

/// Font data for Typst
pub struct FontData(pub &'static [u8]);

/// Configuration for a single PDF generation
pub trait PdfGenInput: Send + Sync {
    /// Typst source files (templates)
    fn sources(&self) -> &[SourceFile];
    /// Font data
    fn fonts(&self) -> &[FontData];
    /// Which Typst source file is the entry point (e.g., "model-na-31-2.typ")
    fn main_template_path(&self) -> &str;
    /// Virtual path for JSON input (e.g., "inputs/model-na-31-2.json")
    fn input_path(&self) -> &str;
    /// The JSON input data
    fn input_json(&self) -> String;
    /// PDF output file name
    fn output_file_name(&self) -> &str;
}

pub struct PdfGenResult {
    pub buffer: Vec<u8>,
}
