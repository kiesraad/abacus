use std::{
    ops::Range,
    path::{Path, PathBuf},
};

use abacus::{
    AppError, create_sqlite_pool,
    data_entry::PollingStationResults,
    domain::committee_session::CommitteeSession,
    election::ElectionWithPoliticalGroups,
    eml::{EML110, EML230, EMLDocument},
    pdf_gen::{
        VotesTables,
        models::{ModelNa31_2Input, ToPdfFileModel},
    },
    polling_station::PollingStation,
    report::DEFAULT_DATE_TIME_FORMAT,
    summary::ElectionSummary,
    test_data_gen::{GenerateElectionArgs, RandomRange, create_test_election, parse_range},
};
use clap::Parser;
use tracing::{info, level_filters::LevelFilter};
use tracing_subscriber::EnvFilter;

/// Abacus API and asset server
#[derive(Parser, Debug, Clone)]
struct Args {
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
    #[arg(long, default_value = "20..50", value_parser = parse_range::<u32>)]
    political_groups: Range<u32>,

    /// Number of candidates to create
    #[arg(long, default_value = "10..50", value_parser = parse_range::<u32>)]
    candidates_per_group: Range<u32>,

    /// Number of polling stations to create
    #[arg(long, default_value = "50..200", value_parser = parse_range::<u32>)]
    polling_stations: Range<u32>,

    /// Number of voters to create
    #[arg(long, default_value = "100_000..250_000", value_parser = parse_range::<u32>)]
    voters: Range<u32>,

    /// Number of seats in the election
    #[arg(long, default_value = "9..=45", value_parser = parse_range::<u32>)]
    seats: Range<u32>,

    /// Include (part of) data entry for this election
    #[arg(long)]
    with_data_entry: bool,

    /// Percentage of the first data entry to complete if data entry is included
    #[arg(long, default_value = "100", value_parser = parse_range::<u32>)]
    first_data_entry: Range<u32>,

    /// Percentage of the completed first data entries that also get a second data entry
    #[arg(long, default_value = "100", value_parser = parse_range::<u32>)]
    second_data_entry: Range<u32>,

    /// Percentage of voters that voted (given we generate data entries)
    #[arg(long, default_value = "60..=85", value_parser = parse_range::<u32>)]
    turnout: Range<u32>,

    #[arg(long, default_value = "1100", value_parser = parse_range::<u32>)]
    candidate_distribution_slope: Range<u32>,

    #[arg(long, default_value = "1100", value_parser = parse_range::<u32>)]
    political_group_distribution_slope: Range<u32>,

    /// Export the election definition, candidate list and polling stations to a directory
    #[arg(long)]
    export_definition: Option<PathBuf>,
}

impl From<Args> for GenerateElectionArgs {
    fn from(args: Args) -> Self {
        GenerateElectionArgs {
            political_groups: RandomRange(args.political_groups),
            candidates_per_group: RandomRange(args.candidates_per_group),
            polling_stations: RandomRange(args.polling_stations),
            voters: RandomRange(args.voters),
            seats: RandomRange(args.seats),
            with_data_entry: args.with_data_entry,
            first_data_entry: RandomRange(args.first_data_entry),
            second_data_entry: RandomRange(args.second_data_entry),
            turnout: RandomRange(args.turnout),
            candidate_distribution_slope: RandomRange(args.candidate_distribution_slope),
            political_group_distribution_slope: RandomRange(
                args.political_group_distribution_slope,
            ),
        }
    }
}

/// Main entry point for the application. Sets up the database, and starts the
/// API server and in-memory file router on port 8080.
#[tokio::main]
async fn main() -> Result<(), AppError> {
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
    let pool = create_sqlite_pool(
        &args.database,
        #[cfg(feature = "dev-database")]
        args.reset_database,
        #[cfg(feature = "dev-database")]
        args.seed_data,
    )
    .await?;

    let test_election = create_test_election(args.clone().into(), pool).await?;

    if let Some(export_dir) = args.export_definition {
        // Export the election definition, candidate list and polling stations to a directory
        export_election(
            &export_dir,
            &test_election.committee_session,
            &test_election.election,
            &test_election.polling_stations,
            test_election.data_entry_completed,
            test_election.results,
        )
        .await;
    }

    Ok(())
}

