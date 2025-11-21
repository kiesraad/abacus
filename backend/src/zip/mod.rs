use async_zip::{Compression, ZipDateTime, ZipEntryBuilder, tokio::write::ZipFileWriter};
use axum::{
    body::Body,
    response::{IntoResponse, Response},
};
use axum_extra::response::Attachment;
use std::io::Cursor;
use tokio::io::{AsyncWriteExt, DuplexStream};
use tokio_util::{compat::TokioAsyncWriteCompatExt, io::ReaderStream};

/// Slugify a filename by replacing spaces with underscores and slashes with dashes.
pub fn slugify_filename(filename: &str) -> String {
    filename.replace(" ", "_").replace("/", "-")
}

/// A ZIP file response, that streams its contents to the client every time a file is added
pub struct ZipResponse {
    inner: ReaderStream<DuplexStream>,
    filename: String,
}

impl ZipResponse {
    /// Create a new [`ZipResponse`] with a buffer size of 16KB.
    pub fn new(filename: &str) -> (Self, ZipResponseWriter) {
        let (reader, writer) = tokio::io::duplex(16 * 1024);

        (
            Self {
                inner: ReaderStream::new(reader),
                filename: filename.into(),
            },
            ZipResponseWriter::new(writer),
        )
    }

    /// Convert this `ZipResponse` into an Axum [`Body`] stream.
    pub fn into_body(self) -> Body {
        Body::from_stream(self.inner)
    }
}

impl IntoResponse for ZipResponse {
    fn into_response(self) -> Response<Body> {
        let filename = self.filename.clone();

        Attachment::new(self.into_body())
            .filename(filename)
            .content_type("application/zip")
            .into_response()
    }
}

/// Writer used to add files into a streaming ZIP archive.
pub struct ZipResponseWriter {
    inner: ZipFileWriter<DuplexStream>,
}

impl ZipResponseWriter {
    /// Create a new writer wrapping the provided duplex stream.
    fn new(writer: DuplexStream) -> Self {
        Self {
            inner: ZipFileWriter::with_tokio(writer),
        }
    }

    /// Add a file with the given name and contents to the archive.
    pub async fn add_file(&mut self, name: &str, data: &[u8]) -> Result<(), ZipResponseError> {
        let builder = ZipEntryBuilder::new(slugify_filename(name).into(), Compression::Deflate)
            .last_modification_date(ZipDateTime::from(chrono::Utc::now()));

        Ok(self.inner.write_entry_whole(builder, data).await?)
    }

    /// Finish writing the archive and flush the underlying stream.
    pub async fn finish(self) -> Result<(), ZipResponseError> {
        let final_writer = self.inner.close().await?;

        final_writer
            .into_inner()
            .shutdown()
            .await
            .map_err(|_| ZipResponseError::ConnectionClosed)?;

        Ok(())
    }
}

#[derive(Debug)]
/// Errors that can occur while creating or streaming a ZIP response.
pub enum ZipResponseError {
    /// The client closed the connection before the ZIP archive was fully written.
    ConnectionClosed,
    /// An error bubbled up from the underlying ZIP writer.
    ZipError(async_zip::error::ZipError),
}

impl From<async_zip::error::ZipError> for ZipResponseError {
    fn from(err: async_zip::error::ZipError) -> Self {
        ZipResponseError::ZipError(err)
    }
}

pub async fn zip_single_file(name: &str, content: &[u8]) -> Result<Vec<u8>, ZipResponseError> {
    let cursor = Cursor::new(Vec::<u8>::new());
    let async_cursor = cursor.compat_write();

    let mut zip_writer = ZipFileWriter::new(async_cursor);

    let builder = ZipEntryBuilder::new(slugify_filename(name).into(), Compression::Deflate)
        .last_modification_date(ZipDateTime::from(chrono::Utc::now()));

    zip_writer.write_entry_whole(builder, content).await?;

    let cursor = zip_writer.close().await?;

    Ok(cursor.into_inner().into_inner())
}

