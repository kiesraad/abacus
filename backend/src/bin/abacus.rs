#[cfg(feature = "dev-database")]
use abacus::{fixtures, start_server};
use clap::Parser;
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
use std::{
    error::Error,
    net::{Ipv4Addr, SocketAddr},
    str::FromStr,
};
use tokio::net::TcpListener;
use tracing::{info, level_filters::LevelFilter};
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

    let address = SocketAddr::from((Ipv4Addr::UNSPECIFIED, args.port));
    let listener = TcpListener::bind(&address).await?;

    start_server(pool, listener).await
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
