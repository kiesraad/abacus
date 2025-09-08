use sqlx::{Error, query, query_as};

use super::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionUpdateRequest,
    PollingStationInvestigation, PollingStationInvestigationConcludeRequest,
    PollingStationInvestigationCreateRequest, status::CommitteeSessionStatus,
};

use crate::DbConnLike;

pub async fn get(
    conn: impl DbConnLike<'_>,
    committee_session_id: u32,
) -> Result<CommitteeSession, Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date,
            start_time,
            number_of_voters as "number_of_voters: u32"
        FROM committee_sessions
        WHERE id = ?
        "#,
        committee_session_id
    )
    .fetch_one(conn)
    .await
}

pub async fn get_election_committee_session_list(
    conn: impl DbConnLike<'_>,
    election_id: u32,
) -> Result<Vec<CommitteeSession>, Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date,
            start_time,
            number_of_voters as "number_of_voters: u32"
        FROM committee_sessions
        WHERE election_id = ?
        ORDER BY number DESC
        "#,
        election_id
    )
    .fetch_all(conn)
    .await
}

pub async fn get_election_committee_session(
    conn: impl DbConnLike<'_>,
    election_id: u32,
) -> Result<CommitteeSession, Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date,
            start_time,
            number_of_voters as "number_of_voters: u32"
        FROM committee_sessions
        WHERE election_id = ?
        ORDER BY number DESC
        LIMIT 1
        "#,
        election_id
    )
    .fetch_one(conn)
    .await
}

pub async fn get_committee_session_for_each_election(
    conn: impl DbConnLike<'_>,
) -> Result<Vec<CommitteeSession>, Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date,
            start_time,
            number_of_voters as "number_of_voters: u32"
        FROM (
            SELECT
            id,
            number,
            election_id,
            status,
            location,
            start_date,
            start_time,
            number_of_voters,
            row_number() over (
            PARTITION BY election_id
            ORDER BY number DESC
            ) AS row_number FROM committee_sessions
        ) t WHERE t.row_number = 1
        "#,
    )
    .fetch_all(conn)
    .await
}

pub async fn create_polling_station_investigation(
    conn: impl DbConnLike<'_>,
    committee_session_id: u32,
    polling_station_investigation: PollingStationInvestigationCreateRequest,
) -> Result<PollingStationInvestigation, Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
        INSERT INTO polling_station_investigations (
          committee_session_id,
          polling_station_id,
          reason
        ) VALUES (?,?,?)
        RETURNING
          id as "id: u32",
          polling_station_id as "polling_station_id: u32",
          reason,
          findings,
          corrected_results as "corrected_results: bool"
        "#,
        committee_session_id,
        polling_station_investigation.polling_station_id,
        polling_station_investigation.reason,
    )
    .fetch_one(conn)
    .await
}

pub async fn conclude_polling_station_investigation(
    conn: impl DbConnLike<'_>,
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
          id = ?
        RETURNING
          id as "id: u32",
          polling_station_id as "polling_station_id: u32",
          reason,
          findings,
          corrected_results as "corrected_results: bool"
        "#,
        polling_station_investigation.findings,
        polling_station_investigation.corrected_results,
        polling_station_investigation.id,
    )
    .fetch_one(conn)
    .await
}

pub async fn create(
    conn: impl DbConnLike<'_>,
    committee_session: CommitteeSessionCreateRequest,
) -> Result<CommitteeSession, Error> {
    let mut tx = conn.begin_immediate().await?;

    let current_committee_session_id =
        get_current_id_for_election(&mut *tx, committee_session.election_id).await?;

    let next_committee_session = query_as!(
        CommitteeSession,
        r#"
        INSERT INTO committee_sessions (
            number,
            election_id,
            location,
            start_date,
            start_time,
            number_of_voters
        ) VALUES (?, ?, ?, ?, ?, ?)
        RETURNING
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date,
            start_time,
            number_of_voters as "number_of_voters: u32"
        "#,
        committee_session.number,
        committee_session.election_id,
        "",
        "",
        "",
        committee_session.number_of_voters,
    )
    .fetch_one(&mut *tx)
    .await?;

    if let Some(current_committee_session_id) = current_committee_session_id {
        crate::polling_station::repository::duplicate_for_committee_session(
            &mut *tx,
            current_committee_session_id,
            next_committee_session.id,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(next_committee_session)
}

/// Delete a committee session
pub async fn delete(conn: impl DbConnLike<'_>, id: u32) -> Result<bool, Error> {
    let mut tx = conn.begin_immediate().await?;

    query!(
        "DELETE FROM polling_stations WHERE committee_session_id = ?",
        id,
    )
    .execute(&mut *tx)
    .await?;

    let rows_affected = query!(r#"DELETE FROM committee_sessions WHERE id = ?"#, id)
        .execute(&mut *tx)
        .await?
        .rows_affected();

    // something weird is happening, rollback
    if rows_affected != 1 {
        tx.rollback().await?;
        return Ok(false);
    }

    tx.commit().await?;

    Ok(rows_affected > 0)
}

pub async fn update(
    conn: impl DbConnLike<'_>,
    committee_session_id: u32,
    committee_session_update: CommitteeSessionUpdateRequest,
) -> Result<CommitteeSession, Error> {
    query_as!(
        CommitteeSession,
        r#"
        UPDATE committee_sessions
        SET
            location = ?,
            start_date = ?,
            start_time = ?
        WHERE id = ?
        RETURNING
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date,
            start_time,
            number_of_voters as "number_of_voters: u32"
        "#,
        committee_session_update.location,
        committee_session_update.start_date,
        committee_session_update.start_time,
        committee_session_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn change_number_of_voters(
    conn: impl DbConnLike<'_>,
    committee_session_id: u32,
    number_of_voters: u32,
) -> Result<CommitteeSession, Error> {
    query_as!(
        CommitteeSession,
        r#"
        UPDATE committee_sessions
        SET number_of_voters = ?
        WHERE id = ?
        RETURNING
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date,
            start_time,
            number_of_voters as "number_of_voters: u32"
        "#,
        number_of_voters,
        committee_session_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn change_status(
    conn: impl DbConnLike<'_>,
    committee_session_id: u32,
    committee_session_status: CommitteeSessionStatus,
) -> Result<CommitteeSession, Error> {
    query_as!(
        CommitteeSession,
        r#"
        UPDATE committee_sessions
        SET status = ?
        WHERE id = ?
        RETURNING
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date,
            start_time,
            number_of_voters as "number_of_voters: u32"
        "#,
        committee_session_status,
        committee_session_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn get_current_id_for_election(
    conn: impl DbConnLike<'_>,
    election_id: u32,
) -> Result<Option<u32>, Error> {
    query!(
        r#"
        SELECT id AS "id: u32"
        FROM committee_sessions
        WHERE election_id = ?
        ORDER BY number DESC
        LIMIT 1
        "#,
        election_id
    )
    .fetch_optional(conn)
    .await
    .map(|record| record.map(|r| r.id))
}

pub async fn investigations(
    conn: impl DbConnLike<'_>,
    committee_session_id: u32,
) -> Result<Vec<PollingStationInvestigation>, Error> {
    query_as!(
        PollingStationInvestigation,
        r#"
        SELECT
            id as "id: u32",
polling_station_id as "polling_station_id: u32",
reason,
findings,
corrected_results as "corrected_results: bool"
FROM polling_station_investigations
WHERE committee_session_id = ?
        "#,
        committee_session_id,
    )
    .fetch_all(conn)
    .await
}
