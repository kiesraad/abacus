use sqlx::{Connection, SqliteConnection, query, types::Json};

use crate::{
    APIError,
    api::election::committee_session::CommitteeSessionError,
    domain::{
        committee_session::CommitteeSession,
        committee_session_status::{CommitteeSessionStatus, change_committee_session_status},
        data_entry_status::DataEntryStatus,
        election::ElectionWithPoliticalGroups,
        polling_station::PollingStation,
        polling_station_results::PollingStationResults,
    },
    error::ErrorReference,
    infra::{
        audit_log::{AuditEvent, AuditService},
        authentication::{Role, User, error::AuthenticationError},
    },
    repository::{
        committee_session_repo, data_entry_repo, election_repo,
        investigation_repo::get_polling_station_investigation, polling_station_repo,
        polling_station_result_repo,
    },
};

pub async fn make_definitive(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    committee_session_id: u32,
    new_state: &DataEntryStatus,
    definitive_entry: &PollingStationResults,
) -> Result<(), sqlx::Error> {
    let mut tx = conn.begin().await?;

    let definitive_entry = Json(definitive_entry);
    query!(
        "INSERT INTO polling_station_results (polling_station_id, committee_session_id, data) VALUES ($1, $2, $3)",
        polling_station_id,
        committee_session_id,
        definitive_entry,
    )
        .execute(&mut *tx)
        .await?;

    let new_state = Json(new_state);
    query!(
        r#"
            INSERT INTO polling_station_data_entries (polling_station_id, committee_session_id, state)
            VALUES (?, ?, ?)
            ON CONFLICT(polling_station_id, committee_session_id) DO
            UPDATE SET
                state = excluded.state,
                updated_at = CURRENT_TIMESTAMP
        "#,
        polling_station_id,
        committee_session_id,
        new_state
    )
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(())
}

pub async fn delete_data_entry_and_result_for_polling_station(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: &CommitteeSession,
    polling_station_id: u32,
) -> Result<(), APIError> {
    if let Some(data_entry) = data_entry_repo::delete_data_entry(conn, polling_station_id).await? {
        audit_service
            .log(conn, &AuditEvent::DataEntryDeleted(data_entry.into()), None)
            .await?;
    }
    if let Some(result) =
        polling_station_result_repo::delete_result(conn, polling_station_id).await?
    {
        audit_service
            .log(conn, &AuditEvent::ResultDeleted(result.into()), None)
            .await?;
        if committee_session.status == CommitteeSessionStatus::DataEntryFinished {
            change_committee_session_status(
                conn,
                committee_session.id,
                CommitteeSessionStatus::DataEntryInProgress,
                audit_service.clone(),
            )
            .await?;
        }
    }
    Ok(())
}

/// Checks if results are complete for a committee session by verifying that
/// - For first committee session: all new polling stations must have results
/// - For subsequent committee sessions: all new polling stations and all investigated
///   polling stations with corrected results must have results
pub async fn are_results_complete_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
) -> Result<bool, sqlx::Error> {
    let mut tx = conn.begin().await?;

    let committee_session = committee_session_repo::get(&mut tx, committee_session_id).await?;

    let all_new_ps_have_data = query!(
        r#"
        SELECT COUNT(*) = 0 as "result: bool"
        FROM polling_stations AS ps
        LEFT JOIN polling_station_results AS r ON r.polling_station_id = ps.id
        WHERE ps.committee_session_id = ? AND ps.id_prev_session IS NULL AND r.data IS NULL
        "#,
        committee_session_id
    )
    .fetch_one(&mut *tx)
    .await?
    .result;

    if !committee_session.is_next_session() {
        tx.commit().await?;
        return Ok(all_new_ps_have_data);
    }

    // Validate that all investigations are finished and have results
    // if corrected_results is true
    let all_investigations_finished = query!(
        r#"
        SELECT COUNT(*) = 0 as "result: bool"
        FROM polling_station_investigations AS psi
        JOIN polling_stations AS ps ON ps.id = psi.polling_station_id
        LEFT JOIN polling_station_results AS r ON psi.polling_station_id = r.polling_station_id
        WHERE ps.committee_session_id = ?
        AND (psi.corrected_results IS NULL OR (psi.corrected_results = 1 AND r.data IS NULL))
        "#,
        committee_session_id
    )
    .fetch_one(&mut *tx)
    .await?
    .result;

    tx.commit().await?;

    Ok(all_new_ps_have_data && all_investigations_finished)
}

