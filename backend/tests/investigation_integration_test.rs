#![cfg(test)]
use abacus::{
    committee_session::status::CommitteeSessionStatus,
    data_entry::{
        CSONextSessionResults, DataEntry, PoliticalGroupTotalVotes, PollingStationResults,
        VotersCounts, VotesCounts,
        status::{ClientState, DataEntryStatusName},
    },
    election::ElectionDetailsResponse,
};
use axum::http::StatusCode;
use reqwest::Response;
use serde_json::json;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        create_result_with_non_example_data_entry, differences_counts_zero, get_statuses,
        political_group_votes_from_test_data_auto,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

async fn get_election(pool: SqlitePool, election_id: u32) -> ElectionDetailsResponse {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/elections/{election_id}");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();

    // Ensure the response is what we expect
    assert_eq!(response.status(), StatusCode::OK);
    response.json().await.unwrap()
}

async fn create_investigation(pool: SqlitePool, polling_station_id: u32) -> Response {
    let addr = serve_api(pool).await;
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/investigation");
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = json!({
        "reason": "Test reason"
    });
    reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

async fn update_investigation(
    pool: SqlitePool,
    polling_station_id: u32,
    body: Option<serde_json::Value>,
) -> Response {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = body.unwrap_or(json!({
        "reason": "Updated reason",
        "findings": "updated test findings",
        "corrected_results": true
    }));
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/investigation");
    reqwest::Client::new()
        .put(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

async fn conclude_investigation(
    pool: SqlitePool,
    polling_station_id: u32,
    body: Option<serde_json::Value>,
) -> Response {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let body = body.unwrap_or(json!({
        "findings": "Test findings",
        "corrected_results": false
    }));
    let url =
        format!("http://{addr}/api/polling_stations/{polling_station_id}/investigation/conclude");
    reqwest::Client::new()
        .post(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .body(body.to_string())
        .send()
        .await
        .unwrap()
}

async fn delete_investigation(pool: SqlitePool, polling_station_id: u32) -> Response {
    let addr = serve_api(pool).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let url = format!("http://{addr}/api/polling_stations/{polling_station_id}/investigation");
    reqwest::Client::new()
        .delete(&url)
        .header("cookie", coordinator_cookie)
        .header("Content-Type", "application/json")
        .send()
        .await
        .unwrap()
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_create_conclude_update_delete(pool: SqlitePool) {
    let election_id = 7;
    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 0);

    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(election_details.investigations[0].reason, "Test reason");
    assert_eq!(election_details.investigations[0].findings, None);

    assert_eq!(
        conclude_investigation(pool.clone(), 741, None)
            .await
            .status(),
        StatusCode::OK
    );

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(election_details.investigations[0].reason, "Test reason");
    assert_eq!(
        election_details.investigations[0].findings,
        Some("Test findings".to_string())
    );
    assert_eq!(
        election_details.investigations[0].corrected_results,
        Some(false)
    );

    assert_eq!(
        update_investigation(pool.clone(), 741, None).await.status(),
        StatusCode::OK
    );

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(election_details.investigations[0].polling_station_id, 741);
    assert_eq!(election_details.investigations[0].reason, "Updated reason");
    assert_eq!(
        election_details.investigations[0].findings,
        Some("updated test findings".to_string())
    );
    assert_eq!(
        election_details.investigations[0].corrected_results,
        Some(true)
    );

    assert_eq!(
        delete_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 0);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_deletion_setting_committee_session_back_to_created_status(
    pool: SqlitePool,
) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 7;

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    // Create 2 investigations
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        create_investigation(pool.clone(), 742).await.status(),
        StatusCode::OK
    );

    // Delete one investigation
    assert_eq!(
        delete_investigation(pool.clone(), 742).await.status(),
        StatusCode::OK
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );

    // Delete last investigation
    assert_eq!(
        delete_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]

async fn test_investigation_deleting_also_deleting_data_entry_and_results(pool: SqlitePool) {
    // TODO: This test should change when issue #2151 is implemented:
    //  The status api should then not return FirstEntryNotStarted
    //  before an investigation with `corrected_results: true` is added
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 5;
    let polling_station_id = 9;

    let statuses = get_statuses(&addr, &cookie, election_id).await;
    assert_eq!(statuses.len(), 1);
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::FirstEntryNotStarted
    );

    // Add investigation with corrected_results: true
    assert_eq!(
        create_investigation(pool.clone(), polling_station_id)
            .await
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        conclude_investigation(
            pool.clone(),
            polling_station_id,
            Some(json!({
                "findings": "Test findings",
                "corrected_results": true
            })),
        )
        .await
        .status(),
        StatusCode::OK
    );

    let data_entry = DataEntry {
        progress: 100,
        data: PollingStationResults::CSONextSession(CSONextSessionResults {
            voters_counts: VotersCounts {
                poll_card_count: 1203,
                proxy_certificate_count: 2,

                total_admitted_voters_count: 1205,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: 1,
                        total: 600,
                    },
                    PoliticalGroupTotalVotes {
                        number: 2,
                        total: 302,
                    },
                    PoliticalGroupTotalVotes {
                        number: 3,
                        total: 98,
                    },
                    PoliticalGroupTotalVotes {
                        number: 4,
                        total: 99,
                    },
                    PoliticalGroupTotalVotes {
                        number: 5,
                        total: 101,
                    },
                ],
                total_votes_candidates_count: 1200,
                blank_votes_count: 3,
                invalid_votes_count: 2,
                total_votes_cast_count: 1205,
            },

            differences_counts: differences_counts_zero(),
            political_group_votes: vec![
                political_group_votes_from_test_data_auto(
                    1,
                    &[
                        78, 20, 55, 45, 50, 0, 60, 40, 30, 20, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 152,
                    ],
                ),
                political_group_votes_from_test_data_auto(2, &[150, 50, 22, 10, 30, 40]),
                political_group_votes_from_test_data_auto(3, &[20, 15, 25, 3, 2, 33]),
                political_group_votes_from_test_data_auto(4, &[20, 15, 25, 24, 15]),
                political_group_votes_from_test_data_auto(5, &[20, 31, 10, 40]),
            ],
        }),
        client_state: ClientState::new_from_str(None).unwrap(),
    };

    create_result_with_non_example_data_entry(&addr, 9, 5, data_entry).await;

    let statuses = get_statuses(&addr, &cookie, election_id).await;
    assert_eq!(statuses.len(), 1);
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::Definitive
    );

    assert_eq!(
        delete_investigation(pool.clone(), polling_station_id)
            .await
            .status(),
        StatusCode::OK
    );

    let statuses = get_statuses(&addr, &cookie, election_id).await;
    assert_eq!(statuses.len(), 1);
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::FirstEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_partials_investigation_update(pool: SqlitePool) {
    let election_id = 7;
    let polling_station_id = 741;

    assert_eq!(
        create_investigation(pool.clone(), polling_station_id)
            .await
            .status(),
        StatusCode::OK
    );

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(
        election_details.investigations[0].polling_station_id,
        polling_station_id
    );
    assert_eq!(election_details.investigations[0].reason, "Test reason");
    assert_eq!(election_details.investigations[0].findings, None);

    // Update only the reason
    let updated = update_investigation(
        pool.clone(),
        polling_station_id,
        Some(json!({
            "reason": "Partially updated reason"
        })),
    )
    .await;

    assert_eq!(updated.status(), StatusCode::OK);

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(
        election_details.investigations[0].polling_station_id,
        polling_station_id
    );
    assert_eq!(
        election_details.investigations[0].reason,
        "Partially updated reason"
    );
    assert_eq!(election_details.investigations[0].findings, None);

    let updated = update_investigation(
        pool.clone(),
        polling_station_id,
        Some(json!({
            "reason": "Partially updated reason",
            "findings": "Partially updated findings"
        })),
    )
    .await;

    // Update only the findings
    assert_eq!(updated.status(), StatusCode::OK);

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(
        election_details.investigations[0].polling_station_id,
        polling_station_id
    );
    assert_eq!(
        election_details.investigations[0].reason,
        "Partially updated reason"
    );
    assert_eq!(
        election_details.investigations[0].findings,
        Some("Partially updated findings".to_string())
    );

    let updated = update_investigation(
        pool.clone(),
        polling_station_id,
        Some(json!({
            "reason": "Partially updated reason",
            "corrected_results": true
        })),
    )
    .await;

    // Update only the corrected_results
    assert_eq!(updated.status(), StatusCode::OK);

    let election_details = get_election(pool.clone(), election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(
        election_details.investigations[0].polling_station_id,
        polling_station_id
    );
    assert_eq!(
        election_details.investigations[0].reason,
        "Partially updated reason"
    );
    assert_eq!(election_details.investigations[0].findings, None);
    assert_eq!(
        election_details.investigations[0].corrected_results,
        Some(true)
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_update_and_data_entry_and_results_delete(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 7;
    let polling_station_id = 741;

    assert_eq!(
        create_investigation(pool.clone(), polling_station_id)
            .await
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        conclude_investigation(
            pool.clone(),
            polling_station_id,
            Some(json!({
                "findings": "Test findings",
                "corrected_results": true
            })),
        )
        .await
        .status(),
        StatusCode::OK
    );

    let data_entry = DataEntry {
        progress: 100,
        data: PollingStationResults::CSONextSession(CSONextSessionResults {
            voters_counts: VotersCounts {
                poll_card_count: 15,
                proxy_certificate_count: 0,
                total_admitted_voters_count: 15,
            },
            votes_counts: VotesCounts {
                political_group_total_votes: vec![
                    PoliticalGroupTotalVotes {
                        number: 1,
                        total: 10,
                    },
                    PoliticalGroupTotalVotes {
                        number: 2,
                        total: 5,
                    },
                ],
                total_votes_candidates_count: 15,
                blank_votes_count: 0,
                invalid_votes_count: 0,
                total_votes_cast_count: 15,
            },

            differences_counts: differences_counts_zero(),
            political_group_votes: vec![
                political_group_votes_from_test_data_auto(1, &[8, 2]),
                political_group_votes_from_test_data_auto(2, &[5, 0]),
            ],
        }),
        client_state: ClientState::new_from_str(None).unwrap(),
    };

    create_result_with_non_example_data_entry(&addr, polling_station_id, election_id, data_entry)
        .await;

    let statuses = get_statuses(&addr, &cookie, election_id).await;
    assert_eq!(statuses.len(), 2);
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::Definitive
    );

    assert_eq!(
        update_investigation(
            pool.clone(),
            polling_station_id,
            Some(json!({
                "reason": "Partially updated reason",
                "findings": "Partially updated findings",
                "corrected_results": false
            })),
        )
        .await
        .status(),
        StatusCode::OK
    );

    let statuses = get_statuses(&addr, &cookie, election_id).await;
    assert_eq!(statuses.len(), 2);
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::FirstEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_for_committee_session_with_created_status(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 7;

    shared::change_status_committee_session(&addr, &cookie, 704, CommitteeSessionStatus::Created)
        .await;
    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_investigation_creation_for_committee_session_with_finished_status(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let cookie = shared::coordinator_login(&addr).await;
    let election_id = 5;

    shared::change_status_committee_session(
        &addr,
        &cookie,
        6,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    assert_eq!(
        create_investigation(pool.clone(), 9).await.status(),
        StatusCode::OK
    );

    let committee_session =
        shared::get_election_committee_session(&addr, &cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_fails_for_wrong_polling_station(pool: SqlitePool) {
    // 732 is an existing polling station, but in the wrong committee session
    assert_eq!(
        create_investigation(pool.clone(), 732).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_creation_fails_on_creating_second_investigation(pool: SqlitePool) {
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        create_investigation(pool.clone(), 741).await.status(),
        StatusCode::CONFLICT
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_conclude_existing(pool: SqlitePool) {
    assert_eq!(
        conclude_investigation(pool.clone(), 741, None)
            .await
            .status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_update_existing(pool: SqlitePool) {
    assert_eq!(
        update_investigation(pool.clone(), 741, None).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_conclude_current_session(pool: SqlitePool) {
    assert_eq!(
        conclude_investigation(pool.clone(), 732, None)
            .await
            .status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_investigation_can_only_update_current_session(pool: SqlitePool) {
    assert_eq!(
        update_investigation(pool.clone(), 732, None).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_polling_station_corrigendum_download_with_previous_results(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let polling_station_id = 9;

    assert_eq!(
        create_investigation(pool.clone(), polling_station_id)
            .await
            .status(),
        StatusCode::OK
    );

    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/investigation/download_corrigendum_pdf"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/pdf");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"Model_Na14-2_GR2026_Stembureau_41_Bijlage_1.pdf\""
    );

    let bytes = response.bytes().await.unwrap();
    assert!(bytes.len() > 1024);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_2", "users"))))]
async fn test_polling_station_corrigendum_download_without_previous_results(pool: SqlitePool) {
    let addr = serve_api(pool.clone()).await;
    let coordinator_cookie = shared::coordinator_login(&addr).await;
    let polling_station_id = 2;

    assert_eq!(
        create_investigation(pool.clone(), polling_station_id)
            .await
            .status(),
        StatusCode::OK
    );

    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/investigation/download_corrigendum_pdf"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_cookie)
        .send()
        .await
        .unwrap();
    let content_disposition = response.headers().get("Content-Disposition");
    let content_type = response.headers().get("Content-Type");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(content_type.unwrap(), "application/pdf");

    let content_disposition_string = content_disposition.unwrap().to_str().unwrap();
    assert_eq!(&content_disposition_string[..21], "attachment; filename=");
    assert_eq!(
        &content_disposition_string[21..],
        "\"Model_Na14-2_GR2024_Stembureau_34_Bijlage_1.pdf\""
    );

    let bytes = response.bytes().await.unwrap();
    assert!(bytes.len() > 1024);
}
