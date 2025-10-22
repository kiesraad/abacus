use chrono::{Datelike, Days, NaiveDate, TimeDelta};
use rand::{Rng, SeedableRng, rngs::StdRng, seq::IndexedRandom};
use sqlx::SqlitePool;
use std::error::Error;
use tracing::info;

use crate::{
    SqlitePoolExt,
    committee_session::{
        CommitteeSession, CommitteeSessionCreateRequest, status::CommitteeSessionStatus,
    },
    data_entry::{
        CSOFirstSessionResults, CandidateVotes, CountingDifferencesPollingStation,
        DifferenceCountsCompareVotesCastAdmittedVoters, DifferencesCounts, ExtraInvestigation,
        FieldPath, PoliticalGroupCandidateVotes, PoliticalGroupTotalVotes, PollingStationResults,
        Validate, ValidationResults, VotersCounts, VotesCounts, YesNo,
        status::{DataEntryStatus, Definitive, SecondEntryNotStarted},
    },
    election::{
        CandidateGender, ElectionCategory, ElectionWithPoliticalGroups, NewElection,
        PoliticalGroup, VoteCountingMethod,
    },
    polling_station::{PollingStation, PollingStationRequest, PollingStationType},
    test_data_gen::GenerateElectionArgs,
};

pub struct CreateTestElectionResult {
    pub election: ElectionWithPoliticalGroups,
    pub committee_session: CommitteeSession,
    pub polling_stations: Vec<PollingStation>,
    pub results: Vec<(PollingStation, PollingStationResults)>,
    pub data_entry_completed: bool,
}

pub async fn create_test_election(
    args: GenerateElectionArgs,
    pool: SqlitePool,
) -> Result<CreateTestElectionResult, Box<dyn Error>> {
    let mut rng = StdRng::from_rng(&mut rand::rng());

    let mut tx = pool.begin_immediate().await?;

    // generate and store the election
    let election =
        crate::election::repository::create(&mut tx, generate_election(&mut rng, &args)).await?;

    // generate the committee session for the election
    let mut committee_session = crate::committee_session::repository::create(
        &mut tx,
        CommitteeSessionCreateRequest {
            number: 1,
            election_id: election.id,
            number_of_voters: 0,
        },
    )
    .await?;

    let number_of_voters = rng.random_range(args.voters.clone());
    committee_session.number_of_voters = number_of_voters;
    crate::committee_session::repository::change_number_of_voters(
        &mut tx,
        committee_session.id,
        number_of_voters,
    )
    .await?;

    // generate the polling stations for the election
    let polling_stations =
        generate_polling_stations(&mut rng, &committee_session, &election, &mut tx, &args).await;

    info!(
        "Election generated with election id: {}, election name: '{}'",
        election.id, election.name
    );

    if !polling_stations.is_empty() {
        committee_session = crate::committee_session::repository::change_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryNotStarted,
        )
        .await?;
    }

    let data_entry_completed = if args.with_data_entry && !polling_stations.is_empty() {
        committee_session = crate::committee_session::repository::change_status(
            &mut tx,
            committee_session.id,
            CommitteeSessionStatus::DataEntryInProgress,
        )
        .await?;

        let (_, second_entries) = generate_data_entry(
            &committee_session,
            &election,
            &polling_stations,
            &mut rng,
            &mut tx,
            &args,
        )
        .await;
        second_entries == polling_stations.len()
    } else {
        false
    };

    let results = if data_entry_completed {
        crate::data_entry::repository::list_results_for_committee_session(
            &mut tx,
            committee_session.id,
        )
        .await?
    } else {
        vec![]
    };

    tx.commit().await?;

    Ok(CreateTestElectionResult {
        election,
        committee_session,
        polling_stations,
        results,
        data_entry_completed,
    })
}

