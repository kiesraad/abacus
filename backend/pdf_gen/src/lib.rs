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
pub struct PdfGenInput {
    /// Typst source files (templates)
    pub sources: Vec<SourceFile>,
    /// Font data
    pub fonts: Vec<FontData>,
    /// Which Typst source file is the entry point (e.g., "model-na-31-2.typ")
    pub main_template_path: &'static str,
    /// Virtual path for JSON input (e.g., "inputs/model-na-31-2.json")
    pub input_path: &'static str,
    /// The JSON input data
    pub input_json: String,
    /// PDF output file name
    pub output_file_name: String,
}

pub struct PdfGenResult {
    pub buffer: Vec<u8>,
}
