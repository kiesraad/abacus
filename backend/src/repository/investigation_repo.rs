use sqlx::{SqliteConnection, query, types::Json};

use crate::domain::{
    committee_session::CommitteeSessionId,
    investigation::{
        PollingStationInvestigation, PollingStationInvestigationConcludeRequest,
        PollingStationInvestigationCreateRequest, PollingStationInvestigationUpdateRequest,
    },
    polling_station::PollingStationId,
};

async fn save(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    investigation: &PollingStationInvestigation,
) -> Result<(), sqlx::Error> {
    let state = Json(investigation);
    let result = query!(
        "UPDATE polling_stations SET investigation_state = ? WHERE id = ?",
        state,
        polling_station_id,
    )
    .execute(conn)
    .await?;

    if result.rows_affected() == 0 {
        return Err(sqlx::Error::RowNotFound);
    }

    Ok(())
}

pub async fn create_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    polling_station_investigation: PollingStationInvestigationCreateRequest,
) -> Result<PollingStationInvestigation, sqlx::Error> {
    let investigation = PollingStationInvestigation {
        polling_station_id,
        reason: polling_station_investigation.reason,
        findings: None,
        corrected_results: None,
    };
    let state = Json(&investigation);

    let result = query!(
        "UPDATE polling_stations SET investigation_state = ? WHERE id = ? AND investigation_state IS NULL",
        state,
        polling_station_id,
    )
    .execute(conn)
    .await?;

    if result.rows_affected() == 0 {
        return Err(sqlx::Error::RowNotFound);
    }

    Ok(investigation)
}

pub async fn conclude_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    polling_station_investigation: PollingStationInvestigationConcludeRequest,
) -> Result<PollingStationInvestigation, sqlx::Error> {
    let mut investigation = get_polling_station_investigation(conn, polling_station_id).await?;
    investigation.findings = Some(polling_station_investigation.findings);
    investigation.corrected_results = Some(polling_station_investigation.corrected_results);
    save(conn, polling_station_id, &investigation).await?;
    Ok(investigation)
}

pub async fn update_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    polling_station_investigation: PollingStationInvestigationUpdateRequest,
) -> Result<PollingStationInvestigation, sqlx::Error> {
    let mut investigation = get_polling_station_investigation(conn, polling_station_id).await?;
    investigation.reason = polling_station_investigation.reason;
    investigation.findings = polling_station_investigation.findings;
    investigation.corrected_results = polling_station_investigation.corrected_results;
    save(conn, polling_station_id, &investigation).await?;
    Ok(investigation)
}

pub async fn get_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<PollingStationInvestigation, sqlx::Error> {
    let row = query!(
        r#"SELECT investigation_state AS "investigation_state: Json<PollingStationInvestigation>"
           FROM polling_stations WHERE id = ?"#,
        polling_station_id,
    )
    .fetch_one(conn)
    .await?;

    row.investigation_state
        .map(|json| json.0)
        .ok_or(sqlx::Error::RowNotFound)
}

pub async fn delete_polling_station_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
) -> Result<Option<PollingStationInvestigation>, sqlx::Error> {
    let row = query!(
        r#"SELECT investigation_state AS "investigation_state: Json<PollingStationInvestigation>"
           FROM polling_stations WHERE id = ?"#,
        polling_station_id,
    )
    .fetch_one(&mut *conn)
    .await?;

    let investigation = row.investigation_state.map(|json| json.0);

    if investigation.is_some() {
        query!(
            "UPDATE polling_stations SET investigation_state = NULL WHERE id = ?",
            polling_station_id,
        )
        .execute(conn)
        .await?;
    }

    Ok(investigation)
}

pub async fn has_investigations_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<bool, sqlx::Error> {
    let result = query!(
        r#"
        SELECT EXISTS(
            SELECT 1 FROM polling_stations
            WHERE committee_session_id = ? AND investigation_state IS NOT NULL
        ) as `exists`"#,
        committee_session_id
    )
    .fetch_one(conn)
    .await?;

    Ok(result.exists == 1)
}

pub async fn list_investigations_for_committee_session(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<Vec<PollingStationInvestigation>, sqlx::Error> {
    let rows = query!(
        r#"
        SELECT investigation_state AS "investigation_state!: Json<PollingStationInvestigation>"
        FROM polling_stations
        WHERE committee_session_id = ? AND investigation_state IS NOT NULL
        "#,
        committee_session_id,
    )
    .fetch_all(conn)
    .await?;

    Ok(rows
        .into_iter()
        .map(|row| row.investigation_state.0)
        .collect())
}

#[cfg(test)]
pub async fn insert_test_investigation(
    conn: &mut SqliteConnection,
    polling_station_id: PollingStationId,
    corrected_results: Option<bool>,
) -> Result<(), sqlx::Error> {
    let investigation = PollingStationInvestigation {
        polling_station_id,
        reason: "Test reason".to_string(),
        findings: Some("Test findings".to_string()),
        corrected_results,
    };
    let state = Json(&investigation);

    query!(
        "UPDATE polling_stations SET investigation_state = ? WHERE id = ?",
        state,
        polling_station_id,
    )
    .execute(&mut *conn)
    .await?;

    Ok(())
}
