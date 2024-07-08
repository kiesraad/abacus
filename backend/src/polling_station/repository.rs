use axum::extract::FromRef;
use sqlx::{query, query_as, SqlitePool};

use crate::AppState;

use super::PollingStation;

pub struct PollingStations(SqlitePool);

impl PollingStations {
    pub async fn list(&self, election_id: u32) -> Result<Vec<PollingStation>, sqlx::Error> {
        query_as!(
            PollingStation,
            r#"
SELECT
  id,
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
WHERE election_id = $1;
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

    pub async fn finalise(&self, id: u32, data: String) -> Result<(), sqlx::Error> {
        let mut tx = self.0.begin().await?;

        query!(
            "INSERT INTO polling_station_results (polling_station_id, data) VALUES (?, ?)",
            id,
            data
        )
        .execute(&mut *tx)
        .await?;

        query!(
            "DELETE FROM polling_station_data_entries WHERE polling_station_id = ?",
            id
        )
        .execute(&mut *tx)
        .await?;

        tx.commit().await?;

        Ok(())
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
