use sqlx::{SqliteConnection, query, types::Json};

use crate::domain::{
    committee_session::CommitteeSessionId, investigation::InvestigationStatus,
    polling_station::PollingStationId, polling_station_data_entry::DataEntryId,
};

pub async fn save(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    status: &InvestigationStatus,
) -> Result<(), sqlx::Error> {
    let state = Json(status);
    let result = query!(
        "UPDATE polling_stations SET investigation_state = ? WHERE id = ?",
        state,
        polling_station_id,
    )
    .execute(conn)
    .await?;

    if result.rows_affected() == 0 {
        return Err(sqlx::Error::RowNotFound);
    }

    Ok(())
}

/// Create a new investigation only if one does not already exist.
/// Returns `RowNotFound` if the polling station already has an investigation.
pub async fn create(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    status: &InvestigationStatus,
) -> Result<(), sqlx::Error> {
    let state = Json(status);
    let result = query!(
        "UPDATE polling_stations SET investigation_state = ? WHERE id = ? AND investigation_state IS NULL",
        state,
        polling_station_id,
    )
    .execute(conn)
    .await?;

    if result.rows_affected() == 0 {
        return Err(sqlx::Error::RowNotFound);
    }

    Ok(())
}

pub async fn get(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<Option<InvestigationStatus>, sqlx::Error> {
    let row = query!(
        r#"SELECT
            investigation_state AS "investigation_state: Json<InvestigationStatus>",
            data_entry_id AS "data_entry_id: DataEntryId"
           FROM polling_stations WHERE id = ?"#,
        polling_station_id,
    )
    .fetch_one(conn)
    .await?;

    Ok(row.investigation_state.map(|json| {
        let status = json.0;
        match (&status, row.data_entry_id) {
            (InvestigationStatus::ConcludedWithNewResults(_), Some(id)) => {
                status.with_data_entry_id(id)
            }
            _ => status,
        }
    }))
}

// Delete the investigation for a given polling station
// Returns old status, or None if none existed
pub async fn delete(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<Option<InvestigationStatus>, sqlx::Error> {
    let row = query!(
        r#"SELECT
            investigation_state AS "investigation_state: Json<InvestigationStatus>",
            data_entry_id AS "data_entry_id: DataEntryId"
           FROM polling_stations WHERE id = ?"#,
        polling_station_id,
    )
    .fetch_one(&mut *conn)
    .await?;

    let status = row.investigation_state.map(|json| {
        let status = json.0;
        match (&status, row.data_entry_id) {
            (InvestigationStatus::ConcludedWithNewResults(_), Some(id)) => {
                status.with_data_entry_id(id)
            }
            _ => status,
        }
    });

    if status.is_some() {
        query!(
            "UPDATE polling_stations SET investigation_state = NULL WHERE id = ?",
            polling_station_id,
        )
        .execute(conn)
        .await?;
    }

    Ok(status)
}

pub async fn has_investigations_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<bool, sqlx::Error> {
    let result = query!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM polling_stations
            WHERE committee_session_id = ? AND investigation_state IS NOT NULL
        ) as `exists`"#,
        committee_session_id
    )
    .fetch_one(conn)
    .await?;

    Ok(result.exists == 1)
}

pub async fn list_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<(PollingStationId, InvestigationStatus)>, sqlx::Error> {
    let rows = query!(
        r#"
        SELECT
            id AS "polling_station_id: PollingStationId",
            investigation_state AS "investigation_state!: Json<InvestigationStatus>",
            data_entry_id AS "data_entry_id: DataEntryId"
        FROM polling_stations
        WHERE committee_session_id = ? AND investigation_state IS NOT NULL
        "#,
        committee_session_id,
    )
    .fetch_all(conn)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let status = row.investigation_state.0;
            let status = match (&status, row.data_entry_id) {
                (InvestigationStatus::ConcludedWithNewResults(_), Some(id)) => {
                    status.with_data_entry_id(id)
                }
                _ => status,
            };
            (row.polling_station_id, status)
        })
        .collect())
}

#[cfg(test)]
pub async fn insert_test_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    status: &InvestigationStatus,
) -> Result<(), sqlx::Error> {
    save(conn, polling_station_id, status).await
}
