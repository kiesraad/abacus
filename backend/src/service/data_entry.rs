use sqlx::SqliteConnection;

use crate::{
    api::data_entry::ElectionStatusResponseEntry,
    domain::{
        committee_session::CommitteeSession,
        data_entry::DataEntryStatusWithSource,
        election::{CommitteeCategory, Election},
    },
    repository::{polling_station_repo, sub_committee_repo},
};

#[derive(Debug)]
pub enum DataEntryServiceError {
    DatabaseError(sqlx::Error),
}

impl From<sqlx::Error> for DataEntryServiceError {
    fn from(err: sqlx::Error) -> Self {
        Self::DatabaseError(err)
    }
}

fn map_to_response_entry(entry: DataEntryStatusWithSource) -> ElectionStatusResponseEntry {
    let status = &entry.status;
    ElectionStatusResponseEntry {
        data_entry_id: entry.data_entry_id,
        source: entry.source,
        status: status.status_name(),
        first_entry_user_id: status.get_first_entry_user_id(),
        second_entry_user_id: status.get_second_entry_user_id(),
        first_entry_progress: status.get_first_entry_progress(),
        second_entry_progress: status.get_second_entry_progress(),
        finished_at: status.finished_at().cloned(),
        finalised_with_warnings: status.finalised_with_warnings().cloned(),
    }
}

/// Get election statuses for the current committee session,
/// picking the right data source based on committee category and session number.
pub async fn election_statuses(
    conn: &mut SqliteConnection,
    election: &Election,
    committee_session: &CommitteeSession,
) -> Result<Vec<ElectionStatusResponseEntry>, DataEntryServiceError> {
    let is_next_session = committee_session.is_next_session();
    let entries = match (election.committee_category, is_next_session) {
        (CommitteeCategory::GSB, false) => {
            polling_station_repo::list_first_session_with_status(conn, committee_session.id).await?
        }
        (CommitteeCategory::GSB, true) => {
            polling_station_repo::list_next_session_with_status(conn, committee_session.id).await?
        }
        (CommitteeCategory::CSB, false) => {
            sub_committee_repo::list_first_session_with_status(conn, committee_session.id).await?
        }
        (CommitteeCategory::CSB, true) => {
            unreachable!("CSB elections only have a single session")
        }
    };

    Ok(entries.into_iter().map(map_to_response_entry).collect())
}

/// Create a data entry in the Definitive state with given results
#[cfg(test)]
pub async fn create_definitive_data_entry(
    conn: &mut SqliteConnection,
    polling_station_id: crate::domain::polling_station::PollingStationId,
    results: &crate::domain::results::Results,
) -> Result<(), DataEntryServiceError> {
    use crate::{
        domain::data_entry::{DataEntryStatus, Definitive},
        repository::{data_entry_repo, user_repo::UserId},
    };

    let state = DataEntryStatus::Definitive(Definitive {
        first_entry_user_id: UserId::from(5),
        second_entry_user_id: UserId::from(6),
        finished_at: chrono::Utc::now(),
        finalised_with_warnings: false,
        results: results.clone(),
    });

    let data_entry_id = polling_station_repo::ensure_data_entry(conn, polling_station_id)
        .await
        .map_err(DataEntryServiceError::DatabaseError)?;
    data_entry_repo::update(conn, data_entry_id, &state).await?;
    Ok(())
}
