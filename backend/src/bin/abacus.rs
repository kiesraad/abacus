use std::{
    error::Error,
    net::{Ipv4Addr, SocketAddr},
};

use abacus::{create_sqlite_pool, start_server};
use clap::Parser;
use tokio::net::TcpListener;
use tracing::level_filters::LevelFilter;
use tracing_subscriber::EnvFilter;

/// Abacus API and asset server
#[derive(Parser, Debug)]
struct Args {
    /// Server port, optional
    #[arg(short, long, default_value_t = 8080, env = "ABACUS_PORT")]
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
    #[arg(short, long, env = "ABACUS_AIRGAP_DETECTION")]
    airgap_detection: bool,
}

/// Main entry point for the application. Sets up the database, and starts the
/// API server and in-memory file router on port 8080.
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env()?,
        )
        .init();

    let args = Args::parse();
    let pool = create_sqlite_pool(
        &args.database,
        #[cfg(feature = "dev-database")]
        args.reset_database,
        #[cfg(feature = "dev-database")]
        args.seed_data,
    )
    .await?;

    // Enable airgap detection if the feature is enabled or if the command line argument is set.
    let enable_airgap_detection = args.airgap_detection || cfg!(feature = "airgap-detection");

    let address = SocketAddr::from((Ipv4Addr::UNSPECIFIED, args.port));
    let listener = TcpListener::bind(&address).await?;

    start_server(pool, listener, enable_airgap_detection).await
}