/// Export an election (in EML) to the specified directory
#[allow(clippy::too_many_lines)]
#[allow(clippy::cognitive_complexity)]
async fn export_election(
    export_dir: &Path,
    committee_session: &CommitteeSession,
    election: &ElectionWithPoliticalGroups,
    polling_stations: &[PollingStation],
    export_results_json: bool,
    results: Vec<(PollingStation, PollingStationResults)>,
) {
    if export_dir.exists() && !export_dir.is_dir() {
        panic!("Export directory already exists and is not a directory");
    }

    if !export_dir.exists() {
        std::fs::create_dir_all(export_dir).expect("Failed to create export directory");
    }

    info!("Exporting definitions to {:?}", export_dir);

    let transaction_id = "1";

    info!("Converting election to EML definitions");
    let definition_eml = EML110::definition_from_abacus_election(election, transaction_id);
    let polling_stations_eml =
        EML110::polling_stations_from_election(election, polling_stations, transaction_id);
    let candidates_eml = EML230::candidates_from_abacus_election(election, transaction_id);

    info!("Converting EML definitions to XML strings");
    let definition_data = definition_eml
        .to_xml_string()
        .expect("Failed to convert definition to XML string");
    let polling_stations_data = polling_stations_eml
        .to_xml_string()
        .expect("Failed to convert polling stations to XML string");
    let candidates_data = candidates_eml
        .to_xml_string()
        .expect("Failed to convert candidates to XML string");

    let def_filename = export_dir.join(format!(
        "Verkiezingsdefinitie_{}.eml.xml",
        election.election_id
    ));
    let candidate_filename = export_dir.join(format!(
        "Kandidatenlijsten_{}.eml.xml",
        election.election_id
    ));
    let ps_filename = export_dir.join(format!("Stembureaus_{}.eml.xml", election.election_id));
    info!("Election definition will be written to {:?}", def_filename);
    info!("Candidate list will be written to {:?}", candidate_filename);
    info!("Polling stations will be written to {:?}", ps_filename);

    // Write to files
    tokio::fs::write(def_filename, definition_data)
        .await
        .expect("Failed to write definition file");
    tokio::fs::write(candidate_filename, candidates_data)
        .await
        .expect("Failed to write candidates file");
    tokio::fs::write(ps_filename, polling_stations_data)
        .await
        .expect("Failed to write polling stations file");

    if export_results_json {
        let election_summary = ElectionSummary::from_results(election, &results)
            .expect("Failed to create election summary");
        let input = ModelNa31_2Input {
            votes_tables: VotesTables::new(election, &election_summary)
                .expect("Failed to create votes tables"),
            summary: election_summary.into(),
            committee_session: committee_session.clone(),
            polling_stations: polling_stations.iter().map(Clone::clone).collect(),
            election: election.clone().into(),
            hash: "0000".to_string(),
            creation_date_time: chrono::Utc::now()
                .format(DEFAULT_DATE_TIME_FORMAT)
                .to_string(),
        }
        .to_pdf_file_model("file.pdf".to_string());
        let input_json = input.model.get_input().expect("Failed to get model input");
        let results_filename = export_dir.join(format!(
            "input_{}_{}.json",
            election.election_id,
            input.model.as_model_name()
        ));
        info!(
            "Writing results JSON file for input to PDF model to {:?}",
            results_filename
        );
        tokio::fs::write(results_filename, input_json)
            .await
            .expect("Failed to write model input file");
    }

    info!("Files written successfully");
}
