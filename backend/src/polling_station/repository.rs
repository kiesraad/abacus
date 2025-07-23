use axum::extract::FromRef;
use sqlx::{QueryBuilder, SqlitePool, query, query_as};

use super::structs::{PollingStation, PollingStationRequest};
use crate::AppState;

pub struct PollingStations(SqlitePool);

impl PollingStations {
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
                polling_station_type AS "polling_station_type: _",
                address,
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

    /// Get a single polling station
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
                polling_station_type AS "polling_station_type: _",
                address,
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

    /// Get a single polling station for an election
    pub async fn get_for_election(
        &self,
        election_id: u32,
        id: u32,
    ) -> Result<PollingStation, sqlx::Error> {
        query_as!(
            PollingStation,
            r#"
            SELECT
                id AS "id: u32",
                election_id AS "election_id: u32",
                name,
                number,
                number_of_voters,
                polling_station_type AS "polling_station_type: _",
                address,
                postal_code,
                locality
            FROM polling_stations
            WHERE id = $1 AND election_id = $2
            "#,
            id,
            election_id
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
              address,
              postal_code,
              locality
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING
              id AS "id: u32",
              election_id AS "election_id: u32",
              name,
              number,
              number_of_voters,
              polling_station_type AS "polling_station_type: _",
              address,
              postal_code,
              locality
            "#,
            election_id,
            new_polling_station.name,
            new_polling_station.number,
            new_polling_station.number_of_voters,
            new_polling_station.polling_station_type,
            new_polling_station.address,
            new_polling_station.postal_code,
            new_polling_station.locality,
        )
        .fetch_one(&self.0)
        .await
    }

    /// Create many polling stations for an election
    pub async fn create_many(
        &self,
        election_id: u32,
        new_polling_stations: Vec<PollingStationRequest>,
    ) -> Result<Vec<PollingStation>, sqlx::Error> {
        // Max number of parameters for a statement
        // See: https://www.sqlite.org/limits.html
        const BIND_LIMIT: usize = 999;

        let mut stations: Vec<PollingStation> = Vec::new();

        let batches = new_polling_stations.chunks(BIND_LIMIT / 8);
        for batch in batches {
            let mut inserted: Vec<PollingStation> = QueryBuilder::new(
                "INSERT INTO polling_stations (election_id, name, number, number_of_voters, polling_station_type, address, postal_code, locality) "
              ).push_values(batch.iter(), |mut b, station| {
                b.push_bind(election_id)
                 .push_bind(&station.name)
                 .push_bind(station.number)
                 .push_bind(station.number_of_voters)
                 .push_bind(&station.polling_station_type)
                 .push_bind(&station.address)
                 .push_bind(&station.postal_code)
                 .push_bind(&station.locality);
              })
              .push(" RETURNING id, election_id, name, number, number_of_voters, polling_station_type, address, postal_code, locality")
              .build_query_as()
              .fetch_all(&self.0)
              .await?;
            stations.append(&mut inserted);
        }

        Ok(stations)
    }

    /// Update a single polling station for an election
    pub async fn update(
        &self,
        election_id: u32,
        polling_station_id: u32,
        polling_station_update: PollingStationRequest,
    ) -> Result<PollingStation, sqlx::Error> {
        query_as!(
            PollingStation,
            r#"
            UPDATE polling_stations
            SET
              name = ?,
              number = ?,
              number_of_voters = ?,
              polling_station_type = ?,
              address = ?,
              postal_code = ?,
              locality = ?
            WHERE
              id = ? AND election_id = ?
            RETURNING
                id AS "id: u32",
                election_id AS "election_id: u32",
                name,
                number,
                number_of_voters,
                polling_station_type AS "polling_station_type: _",
                address,
                postal_code,
                locality
            "#,
            polling_station_update.name,
            polling_station_update.number,
            polling_station_update.number_of_voters,
            polling_station_update.polling_station_type,
            polling_station_update.address,
            polling_station_update.postal_code,
            polling_station_update.locality,
            polling_station_id,
            election_id,
        )
        .fetch_one(&self.0)
        .await
    }

    /// Delete a single polling station for an election
    pub async fn delete(&self, election_id: u32, id: u32) -> Result<bool, sqlx::Error> {
        let rows_affected = query!(
            r#"DELETE FROM polling_stations WHERE id = ? AND election_id = ?"#,
            id,
            election_id,
        )
        .execute(&self.0)
        .await?
        .rows_affected();

        Ok(rows_affected > 0)
    }
}

impl FromRef<AppState> for PollingStations {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
