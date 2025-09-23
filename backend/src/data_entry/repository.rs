use sqlx::{Connection, SqliteConnection, query, query_as, types::Json};

use super::{PollingStationDataEntry, status::DataEntryStatus};
use crate::{
    data_entry::{ElectionStatusResponseEntry, PollingStationResults},
    polling_station::PollingStation,
};

/// Get the full polling station data entry row for a given polling station
/// id, or return an error if there is no data
pub async fn get_row(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    committee_session_id: u32,
) -> Result<PollingStationDataEntry, sqlx::Error> {
    query_as!(
        PollingStationDataEntry,
        r#"
            SELECT
                polling_station_id AS "polling_station_id: u32",
                committee_session_id AS "committee_session_id: u32",
                state AS "state: _",
                updated_at AS "updated_at: _"
            FROM polling_station_data_entries
            WHERE polling_station_id = ? AND committee_session_id = ?
        "#,
        polling_station_id,
        committee_session_id
    )
    .fetch_one(conn)
    .await
}

/// Get a data entry or return an error if there is no data entry for the
/// given polling station id
pub async fn get(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    committee_session_id: u32,
) -> Result<DataEntryStatus, sqlx::Error> {
    get_row(conn, polling_station_id, committee_session_id)
        .await
        .map(|psde| psde.state.0)
}

/// Get a data entry or return the default data entry state for the given
/// polling station id
pub async fn get_or_default(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    committee_session_id: u32,
) -> Result<DataEntryStatus, sqlx::Error> {
    Ok(query_as!(
        PollingStationDataEntry,
        r#"
            SELECT
                polling_station_id AS "polling_station_id: u32",
                committee_session_id AS "committee_session_id: u32",
                state AS "state: _",
                updated_at AS "updated_at: _"
            FROM polling_station_data_entries
            WHERE polling_station_id = ? AND committee_session_id = ?
        "#,
        polling_station_id,
        committee_session_id
    )
    .fetch_optional(conn)
    .await?
    .map(|psde| psde.state.0)
    .unwrap_or(DataEntryStatus::FirstEntryNotStarted))
}

/// Saves the data entry or updates it if it already exists for a given polling station id
pub async fn upsert(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    committee_session_id: u32,
    state: &DataEntryStatus,
) -> Result<PollingStationDataEntry, sqlx::Error> {
    let state = Json(state);
    query_as!(
        PollingStationDataEntry,
        r#"
            INSERT INTO polling_station_data_entries (polling_station_id, committee_session_id, state)
            VALUES (?, ?, ?)
            ON CONFLICT(polling_station_id, committee_session_id) DO UPDATE
            SET
                state = excluded.state,
                updated_at = CURRENT_TIMESTAMP
            RETURNING
                polling_station_id AS "polling_station_id: u32",
                committee_session_id AS "committee_session_id: u32",
                state AS "state: _",
                updated_at AS "updated_at: _"
        "#,
        polling_station_id,
        committee_session_id,
        state
    )
    .fetch_one(conn)
    .await
}

/// Get the status for each polling station data entry in a committee session
pub async fn statuses(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
) -> Result<Vec<ElectionStatusResponseEntry>, sqlx::Error> {
    // If this is not the first committee session, we only want to include
    // polling stations with corrected results in this committee session
    query!(
        r#"
            SELECT
                p.id AS "polling_station_id: u32",
                de.state AS "state: Json<DataEntryStatus>"
            FROM polling_stations AS p
            LEFT JOIN committee_sessions AS c ON c.id = p.committee_session_id
            LEFT JOIN polling_station_data_entries AS de ON de.polling_station_id = p.id
            LEFT JOIN polling_station_investigations AS psi ON psi.polling_station_id = p.id
            WHERE c.id = $1 AND
                CASE
                    WHEN c.number > 1 THEN psi.corrected_results = TRUE
                    ELSE TRUE
                END
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
        }
    })
    .fetch_all(conn)
    .await
}

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

