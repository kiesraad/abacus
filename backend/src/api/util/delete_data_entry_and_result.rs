use sqlx::SqliteConnection;

use crate::{
    APIError,
    api::util::change_committee_session_status::change_committee_session_status,
    domain::{
        committee_session::CommitteeSession, committee_session_status::CommitteeSessionStatus,
    },
    infra::audit_log::{AuditEvent, AuditService},
    repository::{data_entry_repo, polling_station_result_repo},
};

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
