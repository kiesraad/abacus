use axum::extract::FromRef;
use sqlx::{Error, SqlitePool, query, query_as};

use super::{CommitteeSession, CommitteeSessionCreateRequest, CommitteeSessionUpdateRequest};

use crate::AppState;

pub struct CommitteeSessions(SqlitePool);

impl CommitteeSessions {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub async fn list(&self) -> Result<Vec<CommitteeSession>, Error> {
        let committee_sessions: Vec<CommitteeSession> = query_as!(
            CommitteeSession,
            r#"
            SELECT 
              id as "id: u32",
              number as "number: u32",
              election_id as "election_id: u32",
              status as "status: _",
              location,
              start_date,
              start_time
            FROM committee_sessions
            "#,
        )
        .fetch_all(&self.0)
        .await?;
        Ok(committee_sessions)
    }

    pub async fn get(&self, id: u32) -> Result<CommitteeSession, Error> {
        let committee_session: CommitteeSession = query_as!(
            CommitteeSession,
            r#"
            SELECT 
              id as "id: u32",
              number as "number: u32",
              election_id as "election_id: u32",
              status as "status: _",
              location,
              start_date,
              start_time
            FROM committee_sessions
            WHERE id = ?
            "#,
            id
        )
        .fetch_one(&self.0)
        .await?;
        Ok(committee_session)
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
              election_id
            ) VALUES (?, ?)
            RETURNING
              id as "id: u32",
              number as "number: u32",
              election_id as "election_id: u32",
              status as "status: _",
              location,
              start_date,
              start_time
            "#,
            committee_session.number,
            committee_session.election_id
        )
        .fetch_one(&self.0)
        .await
    }

    pub async fn update(
        &self,
        committee_session_id: u32,
        committee_session_update: CommitteeSessionUpdateRequest,
    ) -> Result<bool, Error> {
        let rows_affected = query!(
            r#"
            UPDATE committee_sessions
            SET
              location = ?,
              start_date = ?,
              start_time = ?
            WHERE
              id = ?
            "#,
            committee_session_update.location,
            committee_session_update.start_date,
            committee_session_update.start_time,
            committee_session_id,
        )
        .execute(&self.0)
        .await?
        .rows_affected();

        Ok(rows_affected > 0)
    }
}

impl FromRef<AppState> for CommitteeSessions {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
