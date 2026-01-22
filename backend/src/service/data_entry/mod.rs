use sqlx::{Connection, SqliteConnection, query, types::Json};

use crate::{
    APIError,
    api::util::change_committee_session_status::change_committee_session_status,
    domain::{
        committee_session::CommitteeSession,
        committee_session_status::{CommitteeSessionError, CommitteeSessionStatus},
        data_entry_status::DataEntryStatus,
        election::ElectionWithPoliticalGroups,
        polling_station::PollingStation,
        polling_station_results::PollingStationResults,
    },
    error::ErrorReference,
    infra::{
        audit_log::{AuditEvent, AuditService},
        authentication::{Role, User, error::AuthenticationError},
    },
    repository::{
        committee_session_repo, data_entry_repo, election_repo,
        investigation_repo::get_polling_station_investigation, polling_station_repo,
        polling_station_result_repo,
    },
};

pub async fn make_definitive(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    committee_session_id: u32,
    new_state: &DataEntryStatus,
    definitive_entry: &PollingStationResults,
) -> Result<(), sqlx::Error> {
    let mut tx = conn.begin().await?;

    let definitive_entry = Json(definitive_entry);
    query!(
        "INSERT INTO polling_station_results (polling_station_id, committee_session_id, data) VALUES ($1, $2, $3)",
        polling_station_id,
        committee_session_id,
        definitive_entry,
    )
        .execute(&mut *tx)
        .await?;

    let new_state = Json(new_state);
    query!(
        r#"
            INSERT INTO polling_station_data_entries (polling_station_id, committee_session_id, state)
            VALUES (?, ?, ?)
            ON CONFLICT(polling_station_id, committee_session_id) DO
            UPDATE SET
                state = excluded.state,
                updated_at = CURRENT_TIMESTAMP
        "#,
        polling_station_id,
        committee_session_id,
        new_state
    )
        .execute(&mut *tx)
        .await?;

    tx.commit().await?;

    Ok(())
}

pub async fn delete_data_entry_and_result_for_polling_station(
    conn: &mut SqliteConnection,
    audit_service: &AuditService,
    committee_session: &CommitteeSession,
    polling_station_id: u32,
) -> Result<(), APIError> {
    if let Some(data_entry) = data_entry_repo::delete_data_entry(conn, polling_station_id).await? {
        audit_service
            .log(conn, &AuditEvent::DataEntryDeleted(data_entry.into()), None)
            .await?;
    }
    if let Some(result) =
        polling_station_result_repo::delete_result(conn, polling_station_id).await?
    {
        audit_service
            .log(conn, &AuditEvent::ResultDeleted(result.into()), None)
            .await?;
        if committee_session.status == CommitteeSessionStatus::DataEntryFinished {
            change_committee_session_status(
                conn,
                committee_session.id,
                CommitteeSessionStatus::DataEntryInProgress,
                audit_service.clone(),
            )
            .await?;
        }
    }
    Ok(())
}

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
