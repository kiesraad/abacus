use pdf_gen_types::{PdfGenError, PdfGenInput, PdfGenResult};

#[unsafe(no_mangle)]
pub fn pdf_gen_dyn_generate_pdf(input: Box<dyn PdfGenInput>) -> Result<PdfGenResult, PdfGenError> {
    pdf_gen_impl::generate_pdf(&*input)
}