/// Generate a random election using the limits from args.
fn generate_election(rng: &mut impl rand::Rng, args: &GenerateElectionArgs) -> NewElection {
    // start by generating the political groups
    let mut political_groups = vec![];
    let num_political_groups = rng.random_range(args.political_groups.clone());
    info!("Generating {num_political_groups} political groups");

    for i in 1..=num_political_groups {
        political_groups.push(generate_political_party(rng, i, args));
    }

    // generate a nomination date, and an election date not too long afterward
    let nomination_date = super::data::date_between(
        rng,
        NaiveDate::from_ymd_opt(2020, 1, 1).expect("Invalid date"),
        NaiveDate::from_ymd_opt(2040, 1, 1).expect("Invalid date"),
    );
    let election_date =
        super::data::date_between(rng, nomination_date, nomination_date + Days::new(63));

    // extract the year from the election date, generate the locality where this election would be
    let year = election_date.year();
    let locality = super::data::locality(rng).to_owned();

    // use the previous data to generate some identifiers and names
    let name = format!("Gemeenteraad {locality} {year}");
    let cleaned_up_locality = locality.replace(" ", "_").replace("'", "");
    let election_id = format!("{cleaned_up_locality}_{year}");

    info!("Election has name '{name}'");

    // and put it all in the struct (generating some additional fields where needed)
    NewElection {
        name,
        counting_method: VoteCountingMethod::CSO,
        domain_id: super::data::domain_id(rng),
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
    args: &GenerateElectionArgs,
) -> PoliticalGroup {
    let mut candidates = vec![];
    let has_first_name = rng.random_ratio(1, 2);

    for i in 1..rng.random_range(args.candidates_per_group.clone()) {
        // sometimes first names are omitted
        let first_name = if has_first_name {
            Some(super::data::first_name(rng).to_owned())
        } else {
            None
        };

        // initials are required, but if a first name is known, base initials on that
        let initials = super::data::initials(rng, first_name.as_deref());
        let (prefix, last_name) = super::data::last_name(rng);
        candidates.push(crate::election::Candidate {
            number: i,
            initials,
            first_name,
            last_name_prefix: prefix.map(ToOwned::to_owned),
            last_name: last_name.to_owned(),
            locality: super::data::locality(rng).to_owned(),
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
        name: super::data::political_group_name(rng),
        candidates,
    }
}

/// Generate the polling stations for the given election using the limits from args
async fn generate_polling_stations(
    rng: &mut impl rand::Rng,
    committee_session: &CommitteeSession,
    election: &ElectionWithPoliticalGroups,
    conn: &mut sqlx::SqliteConnection,
    args: &GenerateElectionArgs,
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

        let ps = crate::polling_station::repository::create(
            conn,
            election.id,
            PollingStationRequest {
                name: super::data::polling_station_name(rng),
                number: Some(i64::from(i)),
                number_of_voters: Some(ps_num_voters.into()),
                polling_station_type: Some(PollingStationType::FixedLocation),
                address: super::data::address(rng),
                postal_code: super::data::postal_code(rng),
                locality: super::data::locality(rng).to_owned(),
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
    conn: &mut sqlx::SqliteConnection,
    args: &GenerateElectionArgs,
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
            let ts = super::data::datetime_around(rng, now, TimeDelta::hours(-24));

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
            let results =
                PollingStationResults::CSOFirstSession(generate_cso_first_session_results(
                    rng,
                    &election.political_groups,
                    voters_turned_out,
                    &group_weights,
                    candidate_slope,
                ));

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

                crate::data_entry::repository::make_definitive(
                    conn,
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
                crate::data_entry::repository::upsert(conn, ps.id, committee_session.id, &state)
                    .await
                    .expect("Could not create first data entry");
                generated_first_entries += 1;
            };
        }
    }
    (generated_first_entries, generated_second_entries)
}

fn generate_cso_first_session_results(
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
        differences_counts: DifferencesCounts {
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: true,
                votes_cast_greater_than_admitted_voters: false,
                votes_cast_smaller_than_admitted_voters: false,
            },
            more_ballots_count: 0,
            fewer_ballots_count: 0,
            difference_completely_accounted_for: YesNo::default(),
        },
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{election::repository as election_repo, test_data_gen::RandomRange};

    #[sqlx::test]
    async fn test_create_test_election(pool: SqlitePool) {
        let args = GenerateElectionArgs {
            political_groups: RandomRange(20..50),
            candidates_per_group: RandomRange(10..50),
            polling_stations: RandomRange(50..200),
            voters: RandomRange(100_000..200_000),
            seats: RandomRange(9..45),
            with_data_entry: true,
            first_data_entry: RandomRange(100..101),
            second_data_entry: RandomRange(100..101),
            turnout: RandomRange(60..85),
            candidate_distribution_slope: RandomRange(1100..1101),
            political_group_distribution_slope: RandomRange(1100..1101),
        };

        create_test_election(args, pool.clone()).await.unwrap();

        let mut conn = pool.acquire().await.unwrap();
        let elections = election_repo::list(&mut conn).await.unwrap();
        assert_eq!(elections.len(), 1);
    }
}