/// Check if a polling station has results
pub async fn entry_exists(conn: &mut SqliteConnection, id: u32) -> Result<bool, sqlx::Error> {
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

/// Get a list of polling stations with their results for a committee session
pub async fn list_entries_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
) -> Result<Vec<(PollingStation, PollingStationResults)>, sqlx::Error> {
    let mut tx = conn.begin().await?;
    let polling_stations =
        crate::polling_station::repository::list(&mut tx, committee_session_id).await?;

    // This query requires a little explanation:
    //
    // We are trying to get the latest available results for each polling station in a committee session.
    // However results beyond the first committee session are not available for all polling stations (only
    // those that were re-entered in that committee session are available). So we need to look back into
    // previous committee sessions to find the most recent results available.
    //
    // This query does this by using a recursive CTE (Common Table Expression). A recursive CTE consists of
    // two parts, the initial query and the recursive query. In this case the initial query just fetches the
    // polling stations from the current committee session and any results available for that session.
    //
    // The recursive query then takes the current set of rows and attempts to retrieve the previous
    // committee session's polling station for each row and any results available for that previous
    // session. Once we find a row with results or once we reach a polling station with no previous
    // committee session (the first committee session) we stop looking back, but we should have
    // found results by then (since every polling station will have results the first time it appears).
    //
    // Finally, we only select the rows that have results, eliminating all the intermediate rows without
    // results that were only needed to find the previous committee sessions.
    let results = query!(
        r#"
        WITH RECURSIVE polling_stations_chain(original_id, id, id_prev_session, data) AS (
            SELECT s.id AS original_id, s.id, s.id_prev_session, r.data
            FROM polling_stations AS s
            LEFT JOIN polling_station_results AS r ON r.polling_station_id = s.id
            WHERE s.committee_session_id = ?

            UNION ALL

            SELECT sc.original_id, s.id, s.id_prev_session, r.data
            FROM polling_stations_chain AS sc
            JOIN polling_stations AS s ON s.id = sc.id_prev_session
            LEFT JOIN polling_station_results AS r ON r.polling_station_id = s.id
            WHERE sc.data IS NULL
        )
        SELECT
            sc.original_id AS "original_id!: u32",
            sc.data AS "data: Json<PollingStationResults>"
        FROM polling_stations_chain AS sc
        WHERE sc.data IS NOT NULL
        "#,
        committee_session_id
    )
    .try_map(|row| {
        let polling_station = polling_stations
            .iter()
            .find(|p| p.id == row.original_id)
            .cloned()
            .ok_or(sqlx::Error::RowNotFound)?;
        Ok((polling_station, row.data.0))
    })
    .fetch_all(&mut *tx)
    .await?;

    tx.commit().await?;
    if results.len() != polling_stations.len() {
        // This should never happen, since every polling station should always
        // have results the first time it appears.
        Err(sqlx::Error::RowNotFound)
    } else {
        Ok(results)
    }
}

/// Given a polling station id (does not necessarily need to be in the latest
/// committee session), find the most recent results for that polling station
/// by looking back through previous committee sessions from that point.
pub async fn most_recent_results_for_polling_station(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
) -> Result<Option<PollingStationResults>, sqlx::Error> {
    // For a description of how this query works, please see the comment in the
    // `list_entries_for_committee_session` function above. This is a variant
    // where we start with just a single row for a single polling station, but
    // the rest of the processing is the same.
    query!(
        r#"
        WITH RECURSIVE polling_stations_chain(original_id, id, id_prev_session, data) AS (
            SELECT s.id AS original_id, s.id, s.id_prev_session, r.data
            FROM polling_stations AS s
            LEFT JOIN polling_station_results AS r ON r.polling_station_id = s.id
            WHERE s.id = ?

            UNION ALL

            SELECT sc.original_id, s.id, s.id_prev_session, r.data
            FROM polling_stations_chain AS sc
            JOIN polling_stations AS s ON s.id = sc.id_prev_session
            LEFT JOIN polling_station_results AS r ON r.polling_station_id = s.id
            WHERE sc.data IS NULL
        )
        SELECT
            sc.data AS "data!: Json<PollingStationResults>"
        FROM polling_stations_chain AS sc
        WHERE sc.data IS NOT NULL
        "#,
        polling_station_id
    )
    .map(|row| row.data.0)
    .fetch_optional(conn)
    .await
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
