use axum::body::Bytes;
use std::{
    collections::VecDeque,
    pin::Pin,
    sync::{Arc, Mutex},
    task::{Context, Poll, Waker},
};
use tokio::io::AsyncWrite;
use tokio_stream::Stream;
use tracing::error;

/// An async write buffer that also implements the Stream trait.
/// It allows writing data to a buffer asynchronously and reading it as a stream of bytes.
/// This is useful for streaming data to a client, such as in a ZIP file response.
pub struct WriteStream {
    state: Arc<Mutex<Inner>>,
}

struct Inner {
    buffer: VecDeque<Bytes>,
    waker: Option<Waker>,
    closed: bool,
}

impl WriteStream {
    pub fn new() -> Self {
        Self {
            state: Arc::new(Mutex::new(Inner {
                buffer: VecDeque::new(),
                waker: None,
                closed: false,
            })),
        }
    }

    pub fn finish(&self) {
        let Ok(mut state) = self.state.lock() else {
            error!("Failed to lock WriteStream state for finishing");
            return;
        };

        state.closed = true;
        if let Some(waker) = state.waker.take() {
            waker.wake();
        }
    }
}

impl Clone for WriteStream {
    fn clone(&self) -> Self {
        Self {
            state: self.state.clone(),
        }
    }
}

impl AsyncWrite for WriteStream {
    fn poll_write(
        self: Pin<&mut Self>,
        _cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<Result<usize, std::io::Error>> {
        let Ok(mut state) = self.state.lock() else {
            return Poll::Ready(Err(std::io::Error::other(
                "Failed to lock WriteStream state",
            )));
        };

        if state.closed {
            return Poll::Ready(Err(std::io::Error::new(
                std::io::ErrorKind::BrokenPipe,
                "WriteStream is closed",
            )));
        }

        state.buffer.push_back(Bytes::copy_from_slice(buf));
        if let Some(waker) = state.waker.take() {
            waker.wake();
        }

        Poll::Ready(Ok(buf.len()))
    }

    fn poll_flush(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Result<(), std::io::Error>> {
        Poll::Ready(Ok(()))
    }

    fn poll_shutdown(
        self: Pin<&mut Self>,
        _cx: &mut Context<'_>,
    ) -> Poll<Result<(), std::io::Error>> {
        Poll::Ready(Ok(()))
    }
}

impl Stream for WriteStream {
    type Item = Result<Bytes, std::io::Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let Ok(mut state) = self.state.lock() else {
            return Poll::Ready(Some(Err(std::io::Error::other(
                "Failed to lock WriteStream state",
            ))));
        };

        if let Some(data) = state.buffer.pop_front() {
            Poll::Ready(Some(Ok(data)))
        } else if state.closed {
            Poll::Ready(None)
        } else {
            state.waker = Some(cx.waker().clone());
            Poll::Pending
        }
    }
}

impl Drop for WriteStream {
    fn drop(&mut self) {
        let Ok(mut state) = self.state.lock() else {
            error!("Failed to lock WriteStream state on drop");
            return;
        };

        if !state.closed {
            state.closed = true;
            if let Some(waker) = state.waker.take() {
                waker.wake();
            }
        }
    }
}
