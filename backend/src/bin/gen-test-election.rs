use std::{error::Error, ops::Range, str::FromStr};

use abacus::{
    committee_session::{CommitteeSessionCreateRequest, repository::CommitteeSessions},
    election::{
        CandidateGender, ElectionCategory, ElectionWithPoliticalGroups, NewElection,
        PoliticalGroup, repository::Elections,
    },
    fixtures,
    polling_station::{PollingStationRequest, PollingStationType, repository::PollingStations},
};
use chrono::{Datelike, Days, NaiveDate};
use clap::Parser;
use rand::seq::IndexedRandom;
use sqlx::{SqlitePool, sqlite::SqliteConnectOptions};
#[cfg(feature = "dev-database")]
use tracing::info;
use tracing::level_filters::LevelFilter;
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

    /// Number of political groups to create
    #[arg(long, default_value = "40..50", value_parser = parse_range::<u32>)]
    political_groups: Range<u32>,

    /// Number of candidates to create
    #[arg(long, default_value = "30..80", value_parser = parse_range::<u32>)]
    candidates_per_group: Range<u32>,

    /// Number of polling stations to create
    #[arg(long, default_value = "200..500", value_parser = parse_range::<u32>)]
    polling_stations: Range<u32>,

    /// Number of voters to create
    #[arg(long, default_value = "500_000..800_000", value_parser = parse_range::<u32>)]
    voters: Range<u32>,
}

fn parse_range<T>(range: &str) -> Result<Range<T>, Box<dyn Error + 'static + Send + Sync>>
where
    T: FromStr + std::ops::Add<T, Output = T> + From<u8> + Copy,
    <T as FromStr>::Err: Error + Send + Sync + 'static,
{
    let mut iter = range.split("..");
    let lower_bound = T::from_str(&iter.next().ok_or("Invalid range")?.replace("_", ""))?;
    let upper_bound = if let Some(bound) = iter.next() {
        T::from_str(&bound.replace("_", ""))?
    } else {
        lower_bound + T::from(1u8) // add one to the lower bound, this could fail if the lower bound is already a max
    };
    Ok(lower_bound..upper_bound)
}

/// Main entry point for the application. Sets up the database, and starts the
/// API server and in-memory file router on port 8080.
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // setup logging
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env()?,
        )
        .init();

    // load arguments, setup database
    let args = Args::parse();
    let pool = create_sqlite_pool(&args).await?;
    let mut rng = rand::rng();

    // generate and store the election
    let election = Elections::new(pool.clone())
        .create(generate_election(&mut rng, &args))
        .await
        .expect("Failed to create election");

    // generate the committee session for the election
    let cs_repo = CommitteeSessions::new(pool.clone());
    cs_repo
        .create(CommitteeSessionCreateRequest {
            number: 1,
            election_id: election.id,
        })
        .await
        .expect("Failed to create committee session");

    // generate the polling stations for the election
    let ps_repo = PollingStations::new(pool.clone());
    generate_polling_stations(&mut rng, &election, &ps_repo, &args).await;

    info!(
        "Election generated with election id: {}, election name: '{}'",
        election.id, election.name
    );

    Ok(())
}

