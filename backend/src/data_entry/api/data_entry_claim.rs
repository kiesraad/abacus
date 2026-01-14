use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::Typist,
    data_entry::{
        domain::{
            data_entry_status::{CurrentDataEntry, DataEntryStatus},
            entry_number::EntryNumber,
            polling_station_results::{
                PollingStationResults, common_polling_station_results::CommonPollingStationResults,
                cso_next_session_results::CSONextSessionResults,
            },
            validate::{ValidateRoot, ValidationResults},
        },
        repository::{data_entry_repo, polling_station_result_repo},
        service::validate_and_get_data,
    },
    election::domain::{committee_session::CommitteeSession, election::PoliticalGroup},
};

/// Claim a data entry for a polling station, returning any existing progress
#[utoipa::path(
    post,
    path = "/api/polling_stations/{polling_station_id}/data_entries/{entry_number}/claim",
    responses(
        (status = 200, description = "Data entry claimed successfully", body = ClaimDataEntryResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 409, description = "Request cannot be completed", body = ErrorResponse),
        (status = 422, description = "Invalid data", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("polling_station_id" = u32, description = "Polling station database id"),
        ("entry_number" = u8, description = "Data entry number (first or second data entry)"),
    ),
    security(("cookie_auth" = ["typist"])),
)]
#[allow(clippy::too_many_lines)]
pub async fn polling_station_data_entry_claim(
    user: Typist,
    State(pool): State<SqlitePool>,
    Path((polling_station_id, entry_number)): Path<(u32, EntryNumber)>,
    audit_service: AuditService,
) -> Result<Json<ClaimDataEntryResponse>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let (polling_station, election, committee_session, state) =
        validate_and_get_data(&mut tx, polling_station_id, &user.0).await?;

    let previous_results = if polling_station.id_prev_session.is_some() {
        Some(
            polling_station_result_repo::previous_results_for_polling_station(
                &mut tx,
                polling_station_id,
            )
            .await?,
        )
    } else {
        None
    };

    let new_data_entry = initial_current_data_entry(
        user.0.id(),
        &election.political_groups,
        &committee_session,
        previous_results.as_ref(),
    );

    // Transition to the new state
    let new_state = match entry_number {
        EntryNumber::FirstEntry => state.clone().claim_first_entry(new_data_entry.clone())?,
        EntryNumber::SecondEntry => state.clone().claim_second_entry(new_data_entry.clone())?,
    };

    // Validate the state
    let data = new_state
        .get_data()
        .expect("data should be present because data entry is in progress");
    let validation_results = new_state.start_validate(&polling_station, &election)?;

    // Save the new data entry state
    data_entry_repo::upsert(
        &mut tx,
        polling_station_id,
        committee_session.id,
        &new_state,
    )
    .await?;

    let data_entry =
        data_entry_repo::get_data_entry(&mut tx, polling_station_id, committee_session.id).await?;

    match state {
        DataEntryStatus::FirstEntryNotStarted | DataEntryStatus::SecondEntryNotStarted(_) => {
            audit_service
                .log(
                    &mut tx,
                    &AuditEvent::DataEntryStarted(data_entry.into()),
                    None,
                )
                .await?;
        }
        _ => {
            audit_service
                .log(
                    &mut tx,
                    &AuditEvent::DataEntryResumed(data_entry.into()),
                    None,
                )
                .await?;
        }
    }

    let client_state = new_state.get_client_state().map(|v| v.to_owned());

    tx.commit().await?;

    Ok(Json(ClaimDataEntryResponse {
        data: data.clone(),
        client_state,
        validation_results,
        previous_results: previous_results.map(|r| r.as_common()),
    }))
}

/// Response structure for getting data entry of polling station results
#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct ClaimDataEntryResponse {
    pub data: PollingStationResults,
    #[schema(value_type = Object)]
    pub client_state: Option<serde_json::Value>,
    pub validation_results: ValidationResults,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    #[schema(nullable = false)]
    pub previous_results: Option<CommonPollingStationResults>,
}

fn initial_current_data_entry(
    user_id: u32,
    political_groups: &[PoliticalGroup],
    committee_session: &CommitteeSession,
    previous_results: Option<&PollingStationResults>,
) -> CurrentDataEntry {
    let entry = if committee_session.is_next_session() {
        if let Some(prev) = previous_results {
            let mut copy = CSONextSessionResults {
                voters_counts: prev.voters_counts().clone(),
                votes_counts: prev.votes_counts().clone(),
                differences_counts: prev.differences_counts().clone(),
                political_group_votes: prev.political_group_votes().to_vec(),
            };

            // clear checkboxes in differences because they always need to be re-entered
            copy.differences_counts.compare_votes_cast_admitted_voters = Default::default();
            copy.differences_counts.difference_completely_accounted_for = Default::default();

            PollingStationResults::CSONextSession(copy)
        } else {
            PollingStationResults::empty_cso_next_session(political_groups)
        }
    } else {
        PollingStationResults::empty_cso_first_session(political_groups)
    };

    CurrentDataEntry {
        progress: None,
        user_id,
        entry,
        client_state: None,
    }
}

#[cfg(test)]
pub mod tests {
    use axum::{
        http::StatusCode,
        response::{IntoResponse, Response},
    };
    use http_body_util::BodyExt;
    use sqlx::query_as;
    use test_log::test;

