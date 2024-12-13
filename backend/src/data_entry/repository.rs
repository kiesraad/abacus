use axum::extract::FromRef;
use sqlx::{query, query_as, SqlitePool};

use super::{PollingStation, PollingStationDataEntry, PollingStationResults};
use crate::data_entry::DataEntry;
use crate::polling_station::repository::PollingStations;
use crate::polling_station::status::{EntryResult, FirstEntryInProgress, PollingStationStatus};
use crate::AppState;

pub struct PollingStationDataEntries(SqlitePool);

impl PollingStationDataEntries {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    /// Saves the data entry or updates it if it already exists
    pub async fn upsert(&self, id: u32, state: PollingStationStatus) -> Result<(), sqlx::Error> {
        let state = serde_json::to_value(state).expect("should be serializable to JSON");
        sqlx::query!(
            r#"
            INSERT INTO polling_station_data_entries
              (polling_station_id, state)
            VALUES (?, ?)
            ON CONFLICT(polling_station_id) DO
            UPDATE SET
              state = excluded.state,
              updated_at = unixepoch()
            "#,
            id,
            state
        )
        .execute(&self.0)
        .await?;

        Ok(())
    }

    pub async fn get(&self, id: u32) -> Result<PollingStationDataEntry, sqlx::Error> {
        query_as!(
            PollingStationDataEntry,
            r#"SELECT polling_station_id AS "id: u32", state AS "state: _", updated_at FROM polling_station_data_entries WHERE polling_station_id = ?"#,
            id,
        )
            .fetch_one(&self.0)
            .await
    }

    pub async fn delete(&self, id: u32) -> Result<(), sqlx::Error> {
        let res = query!(
            "DELETE FROM polling_station_data_entries WHERE polling_station_id = ? AND finalised_at IS NULL",
            id,
        )
            .execute(&self.0)
            .await?;
        if res.rows_affected() == 0 {
            Err(sqlx::Error::RowNotFound)
        } else {
            Ok(())
        }
    }

    pub async fn get_or_new(
        &self,
        polling_station_id: u32,
        state: &DataEntry,
    ) -> Result<PollingStationStatus, sqlx::Error> {
        Ok(query_as!(
            PollingStationDataEntry,
            r#"
SELECT
  polling_station_id AS "id: u32",
  state AS "state: _",
  updated_at
FROM polling_station_data_entries
WHERE polling_station_id = ?
            "#,
            polling_station_id
        )
        .fetch_optional(&self.0)
        .await?
        .map(|psde| psde.state.0)
        .unwrap_or(PollingStationStatus::FirstEntryInProgress(
            FirstEntryInProgress {
                first_entry_state: state.clone(),
            },
        )))
    }

    pub async fn update_status(
        &self,
        polling_station_id: u32,
        status: PollingStationStatus,
    ) -> Result<(), sqlx::Error> {
        let status = serde_json::to_value(status).expect("should always be serializable to JSON");
        query!(
            r#"
            UPDATE polling_station_data_entries
            SET state = ?
            WHERE polling_station_id = ?
            "#,
            status,
            polling_station_id
        )
        .fetch_all(&self.0)
        .await?;

        Ok(())
    }

    pub async fn list_results(
        &self,
        election_id: u32,
    ) -> Result<Vec<(u32, EntryResult)>, sqlx::Error> {
        let results: Vec<PollingStationDataEntry> = query_as!(
            PollingStationDataEntry,
            r#"
SELECT
  p.id AS "id: u32",
  de.state AS "state: _",
  de.updated_at
FROM polling_station_data_entries AS de
LEFT JOIN polling_stations AS p ON de.polling_station_id = p.id
WHERE p.election_id = $1
                "#,
            election_id
        )
        .fetch_all(&self.0)
        .await?;

        Ok(results
            .iter()
            .filter_map(|result| {
                if let Some(entry_result) = result.state.get_result() {
                    Some((result.id, entry_result))
                } else {
                    None
                }
            })
            .collect())
    }

    /// Get a list of polling stations with their results for an election
    pub async fn list_with_polling_stations(
        &self,
        polling_stations_repo: PollingStations,
        election_id: u32,
    ) -> Result<Vec<(PollingStation, PollingStationResults)>, sqlx::Error> {
        // first get the list of results and polling stations related to an election
        let list = self.list_results(election_id).await?;
        let polling_stations = polling_stations_repo.list(election_id).await?;

        // find the corresponding polling station for each entry, or fail if any polling station could not be found
        list.into_iter()
            .map(|entry| {
                let polling_station = polling_stations
                    .iter()
                    .find(|p| p.id == entry.0)
                    .cloned()
                    .ok_or(sqlx::Error::RowNotFound)?;
                Ok((polling_station, entry.1.finalised_entry.data))
            })
            .collect::<Result<_, sqlx::Error>>() // this collect causes the iterator to fail early if there was any error
    }
}

impl FromRef<AppState> for PollingStationDataEntries {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
