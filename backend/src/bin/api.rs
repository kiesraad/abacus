use std::error::Error;
use std::net::{Ipv4Addr, SocketAddr};
use std::path::PathBuf;
use std::str::FromStr;

use clap::Parser;
use sqlx::sqlite::SqliteConnectOptions;
use sqlx::SqlitePool;
use tokio::net::TcpListener;
use tower_http::services::{ServeDir, ServeFile};

use backend::router;

const DB_URL: &str = "sqlite://db.sqlite";

/// Abacus API server
#[derive(Parser, Debug)]
struct Args {
    /// Path to the frontend dist directory to serve through the API server
    #[arg(short, long)]
    frontend_dist: Option<PathBuf>,
}

/// Main entry point for the application, sets up the database and starts the
/// API server on port 8080.
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let args = Args::parse();
    let pool = create_sqlite_pool().await?;
    let app = router(pool)?;

    let app = if let Some(fd) = args.frontend_dist {
        app.route_service("/", ServeFile::new(fd.join("index.html")))
            .fallback_service(ServeDir::new(fd))
    } else {
        app
    };

    let address = SocketAddr::from((Ipv4Addr::UNSPECIFIED, 8080));
    let listener = TcpListener::bind(&address).await?;
    println!("Starting API server on http://{}", listener.local_addr()?);
    axum::serve(listener, app.into_make_service()).await?;
    Ok(())
}

/// Create a SQLite database if needed, then connect to it and run migrations.
/// Return a connection pool.
async fn create_sqlite_pool() -> Result<SqlitePool, Box<dyn Error>> {
    let opts = SqliteConnectOptions::from_str(DB_URL)?.create_if_missing(true);
    let pool = SqlitePool::connect_with(opts).await?;
    sqlx::migrate!().run(&pool).await?;
    Ok(pool)
}
