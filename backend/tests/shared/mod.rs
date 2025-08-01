#![cfg(test)]

use std::net::SocketAddr;

use abacus::{
    committee_session::{
        CommitteeSession, CommitteeSessionListResponse, CommitteeSessionStatusChangeRequest,
        status::CommitteeSessionStatus,
    },
    data_entry::{
        CandidateVotes, Count, DataEntry, DifferencesCounts, ElectionStatusResponse,
        PoliticalGroupVotes, PollingStationResults, VotersCounts, VotesCounts,
        status::{ClientState, DataEntryStatusName},
    },
    election::{CandidateNumber, PGNumber},
};
use axum::http::{HeaderValue, StatusCode};
use hyper::header::CONTENT_TYPE;
use reqwest::{Body, Client, Response};
use serde_json::json;

pub fn differences_counts_zero() -> DifferencesCounts {
    DifferencesCounts {
        more_ballots_count: 0,
        fewer_ballots_count: 0,
        unreturned_ballots_count: 0,
        too_few_ballots_handed_out_count: 0,
        too_many_ballots_handed_out_count: 0,
        other_explanation_count: 0,
        no_explanation_count: 0,
    }
}

pub fn political_group_votes_from_test_data_auto(
    number: PGNumber,
    candidate_votes: &[Count],
) -> PoliticalGroupVotes {
    PoliticalGroupVotes {
        number,
        total: candidate_votes.iter().sum(),
        candidate_votes: candidate_votes
            .iter()
            .enumerate()
            .map(|(i, votes)| CandidateVotes {
                number: CandidateNumber::try_from(i + 1).unwrap(),
                votes: *votes,
            })
            .collect(),
    }
}

/// Example data entry for an election with two parties with two candidates.
pub fn example_data_entry(client_state: Option<&str>) -> DataEntry {
    DataEntry {
        progress: 60,
        data: PollingStationResults {
            extra_investigation: Default::default(),
            voters_counts: VotersCounts {
                poll_card_count: 102,
                proxy_certificate_count: 2,
                total_admitted_voters_count: 104,
            },
            votes_counts: VotesCounts {
                votes_candidates_count: 102,
                blank_votes_count: 1,
                invalid_votes_count: 1,
                total_votes_cast_count: 104,
            },
            differences_counts: differences_counts_zero(),
            political_group_votes: vec![
                political_group_votes_from_test_data_auto(1, &[40, 20]),
                political_group_votes_from_test_data_auto(2, &[30, 12]),
            ],
        },
        client_state: ClientState::new_from_str(client_state).unwrap(),
    }
}

/// Claim a first or second data entry
pub async fn claim_data_entry(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
    entry_number: u32,
) {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/claim"
    );
    let res = Client::new()
        .post(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK, "{:?}", res.text().await);
}

pub async fn save_data_entry(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
    entry_number: u32,
    data_entry: DataEntry,
) -> Response {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/{entry_number}"
    );
    let res = Client::new()
        .post(&url)
        .header("cookie", cookie)
        .json(&data_entry)
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "{:?}", res.text().await);
    res
}

/// Finalise the data entry
pub async fn finalise_data_entry(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
    entry_number: u32,
) -> Response {
    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/finalise"
    );
    let res = Client::new()
        .post(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();

    assert_eq!(res.status(), StatusCode::OK, "{:?}", res.text().await);
    res
}

pub async fn complete_data_entry(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
    entry_number: u32,
    data_entry: DataEntry,
) -> Response {
    claim_data_entry(addr, cookie, polling_station_id, entry_number).await;
    save_data_entry(addr, cookie, polling_station_id, entry_number, data_entry).await;
    finalise_data_entry(addr, cookie, polling_station_id, entry_number).await
}

async fn check_data_entry_status_is_definitive(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    polling_station_id: u32,
    election_id: u32,
) {
    // check that data entry status for this polling station is now Definitive
    let url = format!("http://{addr}/api/elections/{election_id}/status");
    let response = Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
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
    let typist_cookie = typist_login(addr).await;
    complete_data_entry(
        addr,
        &typist_cookie,
        polling_station_id,
        1,
        example_data_entry(None),
    )
    .await;
    let typist2_cookie = typist2_login(addr).await;
    complete_data_entry(
        addr,
        &typist2_cookie,
        polling_station_id,
        2,
        example_data_entry(None),
    )
    .await;
    check_data_entry_status_is_definitive(addr, &typist2_cookie, polling_station_id, election_id)
        .await;
}

pub async fn create_result_with_non_example_data_entry(
    addr: &SocketAddr,
    polling_station_id: u32,
    election_id: u32,
    data_entry: DataEntry,
) {
    let typist_cookie = typist_login(addr).await;
    complete_data_entry(
        addr,
        &typist_cookie,
        polling_station_id,
        1,
        data_entry.clone(),
    )
    .await;
    let typist2_cookie = typist2_login(addr).await;
    complete_data_entry(addr, &typist2_cookie, polling_station_id, 2, data_entry).await;
    check_data_entry_status_is_definitive(addr, &typist2_cookie, polling_station_id, election_id)
        .await;
}

pub async fn get_election_committee_session(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    election_id: u32,
) -> CommitteeSession {
    let url = format!("http://{addr}/api/elections/{election_id}/committee_sessions");
    let response = Client::new()
        .get(&url)
        .header("cookie", cookie)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body: CommitteeSessionListResponse = response.json().await.unwrap();
    body.committee_sessions.first().unwrap().clone()
}

pub async fn change_status_committee_session(
    addr: &SocketAddr,
    cookie: &HeaderValue,
    committee_session_id: u32,
    status: CommitteeSessionStatus,
) {
    let url = format!("http://{addr}/api/committee_sessions/{committee_session_id}/status");
    let response = Client::new()
        .put(&url)
        .header("cookie", cookie)
        .json(&CommitteeSessionStatusChangeRequest { status })
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
}

/// Calls the login endpoint for an Admin user and returns the session cookie
pub async fn admin_login(addr: &SocketAddr) -> HeaderValue {
    login(addr, "admin1", "Admin1Password01").await
}

/// Calls the login endpoint for a Coordinator user and returns the session cookie
pub async fn coordinator_login(addr: &SocketAddr) -> HeaderValue {
    login(addr, "coordinator1", "Coordinator1Password01").await
}

/// Calls the login endpoint for a Typist user and returns the session cookie
pub async fn typist_login(addr: &SocketAddr) -> HeaderValue {
    login(addr, "typist1", "Typist1Password01").await
}

/// Calls the login endpoint for a Typist user and returns the session cookie
pub async fn typist2_login(addr: &SocketAddr) -> HeaderValue {
    login(addr, "typist2", "Typist2Password01").await
}

/// Calls the login endpoint with a username and password
pub async fn login(addr: &SocketAddr, username: &str, password: &str) -> HeaderValue {
    let url = format!("http://{addr}/api/user/login");

    let response = reqwest::Client::new()
        .post(&url)
        .header(CONTENT_TYPE, "application/json")
        .body(Body::from(
            json!({
                "username": username,
                "password": password,
            })
            .to_string(),
        ))
        .send()
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    response.headers().get("set-cookie").cloned().unwrap()
}
