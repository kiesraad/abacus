#[cfg(feature = "dev-database")]
use abacus::fixtures;
use abacus::router;
use axum::serve::ListenerExt;
use clap::Parser;
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
use std::{
    error::Error,
    net::{Ipv4Addr, SocketAddr},
    str::FromStr,
};
use tokio::{net::TcpListener, signal};
use tracing::{info, level_filters::LevelFilter, trace};
use tracing_subscriber::EnvFilter;

/// Abacus API and asset server
#[derive(Parser, Debug)]
struct Args {
    /// Server port, optional
    #[arg(short, long, default_value_t = 8080)]
    port: u16,

    /// Location of the database file, will be created if it doesn't exist
    #[arg(short, long, default_value = "db.sqlite")]
    database: String,

    /// Seed the database with initial data using the fixtures
    #[cfg(feature = "dev-database")]
    #[arg(short, long)]
    seed_data: bool,

    /// Reset the database
    #[cfg(feature = "dev-database")]
    #[arg(short, long)]
    reset_database: bool,
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
    let pool = create_sqlite_pool(&args).await?;

    let app = router(pool)?;

    let address = SocketAddr::from((Ipv4Addr::UNSPECIFIED, args.port));
    let listener = TcpListener::bind(&address).await?;
    info!("Starting API server on http://{}", listener.local_addr()?);
    let listener = listener.tap_io(|tcp_stream| {
        if let Err(err) = tcp_stream.set_nodelay(true) {
            trace!("failed to set TCP_NODELAY on incoming connection: {err:#}");
        }
    });
    axum::serve(listener, app.into_make_service())
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

/// Create a SQLite database if needed, then connect to it and run migrations.
/// Return a connection pool.
async fn create_sqlite_pool(
    #[cfg_attr(not(feature = "dev-database"), allow(unused_variables))] args: &Args,
) -> Result<SqlitePool, Box<dyn Error>> {
    let db = format!("sqlite://{}", &args.database);
    let opts = SqliteConnectOptions::from_str(&db)?.create_if_missing(true);

    #[cfg(feature = "dev-database")]
    if args.reset_database {
        // remove the file, ignoring any errors that occurred (such as the file not existing)
        let _ = tokio::fs::remove_file(opts.get_filename()).await;
        info!("removed database file");
    }

    let pool = SqlitePool::connect_with(opts).await?;
    sqlx::migrate!().run(&pool).await?;

    #[cfg(feature = "dev-database")]
    if args.seed_data {
        fixtures::seed_fixture_data(&pool).await?;
    }

    Ok(pool)
}

/// Graceful shutdown, useful for Docker containers.
///
/// Copied from the
/// [axum graceful-shutdown example](https://github.com/tokio-rs/axum/blob/6318b57fda6b524b4d3c7909e07946e2b246ebd2/examples/graceful-shutdown/src/main.rs)
/// (under the MIT license).
async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
