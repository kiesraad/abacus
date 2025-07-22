use axum_extra::response::Attachment;
use std::io::Write;
use zip::{result::ZipError, write::SimpleFileOptions};

use crate::APIError;

pub fn slugify_filename(filename: &str) -> String {
    filename.replace(" ", "_").replace("/", "-")
}

pub struct ZipResponse {
    filename: String,
    options: SimpleFileOptions,
}

impl ZipResponse {
    /// Creates a new `ZipResponse` with the given filename.
    pub fn with_name(filename: &str) -> Self {
        let options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::DEFLATE)
            // zip file format does not support dates beyond 2107 or inserted leap (i.e. 61st) second
            .last_modified_time(
                chrono::Local::now()
                    .naive_local()
                    .try_into()
                    .expect("Timestamp should be inside zip timestamp range"),
            )
            .unix_permissions(0o644);

        Self {
            filename: slugify_filename(filename),
            options,
        }
    }

    /// Creates a zip archive containing the provided files.
    /// Returns an `Attachment` with the zip data.
    /// Returns an `APIError` if the zip creation fails.
    pub fn create_zip(
        &self,
        files: Vec<(String, Vec<u8>)>,
    ) -> Result<Attachment<Vec<u8>>, APIError> {
        let mut data = vec![];
        let mut cursor = std::io::Cursor::new(&mut data);
        let mut zip = zip::ZipWriter::new(&mut cursor);

        for (name, content) in files.into_iter() {
            zip.start_file(slugify_filename(&name), self.options)?;
            zip.write_all(&content).map_err(ZipError::Io)?;
        }

        zip.finish()?;

        Ok(Attachment::new(data)
            .filename(&self.filename)
            .content_type("application/zip"))
    }
}
