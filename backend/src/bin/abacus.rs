use std::{
    io::ErrorKind,
    net::{Ipv6Addr, SocketAddr},
    process,
};

use abacus::{AppError, create_sqlite_pool, infra::backup::BackupConfig};
use clap::Parser;
use socket2::{Domain, Protocol, Socket, Type};
use tokio::net::TcpListener;
use tracing::{error, level_filters::LevelFilter};
use tracing_subscriber::EnvFilter;

/// Default plain HTTP port: 8080 (debug) / 80 (release). With the `tls` feature
/// this is the redirect/CA download port, without TLS it is the main server port.
const fn default_http_port() -> u16 {
    if cfg!(debug_assertions) { 8080 } else { 80 }
}

/// Default port: with the `tls` feature 8443 (debug) / 443 (release),
/// without it the plain-HTTP default (8080 debug / 80 release).
fn get_default_port() -> u16 {
    if cfg!(feature = "tls") {
        if cfg!(debug_assertions) { 8443 } else { 443 }
    } else {
        default_http_port()
    }
}

/// Bind a dual-stack (IPv4 + IPv6) TCP listener on the given port.
fn bind_listener(port: u16) -> Result<TcpListener, AppError> {
    let socket = Socket::new(Domain::IPV6, Type::STREAM, Some(Protocol::TCP))?;
    socket.set_nonblocking(true)?;
    socket.set_only_v6(false)?;
    socket.set_reuse_address(true)?;

    let address = SocketAddr::from((Ipv6Addr::UNSPECIFIED, port));
    socket.bind(&address.into()).map_err(|e| match e.kind() {
        ErrorKind::AddrInUse => AppError::PortAlreadyInUse(port),
        ErrorKind::PermissionDenied => AppError::PermissionDeniedToBindPort(port),
        _ => AppError::Io(e),
    })?;
    socket.listen(1024)?;

    Ok(TcpListener::from_std(socket.into())?)
}

/// Start a plain HTTP server on `http_port` that serves the CA certificate and
/// redirects everything else to HTTPS on `https_port`.
/// A TCP bind failure is logged, not fatal.
#[cfg(feature = "tls")]
fn spawn_plain_http_server(
    http_port: u16,
    https_port: u16,
    ca: std::sync::Arc<abacus::infra::tls::CaCertificate>,
) {
    match bind_listener(http_port) {
        Ok(http_listener) => {
            tokio::spawn(async move {
                if let Err(e) = abacus::infra::plain_http::start_plain_http_server(
                    http_listener,
                    ca,
                    https_port,
                )
                .await
                {
                    tracing::warn!("HTTP redirect server stopped with error: {e}");
                }
            });
        }
        Err(e) => {
            tracing::warn!("could not bind port {http_port} for HTTP to HTTPS redirect: {e}");
        }
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

    /// Directory for database backups
    #[arg(long, default_value = "backups", env = "ABACUS_BACKUP_DIR")]
    backup_dir: std::path::PathBuf,

    /// Location of the TLS directory (CA certificate and key), will be created if it doesn't exist
    #[cfg(feature = "tls")]
    #[arg(long, default_value = "tls", env = "ABACUS_TLS_DIR")]
    tls_dir: std::path::PathBuf,

    /// Port for the plain HTTP server that serves the CA certificate and redirects to HTTPS
    #[cfg(feature = "tls")]
    #[arg(long, default_value_t = default_http_port(), env = "ABACUS_HTTP_PORT")]
    http_port: u16,

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

    let backup_config = BackupConfig {
        directory: args.backup_dir,
    };

    // Enable airgap detection if the feature is enabled or if the command line argument is set.
    #[cfg(feature = "airgap-detection")]
    let enable_airgap_detection = true;

    #[cfg(not(feature = "airgap-detection"))]
    let enable_airgap_detection = args.airgap_detection;

    let listener = bind_listener(args.port)?;

    // When compiled with the `tls` feature the server always serves HTTPS.
    #[cfg(feature = "tls")]
    {
        let certificates = abacus::infra::tls::load_or_generate(&args.tls_dir)?;
        let tls_config = certificates.server_config()?;
        let ca = std::sync::Arc::new(certificates.ca);

        spawn_plain_http_server(args.http_port, args.port, ca.clone());

        abacus::start_server_tls(
            pool,
            listener,
            enable_airgap_detection,
            backup_config,
            tls_config,
            ca,
        )
        .await
    }
    #[cfg(not(feature = "tls"))]
    abacus::start_server(pool, listener, enable_airgap_detection, backup_config).await
}
