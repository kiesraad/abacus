use std::collections::HashMap;

use sqlx::{Connection, SqliteConnection, query, query_as, types::Json};

use crate::{
    api::data_entry::ElectionStatusResponseEntry,
    domain::{
        committee_session::CommitteeSessionId,
        data_entry::{DataEntryStatus, PollingStationDataEntry},
        polling_station::{PollingStation, PollingStationId},
        results::PollingStationResults,
    },
    repository::{committee_session_repo, polling_station_repo},
};

/// Get the full polling station data entry row for a given polling station
/// id, or return None if there is no linked data entry
async fn get_data_entry_optional(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<Option<PollingStationDataEntry>, sqlx::Error> {
    query_as!(
        PollingStationDataEntry,
        r#"
            SELECT
                de.id AS "id: _",
                de.state AS "state: _",
                de.updated_at AS "updated_at: _"
            FROM polling_stations AS p
            JOIN data_entries AS de ON de.id = p.data_entry_id
            WHERE p.id = ?
        "#,
        polling_station_id,
    )
    .fetch_optional(conn)
    .await
}

/// Get the full polling station data entry row for a given polling station
/// id, or return an error if there is no data
pub async fn get_data_entry(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<PollingStationDataEntry, sqlx::Error> {
    get_data_entry_optional(conn, polling_station_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)
}

/// Get a data entry or return an error if there is no data entry for the
/// given polling station id
pub async fn get(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<DataEntryStatus, sqlx::Error> {
    get_data_entry(conn, polling_station_id)
        .await
        .map(|psde| psde.state.0)
}

/// Get a data entry or return the default data entry state for the given
/// polling station id
pub async fn get_or_default(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<DataEntryStatus, sqlx::Error> {
    Ok(query_as!(
        PollingStationDataEntry,
        r#"
            SELECT
                de.id AS "id: _",
                de.state AS "state: _",
                de.updated_at AS "updated_at: _"
            FROM polling_stations AS p
            JOIN data_entries AS de ON de.id = p.data_entry_id
            WHERE p.id = ?
        "#,
        polling_station_id,
    )
    .fetch_optional(conn)
    .await?
    .map(|psde| psde.state.0)
    .unwrap_or(DataEntryStatus::Empty))
}

/// Updates an existing data entry for a given polling station id.
/// Returns an error if no data entry exists for the polling station.
pub async fn update(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    state: &DataEntryStatus,
) -> Result<PollingStationDataEntry, sqlx::Error> {
    let mut tx = conn.begin().await?;
    let state = Json(state);

    let row = query!(
        r#"SELECT data_entry_id FROM polling_stations WHERE id = ?"#,
        polling_station_id
    )
    .fetch_one(&mut *tx)
    .await?;

    let data_entry_id = row.data_entry_id.ok_or(sqlx::Error::RowNotFound)?;

    let res = query_as!(
        PollingStationDataEntry,
        r#"
            UPDATE data_entries
            SET state = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            RETURNING
                id AS "id: _",
                state AS "state: _",
                updated_at AS "updated_at: _"
        "#,
        state,
        data_entry_id
    )
    .fetch_one(&mut *tx)
    .await;

    tx.commit().await?;
    res
}

/// Create an empty data entry row (not linked to any polling station)
pub async fn create_empty(
    conn: &mut SqliteConnection,
) -> Result<PollingStationDataEntry, sqlx::Error> {
    let state = Json(DataEntryStatus::Empty);

    query_as!(
        PollingStationDataEntry,
        r#"
            INSERT INTO data_entries (state)
            VALUES (?)
            RETURNING
                id AS "id: _",
                state AS "state: _",
                updated_at AS "updated_at: _"
        "#,
        state
    )
    .fetch_one(conn)
    .await
}

pub async fn delete_data_entry(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<Option<PollingStationDataEntry>, sqlx::Error> {
    let mut tx = conn.begin().await?;

    // Get data_entry_id from polling station
    let row = query!(
        r#"SELECT data_entry_id FROM polling_stations WHERE id = ?"#,
        polling_station_id
    )
    .fetch_one(&mut *tx)
    .await?;

    let Some(data_entry_id) = row.data_entry_id else {
        tx.commit().await?;
        return Ok(None);
    };

    // Unlink from polling station
    query!(
        "UPDATE polling_stations SET data_entry_id = NULL WHERE id = ?",
        polling_station_id
    )
    .execute(&mut *tx)
    .await?;

    // Delete the data entry
    let res = query_as!(
        PollingStationDataEntry,
        r#"
            DELETE FROM data_entries
            WHERE id = ?
            RETURNING
                id AS "id: _",
                state AS "state: _",
                updated_at AS "updated_at: _"
        "#,
        data_entry_id,
    )
    .fetch_optional(&mut *tx)
    .await?;

    tx.commit().await?;
    Ok(res)
}

/// Get the status for each polling station data entry in a committee session
pub async fn statuses(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<ElectionStatusResponseEntry>, sqlx::Error> {
    // If this is not the first committee session, we only want to include
    // polling stations with corrected results in this committee session
    query!(
        r#"
            SELECT
                p.id AS "polling_station_id: PollingStationId",
                de.state AS "state: Json<DataEntryStatus>"
            FROM polling_stations AS p
            LEFT JOIN committee_sessions AS c ON c.id = p.committee_session_id
            LEFT JOIN data_entries AS de ON de.id = p.data_entry_id
            WHERE c.id = $1 AND (c.number = 1 OR json_extract(p.investigation_state, '$.status') = 'ConcludedWithNewResults')
        "#,
        committee_session_id
    )
    .map(|status| {
        let state = status.state.unwrap_or_default();
        ElectionStatusResponseEntry {
            polling_station_id: status.polling_station_id,
            status: state.status_name(),
            first_entry_user_id: state.get_first_entry_user_id(),
            second_entry_user_id: state.get_second_entry_user_id(),
            first_entry_progress: state.get_first_entry_progress(),
            second_entry_progress: state.get_second_entry_progress(),
            finished_at: state.finished_at().cloned(),
            finalised_with_warnings: state.finalised_with_warnings().cloned(),
        }
    })
    .fetch_all(conn)
    .await
}

/// Check if a polling station has a data entry
pub async fn data_entry_exists(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<bool, sqlx::Error> {
    let res = query!(
        r#"
        SELECT data_entry_id IS NOT NULL AS `exists`
        FROM polling_stations
        WHERE id = ?"#,
        polling_station_id
    )
    .fetch_one(conn)
    .await?;
    Ok(res.exists == 1)
}

/// Returns if a committee session has any data entries
pub async fn has_any(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<bool, sqlx::Error> {
    let result = query!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM polling_stations as ps
            INNER JOIN data_entries AS de ON de.id = ps.data_entry_id
            WHERE committee_session_id = $1
        ) as `exists`"#,
        committee_session_id
    )
    .fetch_one(conn)
    .await?;

    Ok(result.exists == 1)
}

#[cfg(test)]
pub async fn get_data_entries(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<Vec<PollingStationDataEntry>, sqlx::Error> {
    query_as!(
        PollingStationDataEntry,
        r#"
            SELECT
                de.id AS "id: _",
                de.state AS "state: _",
                de.updated_at AS "updated_at: _"
            FROM polling_stations AS p
            JOIN data_entries AS de ON de.id = p.data_entry_id
            WHERE p.id = ?
            "#,
        polling_station_id,
    )
    .fetch_all(conn)
    .await
}

async fn fetch_results_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
    polling_station_id: Option<PollingStationId>,
) -> Result<Vec<(PollingStation, PollingStationResults)>, sqlx::Error> {
    let mut tx = conn.begin().await?;

    // Get and index polling stations by id for performance
    let polling_stations: HashMap<PollingStationId, PollingStation> =
        polling_station_repo::list_polling_stations(&mut tx, committee_session_id)
            .await?
            .into_iter()
            .filter(|ps| polling_station_id.is_none_or(|id| ps.id == id))
            .map(|ps| (ps.id, ps))
            .collect();

    // Query to find the most recent results for each polling station.
    // For each PS, it checks:
    // 1. If the PS has its own Definitive data entry, use that
    // 2. If there's no investigation requiring corrected results, use the previous data entry
    //    (pointed to by prev_data_entry_id, which already skips intermediate sessions without results)
    // 3. Otherwise, NULL (results are expected but not yet available)
    let results = query!(
        r#"
        WITH results AS (
            SELECT ps.id AS original_id,
                   CASE
                       WHEN json_extract(de.state, '$.status') = 'Definitive'
                           THEN json_extract(de.state, '$.state.results')
                       WHEN json_extract(ps.investigation_state, '$.status') IS NOT 'ConcludedWithNewResults'
                           AND json_extract(prev_de.state, '$.status') = 'Definitive'
                           THEN json_extract(prev_de.state, '$.state.results')
                       ELSE NULL
                   END AS data
            FROM polling_stations AS ps
            LEFT JOIN data_entries AS de ON de.id = ps.data_entry_id
            LEFT JOIN data_entries AS prev_de ON prev_de.id = ps.prev_data_entry_id
            WHERE ps.committee_session_id = $1 AND ($2 IS NULL OR ps.id = $2)
        )
        SELECT
            original_id AS "original_id!: PollingStationId",
            data AS "data: Json<PollingStationResults>"
        FROM results
        WHERE data IS NOT NULL
        "#,
        committee_session_id,
        polling_station_id,
    )
    .try_map(|row| {
        let data = row.data.ok_or(sqlx::Error::RowNotFound)?;
        polling_stations
            .get(&row.original_id)
            .cloned()
            .map(|ps| (ps, data.0))
            .ok_or(sqlx::Error::RowNotFound)
    })
    .fetch_all(&mut *tx)
    .await?;
    tx.commit().await?;

    if results.len() != polling_stations.len() {
        Err(sqlx::Error::RowNotFound)
    } else {
        Ok(results)
    }
}

/// Get a list of polling stations with their results for a committee session
pub async fn list_results_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<(PollingStation, PollingStationResults)>, sqlx::Error> {
    fetch_results_for_committee_session(conn, committee_session_id, None).await
}

/// Given a polling station id, find the previous results for that polling station.
/// Directly queries the data entry pointed to by prev_data_entry_id.
pub async fn previous_results_for_polling_station(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<PollingStationResults, sqlx::Error> {
    let polling_station = polling_station_repo::get(conn, polling_station_id).await?;
    let prev_data_entry_id = polling_station
        .prev_data_entry_id()
        .ok_or(sqlx::Error::RowNotFound)?;

    let row = query!(
        r#"
        SELECT json_extract(de.state, '$.state.results') AS "data: Json<PollingStationResults>"
        FROM data_entries AS de
        WHERE de.id = $1 AND json_extract(de.state, '$.status') = 'Definitive'
        "#,
        prev_data_entry_id,
    )
    .fetch_one(conn)
    .await?;

    row.data.map(|d| d.0).ok_or(sqlx::Error::RowNotFound)
}

/// Checks if results are complete for a committee session by verifying that
/// - For first committee session: all new polling stations must have results
/// - For subsequent committee sessions: all new polling stations and all investigated
///   polling stations with corrected results must have results
pub async fn are_results_complete_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<bool, sqlx::Error> {
    let mut tx = conn.begin().await?;

    let committee_session = committee_session_repo::get(&mut tx, committee_session_id).await?;

    // Check that all new polling stations have definitive results (embedded in data_entries state)
    let all_new_ps_have_data = query!(
        r#"
        SELECT COUNT(*) = 0 as "result: bool"
        FROM polling_stations AS ps
        LEFT JOIN data_entries AS de ON de.id = ps.data_entry_id
        WHERE ps.committee_session_id = ?
          AND ps.prev_data_entry_id IS NULL
          AND (de.state IS NULL OR json_extract(de.state, '$.status') != 'Definitive')
        "#,
        committee_session_id
    )
    .fetch_one(&mut *tx)
    .await?
    .result;

    if !all_new_ps_have_data || !committee_session.is_next_session() {
        tx.commit().await?;
        return Ok(all_new_ps_have_data);
    }

    // Validate that all investigations are finished and have definitive results
    // if corrected_results is true
    let all_investigations_finished = query!(
        r#"
        SELECT COUNT(*) = 0 as "result: bool"
        FROM polling_stations AS ps
        LEFT JOIN data_entries AS de ON de.id = ps.data_entry_id
        WHERE ps.committee_session_id = ?
        AND ps.investigation_state IS NOT NULL
        AND (json_extract(ps.investigation_state, '$.status') = 'InProgress'
             OR (json_extract(ps.investigation_state, '$.status') = 'ConcludedWithNewResults'
                 AND (de.state IS NULL OR json_extract(de.state, '$.status') != 'Definitive')))
        "#,
        committee_session_id
    )
    .fetch_one(&mut *tx)
    .await?
    .result;

    tx.commit().await?;

    Ok(all_new_ps_have_data && all_investigations_finished)
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::domain::{
        results::{
            cso_first_session_results::CSOFirstSessionResults,
            differences_counts::DifferencesCounts, voters_counts::VotersCounts,
            votes_counts::VotesCounts,
        },
        valid_default::ValidDefault,
    };

    fn create_test_results(proxy_certificate_count: u32) -> PollingStationResults {
        PollingStationResults::CSOFirstSession(CSOFirstSessionResults {
            extra_investigation: ValidDefault::valid_default(),
            counting_differences_polling_station: ValidDefault::valid_default(),
            voters_counts: {
                VotersCounts {
                    poll_card_count: 100,
                    proxy_certificate_count,
                    total_admitted_voters_count: 100 + proxy_certificate_count,
                }
            },
            votes_counts: VotesCounts::default(),
            differences_counts: DifferencesCounts::default(),
            political_group_votes: vec![],
        })
    }

    mod list_results_for_committee_session {
        use sqlx::SqlitePool;
        use test_log::test;

        use super::*;
        use crate::{
            domain::data_entry,
            repository::{polling_station_repo::insert_test_polling_station, user_repo::UserId},
            service::{create_definitive_data_entry, create_test_investigation},
        };

        /// Test with first session, 2 polling stations with results
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_complete_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(2);

            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(1),
                &create_test_results(10),
            )
            .await
            .unwrap();
            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(2),
                &create_test_results(20),
            )
            .await
            .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 2);

            assert_eq!(results[0].0.id, PollingStationId::from(1));
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 10);

            assert_eq!(results[1].0.id, PollingStationId::from(2));
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 20);
        }

        /// Test with first session, 2 polling stations, only one with results (error)
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_incomplete_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(2);

            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(1),
                &create_test_results(10),
            )
            .await
            .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, one polling station with investigation, but no corrected results
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_one_investigation_no_corrected_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);

            create_test_investigation(&mut conn, PollingStationId::from(741), Some(false))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 2);

            assert_eq!(results[0].0.id, PollingStationId::from(741));
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 3);

            assert_eq!(results[1].0.id, PollingStationId::from(742));
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 4);
        }

        /// Test with 4th session, one polling station with investigation, corrected results=true and results exist
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_one_investigation_with_corrected_results_complete(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);
            let polling_station_id = PollingStationId::from(741);

            create_test_investigation(&mut conn, polling_station_id, Some(true))
                .await
                .unwrap();

            create_definitive_data_entry(&mut conn, polling_station_id, &create_test_results(10))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 2);

            assert_eq!(results[0].0.id, polling_station_id);
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 10);

            assert_eq!(results[1].0.id, PollingStationId::from(742));
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 4);
        }

        /// Test with 4th session, one polling station with investigation, corrected results=true and results don't exist (error)
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_one_investigation_with_corrected_results_incomplete(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);

            create_test_investigation(&mut conn, PollingStationId::from(741), Some(true))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, new polling station with no investigation (error)
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);
            let new_polling_station_id = PollingStationId::from(743);

            insert_test_polling_station(
                &mut conn,
                new_polling_station_id,
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, new polling station with investigation, but no corrected results (error)
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_investigation_no_corrected_results(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);
            let new_polling_station_id = PollingStationId::from(743);

            insert_test_polling_station(
                &mut conn,
                new_polling_station_id,
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();

            create_test_investigation(&mut conn, new_polling_station_id, Some(false))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, new polling station with investigation, corrected results=true and results exist
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_investigation_with_corrected_results_complete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);
            let new_polling_station_id = PollingStationId::from(743);

            insert_test_polling_station(
                &mut conn,
                new_polling_station_id,
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();

            create_test_investigation(&mut conn, new_polling_station_id, Some(true))
                .await
                .unwrap();

            create_definitive_data_entry(
                &mut conn,
                new_polling_station_id,
                &create_test_results(10),
            )
            .await
            .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 3);

            assert_eq!(results[0].0.id, PollingStationId::from(741));
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 3);

            assert_eq!(results[1].0.id, PollingStationId::from(742));
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 4);

            assert_eq!(results[2].0.id, PollingStationId::from(743));
            assert_eq!(results[2].1.voters_counts().proxy_certificate_count, 10);
        }

        /// Test with 4th session, new polling station with investigation, corrected results=true and results don't exist (error)
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_investigation_with_corrected_results_incomplete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);
            let new_polling_station_id = PollingStationId::from(743);

            insert_test_polling_station(
                &mut conn,
                new_polling_station_id,
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();

            create_test_investigation(&mut conn, new_polling_station_id, Some(true))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, new polling station with investigation, corrected results=true and results exist in 3rd session
        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_prev_session_investigation_with_corrected_results_complete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);

            // Add polling station, investigation and results to third session
            insert_test_polling_station(
                &mut conn,
                PollingStationId::from(733),
                CommitteeSessionId::from(703),
                None,
                123,
            )
            .await
            .unwrap();

            create_test_investigation(&mut conn, PollingStationId::from(733), Some(true))
                .await
                .unwrap();

            let state = DataEntryStatus::Definitive(data_entry::Definitive {
                first_entry_user_id: UserId::from(5),
                second_entry_user_id: UserId::from(6),
                finished_at: chrono::Utc::now(),
                finalised_with_warnings: false,
                results: create_test_results(10),
            });
            update(&mut conn, PollingStationId::from(733), &state)
                .await
                .unwrap();

            // Add new polling station to fourth session, linked to the data entry from third session, but without investigation or results
            let prev_data_entry = get_data_entry(&mut conn, PollingStationId::from(733))
                .await
                .unwrap();
            insert_test_polling_station(
                &mut conn,
                PollingStationId::from(743),
                CommitteeSessionId::from(704),
                Some(prev_data_entry.id),
                123,
            )
            .await
            .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 3);

            assert_eq!(results[0].0.id, PollingStationId::from(741));
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 3);

            assert_eq!(results[1].0.id, PollingStationId::from(742));
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 4);

            assert_eq!(results[2].0.id, PollingStationId::from(743));
            assert_eq!(results[2].1.voters_counts().proxy_certificate_count, 10);
        }
    }

    mod are_results_complete_for_committee_session {
        use sqlx::{SqliteConnection, SqlitePool};
        use test_log::test;

        use super::*;
        use crate::{
            domain::investigation::InvestigationStatus,
            repository::{investigation_repo, polling_station_repo::insert_test_polling_station},
            service::{create_definitive_data_entry, create_empty_data_entry},
        };

        async fn create_test_investigation(
            conn: &mut SqliteConnection,
            polling_station_id: PollingStationId,
        ) {
            let status = InvestigationStatus::new("Test investigation reason".to_string());
            investigation_repo::create(conn, polling_station_id, &status)
                .await
                .unwrap();
        }

        async fn conclude_test_investigation(
            conn: &mut SqliteConnection,
            polling_station_id: PollingStationId,
            corrected_results: bool,
        ) {
            let current = investigation_repo::get(conn, polling_station_id)
                .await
                .unwrap()
                .expect("investigation should exist");

            let status = if corrected_results {
                let ps = create_empty_data_entry(conn, polling_station_id)
                    .await
                    .unwrap();
                let data_entry_id = ps.data_entry_id().expect("should have data_entry_id");
                current
                    .conclude_with_new_results("Test findings".to_string(), data_entry_id)
                    .expect("conclude_with_new_results should succeed")
            } else {
                current
                    .conclude_without_new_results("Test findings".to_string(), false)
                    .expect("conclude_without_new_results should succeed")
            };
            investigation_repo::save(conn, polling_station_id, &status)
                .await
                .unwrap();
        }

        async fn insert_test_polling_station_results(
            conn: &mut SqliteConnection,
            polling_station_id: PollingStationId,
        ) {
            create_definitive_data_entry(conn, polling_station_id, &create_test_results(10))
                .await
                .unwrap();
        }

        /// Test first session without results
        #[test(sqlx::test(fixtures("../../fixtures/election_2.sql")))]
        async fn test_first_session_without_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            assert!(
                !are_results_complete_for_committee_session(&mut conn, CommitteeSessionId::from(2))
                    .await
                    .unwrap()
            );
        }

        /// Test first session without results on one polling station
        #[test(sqlx::test(fixtures("../../fixtures/election_2.sql")))]
        async fn test_first_session_without_results_on_one_polling_station(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(1),
                &create_test_results(10),
            )
            .await
            .unwrap();

            assert!(
                !are_results_complete_for_committee_session(&mut conn, CommitteeSessionId::from(2))
                    .await
                    .unwrap()
            );
        }

        /// Test first session with results
        #[test(sqlx::test(fixtures("../../fixtures/election_2.sql")))]
        async fn test_first_session_with_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(1),
                &create_test_results(10),
            )
            .await
            .unwrap();
            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(2),
                &create_test_results(10),
            )
            .await
            .unwrap();

            assert!(
                are_results_complete_for_committee_session(&mut conn, CommitteeSessionId::from(2))
                    .await
                    .unwrap()
            );
        }

        /// Test next session with new polling station, without results
        #[test(sqlx::test(fixtures("../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_polling_station_without_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            insert_test_polling_station(
                &mut conn,
                PollingStationId::from(743),
                CommitteeSessionId::from(704),
                None,
                123,
            )
            .await
            .unwrap();

            assert!(
                !are_results_complete_for_committee_session(
                    &mut conn,
                    CommitteeSessionId::from(704)
                )
                .await
                .unwrap()
            );
        }

        /// Test next session with new polling station, with results
        #[test(sqlx::test(fixtures("../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_polling_station_with_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(704);

            insert_test_polling_station(
                &mut conn,
                PollingStationId::from(743),
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();
            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(743),
                &create_test_results(10),
            )
            .await
            .unwrap();

            assert!(
                are_results_complete_for_committee_session(&mut conn, committee_session_id)
                    .await
                    .unwrap()
            );
        }

        /// Test next session without investigations or new polling stations
        #[test(sqlx::test(fixtures("../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_no_investigations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            assert!(
                are_results_complete_for_committee_session(
                    &mut conn,
                    CommitteeSessionId::from(704)
                )
                .await
                .unwrap()
            );
        }

        /// Test next session with new investigation, not concluded
        #[test(sqlx::test(fixtures("../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigation_not_concluded(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            create_test_investigation(&mut conn, PollingStationId::from(741)).await;

            assert!(
                !are_results_complete_for_committee_session(
                    &mut conn,
                    CommitteeSessionId::from(704)
                )
                .await
                .unwrap()
            );
        }

        /// Test next session with new investigation, concluded with corrected_results = false
        #[test(sqlx::test(fixtures("../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigation_corrected_results_false(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();

            create_test_investigation(&mut conn, PollingStationId::from(741)).await;
            conclude_test_investigation(&mut conn, PollingStationId::from(741), false).await;

            assert!(
                are_results_complete_for_committee_session(
                    &mut conn,
                    CommitteeSessionId::from(704)
                )
                .await
                .unwrap()
            );
        }

        /// Test next session with new investigation, concluded with corrected_results = true, results exist
        #[test(sqlx::test(fixtures("../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigation_corrected_results_true_and_complete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let polling_station_id = PollingStationId::from(741);

            create_test_investigation(&mut conn, polling_station_id).await;
            conclude_test_investigation(&mut conn, polling_station_id, true).await;
            insert_test_polling_station_results(&mut conn, polling_station_id).await;

            assert!(
                are_results_complete_for_committee_session(
                    &mut conn,
                    CommitteeSessionId::from(704)
                )
                .await
                .unwrap()
            );
        }

        /// Test next session with new investigation, concluded with corrected_results = true, results don't exist
        #[test(sqlx::test(fixtures("../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigation_corrected_results_true_and_incomplete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let polling_station_id = PollingStationId::from(741);

            create_test_investigation(&mut conn, polling_station_id).await;
            conclude_test_investigation(&mut conn, polling_station_id, true).await;

            assert!(
                !are_results_complete_for_committee_session(
                    &mut conn,
                    CommitteeSessionId::from(704)
                )
                .await
                .unwrap()
            );
        }

        /// Test with multiple investigations, one not finished
        #[test(sqlx::test(fixtures("../../fixtures/election_7_four_sessions.sql")))]
        async fn test_next_session_new_investigations_one_not_finished(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let first_polling_station_id = PollingStationId::from(741);
            let second_polling_station_id = PollingStationId::from(742);

            // Create first investigation with corrected_results = false (finished)
            create_test_investigation(&mut conn, first_polling_station_id).await;
            conclude_test_investigation(&mut conn, first_polling_station_id, false).await;

            // Create second investigation with corrected_results = true but no result (not finished)
            create_test_investigation(&mut conn, second_polling_station_id).await;
            conclude_test_investigation(&mut conn, second_polling_station_id, true).await;

            assert!(
                !are_results_complete_for_committee_session(
                    &mut conn,
                    CommitteeSessionId::from(704)
                )
                .await
                .unwrap()
            );
        }
    }

    /// Test previous_results_for_polling_station with 4th session, existing polling station
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_for_polling_station(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = PollingStationId::from(742);

        let results = previous_results_for_polling_station(&mut conn, polling_station_id).await;
        assert!(results.is_ok());

        let results = results.unwrap();
        assert_eq!(results.voters_counts().proxy_certificate_count, 4);
    }

    /// Test previous_results_for_polling_station with 4th session, non-existing polling station
    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_for_polling_station_non_existing(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = PollingStationId::from(743);

        let results = previous_results_for_polling_station(&mut conn, polling_station_id).await;
        assert!(results.is_err());
        assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
    }
}
