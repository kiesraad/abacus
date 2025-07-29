use crate::{APIError, zip::write_stream::WriteStream};
use async_zip::{
    Compression, ZipDateTime, ZipEntryBuilder, error::ZipError, tokio::write::ZipFileWriter,
};
use axum::{
    body::Body,
    response::{IntoResponse, Response},
};
use axum_extra::response::Attachment;
use tokio::sync::mpsc::{self, Sender};
use tracing::info;

mod write_stream;

pub fn slugify_filename(filename: &str) -> String {
    filename.replace(" ", "_").replace("/", "-")
}

pub type FileEntry = Option<(String, Vec<u8>)>;

/// A stream that reads files from a channel and writes them to a ZIP file as a streamed HTTP response
pub struct ZipStream {
    file_name: String,
    sender: Sender<FileEntry>,
    write_stream: WriteStream,
}

impl ZipStream {
    pub async fn new(file_name: &str) -> Self {
        // Create the buffer that will pass the resulting zip as a response stream
        let write_stream = write_stream::WriteStream::new();
        let input_write_stream = write_stream.clone();
        let stream_closer = write_stream.clone();

        // Create a channel to send file entries to the ZIP writer
        // A None entry will signal the the last file was sent
        let (sender, mut receiver) = mpsc::channel::<FileEntry>(64);

        tokio::spawn(async move {
            let mut writer = ZipFileWriter::with_tokio(input_write_stream);
            let mut count = 0;

            while let Some(Some((name, data))) = receiver.recv().await {
                info!("Adding file to zip: {}", name);

                let builder =
                    ZipEntryBuilder::new(slugify_filename(&name).into(), Compression::Deflate)
                        .last_modification_date(ZipDateTime::from(chrono::Utc::now()));
                writer.write_entry_whole(builder, &data).await?;

                count += 1;
            }

            if count == 0 {
                info!("No files added to zip, returning error response");
            }

            // Write the ZIP central directory
            writer.close().await?;

            // Signal that the stream is finished, this will finish the HTTP response
            stream_closer.finish();

            Ok::<(), ZipError>(())
        });

        Self {
            sender,
            write_stream,
            file_name: slugify_filename(file_name),
        }
    }

    pub async fn finish(&self) -> Result<(), APIError> {
        self.sender
            .send(None)
            .await
            .map_err(|_| APIError::ZipError("Failed to send finish signal".into()))
    }

    pub fn sender(&self) -> Sender<FileEntry> {
        self.sender.clone()
    }

    pub async fn add_file(&self, name: String, data: Vec<u8>) -> Result<(), APIError> {
        self.sender
            .send(Some((name, data)))
            .await
            .map_err(|_| APIError::ZipError("Failed to send file data".into()))
    }
}

impl IntoResponse for ZipStream {
    fn into_response(self) -> Response<Body> {
        Attachment::new(Body::from_stream(self.write_stream))
            .filename(self.file_name)
            .content_type("application/zip")
            .into_response()
    }
}
