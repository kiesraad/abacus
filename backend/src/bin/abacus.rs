use std::{
    io::ErrorKind,
    net::{Ipv6Addr, SocketAddr},
    process,
};

use abacus::{
    AppError,
    infra::{app::start_server, db::create_sqlite_pool},
};
use clap::Parser;
use socket2::{Domain, Protocol, Socket, Type};
use tokio::net::TcpListener;
use tracing::{error, level_filters::LevelFilter};
use tracing_subscriber::EnvFilter;

/// Get the default port for the server, 8080 in debug builds and 80 for release builds
fn get_default_port() -> u16 {
    #[cfg(debug_assertions)]
    {
        8080
    }
    #[cfg(not(debug_assertions))]
    {
        80
    }
}

/// Abacus API and asset server
#[derive(Parser, Debug)]
struct Args {
    /// Server port, optional
    #[arg(short, long, default_value_t = get_default_port(), env = "ABACUS_PORT")]
    port: u16,

    /// Location of the database file, will be created if it doesn't exist
    #[arg(short, long, default_value = "db.sqlite", env = "ABACUS_DATABASE")]
    database: String,

    /// Seed the database with initial data using the fixtures
    #[cfg(feature = "dev-database")]
    #[arg(short, long, env = "ABACUS_SEED_DATA")]
    seed_data: bool,

    /// Reset the database
    #[cfg(feature = "dev-database")]
    #[arg(short, long, env = "ABACUS_RESET_DATABASE")]
    reset_database: bool,

    /// Enable airgap detection
    #[cfg(not(feature = "airgap-detection"))]
    #[arg(short, long, env = "ABACUS_AIRGAP_DETECTION")]
    airgap_detection: bool,

    /// Show version
    #[arg(short = 'V', long)]
    version: bool,
}

/// Main entry point for the application. Sets up the database, and starts the
/// API server and in-memory file router on port 8080.
#[tokio::main]
async fn main() {
    if let Err(e) = run().await {
        error!("{e}");
        process::exit(1);
    }
}

async fn run() -> Result<(), AppError> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env()?,
        )
        .init();

    let args = Args::parse();
    if args.version {
        println!(env!("ABACUS_GIT_VERSION"));
        return Ok(());
    }

    let pool = create_sqlite_pool(
        &args.database,
        #[cfg(feature = "dev-database")]
        args.reset_database,
        #[cfg(feature = "dev-database")]
        args.seed_data,
    )
    .await?;

    // Enable airgap detection if the feature is enabled or if the command line argument is set.
    #[cfg(feature = "airgap-detection")]
    let enable_airgap_detection = true;

    #[cfg(not(feature = "airgap-detection"))]
    let enable_airgap_detection = args.airgap_detection;

    let socket = Socket::new(Domain::IPV6, Type::STREAM, Some(Protocol::TCP))?;
    socket.set_nonblocking(true)?;
    socket.set_only_v6(false)?;

    let address = SocketAddr::from((Ipv6Addr::UNSPECIFIED, args.port));
    socket.bind(&address.into()).map_err(|e| match e.kind() {
        ErrorKind::AddrInUse => AppError::PortAlreadyInUse(args.port),
        ErrorKind::PermissionDenied => AppError::PermissionDeniedToBindPort(args.port),
        _ => AppError::Io(e),
    })?;
    socket.listen(1024)?;

    let listener = TcpListener::from_std(socket.into())?;

    start_server(pool, listener, enable_airgap_detection).await
}
