use crate::repository::Repository;

use sqlx::query_as;

use super::PollingStation;

pub struct PollingStations<'repo>(pub &'repo Repository);

impl PollingStations<'_> {
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
        .fetch_all(self.0.pool())
        .await
    }
}

pub struct PollingStationDataEntries<'repo>(pub &'repo Repository);

impl PollingStationDataEntries<'_> {
    /// Saves the data entry or updates it if it already exists
    pub async fn upsert(&self, id: u32, entry_number: u8, data: String) -> Result<(), sqlx::Error> {
        sqlx::query!("INSERT INTO polling_station_data_entries (polling_station_id, entry_number, data) VALUES (?, ?, ?)\
              ON CONFLICT(polling_station_id, entry_number) DO UPDATE SET data = excluded.data",
            id, entry_number, data)
            .execute(self.0.pool())
            .await?;

        Ok(())
    }
}
