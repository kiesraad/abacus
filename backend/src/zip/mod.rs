use axum_extra::response::Attachment;
use std::io::Write;
use zip::{result::ZipError, write::SimpleFileOptions};

use crate::APIError;

fn slugify_filename(filename: &str) -> String {
    filename.replace(" ", "_").replace("/", "-")
}

pub enum ZipContent {
    Pdf(String, Vec<u8>),
    Xml(String, Vec<u8>),
}

impl ZipContent {
    pub fn filename(&self) -> String {
        let filename = match self {
            Self::Pdf(filename, _) => filename,
            Self::Xml(filename, _) => filename,
        };

        // slugify the filename
        let slugified = slugify_filename(filename);

        match self {
            Self::Pdf(_, _) => format!("{slugified}.pdf"),
            Self::Xml(_, _) => format!("{slugified}.xml"),
        }
    }

    pub fn content(self) -> Vec<u8> {
        match self {
            Self::Pdf(_, content) => content,
            Self::Xml(_, content) => content,
        }
    }
}

pub struct ZipResponse {
    filename: String,
    options: SimpleFileOptions,
}

impl ZipResponse {
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

        let slugified = slugify_filename(filename);

        Self {
            filename: format!("{slugified}.zip"),
            options,
        }
    }

    pub fn create_zip(&self, files: Vec<ZipContent>) -> Result<Attachment<Vec<u8>>, APIError> {
        let mut data = vec![];
        let mut cursor = std::io::Cursor::new(&mut data);
        let mut zip = zip::ZipWriter::new(&mut cursor);

        for file in files.into_iter() {
            zip.start_file(file.filename(), self.options)?;
            zip.write_all(&file.content()).map_err(ZipError::Io)?;
        }

        zip.finish()?;

        Ok(Attachment::new(data)
            .filename(&self.filename)
            .content_type("application/zip"))
    }
}
