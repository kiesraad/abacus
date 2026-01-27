use sqlx::{SqliteConnection, query_as};

use super::structs::{
    PollingStationInvestigation, PollingStationInvestigationConcludeRequest,
    PollingStationInvestigationCreateRequest,
};
use crate::{committee_session::CommitteeSessionId, polling_station::PollingStationId};

pub async fn create_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    polling_station_investigation: PollingStationInvestigationCreateRequest,
) -> Result<PollingStationInvestigation, sqlx::Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
        INSERT INTO polling_station_investigations (
          polling_station_id,
          reason
        ) VALUES (?,?)
        RETURNING
          polling_station_id as "polling_station_id: PollingStationId",
          reason,
          findings,
          corrected_results as "corrected_results: bool"
        "#,
        polling_station_id,
        polling_station_investigation.reason,
    )
    .fetch_one(conn)
    .await
}

pub async fn conclude_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    polling_station_investigation: PollingStationInvestigationConcludeRequest,
) -> Result<PollingStationInvestigation, sqlx::Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
        UPDATE polling_station_investigations
        SET
          findings = ?,
          corrected_results = ?
        WHERE
          polling_station_id = ?
        RETURNING
          polling_station_id as "polling_station_id: PollingStationId",
          reason,
          findings,
          corrected_results as "corrected_results: bool"
        "#,
        polling_station_investigation.findings,
        polling_station_investigation.corrected_results,
        polling_station_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn update_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    polling_station_investigation: super::structs::PollingStationInvestigationUpdateRequest,
) -> Result<PollingStationInvestigation, sqlx::Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
        UPDATE polling_station_investigations
        SET
          reason = ?,
          findings = ?,
          corrected_results = ?
        WHERE
          polling_station_id = ?
        RETURNING
          polling_station_id as "polling_station_id: PollingStationId",
          reason,
          findings,
          corrected_results as "corrected_results: bool"
        "#,
        polling_station_investigation.reason,
        polling_station_investigation.findings,
        polling_station_investigation.corrected_results,
        polling_station_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn get_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<PollingStationInvestigation, sqlx::Error> {
    query_as("SELECT * FROM polling_station_investigations WHERE polling_station_id = ?")
        .bind(polling_station_id)
        .fetch_one(conn)
        .await
}

pub async fn delete_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<Option<PollingStationInvestigation>, sqlx::Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
            DELETE FROM polling_station_investigations
            WHERE polling_station_id = ?
            RETURNING
                polling_station_id AS "polling_station_id: PollingStationId",
                reason,
                findings,
                corrected_results as "corrected_results: bool"
        "#,
        polling_station_id,
    )
    .fetch_optional(conn)
    .await
}

pub async fn list_investigations_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStationInvestigation>, sqlx::Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
        SELECT
            psi.polling_station_id as "polling_station_id: PollingStationId",
            psi.reason,
            psi.findings,
            psi.corrected_results as "corrected_results: bool"
        FROM polling_station_investigations psi
        JOIN polling_stations ps ON ps.id = psi.polling_station_id
        WHERE ps.committee_session_id = ?
        "#,
        committee_session_id,
    )
    .fetch_all(conn)
    .await
}

#[cfg(test)]
pub async fn insert_test_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    corrected_results: Option<bool>,
) -> Result<(), sqlx::Error> {
    use sqlx::query;

    query!(
        "INSERT INTO polling_station_investigations (polling_station_id, reason, findings, corrected_results) VALUES (?, ?, ?, ?)",
        polling_station_id,
        "Test reason",
        "Test findings",
        corrected_results
    )
    .execute(conn)
    .await?;
    Ok(())
}
