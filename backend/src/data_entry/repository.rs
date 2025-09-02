use chrono::NaiveDateTime;
use sqlx::{query, query_as, types::Json};

use super::{CSOFirstSessionResults, PollingStationDataEntry, status::DataEntryStatus};
use crate::{
    DbConnLike,
    data_entry::{ElectionStatusResponseEntry, PollingStationResults, PollingStationResultsEntry},
    polling_station::PollingStation,
};

/// Get the full polling station data entry row for a given polling station
/// id, or return an error if there is no data
pub async fn get_row(
    conn: impl DbConnLike<'_>,
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
    conn: impl DbConnLike<'_>,
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
    conn: impl DbConnLike<'_>,
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
    conn: impl DbConnLike<'_>,
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

/// Get the status for each polling station data entry in an election
pub async fn statuses(
    conn: impl DbConnLike<'_>,
    election_id: u32,
) -> Result<Vec<ElectionStatusResponseEntry>, sqlx::Error> {
    query!(
        r#"
            SELECT
                id AS "polling_station_id: u32",
                de.state AS "state: Option<Json<DataEntryStatus>>"
            FROM polling_stations AS p
            LEFT JOIN polling_station_data_entries AS de ON de.polling_station_id = p.id
            WHERE election_id = $1
        "#,
        election_id
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
    conn: impl DbConnLike<'_>,
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

/// Get a list of polling station results for an election
pub async fn list_entries(
    conn: impl DbConnLike<'_>,
    election_id: u32,
) -> Result<Vec<PollingStationResultsEntry>, sqlx::Error> {
    query!(
        r#"
        SELECT
            r.polling_station_id AS "polling_station_id: u32",
            r.committee_session_id AS "committee_session_id: u32",
            r.data AS "data: Json<CSOFirstSessionResults>",
            r.created_at as "created_at: NaiveDateTime"
        FROM polling_station_results AS r
        LEFT JOIN polling_stations AS p ON r.polling_station_id = p.id
        WHERE p.election_id = $1
        "#,
        election_id
    )
    .try_map(|row| {
        Ok(PollingStationResultsEntry {
            polling_station_id: row.polling_station_id,
            committee_session_id: row.committee_session_id,
            data: row.data.0,
            created_at: row.created_at.and_utc(),
        })
    })
    .fetch_all(conn)
    .await
}

/// Get a list of polling stations with their results for an election
pub async fn list_entries_with_polling_stations(
    conn: impl DbConnLike<'_>,
    election_id: u32,
) -> Result<Vec<(PollingStation, CSOFirstSessionResults)>, sqlx::Error> {
    let mut conn = conn.acquire().await?;
    // first get the list of results and polling stations related to an election
    let list = list_entries(&mut *conn, election_id).await?;
    let polling_stations =
        crate::polling_station::repository::list(&mut *conn, election_id).await?;

    // find the corresponding polling station for each entry, or fail if any polling station could not be found
    list.into_iter()
        .map(|entry| {
            let polling_station = polling_stations
                .iter()
                .find(|p| p.id == entry.polling_station_id)
                .cloned()
                .ok_or(sqlx::Error::RowNotFound)?;
            Ok((polling_station, entry.data))
        })
        .collect::<Result<_, sqlx::Error>>() // this collect causes the iterator to fail early if there was any error
}

/// Check if a polling station has results
pub async fn entry_exists(conn: impl DbConnLike<'_>, id: u32) -> Result<bool, sqlx::Error> {
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
