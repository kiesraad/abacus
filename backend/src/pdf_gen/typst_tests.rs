/// Typst template smoke tests
///
/// These tests generate PDFs using random data for all Typst templates as defined in `PdfModel`.
/// The generated PDFs are checked to a minimum size to ensure that the generation was successful.
/// The tests cover various edge cases by varying the number of parties, candidates,
/// string lengths, and the presence of optional fields.
use crate::{
    committee_session::{status::CommitteeSessionStatus, structs::CommitteeSession},
    data_entry::structs::{
        CandidateVotes, CommonPollingStationResults,
        DifferenceCountsCompareVotesCastAdmittedVoters, DifferencesCounts,
        PoliticalGroupCandidateVotes, PoliticalGroupTotalVotes, VotersCounts, VotesCounts, YesNo,
    },
    election::{
        Candidate, CandidateGender, ElectionCategory, ElectionWithPoliticalGroups, PoliticalGroup,
        VoteCountingMethod,
    },
    investigation::PollingStationInvestigation,
    pdf_gen::{
        generate_pdf,
        models::{
            ModelN10_2Input, ModelNa14_2Bijlage1Input, ModelNa14_2Input, ModelNa31_2Bijlage1Input,
            ModelNa31_2Input, PdfFileModel, PdfModel,
        },
    },
    polling_station::structs::{PollingStation, PollingStationType},
    summary::{ElectionSummary, PollingStationInvestigations, SumCount, SummaryDifferencesCounts},
};

use chrono::{NaiveDate, NaiveDateTime, NaiveTime};
use rand::{Rng, seq::IndexedRandom};
use test_log::test;

