use chrono::NaiveDateTime;
use sqlx::{Connection, Error, SqliteConnection, query, query_as};

use super::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionFilesUpdateRequest,
    status::CommitteeSessionStatus,
};

pub async fn get(
    conn: &mut SqliteConnection,
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
            start_date_time as "start_date_time: _",
            results_eml as "results_eml: _",
            results_pdf as "results_pdf: _",
            overview_pdf as "overview_pdf: _"
        FROM committee_sessions
        WHERE id = ?
        "#,
        committee_session_id
    )
    .fetch_one(conn)
    .await
}

pub async fn get_previous_session(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
) -> Result<Option<CommitteeSession>, Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            prev.id as "id: u32",
            prev.number as "number: u32",
            prev.election_id as "election_id: u32",
            prev.status as "status: _",
            prev.location,
            prev.start_date_time as "start_date_time: _",
            prev.results_eml as "results_eml: _",
            prev.results_pdf as "results_pdf: _",
            prev.overview_pdf as "overview_pdf: _"
        FROM committee_sessions AS c
        JOIN committee_sessions AS prev ON c.election_id = prev.election_id AND c.number = prev.number + 1
        WHERE c.id = ?
        "#,
        committee_session_id
    )
    .fetch_optional(conn)
    .await
}

pub async fn get_election_committee_session_list(
    conn: &mut SqliteConnection,
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
            start_date_time as "start_date_time: _",
            results_eml as "results_eml: _",
            results_pdf as "results_pdf: _",
            overview_pdf as "overview_pdf: _"
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
    conn: &mut SqliteConnection,
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
            start_date_time as "start_date_time: _",
            results_eml as "results_eml: _",
            results_pdf as "results_pdf: _",
            overview_pdf as "overview_pdf: _"
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
    conn: &mut SqliteConnection,
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
            start_date_time as "start_date_time: _",
            results_eml as "results_eml: _",
            results_pdf as "results_pdf: _",
            overview_pdf as "overview_pdf: _"
        FROM (
            SELECT
            id,
            number,
            election_id,
            status,
            location,
            start_date_time,
            results_eml,
            results_pdf,
            overview_pdf,
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

pub async fn create(
    conn: &mut SqliteConnection,
    committee_session: CommitteeSessionCreateRequest,
) -> Result<CommitteeSession, Error> {
    let mut tx = conn.begin().await?;

    let current_committee_session_id =
        get_current_id_for_election(&mut tx, committee_session.election_id).await?;

    let next_committee_session = query_as!(
        CommitteeSession,
        r#"
        INSERT INTO committee_sessions (
            number,
            election_id,
            location,
            start_date_time
        ) VALUES (?, ?, "", NULL)
        RETURNING
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date_time as "start_date_time: _",
            results_eml as "results_eml: _",
            results_pdf as "results_pdf: _",
            overview_pdf as "overview_pdf: _"
        "#,
        committee_session.number,
        committee_session.election_id,
    )
    .fetch_one(&mut *tx)
    .await?;

    if let Some(current_committee_session_id) = current_committee_session_id {
        crate::polling_station::repository::duplicate_for_committee_session(
            &mut tx,
            current_committee_session_id,
            next_committee_session.id,
        )
        .await?;
    }

    tx.commit().await?;

    Ok(next_committee_session)
}

/// Delete a committee session
pub async fn delete(conn: &mut SqliteConnection, id: u32) -> Result<bool, Error> {
    let mut tx = conn.begin().await?;

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
    conn: &mut SqliteConnection,
    committee_session_id: u32,
    location: String,
    start_date_time: NaiveDateTime,
) -> Result<CommitteeSession, Error> {
    query_as!(
        CommitteeSession,
        r#"
        UPDATE committee_sessions
        SET
            location = ?,
            start_date_time = ?
        WHERE id = ?
        RETURNING
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date_time as "start_date_time: _",
            results_eml as "results_eml: _",
            results_pdf as "results_pdf: _",
            overview_pdf as "overview_pdf: _"
        "#,
        location,
        start_date_time,
        committee_session_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn change_status(
    conn: &mut SqliteConnection,
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
            start_date_time as "start_date_time: _",
            results_eml as "results_eml: _",
            results_pdf as "results_pdf: _",
            overview_pdf as "overview_pdf: _"
        "#,
        committee_session_status,
        committee_session_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn change_files(
    conn: &mut SqliteConnection,
    committee_session_id: u32,
    committee_session_files_update: CommitteeSessionFilesUpdateRequest,
) -> Result<CommitteeSession, Error> {
    query_as!(
        CommitteeSession,
        r#"
        UPDATE committee_sessions
        SET
            results_eml = ?,
            results_pdf = ?,
            overview_pdf = ?
        WHERE id = ?
        RETURNING
            id as "id: u32",
            number as "number: u32",
            election_id as "election_id: u32",
            status as "status: _",
            location,
            start_date_time as "start_date_time: _",
            results_eml as "results_eml: _",
            results_pdf as "results_pdf: _",
            overview_pdf as "overview_pdf: _"
        "#,
        committee_session_files_update.results_eml,
        committee_session_files_update.results_pdf,
        committee_session_files_update.overview_pdf,
        committee_session_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn get_current_id_for_election(
    conn: &mut SqliteConnection,
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