#[cfg(test)]
mod tests {
    use async_zip::{Compression, ZipEntryBuilder, tokio::write::ZipFileWriter};
    use http_body_util::BodyExt;
    use tokio::io::{AsyncWriteExt, BufWriter};

    use super::ZipResponse;

    /// Build a ZIP archive using the library itself to obtain the expected bytes.
    async fn expected_zip_bytes(files: &[(String, Vec<u8>)]) -> Vec<u8> {
        let mut data = Vec::new();
        let mut buffer = BufWriter::new(&mut data);
        let mut zip_writer = ZipFileWriter::with_tokio(&mut buffer);

        for (name, data) in files {
            let builder = ZipEntryBuilder::new(name.clone().into(), Compression::Deflate)
                .last_modification_date(async_zip::ZipDateTime::from(chrono::Utc::now()));

            zip_writer.write_entry_whole(builder, data).await.unwrap();
        }

        zip_writer.close().await.unwrap();
        buffer.shutdown().await.unwrap();

        data
    }

    /// Verifies that a response built in a single task has the correct length.
    #[tokio::test]
    async fn zip_response_returns_expected_length() {
        let files = vec![("example.txt".to_string(), b"example data".to_vec())];
        let expected_len = expected_zip_bytes(&files).await.len();

        let (response, mut writer) = ZipResponse::new("test.zip");
        for (name, data) in &files {
            writer.add_file(name, data).await.unwrap();
        }
        writer.finish().await.unwrap();

        let body_bytes = response.into_body().collect().await.unwrap().to_bytes();
        assert_eq!(body_bytes.len(), expected_len);
    }

    /// Ensures that files added from another task produce a valid archive.
    #[tokio::test]
    async fn zip_response_streaming_task_returns_expected_length() {
        use tokio::time::{Duration, sleep};

        let files: Vec<(String, Vec<u8>)> = (0..10)
            .map(|i| (format!("file_{i}.txt"), format!("content {i}").into_bytes()))
            .collect();
        let expected_len = expected_zip_bytes(&files).await.len();

        let (response, mut writer) = ZipResponse::new("test.zip");

        tokio::spawn(async move {
            for (name, data) in &files {
                writer.add_file(name, data).await.unwrap();
                sleep(Duration::from_millis(10)).await;
            }
            writer.finish().await.unwrap();
        });

        let body_bytes = response.into_body().collect().await.unwrap().to_bytes();

        assert_eq!(body_bytes.len(), expected_len);
    }

    /// Checks that writing stops when the receiving end is dropped.
    #[tokio::test]
    async fn zip_response_stops_writing_when_connection_closes() {
        use tokio::time::{Duration, sleep};

        // Prepare 10 small files to write into the archive.
        let files: Vec<(String, Vec<u8>)> = (0..10)
            .map(|i| (format!("file_{i}.txt"), format!("content {i}").into_bytes()))
            .collect();

        let (response, mut writer) = ZipResponse::new("test.zip");

        // Spawn a task that adds files to the zip with a 10 ms delay between each
        let handle = tokio::spawn(async move {
            let mut written = 0;
            let mut add_err = None;
            for (name, data) in &files {
                match writer.add_file(name, data).await {
                    Ok(_) => {
                        written += 1;
                    }
                    Err(e) => {
                        add_err = Some(e);
                        break;
                    }
                }
                sleep(Duration::from_millis(10)).await;
            }
            (written, add_err)
        });

        // Start streaming the ZIP response and wait until 50 ms have passed
        let body = response.into_body();
        sleep(Duration::from_millis(50)).await;
        drop(body);

        let (written, add_err) = handle.await.unwrap();

        assert!(
            written < 10,
            "expected not all files to be written before closure"
        );
        assert!(
            add_err.is_some(),
            "expected writing to fail once connection closed"
        );
    }
}
