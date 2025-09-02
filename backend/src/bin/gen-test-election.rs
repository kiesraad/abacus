use std::{
    error::Error,
    ops::Range,
    path::{Path, PathBuf},
    str::FromStr,
};

use abacus::{
    committee_session::{
        CommitteeSession, CommitteeSessionCreateRequest, status::CommitteeSessionStatus,
    },
    create_sqlite_pool,
    data_entry::{
        CandidateVotes, CountingDifferencesPollingStation, DifferencesCounts, ExtraInvestigation,
        FieldPath, PoliticalGroupCandidateVotes, PoliticalGroupTotalVotes, CSOFirstSessionResults,
        Validate, ValidationResults, VotersCounts, VotesCounts, YesNo,
        status::{DataEntryStatus, Definitive, SecondEntryNotStarted},
    },
    election::{
        CandidateGender, ElectionCategory, ElectionWithPoliticalGroups, NewElection,
        PoliticalGroup, VoteCountingMethod,
    },
    eml::{EML110, EML230, EMLDocument},
    pdf_gen::models::{ModelNa31_2Input, ToPdfFileModel},
    polling_station::{PollingStation, PollingStationRequest, PollingStationType},
    summary::ElectionSummary,
};
use chrono::{Datelike, Days, NaiveDate, TimeDelta};
use clap::Parser;
use rand::{Rng, seq::IndexedRandom};

use sqlx::SqlitePool;
#[cfg(feature = "dev-database")]
use tracing::info;
use tracing::level_filters::LevelFilter;
use tracing_subscriber::EnvFilter;

/// Abacus API and asset server
#[derive(Parser, Debug)]
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

    /// Export the election defintion, candidate list and polling stations to a directory
    #[arg(long)]
    export_definition: Option<PathBuf>,
}

