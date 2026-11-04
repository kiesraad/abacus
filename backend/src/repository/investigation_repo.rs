use sqlx::{SqliteConnection, query, types::Json};

use crate::{
    domain::{
        committee_session::CommitteeSessionId, investigation::InvestigationStatus,
        polling_station::PollingStationId,
    },
    repository::polling_station_repo::CreateDataEntryError,
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
            investigation_state,
            data_entry_id
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

/// Delete the investigation for a given polling station.
/// Returns `DataEntryAlreadyLinked` if a data entry is still linked, it must be deleted first.
pub async fn delete(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<(), CreateDataEntryError> {
    let row = query!(
        "SELECT data_entry_id FROM polling_stations WHERE id = ?",
        polling_station_id,
    )
    .fetch_one(&mut *conn)
    .await?;

    if row.data_entry_id.is_some() {
        return Err(CreateDataEntryError::DataEntryAlreadyLinked);
    }

    query!(
        "UPDATE polling_stations SET investigation_state = NULL WHERE id = ?",
        polling_station_id,
    )
    .execute(conn)
    .await?;

    Ok(())
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

#[cfg(test)]
pub async fn insert_test_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    status: &InvestigationStatus,
) -> Result<(), sqlx::Error> {
    save(conn, polling_station_id, status).await
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::repository::polling_station_repo;

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_delete(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = PollingStationId::from(741);
        let status = InvestigationStatus::new("Test reason".to_string());
        create(&mut conn, polling_station_id, &status)
            .await
            .unwrap();

        delete(&mut conn, polling_station_id).await.unwrap();

        assert!(get(&mut conn, polling_station_id).await.unwrap().is_none());
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_delete_requires_unlinked_data_entry(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let polling_station_id = PollingStationId::from(741);
        let status = InvestigationStatus::new("Test reason".to_string());
        create(&mut conn, polling_station_id, &status)
            .await
            .unwrap();
        polling_station_repo::create_data_entry(&mut conn, polling_station_id)
            .await
            .unwrap();

        assert!(matches!(
            delete(&mut conn, polling_station_id).await,
            Err(CreateDataEntryError::DataEntryAlreadyLinked)
        ));
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_7_four_sessions"))))]
    async fn test_delete_unknown_polling_station(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();

        assert!(matches!(
            delete(&mut conn, PollingStationId::from(999_999)).await,
            Err(CreateDataEntryError::Sqlx(sqlx::Error::RowNotFound))
        ));
    }
}
