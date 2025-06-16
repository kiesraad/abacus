use axum::extract::FromRef;
use sqlx::{Error, SqlitePool, query_as};

use super::{CommitteeSession, NewCommitteeSession};

use crate::AppState;

pub struct CommitteeSessions(SqlitePool);

impl CommitteeSessions {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    pub async fn list(&self) -> Result<Vec<CommitteeSession>, Error> {
        let committee_sessions: Vec<CommitteeSession> =
            query_as("SELECT id, number, election_id, started_at, status FROM committee_sessions")
                .fetch_all(&self.0)
                .await?;
        Ok(committee_sessions)
    }

    pub async fn get(&self, id: u32) -> Result<CommitteeSession, Error> {
        let committee_session: CommitteeSession =
            query_as("SELECT * FROM committee_sessions WHERE id = ?")
                .bind(id)
                .fetch_one(&self.0)
                .await?;
        Ok(committee_session)
    }

    pub async fn create(
        &self,
        committee_session: NewCommitteeSession,
    ) -> Result<CommitteeSession, Error> {
        query_as(
            r#"
            INSERT INTO committee_sessions (
              number,
              election_id,
              status
            ) VALUES (?, ?, ?)
            RETURNING
              id,
              number,
              election_id,
              started_at,
              status
            "#,
        )
        .bind(committee_session.election_id)
        .bind(committee_session.status)
        .fetch_one(&self.0)
        .await
    }
}

impl FromRef<AppState> for CommitteeSessions {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}
