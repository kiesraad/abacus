use std::collections::HashMap;

use sqlx::{Connection, SqliteConnection, query, query_as, types::Json};

use crate::{
    data_entry::domain::{
        polling_station_result::PollingStationResult,
        polling_station_results::PollingStationResults,
    },
    polling_station,
    polling_station::PollingStation,
};

/// Get the full polling station result row for a given polling station
/// id, or return an error if there is no data
pub async fn get_result(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    committee_session_id: u32,
) -> Result<PollingStationResult, sqlx::Error> {
    query_as!(
        PollingStationResult,
        r#"
            SELECT
                polling_station_id AS "polling_station_id: u32",
                committee_session_id AS "committee_session_id: u32",
                data AS "data: _",
                created_at AS "created_at: _"
            FROM polling_station_results
            WHERE polling_station_id = ? AND committee_session_id = ?
        "#,
        polling_station_id,
        committee_session_id
    )
    .fetch_one(conn)
    .await
}

pub async fn delete_result(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
) -> Result<Option<PollingStationResult>, sqlx::Error> {
    query_as!(
        PollingStationResult,
        r#"
            DELETE FROM polling_station_results
            WHERE polling_station_id = ?
            RETURNING
                polling_station_id AS "polling_station_id: u32",
                committee_session_id AS "committee_session_id: u32",
                data AS "data: _",
                created_at AS "created_at: _"
        "#,
        polling_station_id,
    )
    .fetch_optional(conn)
    .await
}

/// Check if a polling station has a result
pub async fn result_exists(conn: &mut SqliteConnection, id: u32) -> Result<bool, sqlx::Error> {
    let res = query!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM polling_station_results
            WHERE polling_station_id = ?)
        AS `exists`"#,
        id
    )
    .fetch_one(conn)
    .await?;
    Ok(res.exists == 1)
}

