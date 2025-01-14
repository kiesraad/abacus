use axum::extract::FromRef;
use sqlx::{query, query_as, types::Json, SqlitePool};

use super::status::DataEntryStatus;
use super::{PollingStation, PollingStationDataEntry, PollingStationResults};
use crate::data_entry::{ElectionStatusResponseEntry, PollingStationResultsEntry};
use crate::polling_station::repository::PollingStations;
use crate::AppState;

pub struct PollingStationDataEntries(SqlitePool);

impl PollingStationDataEntries {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    /// Get the full polling station data entry row for a given polling station
    /// id, or return an error if there is no data
    pub async fn get_row(
        &self,
        polling_station_id: u32,
    ) -> Result<PollingStationDataEntry, sqlx::Error> {
        query_as!(
            PollingStationDataEntry,
            r#"
                SELECT
                    polling_station_id AS "polling_station_id: u32",
                    state AS "state: _",
                    updated_at AS "updated_at: _"
                FROM polling_station_data_entries
                WHERE polling_station_id = ?
            "#,
            polling_station_id,
        )
        .fetch_one(&self.0)
        .await
    }

    /// Get a data entry or return an error if there is no data entry for the
    /// given polling station id
    pub async fn get(&self, polling_station_id: u32) -> Result<DataEntryStatus, sqlx::Error> {
        self.get_row(polling_station_id)
            .await
            .map(|psde| psde.state.0)
    }

    /// Get a data entry or return the default data entry state for the given
    /// polling station id
    pub async fn get_or_default(
        &self,
        polling_station_id: u32,
    ) -> Result<DataEntryStatus, sqlx::Error> {
        Ok(query_as!(
            PollingStationDataEntry,
            r#"
                SELECT
                    polling_station_id AS "polling_station_id: u32",
                    state AS "state: _",
                    updated_at AS "updated_at: _"
                FROM polling_station_data_entries
                WHERE polling_station_id = ?
            "#,
            polling_station_id
        )
        .fetch_optional(&self.0)
        .await?
        .map(|psde| psde.state.0)
        .unwrap_or(DataEntryStatus::FirstEntryNotStarted))
    }

    /// Saves the data entry or updates it if it already exists for a given polling station id
    pub async fn upsert(
        &self,
        polling_station_id: u32,
        state: &DataEntryStatus,
    ) -> Result<(), sqlx::Error> {
        let state = Json(state);
        sqlx::query!(
            r#"
                INSERT INTO polling_station_data_entries (polling_station_id, state)
                VALUES (?, ?)
                ON CONFLICT(polling_station_id) DO
                UPDATE SET
                    state = excluded.state,
                    updated_at = CURRENT_TIMESTAMP
            "#,
            polling_station_id,
            state
        )
        .execute(&self.0)
        .await?;

        Ok(())
    }

    /// Get the status for each polling station data entry in an election
    pub async fn statuses(
        &self,
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
                first_data_entry_progress: state.get_first_entry_progress(),
                second_data_entry_progress: state.get_second_entry_progress(),
                finished_at: state.finished_at().cloned(),
            }
        })
        .fetch_all(&self.0)
        .await
    }

    pub async fn make_definitive(
        &self,
        polling_station_id: u32,
        new_state: &DataEntryStatus,
        definitive_entry: &PollingStationResults,
    ) -> Result<(), sqlx::Error> {
        let mut tx = self.0.begin().await?;
        let definitive_entry = Json(definitive_entry);
        query!(
            "INSERT INTO polling_station_results (polling_station_id, data) VALUES ($1, $2)",
            polling_station_id,
            definitive_entry
        )
        .execute(tx.as_mut())
        .await?;

        let new_state = Json(new_state);
        sqlx::query!(
            r#"
                INSERT INTO polling_station_data_entries (polling_station_id, state)
                VALUES (?, ?)
                ON CONFLICT(polling_station_id) DO
                UPDATE SET
                    state = excluded.state,
                    updated_at = CURRENT_TIMESTAMP
            "#,
            polling_station_id,
            new_state
        )
        .execute(tx.as_mut())
        .await?;

        tx.commit().await?;

        Ok(())
    }
}

pub struct PollingStationResultsEntries(SqlitePool);

impl PollingStationResultsEntries {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    /// Get a list of polling station results for an election
    pub async fn list(
        &self,
        election_id: u32,
    ) -> Result<Vec<PollingStationResultsEntry>, sqlx::Error> {
        query!(
            r#"
            SELECT
                r.polling_station_id AS "polling_station_id: u32",
                r.data,
                r.created_at
            FROM polling_station_results AS r
            LEFT JOIN polling_stations AS p ON r.polling_station_id = p.id
            WHERE p.election_id = $1
        "#,
            election_id
        )
        .try_map(|row| {
            let data = serde_json::from_slice(&row.data)
                .map_err(|err| sqlx::Error::Decode(Box::new(err)))?;
            Ok(PollingStationResultsEntry {
                polling_station_id: row.polling_station_id,
                data,
                created_at: row.created_at.and_utc(),
            })
        })
        .fetch_all(&self.0)
        .await
    }

    /// Get a list of polling stations with their results for an election
    pub async fn list_with_polling_stations(
        &self,
        polling_stations_repo: PollingStations,
        election_id: u32,
    ) -> Result<Vec<(PollingStation, PollingStationResults)>, sqlx::Error> {
        // first get the list of results and polling stations related to an election
        let list = self.list(election_id).await?;
        let polling_stations = polling_stations_repo.list(election_id).await?;

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
    pub async fn exists(&self, id: u32) -> Result<bool, sqlx::Error> {
        let res = query!(
            r#"
            SELECT EXISTS(
              SELECT 1 FROM polling_station_results
              WHERE polling_station_id = ?)
            AS `exists`"#,
            id
        )
        .fetch_one(&self.0)
        .await?;
        Ok(res.exists == 1)
    }
}

impl FromRef<AppState> for PollingStationDataEntries {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}

impl FromRef<AppState> for PollingStationResultsEntries {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
