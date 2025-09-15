use sqlx::{Error, SqliteConnection, query_as};

use super::structs::{
    PollingStationInvestigation, PollingStationInvestigationConcludeRequest,
    PollingStationInvestigationCreateRequest,
};

pub async fn create_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: u32,
    polling_station_investigation: PollingStationInvestigationCreateRequest,
) -> Result<PollingStationInvestigation, Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
        INSERT INTO polling_station_investigations (
          polling_station_id,
          reason
        ) VALUES (?,?)
        RETURNING
          polling_station_id as "polling_station_id: u32",
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
    polling_station_id: u32,
    polling_station_investigation: PollingStationInvestigationConcludeRequest,
) -> Result<PollingStationInvestigation, Error> {
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
          polling_station_id as "polling_station_id: u32",
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

pub async fn list_investigations_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
) -> Result<Vec<PollingStationInvestigation>, Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
        SELECT
            psi.polling_station_id as "polling_station_id: u32",
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
