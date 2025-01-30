#![cfg(test)]

use axum::http::StatusCode;
use reqwest::Client;
use std::net::SocketAddr;

use abacus::data_entry::{
    status::{ClientState, DataEntryStatusName},
    CandidateVotes, DataEntry, DifferencesCounts, ElectionStatusResponse, PoliticalGroupVotes,
    PollingStationResults, SaveDataEntryResponse, VotersCounts, VotesCounts,
};

// example data entry for an election with two parties with two candidates
pub fn example_data_entry(client_state: Option<&str>) -> DataEntry {
    DataEntry {
        progress: 60,
        data: PollingStationResults {
            recounted: Some(false),
            voters_counts: VotersCounts {
                poll_card_count: 100,
                proxy_certificate_count: 2,
                voter_card_count: 2,
                total_admitted_voters_count: 104,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 102,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 104,
            },
            voters_recounts: None,
            differences_counts: DifferencesCounts {
                more_ballots_count: 0,
                fewer_ballots_count: 0,
                unreturned_ballots_count: 0,
                too_few_ballots_handed_out_count: 0,
                too_many_ballots_handed_out_count: 0,
                other_explanation_count: 0,
                no_explanation_count: 0,
            },
            political_group_votes: vec![
                PoliticalGroupVotes {
                    number: 1,
                    total: 60,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 40,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 20,
                        },
                    ],
                },
                PoliticalGroupVotes {
                    number: 2,
                    total: 42,
                    candidate_votes: vec![
                        CandidateVotes {
                            number: 1,
                            votes: 30,
                        },
                        CandidateVotes {
                            number: 2,
                            votes: 12,
                        },
                    ],
                },
            ],
        },
        client_state: ClientState::new_from_str(client_state).unwrap(),
    }
}

async fn post_data_entry(
    addr: &SocketAddr,
    polling_station_id: u32,
    entry_number: u32,
    data_entry: DataEntry,
) {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/{entry_number}"
    );
    let response = Client::new()
        .post(&url)
        .json(&data_entry)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    let validation_results: SaveDataEntryResponse = response.json().await.unwrap();
    assert_eq!(validation_results.validation_results.errors.len(), 0);
    assert_eq!(validation_results.validation_results.warnings.len(), 0);
}

pub async fn create_and_save_data_entry(
    addr: &SocketAddr,
    polling_station_id: u32,
    entry_number: u32,
    client_state: Option<&str>,
) {
    post_data_entry(
        addr,
        polling_station_id,
        entry_number,
        example_data_entry(client_state),
    )
    .await;
}

pub async fn create_and_save_non_example_data_entry(
    addr: &SocketAddr,
    polling_station_id: u32,
    entry_number: u32,
    data_entry: DataEntry,
) {
    post_data_entry(addr, polling_station_id, entry_number, data_entry).await;
}

async fn finalise_data_entry(addr: &SocketAddr, polling_station_id: u32, entry_number: u32) {
    // Finalise the data entry
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise");
    let response = Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
}

pub async fn create_and_finalise_data_entry(
    addr: &SocketAddr,
    polling_station_id: u32,
    entry_number: u32,
) {
    create_and_save_data_entry(addr, polling_station_id, entry_number, None).await;
    finalise_data_entry(addr, polling_station_id, entry_number).await;
}

pub async fn create_and_finalise_non_example_data_entry(
    addr: &SocketAddr,
    polling_station_id: u32,
    entry_number: u32,
    data_entry: DataEntry,
) {
    create_and_save_non_example_data_entry(addr, polling_station_id, entry_number, data_entry)
        .await;
    finalise_data_entry(addr, polling_station_id, entry_number).await;
}

async fn check_data_entry_status_is_definitive(
    addr: &SocketAddr,
    polling_station_id: u32,
    election_id: u32,
) {
    // check that data entry status for this polling station is now Definitive
    let url = format!("http://{addr}/api/elections/{election_id}/status");
    let response = Client::new().get(&url).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body: ElectionStatusResponse = response.json().await.unwrap();
    assert_eq!(
        body.statuses
            .iter()
            .find(|s| s.polling_station_id == polling_station_id)
            .unwrap()
            .status,
        DataEntryStatusName::Definitive
    );
}

pub async fn create_result(addr: &SocketAddr, polling_station_id: u32, election_id: u32) {
    create_and_finalise_data_entry(addr, polling_station_id, 1).await;
    create_and_finalise_data_entry(addr, polling_station_id, 2).await;
    check_data_entry_status_is_definitive(addr, polling_station_id, election_id).await;
}

pub async fn create_result_with_non_example_data_entry(
    addr: &SocketAddr,
    polling_station_id: u32,
    election_id: u32,
    data_entry: DataEntry,
) {
    create_and_finalise_non_example_data_entry(addr, polling_station_id, 1, data_entry.clone())
        .await;
    create_and_finalise_non_example_data_entry(addr, polling_station_id, 2, data_entry.clone())
        .await;
    check_data_entry_status_is_definitive(addr, polling_station_id, election_id).await;
}
