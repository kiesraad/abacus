use strum::Display;

pub mod zip;

/// A source file for Typst compilation
pub struct SourceFile {
    pub path: &'static str,
    pub content: &'static str,
}

/// Font data for Typst
pub struct FontData(pub &'static [u8]);

/// Configuration for a single PDF generation
pub trait PdfGenInput: Send + Sync + 'static {
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

/// Result of PDF generation
pub struct PdfGenResult {
    pub buffer: Vec<u8>,
}

#[derive(Debug, Display)]
pub enum PdfGenError {
    Typst(String),
    Join(tokio::task::JoinError),
    TemplateNotFound(String),
    ZipError(zip::ZipResponseError),
}

impl std::error::Error for PdfGenError {}

impl From<tokio::task::JoinError> for PdfGenError {
    fn from(err: tokio::task::JoinError) -> Self {
        PdfGenError::Join(err)
    }
}

impl From<zip::ZipResponseError> for PdfGenError {
    fn from(err: zip::ZipResponseError) -> Self {
        PdfGenError::ZipError(err)
    }
}