/// Generate a random election using the limits from args.
fn generate_election(rng: &mut impl rand::Rng, args: &Args) -> NewElection {
    // start by generating the political groups
    let mut political_groups = vec![];
    let num_political_groups = rng.random_range(args.political_groups.clone());
    info!("Generating {num_political_groups} political groups");

    for i in 1..num_political_groups {
        political_groups.push(generate_political_party(rng, i, args));
    }

    // generate the number of voters from the voters range
    let number_of_voters = rng.random_range(args.voters.clone());

    // generate a nomination date, and an election date not too long afterward
    let nomination_date = abacus::test_data_gen::date_between(
        rng,
        NaiveDate::from_ymd_opt(2020, 1, 1).expect("Invalid date"),
        NaiveDate::from_ymd_opt(2040, 1, 1).expect("Invalid date"),
    );
    let election_date =
        abacus::test_data_gen::date_between(rng, nomination_date, nomination_date + Days::new(63));

    // extract the year from the election date, generate the locality where this election would be
    let year = election_date.year();
    let locality = abacus::test_data_gen::locality(rng).to_owned();

    // use the previous data to generate some identifiers and names
    let name = format!("Gemeenteraad {locality} {year}");
    let cleaned_up_locality = locality.replace(" ", "_").replace("'", "");
    let election_id = format!("{cleaned_up_locality}_{year}");

    info!("Election has name '{name}'");

    // and put it all in the struct (generating some additional fields where needed)
    NewElection {
        name,
        domain_id: abacus::test_data_gen::domain_id(rng),
        election_id,
        location: locality,
        number_of_voters,
        category: ElectionCategory::Municipal,
        number_of_seats: rng.random_range(19..45),
        election_date,
        nomination_date,
        political_groups,
    }
}

/// Generate a single political party using the limits from args
fn generate_political_party(
    rng: &mut impl rand::Rng,
    pg_number: u32,
    args: &Args,
) -> PoliticalGroup {
    let mut candidates = vec![];
    let has_first_name = rng.random_ratio(1, 2);

    for i in 1..rng.random_range(args.candidates_per_group.clone()) {
        // sometimes first names are omitted
        let first_name = if has_first_name {
            Some(abacus::test_data_gen::first_name(rng).to_owned())
        } else {
            None
        };

        // initials are required, but if a first name is known, base initials on that
        let initials = abacus::test_data_gen::initials(rng, first_name.as_deref());
        let (prefix, last_name) = abacus::test_data_gen::last_name(rng);
        candidates.push(abacus::election::Candidate {
            number: i,
            initials,
            first_name,
            last_name_prefix: prefix.map(ToOwned::to_owned),
            last_name: last_name.to_owned(),
            locality: abacus::test_data_gen::locality(rng).to_owned(),
            country_code: None,
            gender: [
                CandidateGender::Male,
                CandidateGender::Female,
                CandidateGender::X,
            ]
            .choose(rng)
            .cloned(),
        })
    }
    PoliticalGroup {
        number: pg_number,
        name: abacus::test_data_gen::political_group_name(rng),
        candidates,
    }
}

/// Generate the polling stations for the given election using the limits from args
async fn generate_polling_stations(
    rng: &mut impl rand::Rng,
    election: &ElectionWithPoliticalGroups,
    ps_repo: &PollingStations,
    args: &Args,
) {
    let number_of_ps = rng.random_range(args.polling_stations.clone());
    info!("Generating {number_of_ps} polling stations for election");
    let mut remaining_voters = election.number_of_voters;
    for i in 1..=number_of_ps {
        // compute a some somewhat distributed number of voters for each polling station
        let remaining_ps = number_of_ps - i + 1;
        let ps_num_voters = if remaining_ps == 1 {
            remaining_voters
        } else {
            let sample_voters = remaining_voters / remaining_ps;
            #[allow(clippy::cast_possible_truncation)]
            let min_sample_voters = (sample_voters as f64 * 0.9) as u32;
            #[allow(clippy::cast_possible_truncation)]
            let max_sample_voters = (sample_voters as f64 * 1.1) as u32;
            rng.random_range(min_sample_voters..=max_sample_voters)
        };
        remaining_voters -= ps_num_voters;

        ps_repo
            .create(
                election.id,
                PollingStationRequest {
                    name: abacus::test_data_gen::polling_station_name(rng),
                    number: i64::from(i),
                    number_of_voters: Some(ps_num_voters.into()),
                    polling_station_type: Some(PollingStationType::FixedLocation),
                    address: abacus::test_data_gen::address(rng),
                    postal_code: abacus::test_data_gen::postal_code(rng),
                    locality: abacus::test_data_gen::locality(rng).to_owned(),
                },
            )
            .await
            .expect("Failed to create polling station");
    }
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
