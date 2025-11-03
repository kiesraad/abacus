use std::{
    error::Error,
    path::{Path, PathBuf},
};

use abacus::{
    SqlitePoolExt, committee_session::CommitteeSessionCreateRequest, create_sqlite_pool,
    election::NewElection, eml::EMLDocument,
};
use clap::Parser;
use sqlx::Transaction;
use tracing::{debug, info, level_filters::LevelFilter, warn};
use tracing_subscriber::EnvFilter;

#[derive(Parser, Debug)]
struct Args {
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

    /// Directory to read EML files from
    #[arg(env = "ABACUS_EML_DIRECTORY")]
    directory: PathBuf,
}

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

    let eml_files = find_files(&args.directory, |path| {
        debug!("Checking file {:?}", path);
        let found = path
            .extension()
            .map(|ext| ext.eq_ignore_ascii_case("xml"))
            .unwrap_or(false)
            && path
                .file_name()
                .map(|name| {
                    name.to_string_lossy()
                        .to_lowercase()
                        .starts_with("stembureaus")
                })
                .unwrap_or(false);
        if found {
            info!("Found EML file {:?}", path);
        }
        found
    })
    .await?;

    info!("Found {} EML files for import testing", eml_files.len());

    let mut success_imports = 0;
    let mut failed_imports = 0;

    for eml_file in eml_files {
        let mut tx = pool.begin_immediate().await?;
        match try_import_eml(&mut tx, &eml_file).await {
            Ok(_) => {
                info!("Successfully imported EML file {:?}", eml_file);
                tx.commit().await?;
                success_imports += 1;
            }
            Err(e) => {
                warn!(
                    "Failed to import EML file {:?}: {}",
                    eml_file,
                    e.to_string()
                );
                tx.rollback().await?;
                failed_imports += 1;
            }
        }
    }

    info!(
        "EML import testing completed: {} successful, {} failed",
        success_imports, failed_imports
    );

    Ok(())
}

async fn try_import_eml(
    tx: &mut Transaction<'_, sqlx::Sqlite>,
    eml_file: impl AsRef<Path>,
) -> Result<(), Box<dyn Error>> {
    let name = eml_file
        .as_ref()
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned();
    let eml = abacus::eml::EML110::from_str(&tokio::fs::read_to_string(&eml_file).await?)?;
    let polling_stations = eml.get_polling_stations()?;
    info!(
        "Found {} polling stations in EML file {:?}",
        polling_stations.len(),
        eml_file.as_ref()
    );

    // create election for name
    let election = abacus::election::repository::create(
        &mut *tx,
        NewElection {
            name,
            counting_method: abacus::election::VoteCountingMethod::CSO,
            election_id: "1".to_string(),
            location: "Test".to_string(),
            domain_id: "1".to_string(),
            category: abacus::election::ElectionCategory::Municipal,
            number_of_seats: 19,
            election_date: chrono::Utc::now().date_naive(),
            nomination_date: chrono::Utc::now().date_naive(),
            political_groups: vec![],
        },
    )
    .await?;

    let _committee_session = abacus::committee_session::repository::create(
        &mut *tx,
        CommitteeSessionCreateRequest {
            number: 1,
            election_id: election.id,
            number_of_voters: eml.get_number_of_voters().unwrap_or(1_000),
        },
    )
    .await?;

    // save polling stations
    abacus::polling_station::repository::create_many(&mut *tx, election.id, polling_stations)
        .await?;

    Ok(())
}

async fn find_files(
    path: &Path,
    filter: impl (Fn(&Path) -> bool) + Copy,
) -> Result<Vec<PathBuf>, Box<dyn Error>> {
    let mut entries = tokio::fs::read_dir(path).await?;
    let mut files = Vec::new();
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.is_dir() {
            let mut nested_files = Box::pin(find_files(&path, filter)).await?;
            files.append(&mut nested_files);
        } else if filter(&path) {
            files.push(path);
        }
    }

    Ok(files)
}
