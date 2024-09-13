use crate::APIError;
use axum::extract::State;
use sqlx::SqlitePool;

/// Macro to convert a single fixture name to the contents of a fixture file
macro_rules! load_fixture {
    ($fixture:literal) => {
        Fixture {
            data: include_str!(concat!("../fixtures/", $fixture, ".sql")),
        }
    };
}

/// Macro to convert the list of fixtures to their contents
macro_rules! load_fixtures {
        ([$($fix:literal),* $(,)?]) => {
            &[$(load_fixture!($fix),)*]
        }
    }

/// List of fixtures to load when data seeding is requested.
///
/// This list should be updated manually when a new fixture is added that
/// needs to be loaded when seeding fixtures.
const FIXTURES: &[Fixture] = load_fixtures!(["reset", "elections", "polling_stations"]);

/// The data contained in a fixture file
struct Fixture {
    data: &'static str,
}

/// Function that loads the fixture data into the given connection
/// Each fixture may contain multiple SQL statements.
pub async fn seed_fixture_data(pool: &SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    for fixture in FIXTURES {
        sqlx::raw_sql(fixture.data).execute(pool).await?;
    }

    Ok(())
}

/// API endpoint to reset the database and seed it with fixture data
pub async fn reset_database(State(pool): State<SqlitePool>) -> Result<(), APIError> {
    seed_fixture_data(&pool).await?;
    Ok(())
}
