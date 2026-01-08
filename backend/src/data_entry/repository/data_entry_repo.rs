use sqlx::{SqliteConnection, query, query_as, types::Json};

use crate::data_entry::domain::{
    data_entry_status::DataEntryStatus, polling_station_data_entry::PollingStationDataEntry,
};

/// Get the full polling station data entry row for a given polling station
/// id, or return an error if there is no data
pub async fn get_data_entry(
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
    get_data_entry(conn, polling_station_id, committee_session_id)
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

pub async fn delete_data_entry(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
) -> Result<Option<PollingStationDataEntry>, sqlx::Error> {
    query_as!(
        PollingStationDataEntry,
        r#"
            DELETE FROM polling_station_data_entries
            WHERE polling_station_id = ?
            RETURNING
                polling_station_id AS "polling_station_id: u32",
                committee_session_id AS "committee_session_id: u32",
                state AS "state: _",
                updated_at AS "updated_at: _"
        "#,
        polling_station_id,
    )
    .fetch_optional(conn)
    .await
}

/// Check if a polling station has a data entry
pub async fn data_entry_exists(conn: &mut SqliteConnection, id: u32) -> Result<bool, sqlx::Error> {
    let res = query!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM polling_station_data_entries
            WHERE polling_station_id = ?)
        AS `exists`"#,
        id
    )
    .fetch_one(conn)
    .await?;
    Ok(res.exists == 1)
}
