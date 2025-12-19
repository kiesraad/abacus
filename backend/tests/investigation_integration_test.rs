#![cfg(test)]
use std::net::SocketAddr;

use abacus::{
    committee_session::status::CommitteeSessionStatus,
    data_entry::{
        CSONextSessionResults, DataEntry, PoliticalGroupTotalVotes, PollingStationResults,
        VotersCounts, VotesCounts,
        status::{ClientState, DataEntryStatusName},
    },
    election::ElectionId,
};
use axum::http::StatusCode;
use reqwest::Response;
use sqlx::SqlitePool;
use test_log::test;

use crate::{
    shared::{
        change_status_committee_session, complete_data_entry, coordinator_login,
        create_investigation, create_polling_station, create_result_with_non_example_data_entry,
        differences_counts_zero, get_election_committee_session, get_election_details,
        get_statuses, political_group_votes_from_test_data_auto, typist_login,
        update_investigation,
    },
    utils::serve_api,
};

pub mod shared;
pub mod utils;

async fn conclude_investigation(
    addr: &SocketAddr,
    polling_station_id: u32,
    body: Option<serde_json::Value>,
) -> Response {
    let coordinator_cookie = coordinator_login(addr).await;
    let body = body.unwrap_or(serde_json::json!({
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

async fn delete_investigation(addr: &SocketAddr, polling_station_id: u32) -> Response {
    let coordinator_cookie = coordinator_login(addr).await;
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
async fn test_create_conclude_update_delete(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = ElectionId::from(7);
    let polling_station_id = 741;

    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(election_details.investigations.len(), 0);

    assert_eq!(
        create_investigation(&addr, polling_station_id)
            .await
            .status(),
        StatusCode::CREATED
    );

    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(
        election_details.investigations[0].polling_station_id,
        polling_station_id
    );
    assert_eq!(election_details.investigations[0].reason, "Test reason");
    assert_eq!(election_details.investigations[0].findings, None);

    assert_eq!(
        conclude_investigation(&addr, polling_station_id, None)
            .await
            .status(),
        StatusCode::OK
    );

    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(
        election_details.investigations[0].polling_station_id,
        polling_station_id
    );
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
        update_investigation(&addr, polling_station_id, None)
            .await
            .status(),
        StatusCode::OK
    );

    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(
        election_details.investigations[0].polling_station_id,
        polling_station_id
    );
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
        delete_investigation(&addr, polling_station_id)
            .await
            .status(),
        StatusCode::NO_CONTENT
    );
    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(election_details.investigations.len(), 0);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_deletion_setting_committee_session_back_to_created_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = ElectionId::from(7);

    let committee_session =
        get_election_committee_session(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);

    // Create 2 investigations
    assert_eq!(
        create_investigation(&addr, 741).await.status(),
        StatusCode::CREATED
    );
    assert_eq!(
        create_investigation(&addr, 742).await.status(),
        StatusCode::CREATED
    );

    // Delete one investigation
    assert_eq!(
        delete_investigation(&addr, 742).await.status(),
        StatusCode::NO_CONTENT
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );

    // Delete last investigation
    assert_eq!(
        delete_investigation(&addr, 741).await.status(),
        StatusCode::NO_CONTENT
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_deletion_removes_polling_station_from_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = ElectionId::from(5);
    let polling_station_id = 11;

    let statuses = get_statuses(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(statuses.len(), 1);
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::Definitive
    );

    assert_eq!(
        delete_investigation(&addr, polling_station_id)
            .await
            .status(),
        StatusCode::NO_CONTENT
    );

    let statuses = get_statuses(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(statuses.len(), 0);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_partials_update(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = ElectionId::from(7);
    let polling_station_id = 741;

    assert_eq!(
        create_investigation(&addr, polling_station_id)
            .await
            .status(),
        StatusCode::CREATED
    );

    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(election_details.investigations.len(), 1);
    assert_eq!(
        election_details.investigations[0].polling_station_id,
        polling_station_id
    );
    assert_eq!(election_details.investigations[0].reason, "Test reason");
    assert_eq!(election_details.investigations[0].findings, None);

    // Update only the reason
    let updated = update_investigation(
        &addr,
        polling_station_id,
        Some(serde_json::json!({
            "reason": "Partially updated reason"
        })),
    )
    .await;

    assert_eq!(updated.status(), StatusCode::OK);

    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
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
        &addr,
        polling_station_id,
        Some(serde_json::json!({
            "reason": "Partially updated reason",
            "findings": "Partially updated findings"
        })),
    )
    .await;

    // Update only the findings
    assert_eq!(updated.status(), StatusCode::OK);

    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
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
        &addr,
        polling_station_id,
        Some(serde_json::json!({
            "reason": "Partially updated reason",
            "corrected_results": true
        })),
    )
    .await;

    // Update only the corrected_results
    assert_eq!(updated.status(), StatusCode::OK);

    let election_details =
        get_election_details(&addr, &coordinator_login(&addr).await, election_id).await;
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

fn second_session_data_entry_two_political_groups() -> DataEntry {
    DataEntry {
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
    }
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_update_with_result(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = ElectionId::from(7);
    let polling_station_id = 741;

    // Create and conclude investigation
    let response = create_investigation(&addr, polling_station_id).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let response = conclude_investigation(
        &addr,
        polling_station_id,
        Some(serde_json::json!({"findings": "Test findings", "corrected_results": true})),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);

    // Complete data entry
    create_result_with_non_example_data_entry(
        &addr,
        polling_station_id,
        election_id,
        second_session_data_entry_two_political_groups(),
    )
    .await;

    let statuses = get_statuses(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::Definitive
    );

    // Try to update investigation corrected_results to false
    let mut investigation = serde_json::json!({
        "reason": "Test reason",
        "findings": "Test findings",
        "corrected_results": false
    });
    let response =
        update_investigation(&addr, polling_station_id, Some(investigation.clone())).await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["reference"], "InvestigationHasDataEntryOrResult");

    // Data entry result is still there
    let statuses = get_statuses(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::Definitive
    );

    // Accept deletion
    investigation["accept_data_entry_deletion"] = true.into();
    let response = update_investigation(&addr, polling_station_id, Some(investigation)).await;
    assert_eq!(response.status(), StatusCode::OK);

    // Data entry result is deleted
    let statuses = get_statuses(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(statuses.len(), 0);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_update_with_data_entry(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = ElectionId::from(7);
    let polling_station_id = 741;

    // Create and conclude investigation
    let response = create_investigation(&addr, polling_station_id).await;
    assert_eq!(response.status(), StatusCode::CREATED);

    let response = conclude_investigation(
        &addr,
        polling_station_id,
        Some(serde_json::json!({"findings": "Test findings", "corrected_results": true})),
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);

    // First data entry
    let typist_cookie = typist_login(&addr).await;
    complete_data_entry(
        &addr,
        &typist_cookie,
        polling_station_id,
        1,
        second_session_data_entry_two_political_groups(),
    )
    .await;

    let statuses = get_statuses(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::SecondEntryNotStarted
    );

    // Try to update investigation corrected_results to false
    let mut investigation = serde_json::json!({
        "reason": "Test reason",
        "findings": "Test findings",
        "corrected_results": false
    });
    let response =
        update_investigation(&addr, polling_station_id, Some(investigation.clone())).await;
    assert_eq!(response.status(), StatusCode::CONFLICT);
    let body: serde_json::Value = response.json().await.unwrap();
    assert_eq!(body["reference"], "InvestigationHasDataEntryOrResult");

    // Data entry is still there
    let statuses = get_statuses(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(
        statuses[&polling_station_id].status,
        DataEntryStatusName::SecondEntryNotStarted
    );

    // Accept deletion
    investigation["accept_data_entry_deletion"] = true.into();
    let response = update_investigation(&addr, polling_station_id, Some(investigation)).await;
    assert_eq!(response.status(), StatusCode::OK);

    // Data entry is deleted
    let statuses = get_statuses(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(statuses.len(), 0);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_creation_for_committee_session_with_created_status(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = ElectionId::from(7);

    assert_eq!(
        create_investigation(&addr, 741).await.status(),
        StatusCode::CREATED
    );

    let committee_session =
        get_election_committee_session(&addr, &coordinator_login(&addr).await, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryNotStarted
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_creation_fails_for_wrong_polling_station(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    // 732 is an existing polling station, but in the wrong committee session
    assert_eq!(
        create_investigation(&addr, 732).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_creation_fails_on_creating_second_investigation(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    assert_eq!(
        create_investigation(&addr, 741).await.status(),
        StatusCode::CREATED
    );
    assert_eq!(
        create_investigation(&addr, 741).await.status(),
        StatusCode::CONFLICT
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_can_only_conclude_existing(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    assert_eq!(
        conclude_investigation(&addr, 741, None).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_can_only_update_existing(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    assert_eq!(
        update_investigation(&addr, 741, None).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_can_only_conclude_current_session(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    assert_eq!(
        conclude_investigation(&addr, 732, None).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_can_only_update_current_session(pool: SqlitePool) {
    let addr = serve_api(pool).await;

    assert_eq!(
        update_investigation(&addr, 732, None).await.status(),
        StatusCode::NOT_FOUND
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_can_conclude_update_new_polling_station_corrected_results_true(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let ps_response =
        create_polling_station(&addr, &coordinator_cookie, ElectionId::from(7), 123).await;
    let ps_body: serde_json::Value = ps_response.json().await.unwrap();
    let new_ps_id = u32::try_from(ps_body["id"].as_u64().unwrap()).unwrap();

    create_investigation(&addr, new_ps_id).await;

    let conclude_response = conclude_investigation(
        &addr,
        new_ps_id,
        Some(serde_json::json!({
            "findings": "Test findings",
            "corrected_results": true
        })),
    )
    .await;
    assert_eq!(conclude_response.status(), StatusCode::OK);

    let update_response = update_investigation(
        &addr,
        new_ps_id,
        Some(serde_json::json!({
            "reason": "Test reason",
            "corrected_results": true
        })),
    )
    .await;
    assert_eq!(update_response.status(), StatusCode::OK);
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_cannot_conclude_update_new_polling_station_corrected_results_false(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    let ps_response =
        create_polling_station(&addr, &coordinator_cookie, ElectionId::from(7), 123).await;
    let ps_body: serde_json::Value = ps_response.json().await.unwrap();
    let new_ps_id = u32::try_from(ps_body["id"].as_u64().unwrap()).unwrap();

    create_investigation(&addr, new_ps_id).await;

    let conclude_response = conclude_investigation(
        &addr,
        new_ps_id,
        Some(serde_json::json!({
            "findings": "Test findings",
            "corrected_results": false
        })),
    )
    .await;

    assert_eq!(conclude_response.status(), StatusCode::CONFLICT);
    let conclude_body: serde_json::Value = conclude_response.json().await.unwrap();
    assert_eq!(
        conclude_body["reference"],
        "InvestigationRequiresCorrectedResults"
    );

    let update_response = update_investigation(
        &addr,
        new_ps_id,
        Some(serde_json::json!({
            "reason": "Test reason",
            "corrected_results": false
        })),
    )
    .await;

    assert_eq!(update_response.status(), StatusCode::CONFLICT);
    let update_body: serde_json::Value = update_response.json().await.unwrap();
    assert_eq!(
        update_body["reference"],
        "InvestigationRequiresCorrectedResults"
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_polling_station_corrigendum_download_with_previous_results(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    // Polling station 9 has previous results, but no investigation yet
    let polling_station_id = 9;

    assert_eq!(
        create_investigation(&addr, polling_station_id)
            .await
            .status(),
        StatusCode::CREATED
    );

    let url = format!(
        "http://{addr}/api/polling_stations/{polling_station_id}/investigation/download_corrigendum_pdf"
    );
    let response = reqwest::Client::new()
        .get(&url)
        .header("cookie", coordinator_login(&addr).await)
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

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_polling_station_corrigendum_download_without_previous_results(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let coordinator_cookie = coordinator_login(&addr).await;
    // Polling station 11 is new and has no previous results. An investigation already exists.
    let polling_station_id = 11;

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
        "\"Model_Na14-2_GR2026_Stembureau_42_Bijlage_1.pdf\""
    );

    let bytes = response.bytes().await.unwrap();
    assert!(bytes.len() > 1024);
}

async fn check_finished_to_in_progress_on<F, Fut>(
    addr: &SocketAddr,
    pre_create: bool,
    action: F,
    expected_status: StatusCode,
) where
    F: FnOnce() -> Fut,
    Fut: Future<Output = Response>,
{
    let election_id = ElectionId::from(5);
    let committee_session_id = 6;

    if pre_create {
        assert_eq!(
            create_investigation(addr, 9).await.status(),
            StatusCode::CREATED
        );

        assert_eq!(
            conclude_investigation(
                addr,
                9,
                Some(serde_json::json!({"findings": "Test findings", "corrected_results": false})),
            )
            .await
            .status(),
            StatusCode::OK
        );
    }

    let coordinator_cookie = coordinator_login(addr).await;
    change_status_committee_session(
        addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        get_election_committee_session(addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    let status = action().await.status();
    assert_eq!(status, expected_status, "Unexpected response status");

    let coordinator_cookie = coordinator_login(addr).await;
    let committee_session =
        get_election_committee_session(addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryInProgress
    );
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_finished_to_in_progress_on_create(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    check_finished_to_in_progress_on(
        &addr,
        false,
        || create_investigation(&addr, 9),
        StatusCode::CREATED,
    )
    .await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_finished_to_in_progress_on_update(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    check_finished_to_in_progress_on(
        &addr,
        true,
        || update_investigation(&addr, 9, None),
        StatusCode::OK,
    )
    .await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_finished_to_in_progress_on_conclude(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    check_finished_to_in_progress_on(
        &addr,
        true,
        || conclude_investigation(&addr, 9, None),
        StatusCode::OK,
    )
    .await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_5_with_results", "users"))))]
async fn test_finished_to_in_progress_on_delete_non_last(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    check_finished_to_in_progress_on(
        &addr,
        true,
        || delete_investigation(&addr, 9),
        StatusCode::NO_CONTENT,
    )
    .await;
}

#[test(sqlx::test(fixtures(path = "../fixtures", scripts("election_7_four_sessions", "users"))))]
async fn test_finished_to_created_on_delete_last(pool: SqlitePool) {
    let addr = serve_api(pool).await;
    let election_id = ElectionId::from(7);
    let committee_session_id = 704;

    assert_eq!(
        create_investigation(&addr, 741).await.status(),
        StatusCode::CREATED
    );

    assert_eq!(
        conclude_investigation(
            &addr,
            741,
            Some(serde_json::json!({"findings": "Test findings", "corrected_results": false})),
        )
        .await
        .status(),
        StatusCode::OK
    );

    let coordinator_cookie = coordinator_login(&addr).await;
    change_status_committee_session(
        &addr,
        &coordinator_cookie,
        election_id,
        committee_session_id,
        CommitteeSessionStatus::DataEntryFinished,
    )
    .await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(
        committee_session.status,
        CommitteeSessionStatus::DataEntryFinished
    );

    let status = delete_investigation(&addr, 741).await.status();
    assert_eq!(status, StatusCode::NO_CONTENT);

    let coordinator_cookie = coordinator_login(&addr).await;
    let committee_session =
        get_election_committee_session(&addr, &coordinator_cookie, election_id).await;
    assert_eq!(committee_session.status, CommitteeSessionStatus::Created);
}
