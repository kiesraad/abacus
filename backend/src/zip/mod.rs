use async_zip::{Compression, ZipEntryBuilder, error::ZipError, tokio::write::ZipFileWriter};
use axum::{
    body::{Body, Bytes},
    response::{IntoResponse, Response},
};
use axum_extra::response::Attachment;
use std::{
    io::Result as IoResult,
    pin::Pin,
    task::{Context, Poll},
};
use tokio::{
    io::AsyncWrite,
    sync::mpsc::{self, Sender},
};
use tokio_stream::wrappers::ReceiverStream;
use tracing::info;

use crate::APIError;

pub fn slugify_filename(filename: &str) -> String {
    filename.replace(" ", "_").replace("/", "-")
}

pub type FileEntry = Option<(String, Vec<u8>)>;

/// A writer that sends data through a channel
#[derive(Clone)]
struct ChannelWriter {
    sender: mpsc::Sender<Result<Bytes, std::io::Error>>,
}

impl ChannelWriter {
    pub fn new() -> (Self, mpsc::Receiver<Result<Bytes, std::io::Error>>) {
        let (sender, receiver) = mpsc::channel(64);
        (Self { sender }, receiver)
    }
}

impl AsyncWrite for ChannelWriter {
    fn poll_write(
        self: Pin<&mut Self>,
        _cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<std::io::Result<usize>> {
        // Synchronously try to send the buffer
        let bytes = Bytes::copy_from_slice(buf);
        match self.get_mut().sender.try_send(Ok(bytes)) {
            Ok(_) => Poll::Ready(Ok(buf.len())),
            Err(mpsc::error::TrySendError::Full(_)) => {
                // Channel is full, so tell the runtime to poll again later.
                Poll::Pending
            }
            Err(_) => Poll::Ready(Err(std::io::Error::new(
                std::io::ErrorKind::BrokenPipe,
                "channel closed",
            ))),
        }
    }

    fn poll_flush(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<IoResult<()>> {
        Poll::Ready(Ok(()))
    }
}

/// A stream that reads files from a channel and writes them to a ZIP file as a streamed HTTP response
pub struct ZipStream {
    file_name: String,
    sender: Sender<FileEntry>,
    output: mpsc::Receiver<Result<Bytes, std::io::Error>>,
}

impl ZipStream {
    pub async fn new(file_name: &str) -> Self {
        let (write_stream, output) = ChannelWriter::new();
        let (sender, mut receiver) = mpsc::channel::<FileEntry>(64);

        tokio::spawn(async move {
            let mut writer = ZipFileWriter::with_tokio(write_stream);

            while let Some(Some((name, data))) = receiver.recv().await {
                info!("Adding file to zip: {}", name);

                let builder =
                    ZipEntryBuilder::new(slugify_filename(&name).into(), Compression::Deflate);
                writer.write_entry_whole(builder, &data).await?;
            }

            writer.close().await?;

            Ok::<(), ZipError>(())
        });

        Self {
            sender,
            output,
            file_name: slugify_filename(file_name),
        }
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
        let stream = ReceiverStream::new(self.output);
        Attachment::new(Body::from_stream(stream))
            .filename(self.file_name)
            .content_type("application/zip")
            .into_response()
    }
}
