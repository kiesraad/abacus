use pdf_gen_types::{PdfGenError, PdfGenInput, PdfGenResult};

pub fn pdf_gen_dyn_generate_pdf(input: &dyn PdfGenInput) -> Result<PdfGenResult, PdfGenError> {
    pdf_gen_impl::generate_pdf(input)
}
