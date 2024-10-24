use axum::extract::FromRef;
use sqlx::{query_as, SqlitePool};

use crate::polling_station::structs::{PollingStation, PollingStationStatusEntry};
use crate::AppState;

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

    /// Determines the status of the polling station.
    /// - When an entry of the polling station is found in the `polling_station_data_entries` table, and the `client_state.continue` value is true the status is FirstEntryInProgress
    /// - When an entry of the polling station is found in the `polling_station_data_entries` table, and the `client_state.continue` value is false the status is FirstEntryUnfinished
    /// - When an entry of the polling station is found in the `polling_station_results` table, the status is Definitive
    /// - If no entries are found, it has the NotStarted status
    ///
    /// The implementation and determination will probably change while we implement more statuses
    pub async fn status(
        &self,
        election_id: u32,
    ) -> Result<Vec<PollingStationStatusEntry>, sqlx::Error> {
        query_as!(
            PollingStationStatusEntry,
            r#"
SELECT p.id AS "id: u32",
CASE
  WHEN de.polling_station_id IS NOT NULL THEN 
  (CASE WHEN json_extract(de.client_state, '$.continue') = true THEN 'FirstEntryInProgress' ELSE 'FirstEntryUnfinished' END)
  WHEN r.polling_station_id IS NOT NULL THEN 'Definitive'
  ELSE 'NotStarted' END AS "status!: _"
FROM polling_stations AS p
LEFT JOIN polling_station_results AS r ON r.polling_station_id = p.id
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
