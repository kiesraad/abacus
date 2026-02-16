mod sources;
#[cfg(test)]
mod typst_smoke_tests;
#[cfg(test)]
mod typst_tests;

use crate::domain::models::PdfFileModel;
use pdf_gen::PdfGenInput;

impl PdfGenInput for PdfFileModel {
    fn sources(&self) -> &[pdf_gen::SourceFile] {
        sources::load_sources()
    }

    fn fonts(&self) -> &[pdf_gen::FontData] {
        sources::load_fonts()
    }

    fn main_template_path(&self) -> &str {
        self.model.as_template_path_str()
    }

    fn input_path(&self) -> &str {
        self.model.as_input_path_str()
    }

    fn input_json(&self) -> String {
        self.model.get_input()
    }

    fn output_file_name(&self) -> &str {
        &self.file_name
    }
}
