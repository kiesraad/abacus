use axum::extract::FromRef;
use sqlx::{query, Sqlite, SqlitePool, Transaction};

use super::{PollingStation, PollingStationResults, PollingStationResultsEntry};
use crate::polling_station::repository::PollingStations;
use crate::AppState;

pub struct PollingStationDataEntries(SqlitePool);

impl PollingStationDataEntries {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    /// Saves the data entry or updates it if it already exists
    pub async fn upsert(
        &self,
        id: u32,
        entry_number: u8,
        progress: u8,
        data: String,
        client_state: String,
    ) -> Result<(), sqlx::Error> {
        sqlx::query!(
            r#"
            INSERT INTO polling_station_data_entries
              (polling_station_id, entry_number, progress, data, client_state)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(polling_station_id, entry_number) DO
            UPDATE SET
              progress = excluded.progress,
              data = excluded.data,
              client_state = excluded.client_state,
              updated_at = unixepoch()
            "#,
            id,
            entry_number,
            progress,
            data,
            client_state
        )
        .execute(&self.0)
        .await?;

        Ok(())
    }

    pub async fn get(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        id: u32,
        entry_number: u8,
    ) -> Result<(u8, Vec<u8>, Vec<u8>, i64), sqlx::Error> {
        let res = query!(
            r#"SELECT progress AS "progress: u8", data, client_state, updated_at FROM polling_station_data_entries WHERE polling_station_id = ? AND entry_number = ?"#,
            id,
            entry_number
        )
            .fetch_one(&mut **tx)
            .await?;
        if let (progress, Some(data), Some(client_state), updated_at) =
            (res.progress, res.data, res.client_state, res.updated_at)
        {
            Ok((progress, data, client_state, updated_at))
        } else {
            Err(sqlx::Error::RowNotFound)
        }
    }

    pub async fn delete(&self, id: u32, entry_number: u8) -> Result<(), sqlx::Error> {
        let res = query!(
            "DELETE FROM polling_station_data_entries WHERE polling_station_id = ? AND entry_number = ? AND finalised_at IS NULL",
            id,
            entry_number
        )
            .execute(&self.0)
            .await?;
        if res.rows_affected() == 0 {
            Err(sqlx::Error::RowNotFound)
        } else {
            Ok(())
        }
    }

    pub async fn finalise_first_entry(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        id: u32,
    ) -> Result<(), sqlx::Error> {
        // future: support second data entry
        query!(
            r#"
            UPDATE polling_station_data_entries
            SET finalised_at = unixepoch()
            WHERE polling_station_id = ? AND entry_number = 1"#,
            id,
        )
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    pub async fn finalise(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        id: u32,
    ) -> Result<(), sqlx::Error> {
        // Copies first data entry to results
        query!(
            "INSERT INTO polling_station_results (polling_station_id, data) SELECT polling_station_id, data FROM polling_station_data_entries WHERE polling_station_id = ? AND entry_number = 1",
            id,
        )
            .execute(&mut **tx)
            .await?;

        // Deletes all entries from a polling station
        query!(
            "DELETE FROM polling_station_data_entries WHERE polling_station_id = ?",
            id
        )
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    pub async fn exists_entry(&self, id: u32, entry_number: u8) -> Result<bool, sqlx::Error> {
        let res = query!(
            r#"
            SELECT EXISTS(
              SELECT 1 FROM polling_station_data_entries
              WHERE polling_station_id = ?
                AND entry_number = ?)
            AS `exists`"#,
            id,
            entry_number
        )
        .fetch_one(&self.0)
        .await?;
        Ok(res.exists == 1)
    }

    pub async fn exists_finalised_entry(
        &self,
        id: u32,
        entry_number: u8,
    ) -> Result<bool, sqlx::Error> {
        let res = query!(
            r#"
            SELECT EXISTS(
              SELECT 1 FROM polling_station_data_entries
              WHERE polling_station_id = ?
                AND entry_number = ?
                AND finalised_at IS NOT NULL)
            AS `exists`"#,
            id,
            entry_number
        )
        .fetch_one(&self.0)
        .await?;
        Ok(res.exists == 1)
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
                r.created_at AS "created_at: i64"
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
                created_at: row.created_at,
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
