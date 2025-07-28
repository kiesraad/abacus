use axum::extract::FromRef;
use sqlx::{Error, SqlitePool, query_as};

use super::{
    CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionUpdateRequest,
    status::CommitteeSessionStatus,
};

use crate::AppState;

pub struct CommitteeSessions(SqlitePool);

impl CommitteeSessions {
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub async fn get(&self, committee_session_id: u32) -> Result<CommitteeSession, Error> {
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
        .fetch_one(&self.0)
        .await
    }

    pub async fn get_election_committee_session_list(
        &self,
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
        .fetch_all(&self.0)
        .await
    }

    pub async fn get_election_committee_session(
        &self,
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
        .fetch_one(&self.0)
        .await
    }

    pub async fn get_committee_session_for_each_election(
        &self,
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
        .fetch_all(&self.0)
        .await
    }

    pub async fn create(
        &self,
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
              start_time
            ) VALUES (?, ?, ?, ?, ?)
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
            ""
        )
        .fetch_one(&self.0)
        .await
    }

    pub async fn update(
        &self,
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
        .fetch_one(&self.0)
        .await
    }

    pub async fn change_number_of_voters(
        &self,
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
        .fetch_one(&self.0)
        .await
    }

    pub async fn change_status(
        &self,
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
        .fetch_one(&self.0)
        .await
    }
}

impl FromRef<AppState> for CommitteeSessions {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
