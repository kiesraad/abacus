use sqlx::SqlitePool;

use crate::{
    election::repository::Elections,
    polling_station::repository::{PollingStationDataEntries, PollingStations},
};

#[derive(Clone)]
pub struct Repository {
    pool: SqlitePool,
}

impl Repository {

    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub fn elections(&self) -> Elections<'_> {
        Elections(self)
    }
    pub fn polling_stations(&self) -> PollingStations<'_> {
        PollingStations(self)
    }

    pub fn polling_station_data_entries(&self) -> PollingStationDataEntries<'_> {
        PollingStationDataEntries(self)
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