fn parse_range<T>(range: &str) -> Result<Range<T>, Box<dyn Error + 'static + Send + Sync>>
where
    T: FromStr + std::ops::Add<T, Output = T> + From<u8> + Copy,
    <T as FromStr>::Err: Error + Send + Sync + 'static,
{
    let mut iter = range.split("..");
    let lower_bound = T::from_str(&iter.next().ok_or("Invalid range")?.replace("_", ""))?;
    let upper_bound = if let Some(bound) = iter.next() {
        if let Some(bound) = bound.strip_prefix("=") {
            // add one to the bound, assumes that the bound is not already a max
            T::from_str(&bound.replace("_", ""))? + T::from(1u8)
        } else {
            T::from_str(&bound.replace("_", ""))?
        }
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
    let pool = create_sqlite_pool(
        &args.database,
        #[cfg(feature = "dev-database")]
        args.reset_database,
        #[cfg(feature = "dev-database")]
        args.seed_data,
    )
    .await?;
    let mut rng = rand::rng();

    // generate and store the election
    let election = abacus::election::repository::create(&pool, generate_election(&mut rng, &args))
        .await
        .expect("Failed to create election");

    // generate the committee session for the election
    let mut committee_session = abacus::committee_session::repository::create(
        &pool,
        CommitteeSessionCreateRequest {
            number: 1,
            election_id: election.id,
            number_of_voters: 0,
        },
    )
    .await
    .expect("Failed to create committee session");

    if args.with_data_entry {
        committee_session = abacus::committee_session::repository::change_status(
            &pool,
            committee_session.id,
            CommitteeSessionStatus::DataEntryInProgress,
        )
        .await
        .expect("Failed to update committee session status");
    }

    let number_of_voters = rng.random_range(args.voters.clone());
    committee_session.number_of_voters = number_of_voters;
    abacus::committee_session::repository::change_number_of_voters(
        &pool,
        committee_session.id,
        number_of_voters,
    )
    .await
    .expect("Failed to update number of voters of committee session");

    // generate the polling stations for the election
    let polling_stations =
        generate_polling_stations(&mut rng, &committee_session, &election, pool.clone(), &args)
            .await;

    info!(
        "Election generated with election id: {}, election name: '{}'",
        election.id, election.name
    );

    let data_entry_completed = if args.with_data_entry {
        let (_, second_entries) = generate_data_entry(
            &committee_session,
            &election,
            &polling_stations,
            &mut rng,
            pool.clone(),
            &args,
        )
        .await;
        second_entries == polling_stations.len()
    } else {
        false
    };

    if let Some(export_dir) = args.export_definition {
        let results = if data_entry_completed {
            abacus::data_entry::repository::list_entries_with_polling_stations(&pool, election.id)
                .await
                .expect("Could not load results")
        } else {
            vec![]
        };

        // Export the election definition, candidate list and polling stations to a directory
        export_election(
            &export_dir,
            &committee_session,
            &election,
            &polling_stations,
            data_entry_completed,
            results,
        )
        .await;
    }

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
        counting_method: VoteCountingMethod::CSO,
        domain_id: abacus::test_data_gen::domain_id(rng),
        election_id,
        location: locality,
        category: ElectionCategory::Municipal,
        number_of_seats: rng.random_range(args.seats.clone()),
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
    committee_session: &CommitteeSession,
    election: &ElectionWithPoliticalGroups,
    pool: SqlitePool,
    args: &Args,
) -> Vec<PollingStation> {
    let number_of_ps = rng.random_range(args.polling_stations.clone());
    info!("Generating {number_of_ps} polling stations for election");

    let mut polling_stations = vec![];
    let mut remaining_voters = committee_session.number_of_voters;
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

        let ps = abacus::polling_station::repository::create(
            &pool,
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
        polling_stations.push(ps);
    }

    polling_stations
}

/// Generate and store data entries for the given election based on arguments
async fn generate_data_entry(
    committee_session: &CommitteeSession,
    election: &ElectionWithPoliticalGroups,
    polling_stations: &[PollingStation],
    rng: &mut impl rand::Rng,
    pool: SqlitePool,
    args: &Args,
) -> (usize, usize) {
    info!("Generating data entries for election");
    let now = chrono::Utc::now();
    let first_entry_chance = rng.random_range(args.first_data_entry.clone()).min(100);
    let second_entry_chance = rng.random_range(args.second_data_entry.clone()).min(100);

    let group_slope =
        rng.random_range(args.political_group_distribution_slope.clone()) as f64 / 1000.0;
    let group_weights =
        distribute_power_law_weights(rng, election.political_groups.len(), group_slope);

    let mut generated_first_entries = 0;
    let mut generated_second_entries = 0;

    for ps in polling_stations {
        if rng.random_ratio(first_entry_chance, 100) {
            let ts = abacus::test_data_gen::datetime_around(rng, now, TimeDelta::hours(-24));

            // extract number of voters from polling station, or generate some approx default
            let voters_available = ps.number_of_voters.unwrap_or_else(|| {
                committee_session.number_of_voters as i64 / polling_stations.len() as i64
            });

            // number of voters that actually came and voted
            let turnout = rng.random_range(args.turnout.clone()) as i64;
            let voters_turned_out = u32::try_from((voters_available * turnout) / 100)
                .expect("Failed to convert voters turned out to u32");

            let candidate_slope =
                rng.random_range(args.candidate_distribution_slope.clone()) as f64 / 1000.0;
            let results = generate_polling_station_results(
                rng,
                &election.political_groups,
                voters_turned_out,
                &group_weights,
                candidate_slope,
            );

            // Validate the generated results to catch issues early
            let mut validation_results = ValidationResults::default();
            if let Err(e) = results.validate(
                election,
                ps,
                &mut validation_results,
                &FieldPath::new("data".to_string()),
            ) {
                panic!(
                    "Failed to validate generated results for polling station {}: {}",
                    ps.number, e
                );
            }
            if validation_results.has_errors() {
                panic!(
                    "Generated invalid polling station results for station {}: {:?}",
                    ps.number, validation_results.errors
                );
            }

            if rng.random_ratio(second_entry_chance, 100) {
                // generate a definitive data entry
                let state = DataEntryStatus::Definitive(Definitive {
                    first_entry_user_id: 5,  // first typist from users in fixtures
                    second_entry_user_id: 6, // second typist from users in fixtures
                    finished_at: ts,
                });

                abacus::data_entry::repository::make_definitive(
                    &pool,
                    ps.id,
                    committee_session.id,
                    &state,
                    &results,
                )
                .await
                .expect("Could not create definitive data entry");
                generated_second_entries += 1;
            } else {
                // generate only a first data entry
                let state = DataEntryStatus::SecondEntryNotStarted(SecondEntryNotStarted {
                    first_entry_user_id: 5, // first typist from users in fixtures
                    finalised_first_entry: results.clone(),
                    first_entry_finished_at: ts,
                });
                abacus::data_entry::repository::upsert(&pool, ps.id, committee_session.id, &state)
                    .await
                    .expect("Could not create first data entry");
                generated_first_entries += 1;
            };
        }
    }
    (generated_first_entries, generated_second_entries)
}

fn generate_polling_station_results(
    rng: &mut impl rand::Rng,
    political_groups: &[PoliticalGroup],
    number_of_votes: u32,
    group_weights: &[f64],
    candidate_distribution_slope: f64,
) -> CSOFirstSessionResults {
    // generate a small percentage of blank votes
    #[allow(clippy::cast_possible_truncation)]
    let blank_votes = (number_of_votes as f64 * rng.random_range(0.0..0.02)) as u32;
    let remaining_votes = number_of_votes - blank_votes;

    // generate a small percentage of invalid votes
    #[allow(clippy::cast_possible_truncation)]
    let invalid_votes = (remaining_votes as f64 * rng.random_range(0.0..0.02)) as u32;
    let remaining_votes = remaining_votes - invalid_votes;

    // distribute the remaining votes for this polling station randomly according to a power law distribution
    let pg_votes = distribute_fill_weights(rng, group_weights, remaining_votes, false);

    // Define weighted options for extra_investigation (most common: both "no")
    let extra_investigation_options = [
        (
            // 85% weight - both unanswered
            85,
            ExtraInvestigation {
                extra_investigation_other_reason: YesNo::default(),
                ballots_recounted_extra_investigation: YesNo::default(),
            },
        ),
        (
            // 10% weight - no to both
            10,
            ExtraInvestigation {
                extra_investigation_other_reason: YesNo::no(),
                ballots_recounted_extra_investigation: YesNo::no(),
            },
        ),
        (
            // 3% weight - yes to investigation, no to recount
            3,
            ExtraInvestigation {
                extra_investigation_other_reason: YesNo::yes(),
                ballots_recounted_extra_investigation: YesNo::no(),
            },
        ),
        (
            // 2% weight - yes to both
            2,
            ExtraInvestigation {
                extra_investigation_other_reason: YesNo::yes(),
                ballots_recounted_extra_investigation: YesNo::yes(),
            },
        ),
    ];

    let extra_investigation = extra_investigation_options
        .choose_weighted(rng, |item| item.0)
        .expect("Weighted random selection for extra_investigation should never fail with valid weights")
        .1
        .clone();

    CSOFirstSessionResults {
        extra_investigation,
        counting_differences_polling_station: CountingDifferencesPollingStation {
            // 90% chance of "no", 10% chance of "yes" for each field
            unexplained_difference_ballots_voters: if rng.random_bool(0.9) {
                YesNo::no()
            } else {
                YesNo::yes()
            },
            difference_ballots_per_list: if rng.random_bool(0.9) {
                YesNo::no()
            } else {
                YesNo::yes()
            },
        },
        voters_counts: VotersCounts {
            poll_card_count: number_of_votes,
            proxy_certificate_count: 0,
            total_admitted_voters_count: number_of_votes,
        },
        votes_counts: VotesCounts {
            political_group_total_votes: political_groups
                .iter()
                .zip(pg_votes.clone())
                .map(|(pg, votes)| PoliticalGroupTotalVotes {
                    number: pg.number,
                    total: votes,
                })
                .collect(),
            total_votes_candidates_count: remaining_votes,
            blank_votes_count: blank_votes,
            invalid_votes_count: invalid_votes,
            total_votes_cast_count: number_of_votes,
        },
        differences_counts: DifferencesCounts::zero(),
        political_group_votes: political_groups
            .iter()
            .zip(pg_votes)
            .map(|(pg, votes)| {
                // distribute the votes for this group among candidates, but give the most votes to the first candidate
                let candidate_votes = distribute_power_law(
                    rng,
                    votes,
                    pg.candidates.len(),
                    candidate_distribution_slope,
                    true,
                );
                PoliticalGroupCandidateVotes {
                    number: pg.number,
                    total: votes,
                    candidate_votes: pg
                        .candidates
                        .iter()
                        .zip(candidate_votes)
                        .map(|(candidate, votes)| CandidateVotes {
                            number: candidate.number,
                            votes,
                        })
                        .collect(),
                }
            })
            .collect(),
    }
}

/// Generate weights for a power law distribution.
/// The slope determines the shape of the distribution, if the slope is zero,
/// the distribution is uniform. Beyond a slope of 2.0-5.0, the distribution becomes
/// heavily skewed towards a single target.
fn distribute_power_law_weights(rng: &mut impl rand::Rng, targets: usize, slope: f64) -> Vec<f64> {
    // Generate power-law weights: w_i = x_i^-s
    let mut weights: Vec<f64> = (0..targets)
        .map(|_| {
            // generate a uniform random number, avoid 0.0 for division by zero when normalizing
            let x: f64 = rng.random_range(0.000_001..1.0);

            // Calculate weight, using a power law distribution (i.e. we're over)
            1.0 / x.powf(slope)
        })
        .collect();

    // Normalize weights to sum to 1
    let sum: f64 = weights.iter().sum();
    for w in weights.iter_mut() {
        *w /= sum;
    }

    weights
}

/// Distribute a number of votes to a set of weighed targets. If the sorted flag is set,
/// the targets are sorted from high to low weight.
fn distribute_fill_weights(
    rng: &mut impl rand::Rng,
    weights: &[f64],
    votes: u32,
    sorted: bool,
) -> Vec<u32> {
    // Convert weights to integer quantities
    #[allow(clippy::cast_possible_truncation)]
    let mut result: Vec<u32> = weights
        .iter()
        .map(|w| (w * votes as f64).floor() as u32)
        .collect();

    // Fix rounding discrepancy, assign the rest randomly
    let mut remaining = votes - result.iter().sum::<u32>();
    while remaining > 0 {
        let i = rng.random_range(0..weights.len());
        result[i] += 1;
        remaining -= 1;
    }

    if sorted {
        // sort from high to low
        result.sort_by(|a, b| b.cmp(a));
    }

    result
}

/// Distribute the votes to a number of targets using a power law distribution.
/// The slope determines the shape of the distribution, if the slope is zero,
/// the distribution is uniform. Beyond a slope of 2.0-5.0, the distribution becomes
/// heavily skewed towards a single target.
fn distribute_power_law(
    rng: &mut impl rand::Rng,
    votes: u32,
    targets: usize,
    slope: f64,
    sorted: bool,
) -> Vec<u32> {
    let weights = distribute_power_law_weights(rng, targets, slope);
    distribute_fill_weights(rng, &weights, votes, sorted)
}

/// Export an election (in EML) to the specified directory
async fn export_election(
    export_dir: &Path,
    committee_session: &CommitteeSession,
    election: &ElectionWithPoliticalGroups,
    polling_stations: &[PollingStation],
    export_results_json: bool,
    results: Vec<(PollingStation, CSOFirstSessionResults)>,
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
    let polling_stations_eml = EML110::polling_stations_from_election(
        committee_session,
        election,
        polling_stations,
        transaction_id,
    );
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
            committee_session: committee_session.clone(),
            polling_stations: polling_stations.iter().map(Clone::clone).collect(),
            summary: election_summary,
            election: election.clone(),
            hash: "0000".to_string(),
            creation_date_time: chrono::Utc::now().format("%d-%m-%Y %H:%M").to_string(),
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