pub async fn validate_and_get_data(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    user: &User,
) -> Result<
    (
        PollingStation,
        ElectionWithPoliticalGroups,
        CommitteeSession,
        DataEntryStatus,
    ),
    APIError,
> {
    let polling_station = polling_station_repo::get(conn, polling_station_id).await?;
    let committee_session =
        committee_session_repo::get(conn, polling_station.committee_session_id).await?;
    let election = election_repo::get(conn, committee_session.election_id).await?;

    let data_entry_status =
        data_entry_repo::get_or_default(conn, polling_station_id, committee_session.id).await?;

    // Validate polling station
    if committee_session.is_next_session() {
        match get_polling_station_investigation(conn, polling_station.id).await {
            Ok(investigation) if investigation.corrected_results == Some(true) => {}
            _ => {
                return Err(APIError::Conflict(
                    "Data entry not allowed, no investigation with corrected results.".to_string(),
                    ErrorReference::DataEntryNotAllowed,
                ));
            }
        }
    }

    // Validate state based on user role
    match user.role() {
        Role::Typist => {
            if committee_session.status == CommitteeSessionStatus::DataEntryPaused {
                return Err(CommitteeSessionError::CommitteeSessionPaused.into());
            } else if committee_session.status != CommitteeSessionStatus::DataEntryInProgress {
                return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
            }
        }
        Role::Coordinator => {
            if committee_session.status != CommitteeSessionStatus::DataEntryInProgress
                && committee_session.status != CommitteeSessionStatus::DataEntryPaused
            {
                return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
            }
        }
        _ => {
            return Err(AuthenticationError::Forbidden.into());
        }
    }

    Ok((
        polling_station,
        election,
        committee_session,
        data_entry_status,
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    mod are_results_complete_for_committee_session {
        use sqlx::{SqliteConnection, SqlitePool};
        use test_log::test;

        use super::*;
        use crate::{
            domain::investigation::{
                PollingStationInvestigationConcludeRequest,
                PollingStationInvestigationCreateRequest,
            },
            repository::{
                investigation_repo::{
                    conclude_polling_station_investigation, create_polling_station_investigation,
                },
                polling_station_repo::insert_test_polling_station,
                polling_station_result_repo::{insert_test_result, tests::create_test_results},
            },
        };

        async fn create_test_investigation(conn: &mut SqliteConnection, polling_station_id: u32) {
            create_polling_station_investigation(
                conn,
                polling_station_id,
                PollingStationInvestigationCreateRequest {
                    reason: "Test investigation reason".to_string(),
                },
            )
            .await
            .unwrap();
        }

        async fn conclude_test_investigation(
            conn: &mut SqliteConnection,
            polling_station_id: u32,
            corrected_results: bool,
        ) {
            conclude_polling_station_investigation(
                conn,
                polling_station_id,
                PollingStationInvestigationConcludeRequest {
                    findings: "Test findings".to_string(),
                    corrected_results,
                },
            )
            .await
            .unwrap();
        }

        async fn insert_test_polling_station_results(
            conn: &mut SqliteConnection,
            polling_station_id: u32,
        ) {
            insert_test_result(conn, polling_station_id, 704, &create_test_results(10))
                .await
                .unwrap();
        }

        /// Test first session without results
        #[test(sqlx::test(fixtures("../../../fixtures/election_2.sql")))]
        async fn test_first_session_without_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            assert!(
                !are_results_complete_for_committee_session(&mut conn, 2)
                    .await
                    .unwrap()
            );
        }

        /// Test first session without results on one polling station
        #[test(sqlx::test(fixtures("../../../fixtures/election_2.sql")))]
        async fn test_first_session_without_results_on_one_polling_station(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            insert_test_result(&mut conn, 1, 2, &create_test_results(10))
                .await
                .unwrap();

            assert!(
                !are_results_complete_for_committee_session(&mut conn, 2)
                    .await
                    .unwrap()
            );
        }

        /// Test first session with results
        #[test(sqlx::test(fixtures("../../../fixtures/election_2.sql")))]
        async fn test_first_session_with_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            insert_test_result(&mut conn, 1, 2, &create_test_results(10))
                .await
                .unwrap();
            insert_test_result(&mut conn, 2, 2, &create_test_results(10))
                .await
                .unwrap();

            assert!(
                are_results_complete_for_committee_session(&mut conn, 2)
                    .await
                    .unwrap()
            );
        }

        /// Test next session with new polling station, without results
        #[test(sqlx::test(fixtures("../../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_polling_station_without_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            insert_test_polling_station(&mut conn, 743, 704, None, 123)
                .await
                .unwrap();

            assert!(
                !are_results_complete_for_committee_session(&mut conn, 704)
                    .await
                    .unwrap()
            );
        }

        /// Test next session with new polling station, with results
        #[test(sqlx::test(fixtures("../../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_polling_station_with_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            insert_test_polling_station(&mut conn, 743, 704, None, 123)
                .await
                .unwrap();
            insert_test_result(&mut conn, 743, 704, &create_test_results(10))
                .await
                .unwrap();

            assert!(
                are_results_complete_for_committee_session(&mut conn, 704)
                    .await
                    .unwrap()
            );
        }

        /// Test next session without investigations or new polling stations
        #[test(sqlx::test(fixtures("../../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_no_investigations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            assert!(
                are_results_complete_for_committee_session(&mut conn, 704)
                    .await
                    .unwrap()
            );
        }

        /// Test next session with new investigation, not concluded
        #[test(sqlx::test(fixtures("../../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigation_not_concluded(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            create_test_investigation(&mut conn, 741).await;

            assert!(
                !are_results_complete_for_committee_session(&mut conn, 704)
                    .await
                    .unwrap()
            );
        }

        /// Test next session with new investigation, concluded with corrected_results = false
        #[test(sqlx::test(fixtures("../../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigation_corrected_results_false(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            create_test_investigation(&mut conn, 741).await;
            conclude_test_investigation(&mut conn, 741, false).await;

            assert!(
                are_results_complete_for_committee_session(&mut conn, 704)
                    .await
                    .unwrap()
            );
        }

        /// Test next session with new investigation, concluded with corrected_results = true, results exist
        #[test(sqlx::test(fixtures("../../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigation_corrected_results_true_and_complete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();

            create_test_investigation(&mut conn, 741).await;
            conclude_test_investigation(&mut conn, 741, true).await;
            insert_test_polling_station_results(&mut conn, 741).await;

            assert!(
                are_results_complete_for_committee_session(&mut conn, 704)
                    .await
                    .unwrap()
            );
        }

        /// Test next session with new investigation, concluded with corrected_results = true, results don't exist
        #[test(sqlx::test(fixtures("../../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigation_corrected_results_true_and_incomplete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();

            create_test_investigation(&mut conn, 741).await;
            conclude_test_investigation(&mut conn, 741, true).await;

            assert!(
                !are_results_complete_for_committee_session(&mut conn, 704)
                    .await
                    .unwrap()
            );
        }

        /// Test with multiple investigations, one not finished
        #[test(sqlx::test(fixtures("../../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigations_one_not_finished(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            // Create first investigation with corrected_results = false (finished)
            create_test_investigation(&mut conn, 741).await;
            conclude_test_investigation(&mut conn, 741, false).await;

            // Create second investigation with corrected_results = true but no result (not finished)
            create_test_investigation(&mut conn, 742).await;
            conclude_test_investigation(&mut conn, 742, true).await;

            assert!(
                !are_results_complete_for_committee_session(&mut conn, 704)
                    .await
                    .unwrap()
            );
        }
    }
}