    use super::*;
    use crate::{
        authentication::{Role, User},
        data_entry::domain::polling_station_data_entry::PollingStationDataEntry,
        election::{
            api::committee_session::tests::change_status_committee_session,
            domain::committee_session_status::CommitteeSessionStatus,
            repository::{
                investigation_repo::insert_test_investigation,
                polling_station_repo::insert_test_polling_station,
            },
        },
        error::ErrorReference,
    };

    pub async fn claim(
        pool: SqlitePool,
        polling_station_id: u32,
        entry_number: EntryNumber,
    ) -> Response {
        let user = match entry_number {
            EntryNumber::FirstEntry => User::test_user(Role::Typist, 1),
            EntryNumber::SecondEntry => User::test_user(Role::Typist, 2),
        };
        polling_station_data_entry_claim(
            Typist(user.clone()),
            State(pool.clone()),
            Path((polling_station_id, entry_number)),
            AuditService::new(Some(user), None),
        )
        .await
        .into_response()
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_ok(pool: SqlitePool) {
        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_committee_session_status_is_data_entry_paused(pool: SqlitePool) {
        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryPaused)
            .await;

        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::CommitteeSessionPaused);

        // Check that no row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
    async fn test_claim_data_entry_committee_session_status_not_data_entry_paused_or_in_progress(
        pool: SqlitePool,
    ) {
        change_status_committee_session(pool.clone(), 2, CommitteeSessionStatus::DataEntryFinished)
            .await;

        let response = claim(pool.clone(), 1, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            result.reference,
            ErrorReference::InvalidCommitteeSessionStatus
        );

        // Check that no row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, 1)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_err_no_investigation(pool: SqlitePool) {
        let response = claim(pool.clone(), 742, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::DataEntryNotAllowed);

        // Check that no row was created
        let mut conn = pool.acquire().await.unwrap();
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, 742)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_err_investigation_no_corrected_results(
        pool: SqlitePool,
    ) {
        let mut conn = pool.acquire().await.unwrap();
        // Insert investigation
        insert_test_investigation(&mut conn, 742, Some(false))
            .await
            .unwrap();

        let response = claim(pool.clone(), 742, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::CONFLICT);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::DataEntryNotAllowed);

        // Check that no row was created
        assert!(
            !data_entry_repo::data_entry_exists(&mut conn, 742)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_claim_data_entry_next_session_ok(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        // Insert investigation
        insert_test_investigation(&mut conn, 742, Some(true))
            .await
            .unwrap();

        change_status_committee_session(
            pool.clone(),
            704,
            CommitteeSessionStatus::DataEntryInProgress,
        )
        .await;

        let response = claim(pool.clone(), 742, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that row was created
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 742)
                .await
                .unwrap()
        );
    }

    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_5_with_results"))))]
    async fn test_create_data_entry_uniqueness(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(&mut pool.acquire().await.unwrap(), 9, Some(true))
            .await
            .unwrap();

        // Claim a polling station that had entries/a result in the previous committee session
        let response = claim(pool.clone(), 9, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);

        // Check that a new row was created
        assert!(
            data_entry_repo::data_entry_exists(&mut conn, 9)
                .await
                .unwrap()
        );

        // Check that the new data entry is linked to the new committee session
        let data = query_as!(
            PollingStationDataEntry,
            r#"
            SELECT
                polling_station_id AS "polling_station_id: u32",
                committee_session_id AS "committee_session_id: u32",
                state AS "state: _",
                updated_at AS "updated_at: _"
            FROM polling_station_data_entries
            WHERE polling_station_id = 9
            "#
        )
        .fetch_all(&pool)
        .await
        .expect("No data found");
        assert_eq!(data.len(), 1);
        assert_eq!(data[0].committee_session_id, 6);
    }

    async fn claim_previous_results(
        pool: SqlitePool,
        polling_station_id: u32,
    ) -> Option<CommonPollingStationResults> {
        let response = claim(pool.clone(), polling_station_id, EntryNumber::FirstEntry).await;
        assert_eq!(response.status(), StatusCode::OK);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ClaimDataEntryResponse = serde_json::from_slice(&body).unwrap();
        result.previous_results
    }

    /// No previous results, should return none
    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_none(pool: SqlitePool) {
        // Add new polling station
        insert_test_polling_station(&mut pool.acquire().await.unwrap(), 743, 704, None, 123)
            .await
            .unwrap();

        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(&mut pool.acquire().await.unwrap(), 743, Some(true))
            .await
            .unwrap();

        change_status_committee_session(
            pool.clone(),
            704,
            CommitteeSessionStatus::DataEntryInProgress,
        )
        .await;

        assert!(claim_previous_results(pool.clone(), 743).await.is_none());
    }

    /// Should get result from third session, even though there were also results in the first session
    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results(pool: SqlitePool) {
        // Add investigation with corrected_results to be able to claim the polling station
        insert_test_investigation(&mut pool.acquire().await.unwrap(), 742, Some(true))
            .await
            .unwrap();

        change_status_committee_session(
            pool.clone(),
            704,
            CommitteeSessionStatus::DataEntryInProgress,
        )
        .await;

        let previous_results = claim_previous_results(pool.clone(), 742).await.unwrap();
        // Check by difference in fixture results data
        assert_eq!(previous_results.voters_counts.proxy_certificate_count, 4);
    }
}
