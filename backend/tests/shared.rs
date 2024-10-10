#![cfg(test)]

use std::net::SocketAddr;

use backend::data_entry::{
    CandidateVotes, DifferencesCounts, PoliticalGroupVotes, PollingStationResults,
    SaveDataEntryRequest, SaveDataEntryResponse, VotersCounts, VotesCounts,
};
use hyper::StatusCode;

pub fn example_data_entry() -> SaveDataEntryRequest {
    SaveDataEntryRequest {
        data: PollingStationResults {
            recounted: false,
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
            political_group_votes: vec![PoliticalGroupVotes {
                number: 1,
                total: 102,
                candidate_votes: vec![
                    CandidateVotes {
                        number: 1,
                        votes: 54,
                    },
                    CandidateVotes {
                        number: 2,
                        votes: 48,
                    },
                ],
            }],
        },
        client_state: None,
    }
}

pub async fn create_and_save_data_entry(addr: &SocketAddr, polling_station_id: u32) {
    let request_body = example_data_entry();
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/data_entries/1");
    let response = reqwest::Client::new()
        .post(&url)
        .json(&request_body)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    let status = response.status();
    if status != StatusCode::OK {
        println!("Response body: {:?}", &response.text().await.unwrap());
        panic!("Unexpected response status: {:?}", status);
    }
    let validation_results: SaveDataEntryResponse = response.json().await.unwrap();
    assert_eq!(validation_results.validation_results.errors.len(), 0);
    assert_eq!(validation_results.validation_results.warnings.len(), 0);
}

pub async fn create_and_finalise_data_entry(addr: &SocketAddr, polling_station_id: u32) {
    create_and_save_data_entry(addr, polling_station_id).await;

    // Finalise the data entry
    let url = format!("http://{addr}/api/polling_stations/1/data_entries/1/finalise");
    let response = reqwest::Client::new().post(&url).send().await.unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
}
