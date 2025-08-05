use sqlx::{Error, query_as};

use super::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionUpdateRequest,
    status::CommitteeSessionStatus,
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

pub async fn create(
    conn: impl DbConnLike<'_>,
    committee_session: CommitteeSessionCreateRequest,
) -> Result<CommitteeSession, Error> {
    query_as!(
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
    .fetch_one(conn)
    .await
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
