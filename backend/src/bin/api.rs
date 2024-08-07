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

    /// Server port, optional
    #[arg(short, long, default_value_t = 8080)]
    port: u16,

    /// Seed the database with initial data using the fixtures
    #[arg(short, long)]
    seed_data: bool,

    /// Reset the database
    #[arg(short, long)]
    reset_database: bool,
}

/// Main entry point for the application, sets up the database and starts the
/// API server on port 8080.
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let args = Args::parse();
    let pool = create_sqlite_pool(args.reset_database, args.seed_data).await?;
    let app = router(pool)?;

    let app = if let Some(fd) = args.frontend_dist {
        app.fallback_service(
            ServeDir::new(fd.clone()).fallback(ServeFile::new(fd.join("index.html"))),
        )
    } else {
        app
    };

    let address = SocketAddr::from((Ipv4Addr::UNSPECIFIED, args.port));
    let listener = TcpListener::bind(&address).await?;
    println!("Starting API server on http://{}", listener.local_addr()?);
    axum::serve(listener, app.into_make_service()).await?;
    Ok(())
}

/// Create a SQLite database if needed, then connect to it and run migrations.
/// Return a connection pool.
async fn create_sqlite_pool(
    reset_database: bool,
    load_fixtures: bool,
) -> Result<SqlitePool, Box<dyn Error>> {
    let opts = SqliteConnectOptions::from_str(DB_URL)?.create_if_missing(true);
    if reset_database {
        // remove the file, ignoring any errors that occured (such as the file not existing)
        let _ = tokio::fs::remove_file(opts.get_filename()).await;
    }
    let pool = SqlitePool::connect_with(opts).await?;
    sqlx::migrate!().run(&pool).await?;

    if load_fixtures {
        fixtures::seed_fixture_data(&pool).await?;
    }

    Ok(pool)
}

mod fixtures {
    macro_rules! load_fixture {
        ($fixture:literal) => {
            Fixture {
                data: include_str!(concat!("../../fixtures/", $fixture, ".sql")),
            }
        };
    }

    macro_rules! load_fixtures {
        ([$($fix:literal),* $(,)?]) => {
            &[$(load_fixture!($fix),)*]
        }
    }

    const FIXTURES: &[Fixture] = load_fixtures!(["elections", "polling_stations",]);

    struct Fixture {
        data: &'static str,
    }

    pub async fn seed_fixture_data(
        pool: &sqlx::SqlitePool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for fixture in FIXTURES {
            sqlx::raw_sql(fixture.data).execute(pool).await?;
        }

        Ok(())
    }
}