async fn fetch_results_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
    polling_station_id: Option<u32>,
) -> Result<Vec<(PollingStation, PollingStationResults)>, sqlx::Error> {
    let mut tx = conn.begin().await?;

    // Get and index polling stations by id for performance
    let polling_stations: HashMap<u32, _> = polling_station::list(&mut tx, committee_session_id)
        .await?
        .into_iter()
        .filter(|ps| polling_station_id.is_none_or(|id| ps.id == id))
        .map(|ps| (ps.id, ps))
        .collect();

    // This is a recursive Common Table Expression (CTE)
    // It traverses polling stations through previous committee sessions to find the most recent results
    // while respecting investigations that require corrected results. It starts looking from the given
    // committee session.
    //
    // A recursive CTE consists of two parts, the initial query and the recursive query.
    // The initial query fetches the polling stations from the given committee session and any results
    // based on the same conditions as the recursive query.
    // The recursive query traverses previous committee sessions for each polling stations without results until:
    // - Results are found
    // - Or results are expected due to an investigation requiring corrected results
    // Finally we select all the rows that have results, ensuring we get the most recent results
    //
    // This function returns the original polling station id and the found results. When no results are found,
    // an error is thrown.
    let results = query!(
        r#"
        WITH RECURSIVE polling_stations_chain(original_id, id, id_prev_session, data, investigation) AS (
            SELECT ps.id AS original_id, ps.id, ps.id_prev_session, r.data, psi.polling_station_id
            FROM polling_stations AS ps
            LEFT JOIN polling_station_results AS r ON r.polling_station_id = ps.id
            LEFT JOIN polling_station_investigations AS psi ON psi.polling_station_id = ps.id AND psi.corrected_results = 1
            WHERE ps.committee_session_id = $1 AND ($2 IS NULL OR ps.id = $2)

            UNION ALL

            SELECT sc.original_id, ps.id, ps.id_prev_session, r.data, psi.polling_station_id
            FROM polling_stations_chain AS sc
            JOIN polling_stations AS ps ON ps.id = sc.id_prev_session
            LEFT JOIN polling_station_results AS r ON r.polling_station_id = ps.id
            LEFT JOIN polling_station_investigations AS psi ON psi.polling_station_id = ps.id AND psi.corrected_results = 1
            WHERE sc.data IS NULL AND sc.investigation IS NULL
        )
        SELECT
            sc.original_id AS "original_id!: u32",
            sc.data AS "data: Json<PollingStationResults>"
        FROM polling_stations_chain AS sc
        WHERE sc.data IS NOT NULL
        "#,
        committee_session_id,
        polling_station_id,
    )
        .try_map(|row| {
            polling_stations
                .get(&row.original_id)
                .cloned()
                .map(|ps| (ps, row.data.0))
                .ok_or_else(|| sqlx::Error::RowNotFound)
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
    committee_session_id: u32,
) -> Result<Vec<(PollingStation, PollingStationResults)>, sqlx::Error> {
    fetch_results_for_committee_session(conn, committee_session_id, None).await
}

/// Given a polling station id, find the previous results for that polling station
/// Uses the CTE in fetch_results_for_committee_session to look back through previous committee sessions.
pub async fn previous_results_for_polling_station(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
) -> Result<PollingStationResults, sqlx::Error> {
    let polling_station = polling_station::get(conn, polling_station_id).await?;
    let ps_id_prev_session = polling_station
        .id_prev_session
        .ok_or(sqlx::Error::RowNotFound)?;

    let prev_session_id = crate::committee_session::repository::get_previous_session(
        conn,
        polling_station.committee_session_id,
    )
    .await?
    .ok_or(sqlx::Error::RowNotFound)?
    .id;

    fetch_results_for_committee_session(conn, prev_session_id, Some(ps_id_prev_session))
        .await?
        .into_iter()
        .next()
        .map(|(_, data)| data)
        .ok_or(sqlx::Error::RowNotFound)
}

#[cfg(test)]
pub async fn insert_test_result(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    committee_session_id: u32,
    results: &PollingStationResults,
) -> Result<(), sqlx::Error> {
    let results = Json(results);
    query!(
        "INSERT INTO polling_station_results (polling_station_id, committee_session_id, data) VALUES (?, ?, ?)",
        polling_station_id,
        committee_session_id,
        results,
    )
        .execute(conn)
        .await?;
    Ok(())
}

#[cfg(test)]
pub mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::data_entry::domain::{
        polling_station_results::{
            cso_first_session_results::CSOFirstSessionResults,
            differences_counts::DifferencesCounts, voters_counts::VotersCounts,
            votes_counts::VotesCounts,
        },
        valid_default::ValidDefault,
    };

    pub fn create_test_results(proxy_certificate_count: u32) -> PollingStationResults {
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
            investigation::insert_test_investigation, polling_station::insert_test_polling_station,
        };

        /// Test with first session, 2 polling stations with results
        #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
        async fn test_complete_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 2;

            insert_test_result(&mut conn, 1, committee_session_id, &create_test_results(10))
                .await
                .unwrap();
            insert_test_result(&mut conn, 2, committee_session_id, &create_test_results(20))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 2);

            assert_eq!(results[0].0.id, 1);
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 10);

            assert_eq!(results[1].0.id, 2);
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 20);
        }

        /// Test with first session, 2 polling stations, only one with results (error)
        #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_2"))))]
        async fn test_incomplete_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 2;

            insert_test_result(&mut conn, 1, committee_session_id, &create_test_results(10))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, one polling station with investigation, but no corrected results
        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_one_investigation_no_corrected_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 704;

            insert_test_investigation(&mut conn, 741, Some(false))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 2);

            assert_eq!(results[0].0.id, 742);
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 4);

            assert_eq!(results[1].0.id, 741);
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 3);
        }

        /// Test with 4th session, one polling station with investigation, corrected results=true and results exist
        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_one_investigation_with_corrected_results_complete(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 704;

            insert_test_investigation(&mut conn, 741, Some(true))
                .await
                .unwrap();

            insert_test_result(
                &mut conn,
                741,
                committee_session_id,
                &create_test_results(10),
            )
            .await
            .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 2);

            assert_eq!(results[0].0.id, 741);
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 10);

            assert_eq!(results[1].0.id, 742);
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 4);
        }

        /// Test with 4th session, one polling station with investigation, corrected results=true and results don't exist (error)
        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_one_investigation_with_corrected_results_incomplete(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 704;

            insert_test_investigation(&mut conn, 741, Some(true))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, new polling station with no investigation (error)
        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_no_investigation(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 704;
            let new_polling_station_id = 743;

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
            path = "../../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_investigation_no_corrected_results(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 704;
            let new_polling_station_id = 743;

            insert_test_polling_station(
                &mut conn,
                new_polling_station_id,
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();

            insert_test_investigation(&mut conn, new_polling_station_id, Some(false))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, new polling station with investigation, corrected results=true and results exist
        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_investigation_with_corrected_results_complete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 704;
            let new_polling_station_id = 743;

            insert_test_polling_station(
                &mut conn,
                new_polling_station_id,
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();

            insert_test_investigation(&mut conn, new_polling_station_id, Some(true))
                .await
                .unwrap();

            insert_test_result(
                &mut conn,
                new_polling_station_id,
                committee_session_id,
                &create_test_results(10),
            )
            .await
            .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 3);

            assert_eq!(results[0].0.id, 743);
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 10);

            assert_eq!(results[1].0.id, 742);
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 4);

            assert_eq!(results[2].0.id, 741);
            assert_eq!(results[2].1.voters_counts().proxy_certificate_count, 3);
        }

        /// Test with 4th session, new polling station with investigation, corrected results=true and results don't exist (error)
        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_investigation_with_corrected_results_incomplete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 704;
            let new_polling_station_id = 743;

            insert_test_polling_station(
                &mut conn,
                new_polling_station_id,
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();

            insert_test_investigation(&mut conn, new_polling_station_id, Some(true))
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }

        /// Test with 4th session, new polling station with investigation, corrected results=true and results exist in 3rd session
        #[test(sqlx::test(fixtures(
            path = "../../../fixtures",
            scripts("election_7_four_sessions")
        )))]
        async fn test_next_new_polling_station_prev_session_investigation_with_corrected_results_complete(
            pool: SqlitePool,
        ) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = 704;

            // Add polling station, investigation and results to third session
            insert_test_polling_station(&mut conn, 733, 703, None, 123)
                .await
                .unwrap();

            insert_test_investigation(&mut conn, 733, Some(true))
                .await
                .unwrap();

            insert_test_result(&mut conn, 733, 703, &create_test_results(10))
                .await
                .unwrap();

            // Add new polling station to fourth session, linked to the one in third session, but without investigation or results
            insert_test_polling_station(&mut conn, 743, 704, Some(733), 123)
                .await
                .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 3);

            assert_eq!(results[0].0.id, 742);
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 4);

            assert_eq!(results[1].0.id, 743);
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 10);

            assert_eq!(results[2].0.id, 741);
            assert_eq!(results[2].1.voters_counts().proxy_certificate_count, 3);
        }
    }

    /// Test previous_results_for_polling_station with 4th session, existing polling station
    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_for_polling_station(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = 742;

        let results = previous_results_for_polling_station(&mut conn, polling_station_id).await;
        assert!(results.is_ok());

        let results = results.unwrap();
        assert_eq!(results.voters_counts().proxy_certificate_count, 4);
    }

    /// Test previous_results_for_polling_station with 4th session, non-existing polling station
    #[test(sqlx::test(fixtures(path = "../../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_previous_results_for_polling_station_non_existing(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = 743;

        let results = previous_results_for_polling_station(&mut conn, polling_station_id).await;
        assert!(results.is_err());
        assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
    }
}
