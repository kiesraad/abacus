use axum::extract::FromRef;
use sqlx::{query, query_as, SqlitePool};

use crate::polling_station::structs::{PollingStation, PollingStationRequest};
use crate::AppState;

use super::status::{PollingStationStatus, PollingStationStatusEntry};

pub struct PollingStations(SqlitePool);

impl PollingStations {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    /// List all polling stations from an election
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

    /// Get a single polling from an election
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

    /// Create a single polling station for an election
    pub async fn create(
        &self,
        election_id: u32,
        new_polling_station: PollingStationRequest,
    ) -> Result<PollingStation, sqlx::Error> {
        query_as!(
            PollingStation,
            r#"
            INSERT INTO polling_stations (
              election_id,
              name,
              number,
              number_of_voters,
              polling_station_type,
              street,
              house_number,
              house_number_addition,
              postal_code,
              locality
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
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
            "#,
            election_id,
            new_polling_station.name,
            new_polling_station.number,
            new_polling_station.number_of_voters,
            new_polling_station.polling_station_type,
            new_polling_station.street,
            new_polling_station.house_number,
            new_polling_station.house_number_addition,
            new_polling_station.postal_code,
            new_polling_station.locality,
        )
        .fetch_one(&self.0)
        .await
    }

    /// Update a single polling station for an election
    pub async fn update(
        &self,
        polling_station_id: u32,
        polling_station_update: PollingStationRequest,
    ) -> Result<bool, sqlx::Error> {
        let rows_affected = query!(
            r#"
            UPDATE polling_stations
            SET
              name = ?,
              number = ?,
              number_of_voters = ?,
              polling_station_type = ?,
              street = ?,
              house_number = ?,
              house_number_addition = ?,
              postal_code = ?,
              locality = ?
            WHERE
              id = ?
            "#,
            polling_station_update.name,
            polling_station_update.number,
            polling_station_update.number_of_voters,
            polling_station_update.polling_station_type,
            polling_station_update.street,
            polling_station_update.house_number,
            polling_station_update.house_number_addition,
            polling_station_update.postal_code,
            polling_station_update.locality,
            polling_station_id,
        )
        .execute(&self.0)
        .await?
        .rows_affected();

        Ok(rows_affected > 0)
    }

    /// Delete a single polling station for an election
    pub async fn delete(&self, polling_station_id: u32) -> Result<bool, sqlx::Error> {
        let rows_affected = query!(
            r#"DELETE FROM polling_stations WHERE id = ?"#,
            polling_station_id,
        )
        .execute(&self.0)
        .await?
        .rows_affected();

        Ok(rows_affected > 0)
    }

    /// Get or create a polling station status entry
    pub async fn get_or_create_status(
        &self,
        polling_station_id: u32,
    ) -> Result<PollingStationStatusEntry, sqlx::Error> {
        let result = query_as!(
            PollingStationStatusEntry,
            r#"
SELECT
  psse.polling_station_id AS "polling_station_id: u32",
  psse.status AS "status: _",

  CASE
    WHEN de.polling_station_id IS NULL THEN NULL
    WHEN de.finalised_at IS NOT NULL THEN NULL
    ELSE de.progress
    END AS "data_entry_progress: u8"

FROM polling_station_status_entries AS psse
LEFT JOIN polling_station_data_entries AS de ON de.polling_station_id = psse.polling_station_id
WHERE psse.polling_station_id = $1"#,
            polling_station_id
        )
        .fetch_optional(&self.0)
        .await?;

        if let Some(r) = result {
            Ok(r)
        } else {
            let default_state = serde_json::to_value(PollingStationStatus::default())
                .expect("should always be serializable to JSON");

            // TODO: Should we use a transaction here?
            query!(
                r#"
INSERT INTO polling_station_status_entries(polling_station_id, status)
VALUES ($1, $2)
"#,
                polling_station_id,
                default_state,
            )
            .execute(&self.0)
            .await?;

            self.status(polling_station_id).await
        }
    }

    pub async fn update_status(
        &self,
        polling_station_id: u32,
        state: PollingStationStatus,
    ) -> Result<(), sqlx::Error> {
        let state = serde_json::to_value(state).expect("should always be serializable to JSON");

        query!(
            r#"
UPDATE polling_station_status_entries
SET status = $2
WHERE polling_station_id = $1"#,
            polling_station_id,
            state,
        )
        .execute(&self.0)
        .await?;
        Ok(())
    }

    /// Gets the status of a single polling station.
    pub async fn status(
        &self,
        polling_station_id: u32,
    ) -> Result<PollingStationStatusEntry, sqlx::Error> {
        query_as!(
            PollingStationStatusEntry,
            r#"
SELECT
  psse.polling_station_id AS "polling_station_id: u32",
  psse.status AS "status: _",

  CASE
    WHEN de.polling_station_id IS NULL THEN NULL
    WHEN de.finalised_at IS NOT NULL THEN NULL
    ELSE de.progress
    END AS "data_entry_progress: u8"

FROM polling_station_status_entries AS psse
LEFT JOIN polling_station_data_entries AS de ON de.polling_station_id = psse.polling_station_id
WHERE psse.polling_station_id = $1"#,
            polling_station_id
        )
        .fetch_one(&self.0)
        .await
    }

    /// Determines the status of the polling station.
    /// - When an entry of the polling station is found in the `polling_station_data_entries` table, and the `client_state.continue` value is true the status is FirstEntryInProgress
    /// - When an entry of the polling station is found in the `polling_station_data_entries` table, and the `client_state.continue` value is false the status is FirstEntryUnfinished
    /// - When an entry of the polling station is found in the `polling_station_results` table, the status is Definitive
    /// - If no entries are found, it has the NotStarted status
    ///
    /// The implementation and determination will probably change while we implement more statuses
    pub async fn statuses(
        &self,
        election_id: u32,
    ) -> Result<Vec<PollingStationStatusEntry>, sqlx::Error> {
        query_as!(
            PollingStationStatusEntry,
            r#"
SELECT
  psse.polling_station_id AS "polling_station_id: u32",
  psse.status AS "status: _",

  CASE
    WHEN de.polling_station_id IS NULL THEN NULL
    WHEN de.finalised_at IS NOT NULL THEN NULL
    ELSE de.progress
    END AS "data_entry_progress: u8"

FROM polling_stations AS p
LEFT JOIN polling_station_status_entries AS psse ON psse.polling_station_id = p.id
LEFT JOIN polling_station_data_entries AS de ON de.polling_station_id = p.id
WHERE election_id = $1
"#,
            election_id
        )
        .fetch_all(&self.0)
        .await
    }
}

impl FromRef<AppState> for PollingStations {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
