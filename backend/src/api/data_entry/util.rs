use sqlx::SqliteConnection;

use crate::{
    APIError,
    domain::{
        committee_session::CommitteeSession,
        committee_session_status::{CommitteeSessionError, CommitteeSessionStatus},
        data_entry_status::DataEntryStatus,
        election::ElectionWithPoliticalGroups,
        polling_station::PollingStation,
    },
    error::ErrorReference,
    infra::authentication::{Role, User, error::AuthenticationError},
    repository::{
        committee_session_repo, data_entry_repo, election_repo,
        investigation_repo::get_polling_station_investigation, polling_station_repo,
    },
};

pub async fn validate_and_get_data(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    user: &User,
) -> Result<
    (
        PollingStation,
        ElectionWithPoliticalGroups,
        CommitteeSession,
        DataEntryStatus,
    ),
    APIError,
> {
    let polling_station = polling_station_repo::get(conn, polling_station_id).await?;
    let committee_session =
        committee_session_repo::get(conn, polling_station.committee_session_id).await?;
    let election = election_repo::get(conn, committee_session.election_id).await?;

    let data_entry_status =
        data_entry_repo::get_or_default(conn, polling_station_id, committee_session.id).await?;

    // Validate polling station
    if committee_session.is_next_session() {
        match get_polling_station_investigation(conn, polling_station.id).await {
            Ok(investigation) if investigation.corrected_results == Some(true) => {}
            _ => {
                return Err(APIError::Conflict(
                    "Data entry not allowed, no investigation with corrected results.".to_string(),
                    ErrorReference::DataEntryNotAllowed,
                ));
            }
        }
    }

    // Validate state based on user role
    match user.role() {
        Role::Typist => {
            if committee_session.status == CommitteeSessionStatus::DataEntryPaused {
                return Err(CommitteeSessionError::CommitteeSessionPaused.into());
            } else if committee_session.status != CommitteeSessionStatus::DataEntryInProgress {
                return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
            }
        }
        Role::Coordinator => {
            if committee_session.status != CommitteeSessionStatus::DataEntryInProgress
                && committee_session.status != CommitteeSessionStatus::DataEntryPaused
            {
                return Err(CommitteeSessionError::InvalidCommitteeSessionStatus.into());
            }
        }
        _ => {
            return Err(AuthenticationError::Forbidden.into());
        }
    }

    Ok((
        polling_station,
        election,
        committee_session,
        data_entry_status,
    ))
}
