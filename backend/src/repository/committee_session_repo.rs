use chrono::NaiveDateTime;
use sqlx::{Connection, SqliteConnection, query, query_as, query_scalar};

use crate::{
    domain::{
        committee_session::{CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionId},
        committee_session_status::CommitteeSessionStatus,
        election::{CommitteeCategory, ElectionId},
    },
    repository::polling_station_repo::duplicate_for_committee_session,
};

/// Returns the committee category for the related election
pub async fn get_committee_category(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<CommitteeCategory, sqlx::Error> {
    query_scalar!(
        r#"
        SELECT e.committee_category
        FROM committee_sessions AS c
        JOIN elections AS e ON c.election_id = e.id
        WHERE c.id = ?
        "#,
        committee_session_id
    )
    .fetch_one(conn)
    .await
}

pub async fn get(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<CommitteeSession, sqlx::Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            id,
            number,
            election_id,
            status,
            location,
            start_date_time
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
    committee_session_id: CommitteeSessionId,
) -> Result<Option<CommitteeSession>, sqlx::Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            prev.id,
            prev.number,
            prev.election_id,
            prev.status,
            prev.location,
            prev.start_date_time
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
    election_id: ElectionId,
) -> Result<Vec<CommitteeSession>, sqlx::Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            id,
            number,
            election_id,
            status,
            location,
            start_date_time
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
    election_id: ElectionId,
) -> Result<CommitteeSession, sqlx::Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            id,
            number,
            election_id,
            status,
            location,
            start_date_time
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
) -> Result<Vec<CommitteeSession>, sqlx::Error> {
    query_as!(
        CommitteeSession,
        r#"
        SELECT
            id,
            number,
            election_id,
            status,
            location,
            start_date_time
        FROM (
            SELECT
            id,
            number,
            election_id,
            status,
            location,
            start_date_time,
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
) -> Result<CommitteeSession, sqlx::Error> {
    let mut tx = conn.begin().await?;

    let current_committee_session_id =
        get_current_id_for_election(&mut tx, committee_session.election_id).await?;

    let next_committee_session = query_as!(
        CommitteeSession,
        r#"
        INSERT INTO committee_sessions (
            number,
            election_id,
            location
        ) VALUES (?, ?, ?)
        RETURNING
            id as "id!: CommitteeSessionId",
            number,
            election_id,
            status,
            location,
            start_date_time
        "#,
        committee_session.number,
        committee_session.election_id,
        ""
    )
    .fetch_one(&mut *tx)
    .await?;

    if let Some(current_committee_session_id) = current_committee_session_id {
        duplicate_for_committee_session(
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
pub async fn delete(
    conn: &mut SqliteConnection,
    committee_session_id: CommitteeSessionId,
) -> Result<bool, sqlx::Error> {
    let mut tx = conn.begin().await?;

    query!(
        "DELETE FROM sub_committees WHERE committee_session_id = ?",
        committee_session_id,
    )
    .execute(&mut *tx)
    .await?;

    query!(
        "DELETE FROM polling_stations WHERE committee_session_id = ?",
        committee_session_id,
    )
    .execute(&mut *tx)
    .await?;

    let rows_affected = query!(
        r#"DELETE FROM committee_sessions WHERE id = ?"#,
        committee_session_id
    )
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
    committee_session_id: CommitteeSessionId,
    location: String,
    start_date_time: NaiveDateTime,
) -> Result<CommitteeSession, sqlx::Error> {
    query_as!(
        CommitteeSession,
        r#"
        UPDATE committee_sessions
        SET
            location = ?,
            start_date_time = ?
        WHERE id = ?
        RETURNING
            id,
            number,
            election_id,
            status,
            location,
            start_date_time
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
    committee_session_id: CommitteeSessionId,
    committee_session_status: CommitteeSessionStatus,
) -> Result<CommitteeSession, sqlx::Error> {
    query_as!(
        CommitteeSession,
        r#"
        UPDATE committee_sessions
        SET status = ?
        WHERE id = ?
        RETURNING
            id,
            number,
            election_id,
            status,
            location,
            start_date_time
        "#,
        committee_session_status,
        committee_session_id,
    )
    .fetch_one(conn)
    .await
}

pub async fn get_current_id_for_election(
    conn: &mut SqliteConnection,
    election_id: ElectionId,
) -> Result<Option<CommitteeSessionId>, sqlx::Error> {
    query!(
        r#"
        SELECT id
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
