use std::collections::HashMap;

use sqlx::{Connection, SqliteConnection, query, query_as, types::Json};

use crate::{
    domain::{
        committee_session::CommitteeSessionId,
        data_entry::{
            DataEntryId, DataEntryRow, DataEntrySource, DataEntrySourceContext, DataEntryStatus,
        },
        election::CommitteeCategory,
        investigation::InvestigationStatus,
        polling_station::PollingStationId,
        results::{
            PollingStationResults, Results,
            common_polling_station_results::CommonPollingStationResults,
        },
        sub_committee::{SubCommitteeId, SubCommitteeNumber},
    },
    repository::{
        committee_session_repo,
        common::{PollingStationRow, PollingStationRowLike, SubCommitteeRow, SubCommitteeRowLike},
        election_repo, polling_station_repo, sub_committee_repo,
    },
};

/// Create an empty data entry row (not linked to any polling station)
pub async fn create_empty(conn: &mut SqliteConnection) -> Result<DataEntryRow, sqlx::Error> {
    let state = Json(DataEntryStatus::Empty);

    query_as!(
        DataEntryRow,
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

/// Get the full data entry row by its primary key.
pub async fn get(
    conn: &mut SqliteConnection,
    data_entry_id: DataEntryId,
) -> Result<DataEntryRow, sqlx::Error> {
    query_as!(
        DataEntryRow,
        r#"
            SELECT
                id AS "id: _",
                state AS "state: _",
                updated_at AS "updated_at: _"
            FROM data_entries
            WHERE id = ?
        "#,
        data_entry_id,
    )
    .fetch_one(conn)
    .await
}

/// Get the status of a data entry by its primary key.
pub async fn get_status(
    conn: &mut SqliteConnection,
    data_entry_id: DataEntryId,
) -> Result<DataEntryStatus, sqlx::Error> {
    get(conn, data_entry_id).await.map(|psde| psde.state.0)
}

/// Update a data entry directly by its primary key.
pub async fn update(
    conn: &mut SqliteConnection,
    data_entry_id: DataEntryId,
    state: &DataEntryStatus,
) -> Result<DataEntryRow, sqlx::Error> {
    let state = Json(state);

    query_as!(
        DataEntryRow,
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
    .fetch_one(conn)
    .await
}

/// Find which entity (polling station or sub committee) is the source of a data entry.
/// We expect to only find one match: either a polling station or a sub committee, not both.
pub async fn resolve_source(
    conn: &mut SqliteConnection,
    data_entry_id: DataEntryId,
) -> Result<DataEntrySourceContext, sqlx::Error> {
    let mut tx = conn.begin().await?;

    let ps = query_as!(
        PollingStationRow,
        r#"
        SELECT
            p.id AS "id: _",
            p.committee_session_id AS "committee_session_id: _",
            c.number AS "committee_session_number: u32",
            p.prev_data_entry_id AS "prev_data_entry_id: _",
            p.data_entry_id AS "data_entry_id: _",
            p.investigation_state AS "investigation_state: Json<InvestigationStatus>",
            p.name,
            p.number AS "number: u32",
            p.number_of_voters AS "number_of_voters: _",
            p.polling_station_type AS "polling_station_type: _",
            p.address,
            p.postal_code,
            p.locality
        FROM polling_stations AS p
        JOIN committee_sessions AS c ON c.id = p.committee_session_id
        WHERE p.data_entry_id = $1
        "#,
        data_entry_id
    )
    .map(PollingStationRow::into_polling_station_data_source)
    .fetch_optional(&mut *tx)
    .await?;

    let source = if let Some(ps) = ps {
        ps
    } else {
        query_as!(
            SubCommitteeRow,
            r#"
            SELECT
                id AS "id: _",
                committee_session_id AS "committee_session_id: _",
                data_entry_id AS "data_entry_id!: _",
                number AS "number: SubCommitteeNumber",
                name,
                category AS "category: _"
            FROM sub_committees
            WHERE data_entry_id = $1
        "#,
            data_entry_id
        )
        .map(SubCommitteeRow::into_sub_committee_data_source)
        .fetch_one(&mut *tx)
        .await?
    };
    let committee_session =
        committee_session_repo::get(&mut tx, source.committee_session_id()).await?;
    let election = election_repo::get(&mut tx, committee_session.election_id).await?;

    tx.commit().await?;

    Ok(DataEntrySourceContext {
        source,
        election,
        committee_session,
    })
}

/// Delete a data entry by its primary key.
pub async fn delete(
    conn: &mut SqliteConnection,
    data_entry_id: DataEntryId,
) -> Result<DataEntryRow, sqlx::Error> {
    query_as!(
        DataEntryRow,
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
    .fetch_one(conn)
    .await
}

/// Returns if a committee session has any data entries
pub async fn has_any(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<bool, sqlx::Error> {
    let result = query!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM polling_stations AS ps
            INNER JOIN data_entries AS de ON de.id = ps.data_entry_id
            WHERE ps.committee_session_id = $1
            UNION ALL
            SELECT 1 FROM sub_committees AS sc
            INNER JOIN data_entries AS de ON de.id = sc.data_entry_id
            WHERE sc.committee_session_id = $1
        ) as `exists`"#,
        committee_session_id
    )
    .fetch_one(conn)
    .await?;

    Ok(result.exists == 1)
}

/// List the results for all data entries of a committee session for the GSB.
async fn list_results_for_gsb_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<(DataEntrySource, Results)>, sqlx::Error> {
    let polling_stations: HashMap<_, _> =
        polling_station_repo::list_for_session(conn, committee_session_id)
            .await?
            .into_iter()
            .map(|ps| (ps.id(), ps))
            .collect();

    // Query to find the most recent results for each polling station.
    // For each PS, it checks:
    // 1. If the PS has its own Definitive data entry, use that
    // 2. If there's no investigation requiring corrected results, use the previous data entry
    //    (pointed to by prev_data_entry_id, which already skips intermediate sessions without results)
    // 3. Otherwise, NULL (results are expected but not yet available)
    let results = query!(
        r#"
        SELECT ps.id AS "original_id: PollingStationId",
            CASE
                WHEN json_extract(de.state, '$.status') = 'Definitive'
                    THEN json_extract(de.state, '$.state.results')
                WHEN json_extract(ps.investigation_state, '$.status') IS NOT 'ConcludedWithNewResults'
                    AND json_extract(prev_de.state, '$.status') = 'Definitive'
                    THEN json_extract(prev_de.state, '$.state.results')
                ELSE NULL
            END AS "data: Json<Results>"
        FROM polling_stations AS ps
        LEFT JOIN data_entries AS de ON de.id = ps.data_entry_id
        LEFT JOIN data_entries AS prev_de ON prev_de.id = ps.prev_data_entry_id
        WHERE ps.committee_session_id = $1 AND "data: Json<Results>" IS NOT NULL
        "#,
        committee_session_id,
    )
    .try_map(|row| {
        let data = row.data.ok_or(sqlx::Error::RowNotFound)?;
        polling_stations
            .get(&row.original_id)
            .cloned()
            .map(|ps| (DataEntrySource::PollingStation(ps), data.0))
            .ok_or(sqlx::Error::RowNotFound)
    })
    .fetch_all(&mut *conn)
    .await?;

    if results.len() != polling_stations.len() {
        return Err(sqlx::Error::RowNotFound);
    }

    Ok(results)
}

/// List the results for all data entries of a committee session for the CSB.
async fn list_results_for_csb_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<(DataEntrySource, Results)>, sqlx::Error> {
    let sub_committee_sessions: HashMap<_, _> =
        sub_committee_repo::list_first_session(conn, committee_session_id)
            .await?
            .into_iter()
            .map(|sc| (sc.sub_committee.id, sc))
            .collect();

    let results = query!(
        r#"
        SELECT sc.id AS "id: SubCommitteeId", CASE WHEN json_extract(de.state, '$.status') = 'Definitive'
            THEN json_extract(de.state, '$.state.results')
            ELSE NULL
        END AS "data: Json<Results>"
        FROM sub_committees AS sc
        LEFT JOIN data_entries AS de ON de.id = sc.data_entry_id
        WHERE sc.committee_session_id = $1 AND "data: Json<Results>" IS NOT NULL
    "#,
        committee_session_id
    )
    .try_map(|row| {
        let data = row.data.ok_or(sqlx::Error::RowNotFound)?;
        sub_committee_sessions
            .get(&row.id)
            .cloned()
            .map(|sc| (DataEntrySource::SubCommittee(sc), data.0))
            .ok_or(sqlx::Error::RowNotFound)
    })
    .fetch_all(&mut *conn)
    .await?;

    if results.len() != sub_committee_sessions.len() {
        return Err(sqlx::Error::RowNotFound);
    }

    Ok(results)
}

/// Get a list of polling stations with their results for a committee session
pub async fn list_results_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<(DataEntrySource, Results)>, sqlx::Error> {
    let mut tx = conn.begin().await?;

    let committee_session = committee_session_repo::get(&mut tx, committee_session_id).await?;
    let election = election_repo::get(&mut tx, committee_session.election_id).await?;
    let results = match election.committee_category {
        CommitteeCategory::GSB => {
            list_results_for_gsb_committee_session(&mut tx, committee_session_id).await?
        }
        CommitteeCategory::CSB => {
            list_results_for_csb_committee_session(&mut tx, committee_session_id).await?
        }
    };
    tx.commit().await?;

    Ok(results)
}

/// Given a polling station id, find the previous results for that polling station.
/// Directly queries the data entry pointed to by prev_data_entry_id.
pub async fn previous_results_for_polling_station(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<CommonPollingStationResults, sqlx::Error> {
    let polling_station = polling_station_repo::get(conn, polling_station_id).await?;
    let prev_data_entry_id = polling_station
        .prev_data_entry_id()
        .ok_or(sqlx::Error::RowNotFound)?;

    let row = query!(
        r#"
        SELECT json_extract(de.state, '$.state.results') AS "data: Json<Results>"
        FROM data_entries AS de
        WHERE de.id = $1 AND json_extract(de.state, '$.status') = 'Definitive'
        "#,
        prev_data_entry_id,
    )
    .fetch_one(conn)
    .await?;

    match row.data.map(|d| d.0) {
        Some(Results::CSOFirstSession(results)) => Ok(results.as_common()),
        Some(Results::CSONextSession(results)) => Ok(results.as_common()),
        _ => Err(sqlx::Error::RowNotFound),
    }
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

    fn create_test_results(proxy_certificate_count: u32) -> Results {
        Results::CSOFirstSession(CSOFirstSessionResults {
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
            domain::data_entry::{self, DataEntrySourceId},
            repository::{
                polling_station_repo::{self, insert_test_polling_station},
                user_repo::UserId,
            },
            service::{create_definitive_data_entry, create_test_investigation},
        };

        /// Test with first session, 2 polling stations with results
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_complete_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(2);

            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(211),
                &create_test_results(10),
            )
            .await
            .unwrap();
            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(212),
                &create_test_results(20),
            )
            .await
            .unwrap();

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 2);

            assert_eq!(
                results[0].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(211))
            );
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 10);

            assert_eq!(
                results[1].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(212))
            );
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 20);
        }

        /// Test with first session, 2 polling stations, only one with results (error)
        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2"))))]
        async fn test_incomplete_polling_stations(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(2);

            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(211),
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

            assert_eq!(
                results[0].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(741))
            );
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 3);

            assert_eq!(
                results[1].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(742))
            );
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

            assert_eq!(
                results[0].0.id(),
                DataEntrySourceId::PollingStation(polling_station_id)
            );
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 10);

            assert_eq!(
                results[1].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(742))
            );
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

            assert_eq!(
                results[0].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(741))
            );
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 3);

            assert_eq!(
                results[1].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(742))
            );
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 4);

            assert_eq!(
                results[2].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(743))
            );
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

            // Can't use create_test_investigation because PS 733 is in session 703, not the latest.
            // Manually create data entry, investigation, and definitive results.
            let empty = create_empty(&mut conn).await.unwrap();
            polling_station_repo::link_data_entry(&mut conn, PollingStationId::from(733), empty.id)
                .await
                .unwrap();
            let inv_status =
                crate::domain::investigation::InvestigationStatus::new("Test reason".to_string())
                    .conclude_with_new_results("Test findings".to_string(), empty.id)
                    .expect("conclude_with_new_results should succeed");
            crate::repository::investigation_repo::insert_test_investigation(
                &mut conn,
                PollingStationId::from(733),
                &inv_status,
            )
            .await
            .unwrap();

            let state = DataEntryStatus::Definitive(data_entry::Definitive {
                first_entry_user_id: UserId::from(5),
                second_entry_user_id: UserId::from(6),
                finished_at: chrono::Utc::now(),
                finalised_with_warnings: false,
                results: create_test_results(10),
            });
            update(&mut conn, empty.id, &state).await.unwrap();

            // Add new polling station to fourth session, linked to the data entry from third session, but without investigation or results
            let prev_data_entry = get(&mut conn, empty.id).await.unwrap();
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

            assert_eq!(
                results[0].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(741))
            );
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 3);

            assert_eq!(
                results[1].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(742))
            );
            assert_eq!(results[1].1.voters_counts().proxy_certificate_count, 4);

            assert_eq!(
                results[2].0.id(),
                DataEntrySourceId::PollingStation(PollingStationId::from(743))
            );
            assert_eq!(results[2].1.voters_counts().proxy_certificate_count, 10);
        }

        #[test(sqlx::test(fixtures(
            path = "../../fixtures",
            scripts("election_8_csb_with_results")
        )))]
        async fn test_csb_committee_session_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(801);

            let results = list_results_for_committee_session(&mut conn, committee_session_id)
                .await
                .unwrap();
            assert_eq!(results.len(), 1);

            assert_eq!(
                results[0].0.id(),
                DataEntrySourceId::SubCommittee(SubCommitteeId::from(811))
            );
            assert_eq!(results[0].1.voters_counts().proxy_certificate_count, 4);
        }

        #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_9_csb"))))]
        async fn test_csb_incomplete_committee_session_results(pool: SqlitePool) {
            let mut conn = pool.acquire().await.unwrap();
            let committee_session_id = CommitteeSessionId::from(801);

            let results = list_results_for_committee_session(&mut conn, committee_session_id).await;
            assert!(results.is_err());
            assert!(matches!(results.unwrap_err(), sqlx::Error::RowNotFound));
        }
    }

    mod are_results_complete_for_committee_session {
        use sqlx::{SqliteConnection, SqlitePool};
        use test_log::test;

        use super::*;
        use crate::{
            domain::investigation::InvestigationStatus,
            repository::{
                investigation_repo,
                polling_station_repo::{self, insert_test_polling_station},
            },
            service::create_definitive_data_entry,
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
                let data_entry_id =
                    polling_station_repo::create_data_entry(conn, polling_station_id)
                        .await
                        .unwrap();
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

        async fn insert_test_results(
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
                PollingStationId::from(211),
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
                PollingStationId::from(211),
                &create_test_results(10),
            )
            .await
            .unwrap();
            create_definitive_data_entry(
                &mut conn,
                PollingStationId::from(212),
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
            let polling_station_id = PollingStationId::from(743);

            insert_test_polling_station(
                &mut conn,
                polling_station_id,
                committee_session_id,
                None,
                123,
            )
            .await
            .unwrap();
            polling_station_repo::create_data_entry(&mut conn, polling_station_id)
                .await
                .unwrap();
            create_definitive_data_entry(&mut conn, polling_station_id, &create_test_results(10))
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
            insert_test_results(&mut conn, polling_station_id).await;

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
        assert_eq!(results.voters_counts.proxy_certificate_count, 4);
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
