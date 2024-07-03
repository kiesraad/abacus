use std::convert::Infallible;

use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use sqlx::SqlitePool;

use crate::{
    election::repository::Elections,
    polling_station::repository::{PollingStationDataEntries, PollingStations},
};

pub struct Repository {
    pool: SqlitePool,
}

impl Repository {
    #[cfg(test)]
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

#[axum::async_trait]
impl<S> FromRequestParts<S> for Repository
where
    S: Sync,
    SqlitePool: FromRef<S>,
{
    type Rejection = Infallible;

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let pool = SqlitePool::from_ref(state);
        let repo = Self { pool };
        Ok(repo)
    }
}
