use rand::{Rng, distr::Alphanumeric};
use std::{path::PathBuf, process::Command};

use super::{PdfGenResult, models::PdfModel};
use crate::APIError;

pub fn generate_pdf(model: PdfModel) -> Result<PdfGenResult, APIError> {
    generate_pdf_internal(model).map_err(APIError::PdfGenError)
}

/// Uses environment variables `ABACUS_TYPST_BIN` (`typst` by default) and `ABACUS_TEMPLATES_DIR` (`./templates` by
/// default) to generate a PDF using an external binary of typst.
fn generate_pdf_internal(model: PdfModel) -> Result<PdfGenResult, PdfGenError> {
    // create a temporary copy of the template files
    let tmp_path = prep_tmp_templates_dir()?;

    // write json data to model input file
    let json_path = {
        let mut full_path = tmp_path.clone();
        full_path.push(model.as_input_path());
        full_path
    };
    let json_data = model.get_input()?;
    std::fs::write(json_path, json_data)?;

    // construct the typst command to run
    let typst_binary = std::env::var("ABACUS_TYPST_BIN").unwrap_or("typst".into());
    let mut command = Command::new(typst_binary);
    command
        .args([
            "compile",
            "--format",
            "pdf",
            "--ignore-system-fonts",
            "--font-path",
            "fonts/",
            model
                .as_template_path()
                .to_str()
                .expect("Model template path should always be UTF-8"),
            "-",
        ])
        .current_dir(&tmp_path);

    // get the command output
    let res = command.output()?;

    // remove the temporary directory
    std::fs::remove_dir_all(&tmp_path)?;

    // return the result
    Ok(PdfGenResult { buffer: res.stdout })
}

/// Creates a temporary copy of the templates directory
fn prep_tmp_templates_dir() -> Result<PathBuf, std::io::Error> {
    let from_dir =
        PathBuf::from(&std::env::var("ABACUS_TEMPLATES_DIR").unwrap_or("./templates".into()));
    let temp_dir = {
        let mut temp_dir = std::env::temp_dir();
        let mut tmp_dir_name = "abacus-".to_string();
        for c in rand::rng()
            .sample_iter(Alphanumeric)
            .take(8)
            .map(char::from)
        {
            tmp_dir_name.push(c);
        }
        temp_dir.push(tmp_dir_name);
        temp_dir
    };
    copy_dir(&from_dir, &temp_dir)?;

    Ok(temp_dir)
}

/// Copy a directory recusively to another location
fn copy_dir(
    source: impl AsRef<std::path::Path>,
    dest: impl AsRef<std::path::Path>,
) -> Result<(), std::io::Error> {
    std::fs::create_dir_all(&dest)?;
    for entry in std::fs::read_dir(source)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            copy_dir(entry.path(), dest.as_ref().join(entry.file_name()))?;
        } else {
            std::fs::copy(entry.path(), dest.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[derive(Debug)]
pub enum PdfGenError {
    Io(std::io::Error),
    Json(serde_json::Error),
}

impl From<std::io::Error> for PdfGenError {
    fn from(err: std::io::Error) -> Self {
        PdfGenError::Io(err)
    }
}

impl From<serde_json::Error> for PdfGenError {
    fn from(err: serde_json::Error) -> Self {
        PdfGenError::Json(err)
    }
}
