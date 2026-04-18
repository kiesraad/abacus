use std::{cell::RefCell, io::Write};

use tracing::level_filters::LevelFilter;
use tracing_subscriber::{
    Layer,
    filter::Targets,
    fmt::{self, MakeWriter},
    layer::SubscriberExt,
    util::SubscriberInitExt,
};

// Per-iteration buffer for Abacus tracing events.
thread_local! {
    static ABACUS_LOG: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
}

struct ThreadLocalWriter;

impl Write for ThreadLocalWriter {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        ABACUS_LOG.with(|b| b.borrow_mut().extend_from_slice(buf));
        Ok(buf.len())
    }

    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

impl<'a> MakeWriter<'a> for ThreadLocalWriter {
    type Writer = Self;

    fn make_writer(&'a self) -> Self::Writer {
        ThreadLocalWriter
    }
}

/// Initialise the tracing subscriber that captures apportionment traces into a
/// per-iteration thread-local buffer.  Call once from the `init:` block of a
/// fuzz target.
pub fn init_tracing() {
    let layer = fmt::layer()
        .with_writer(ThreadLocalWriter)
        .without_time()
        .with_ansi(false)
        .with_target(true)
        .with_level(true)
        .with_filter(
            Targets::new().with_target("apportionment::seat_assignment", LevelFilter::TRACE),
        );
    tracing_subscriber::registry().with(layer).init();
}

/// Run `f`, capture all apportionment tracing output, and return both the
/// return value and the captured log as a UTF-8 string.
pub fn run_with_log<F, R>(f: F) -> (R, String)
where
    F: FnOnce() -> R,
{
    ABACUS_LOG.with(|b| b.borrow_mut().clear());
    let result = f();
    let log = ABACUS_LOG
        .with(|b| String::from_utf8(std::mem::take(&mut *b.borrow_mut())).unwrap());
    (result, log)
}
