use axum::extract::FromRef;
use sqlx::{query, query_as, Sqlite, SqlitePool, Transaction};

use crate::AppState;

use super::{
    PollingStation, PollingStationResults, PollingStationResultsEntry, PollingStationStatusEntry,
};

pub struct PollingStations(SqlitePool);

impl PollingStations {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub async fn list(&self, election_id: u32) -> Result<Vec<PollingStation>, sqlx::Error> {
        query_as!(
            PollingStation,
            r#"
            SELECT
                id AS "id: u32",
                election_id AS "election_id: u32",
                name,
                number,
                number_of_voters,
                polling_station_type,
                street,
                house_number,
                house_number_addition,
                postal_code,
                locality
            FROM polling_stations
            WHERE election_id = $1
        "#,
            election_id
        )
        .fetch_all(&self.0)
        .await
    }

    pub async fn get(&self, id: u32) -> Result<PollingStation, sqlx::Error> {
        query_as!(
            PollingStation,
            r#"
            SELECT
                id AS "id: u32",
                election_id AS "election_id: u32",
                name,
                number,
                number_of_voters,
                polling_station_type,
                street,
                house_number,
                house_number_addition,
                postal_code,
                locality
            FROM polling_stations
            WHERE id = $1
        "#,
            id
        )
        .fetch_one(&self.0)
        .await
    }

    pub async fn status(
        &self,
        election_id: u32,
    ) -> Result<Vec<PollingStationStatusEntry>, sqlx::Error> {
        query_as!(
            PollingStationStatusEntry,
            r#"
SELECT p.id AS "id: u32",
CASE WHEN r.polling_station_id IS NULL THEN 'FirstEntry' ELSE 'Definitive' END AS "status!: _"
FROM polling_stations AS p
LEFT JOIN polling_station_results AS r ON r.polling_station_id = p.id
WHERE election_id = $1
"#,
            election_id
        )
        .fetch_all(&self.0)
        .await
    }
}

pub struct PollingStationDataEntries(SqlitePool);

impl PollingStationDataEntries {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    /// Saves the data entry or updates it if it already exists
    pub async fn upsert(&self, id: u32, entry_number: u8, data: String) -> Result<(), sqlx::Error> {
        sqlx::query!("INSERT INTO polling_station_data_entries (polling_station_id, entry_number, data) VALUES (?, ?, ?)\
              ON CONFLICT(polling_station_id, entry_number) DO UPDATE SET data = excluded.data",
            id, entry_number, data)
            .execute(&self.0)
            .await?;

        Ok(())
    }

    pub async fn get(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        id: u32,
        entry_number: u8,
    ) -> Result<Vec<u8>, sqlx::Error> {
        let res = query!(
            "SELECT data FROM polling_station_data_entries WHERE polling_station_id = ? AND entry_number = ?",
            id,
            entry_number
        )
            .fetch_one(&mut **tx)
        .await?;
        res.data.ok_or_else(|| sqlx::Error::RowNotFound)
    }

    pub async fn delete(&self, id: u32, entry_number: u8) -> Result<(), sqlx::Error> {
        let res = query!(
            "DELETE FROM polling_station_data_entries WHERE polling_station_id = ? AND entry_number = ?",
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

    pub async fn finalise(
        &self,
        tx: &mut Transaction<'_, Sqlite>,
        id: u32,
    ) -> Result<(), sqlx::Error> {
        // future: support second data entry
        query!(
            "INSERT INTO polling_station_results (polling_station_id, data) SELECT polling_station_id, data FROM polling_station_data_entries WHERE polling_station_id = ? AND entry_number = 1",
            id,
        )
        .execute(&mut **tx)
        .await?;

        query!(
            "DELETE FROM polling_station_data_entries WHERE polling_station_id = ?",
            id
        )
        .execute(&mut **tx)
        .await?;

        Ok(())
    }

    pub async fn exists_finalised(&self, id: u32) -> Result<bool, sqlx::Error> {
        let res = query!(
            "SELECT EXISTS(SELECT 1 FROM polling_station_results WHERE polling_station_id = ?) AS `exists`",
            id
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
                r.data
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
            })
        })
        .fetch_all(&self.0)
        .await
    }

    /// Get a list of polling stations with their results for an election
    pub async fn list_with_polling_stations(
        &self,
        election_id: u32,
    ) -> Result<Vec<(PollingStation, PollingStationResults)>, sqlx::Error> {
        // first get the list of results and polling stations related to an election
        let list = self.list(election_id).await?;
        let polling_stations = PollingStations(self.0.clone()).list(election_id).await?;

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
}

impl FromRef<AppState> for PollingStations {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
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
