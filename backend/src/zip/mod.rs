use axum_extra::response::Attachment;
use std::io::Write;
use zip::{result::ZipError, write::SimpleFileOptions};

use crate::APIError;

pub fn slugify_filename(filename: &str) -> String {
    filename.replace(" ", "_").replace("/", "-")
}

pub fn default_zip_options() -> SimpleFileOptions {
    SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::DEFLATE)
        // zip file format does not support dates beyond 2107 or inserted leap (i.e. 61st) second
        .last_modified_time(
            chrono::Local::now()
                .naive_local()
                .try_into()
                .expect("Timestamp should be inside zip timestamp range"),
        )
        .unix_permissions(0o644)
}

pub fn zip_to_attachment(data: Vec<u8>, file_name: &str) -> Attachment<Vec<u8>> {
    Attachment::new(data)
        .filename(file_name)
        .content_type("application/zip")
}

/// Creates a zip archive containing the provided files.
/// Returns an `Attachment` with the zip data.
/// Returns an `APIError` if the zip creation fails.
pub fn create_zip(
    file_name: &str,
    files: Vec<(String, Vec<u8>)>,
) -> Result<Attachment<Vec<u8>>, APIError> {
    let mut data = vec![];
    let mut cursor = std::io::Cursor::new(&mut data);
    let mut zip = zip::ZipWriter::new(&mut cursor);
    let options = default_zip_options();

    for (name, content) in files.into_iter() {
        zip.start_file(slugify_filename(&name), options)?;
        zip.write_all(&content).map_err(ZipError::Io)?;
    }

    zip.finish()?;

    Ok(zip_to_attachment(data, file_name))
}