fn random_string(rng: &mut impl rand::Rng, length: usize) -> String {
    rng.sample_iter(&rand::distr::Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

fn random_value<T: Copy>(rng: &mut impl rand::Rng, variants: &[T]) -> T {
    *variants.choose(rng).unwrap()
}

fn random_date(rng: &mut impl rand::Rng) -> NaiveDate {
    NaiveDate::from_ymd_opt(
        rng.random_range(1900..=2100),
        rng.random_range(1..=12),
        rng.random_range(1..=28),
    )
    .unwrap()
}

fn random_date_time(rng: &mut impl rand::Rng) -> NaiveDateTime {
    random_date(rng).and_time(
        NaiveTime::from_hms_opt(
            rng.random_range(0..24),
            rng.random_range(0..60),
            rng.random_range(0..60),
        )
        .unwrap(),
    )
}

fn random_option<T>(rng: &mut impl rand::Rng, value: T, none_where_possible: bool) -> Option<T> {
    if none_where_possible {
        return None;
    }

    if rng.random_bool(0.5) {
        Some(value)
    } else {
        None
    }
}

fn random_string_option(
    rng: &mut impl rand::Rng,
    string_length: usize,
    none_where_possible: bool,
) -> Option<String> {
    if none_where_possible {
        return None;
    }

    let value = random_string(rng, string_length);

    random_option(rng, value, none_where_possible)
}

fn random_yes_no(rng: &mut impl rand::Rng) -> YesNo {
    match rng.random_range(0..4) {
        0 => YesNo {
            yes: false,
            no: false,
        },
        1 => YesNo {
            yes: true,
            no: true,
        },
        2 => YesNo::yes(),
        _ => YesNo::no(),
    }
}

fn random_election(
    rng: &mut impl rand::Rng,
    parties: u32,
    candidates: u32,
    string_length: usize,
    none_where_possible: bool,
) -> ElectionWithPoliticalGroups {
    ElectionWithPoliticalGroups {
        id: rng.random_range(0..5),
        name: random_string(rng, string_length),
        counting_method: random_value(rng, &[VoteCountingMethod::CSO, VoteCountingMethod::DSO]),
        election_id: random_string(rng, string_length),
        location: random_string(rng, string_length),
        domain_id: random_string(rng, string_length),
        category: ElectionCategory::Municipal,
        number_of_seats: rng.random_range(0..5),
        election_date: random_date(rng),
        nomination_date: random_date(rng),
        political_groups: (0..parties)
            .map(|party_index| PoliticalGroup {
                number: party_index + 1,
                name: random_string(rng, string_length),
                candidates: (0..candidates)
                    .map(|candidate_index| {
                        let gender = random_value(
                            rng,
                            &[
                                CandidateGender::Male,
                                CandidateGender::Female,
                                CandidateGender::X,
                            ],
                        );

                        Candidate {
                            number: candidate_index + 1,
                            initials: random_string(rng, string_length),
                            first_name: random_string_option(
                                rng,
                                string_length,
                                none_where_possible,
                            ),
                            last_name_prefix: random_string_option(
                                rng,
                                string_length,
                                none_where_possible,
                            ),
                            last_name: random_string(rng, string_length),
                            locality: random_string(rng, string_length),
                            country_code: random_string_option(
                                rng,
                                string_length,
                                none_where_possible,
                            ),
                            gender: random_option(rng, gender, none_where_possible),
                        }
                    })
                    .collect(),
            })
            .collect(),
    }
}

fn random_polling_station(
    rng: &mut impl rand::Rng,
    election: &ElectionWithPoliticalGroups,
    string_length: usize,
    none_where_possible: bool,
) -> PollingStation {
    let id_prev_session = rng.random_range(0..5);
    let number_of_voters = rng.random_range(0..=1000);
    let polling_station_type = random_value(
        rng,
        &[
            PollingStationType::FixedLocation,
            PollingStationType::Special,
            PollingStationType::Mobile,
        ],
    );

    PollingStation {
        id: rng.random_range(0..5),
        election_id: election.id,
        committee_session_id: rng.random_range(0..5),
        id_prev_session: random_option(rng, id_prev_session, none_where_possible),
        name: random_string(rng, string_length),
        number: rng.random_range(0..5),
        number_of_voters: random_option(rng, number_of_voters as i64, none_where_possible),
        polling_station_type: random_option(rng, polling_station_type, none_where_possible),
        address: random_string(rng, string_length),
        postal_code: random_string(rng, string_length),
        locality: random_string(rng, string_length),
    }
}

fn random_committee_session(
    rng: &mut impl rand::Rng,
    election_id: u32,
    string_length: usize,
    none_where_possible: bool,
) -> CommitteeSession {
    let results_eml = rng.random_range(0..1_000);
    let results_pdf = rng.random_range(0..1_000);

    CommitteeSession {
        id: rng.random_range(0..5),
        number: rng.random_range(1..=2),
        election_id,
        location: random_string(rng, string_length),
        // a start_date_time is required for our typst models, this is validated in the code
        start_date_time: Some(random_date_time(rng)),
        status: random_value(
            rng,
            &[
                CommitteeSessionStatus::Created,
                CommitteeSessionStatus::DataEntryNotStarted,
                CommitteeSessionStatus::DataEntryInProgress,
                CommitteeSessionStatus::DataEntryPaused,
                CommitteeSessionStatus::DataEntryFinished,
            ],
        ),
        number_of_voters: rng.random_range(0..=10_000),
        results_eml: random_option(rng, results_eml, none_where_possible),
        results_pdf: random_option(rng, results_pdf, none_where_possible),
        overview_pdf: random_option(rng, results_pdf, none_where_possible),
    }
}

fn random_polling_station_result(
    rng: &mut impl rand::Rng,
    election: &ElectionWithPoliticalGroups,
) -> CommonPollingStationResults {
    CommonPollingStationResults {
        voters_counts: VotersCounts {
            poll_card_count: rng.random_range(0..500),
            proxy_certificate_count: rng.random_range(0..500),
            total_admitted_voters_count: rng.random_range(0..500),
        },
        votes_counts: VotesCounts {
            political_group_total_votes: election
                .political_groups
                .iter()
                .map(|group| PoliticalGroupTotalVotes {
                    number: group.number,
                    total: rng.random_range(0..500),
                })
                .collect(),
            total_votes_candidates_count: rng.random_range(0..500),
            blank_votes_count: rng.random_range(0..500),
            invalid_votes_count: rng.random_range(0..500),
            total_votes_cast_count: rng.random_range(0..500),
        },
        differences_counts: DifferencesCounts {
            compare_votes_cast_admitted_voters: DifferenceCountsCompareVotesCastAdmittedVoters {
                admitted_voters_equal_votes_cast: rng.random_bool(0.5),
                votes_cast_greater_than_admitted_voters: rng.random_bool(0.5),
                votes_cast_smaller_than_admitted_voters: rng.random_bool(0.5),
            },
            more_ballots_count: rng.random_range(0..500),
            fewer_ballots_count: rng.random_range(0..500),
            difference_completely_accounted_for: random_yes_no(rng),
        },
        political_group_votes: election
            .political_groups
            .iter()
            .map(|group| PoliticalGroupCandidateVotes {
                number: group.number,
                total: rng.random_range(0..500),
                candidate_votes: group
                    .candidates
                    .iter()
                    .map(|candidate| CandidateVotes {
                        number: candidate.number,
                        votes: rng.random_range(0..500),
                    })
                    .collect(),
            })
            .collect(),
    }
}

fn random_station_subset(
    rng: &mut impl rand::Rng,
    polling_stations: &[PollingStation],
) -> Vec<u32> {
    polling_stations
        .iter()
        .filter(|_| rng.random_bool(0.5))
        .map(|station| station.number)
        .collect()
}

fn random_sum_count(rng: &mut impl rand::Rng, polling_stations: &[PollingStation]) -> SumCount {
    SumCount {
        count: rng.random_range(0..500),
        polling_stations: random_station_subset(rng, polling_stations),
    }
}

fn random_election_summary(
    rng: &mut impl rand::Rng,
    election: &ElectionWithPoliticalGroups,
    polling_stations: &[PollingStation],
) -> ElectionSummary {
    let result = random_polling_station_result(rng, election);

    ElectionSummary {
        voters_counts: result.voters_counts.clone(),
        votes_counts: result.votes_counts.clone(),
        differences_counts: SummaryDifferencesCounts {
            more_ballots_count: random_sum_count(rng, polling_stations),
            fewer_ballots_count: random_sum_count(rng, polling_stations),
        },
        political_group_votes: result.political_group_votes.clone(),
        polling_station_investigations: PollingStationInvestigations {
            admitted_voters_recounted: random_station_subset(rng, polling_stations),
            investigated_other_reason: random_station_subset(rng, polling_stations),
            ballots_recounted: random_station_subset(rng, polling_stations),
        },
    }
}

fn random_investigation(
    rng: &mut impl rand::Rng,
    polling_station: &PollingStation,
    string_length: usize,
    none_where_possible: bool,
) -> PollingStationInvestigation {
    let corrected_result = rng.random_bool(0.5);

    PollingStationInvestigation {
        polling_station_id: polling_station.id,
        reason: random_string(rng, string_length),
        findings: random_string_option(rng, string_length, none_where_possible),
        corrected_results: random_option(rng, corrected_result, none_where_possible),
    }
}

/// Edge values for (parties, candidates, string_length, none_where_possible)
const EDGE_VALUES: [(u32, u32, usize, bool); 6] = [
    (10, 10, 10, false),
    (0, 0, 10, false),
    (0, 10, 10, false),
    (1, 1, 10, true),
    (1, 1, 0, false),
    (1, 1, 0, true),
];

/// Minimum PDF size to consider the generated PDF valid
const MIN_PDF_SIZE: usize = 20_000;

async fn test_pdf(model: PdfModel) {
    let input = model.as_input_path();
    let result = match generate_pdf(PdfFileModel::new("file.pdf".to_string(), model)).await {
        Ok(r) => r,
        Err(e) => panic!("Error generating PDF for {input:?}: {e:?}"),
    };
    assert!(
        result.buffer.len() > MIN_PDF_SIZE,
        "Incorrect PDF file size for {input:?}"
    );
}

#[test(tokio::test)]
async fn test_na_14_2() {
    let mut rng = rand::rng();

    for (parties, candidates, string_length, none_where_possible) in EDGE_VALUES {
        let election = random_election(
            &mut rng,
            parties,
            candidates,
            string_length,
            none_where_possible,
        );
        let committee_session =
            random_committee_session(&mut rng, election.id, string_length, none_where_possible);
        let previous_committee_session =
            random_committee_session(&mut rng, election.id, string_length, none_where_possible);
        let polling_station_count = rng.random_range(1..=5);
        let polling_stations: Vec<_> = (0..polling_station_count)
            .map(|_| {
                random_polling_station(&mut rng, &election, string_length, none_where_possible)
            })
            .collect();
        let previous_summary = random_election_summary(&mut rng, &election, &polling_stations);
        let summary = random_election_summary(&mut rng, &election, &polling_stations);
        let hash = random_string(&mut rng, 64);
        let creation_date_time = random_date_time(&mut rng)
            .format("%Y-%m-%dT%H:%M:%S")
            .to_string();

        let model = PdfModel::ModelNa14_2(Box::new(ModelNa14_2Input {
            election,
            committee_session,
            previous_committee_session,
            previous_summary,
            summary,
            hash,
            creation_date_time,
        }));

        test_pdf(model).await;
    }
}

#[test(tokio::test)]
async fn test_na_14_2_bijlage_1() {
    let mut rng = rand::rng();

    for (parties, candidates, string_length, none_where_possible) in EDGE_VALUES {
        let election = random_election(
            &mut rng,
            parties,
            candidates,
            string_length,
            none_where_possible,
        );
        let polling_station =
            random_polling_station(&mut rng, &election, string_length, none_where_possible);
        let investigation = random_investigation(
            &mut rng,
            &polling_station,
            string_length,
            none_where_possible,
        );
        let previous_results = random_polling_station_result(&mut rng, &election);

        let model = PdfModel::ModelNa14_2Bijlage1(Box::new(ModelNa14_2Bijlage1Input {
            previous_results,
            election: election.clone(),
            polling_station: polling_station.clone(),
            investigation: investigation.clone(),
        }));

        test_pdf(model).await;
    }
}

#[test(tokio::test)]
async fn test_na_31_2() {
    let mut rng = rand::rng();

    for (parties, candidates, string_length, none_where_possible) in EDGE_VALUES {
        let election = random_election(
            &mut rng,
            parties,
            candidates,
            string_length,
            none_where_possible,
        );
        let committee_session =
            random_committee_session(&mut rng, election.id, string_length, none_where_possible);
        let polling_station_count = rng.random_range(1..=5);
        let polling_stations: Vec<_> = (0..polling_station_count)
            .map(|_| {
                random_polling_station(&mut rng, &election, string_length, none_where_possible)
            })
            .collect();
        let summary = random_election_summary(&mut rng, &election, &polling_stations);
        let hash = random_string(&mut rng, 64);
        let creation_date_time = random_date_time(&mut rng)
            .format("%Y-%m-%dT%H:%M:%S")
            .to_string();

        let model = PdfModel::ModelNa31_2(Box::new(ModelNa31_2Input {
            committee_session,
            election,
            summary,
            polling_stations,
            hash,
            creation_date_time,
        }));

        test_pdf(model).await;
    }
}

#[test(tokio::test)]
async fn test_na_31_2_bijlage_1() {
    let mut rng = rand::rng();

    for (parties, candidates, string_length, none_where_possible) in EDGE_VALUES {
        let election = random_election(
            &mut rng,
            parties,
            candidates,
            string_length,
            none_where_possible,
        );
        let polling_station =
            random_polling_station(&mut rng, &election, string_length, none_where_possible);

        let model = PdfModel::ModelNa31_2Bijlage1(Box::new(ModelNa31_2Bijlage1Input {
            election,
            polling_station,
        }));

        test_pdf(model).await;
    }
}

#[test(tokio::test)]
async fn test_n_10_2() {
    let mut rng = rand::rng();

    for (parties, candidates, string_length, none_where_possible) in EDGE_VALUES {
        let election = random_election(
            &mut rng,
            parties,
            candidates,
            string_length,
            none_where_possible,
        );
        let polling_station =
            random_polling_station(&mut rng, &election, string_length, none_where_possible);

        let model = PdfModel::ModelN10_2(Box::new(ModelN10_2Input {
            election,
            polling_station,
        }));

        test_pdf(model).await;
    }
}
