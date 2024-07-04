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
    pub const fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub const fn elections(&self) -> Elections<'_> {
        Elections(self)
    }
    pub const fn polling_stations(&self) -> PollingStations<'_> {
        PollingStations(self)
    }

    pub const fn polling_station_data_entries(&self) -> PollingStationDataEntries<'_> {
        PollingStationDataEntries(self)
    }

    pub const fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}
