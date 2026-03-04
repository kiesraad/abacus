use sqlx::SqliteConnection;

use crate::{
    domain::{committee_session::CommitteeSession, polling_station::PollingStationsForSession},
    repository::polling_station_repo,
};

#[derive(Debug)]
pub enum PollingStationServiceError {
    DatabaseError(sqlx::Error),
}

impl From<sqlx::Error> for PollingStationServiceError {
    fn from(err: sqlx::Error) -> Self {
        Self::DatabaseError(err)
    }
}

pub async fn list_for_session(
    conn: &mut SqliteConnection,
    committee_session: &CommitteeSession,
) -> Result<PollingStationsForSession, PollingStationServiceError> {
    if committee_session.is_next_session() {
        Ok(PollingStationsForSession::Next(
            polling_station_repo::list_next_session(conn, committee_session.id).await?,
        ))
    } else {
        Ok(PollingStationsForSession::First(
            polling_station_repo::list_first_session(conn, committee_session.id).await?,
        ))
    }
}
