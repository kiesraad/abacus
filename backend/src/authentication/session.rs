use std::time::Duration;

use axum::{
    extract::{FromRef, OptionalFromRequestParts},
    http::request::Parts,
};
use axum_extra::extract::cookie::Cookie;
use chrono::{DateTime, TimeDelta, Utc};
use cookie::CookieBuilder;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};

use crate::{APIError, AppState};

use super::{
    SESSION_COOKIE_NAME, SESSION_LIFE_TIME,
    error::AuthenticationError,
    util::{create_new_session_key, get_expires_at},
};

/// A session object, corresponds to a row in the sessions table
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
pub struct Session {
    session_key: String,
    user_id: u32,
    expires_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
}

impl<S> OptionalFromRequestParts<S> for Session
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Option<Self>, Self::Rejection> {
        Ok(parts.extensions.get::<Session>().cloned())
    }
}

impl Session {
    // Create a new session for a specific user
    pub(super) fn new(user_id: u32, life_time: TimeDelta) -> Result<Self, AuthenticationError> {
        let session_key = create_new_session_key();
        let expires_at = get_expires_at(life_time)?;
        let created_at = Utc::now();

        Ok(Self {
            session_key,
            user_id,
            expires_at,
            created_at,
        })
    }

    /// Get the session user id
    pub(super) fn user_id(&self) -> u32 {
        self.user_id
    }

    /// Get the session key
    pub(super) fn session_key(&self) -> &str {
        &self.session_key
    }

    /// Get the session expiration time
    pub(super) fn expires_at(&self) -> DateTime<Utc> {
        self.expires_at
    }

    /// Get the age of a session
    pub(super) fn duration(&self) -> Duration {
        Utc::now()
            .signed_duration_since(self.created_at)
            .to_std()
            .unwrap_or_default()
    }

    /// Get a cookie containing this session key
    pub(crate) fn get_cookie(&self) -> Cookie<'static> {
        CookieBuilder::new(SESSION_COOKIE_NAME, self.session_key.clone())
            .max_age(cookie::time::Duration::seconds(
                SESSION_LIFE_TIME.num_seconds(),
            ))
            .build()
    }
}

/// Sessions repository
pub struct Sessions(SqlitePool);

impl Sessions {
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    /// Create a new session, note this converts any i64 timestamps to i64
    pub(crate) async fn create(
        &self,
        user_id: u32,
        life_time: TimeDelta,
    ) -> Result<Session, AuthenticationError> {
        let session = Session::new(user_id, life_time)?;

        let saved_session = sqlx::query_as!(
            Session,
            r#"INSERT INTO sessions (session_key, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            RETURNING
                session_key,
                user_id as "user_id: u32",
                expires_at as "expires_at: _",
                created_at as "created_at: _"
            "#,
            session.session_key,
            session.user_id,
            session.expires_at,
            session.created_at
        )
        .fetch_one(&self.0)
        .await?;

        Ok(saved_session)
    }

    /// Get a session by its key
    pub(super) async fn get_by_key(
        &self,
        session_key: &str,
    ) -> Result<Option<Session>, AuthenticationError> {
        let session: Option<Session> = sqlx::query_as!(
            Session,
            r#"
            SELECT
                session_key,
                user_id as "user_id: u32",
                expires_at as "expires_at: _",
                created_at as "created_at: _"
            FROM sessions WHERE session_key = ?
            "#,
            session_key
        )
        .fetch_optional(&self.0)
        .await?;

        Ok(session)
    }

    /// Delete a session by its key
    pub async fn delete(&self, session_key: &str) -> Result<(), AuthenticationError> {
        sqlx::query!("DELETE FROM sessions WHERE session_key = ?", session_key)
            .execute(&self.0)
            .await?;

        Ok(())
    }

    /// Delete a session for a certain user
    pub async fn delete_user_session(&self, user_id: u32) -> Result<(), AuthenticationError> {
        sqlx::query!("DELETE FROM sessions WHERE user_id = ?", user_id)
            .execute(&self.0)
            .await?;

        Ok(())
    }

    /// Delete all sessions that have expired
    pub async fn delete_expired_sessions(&self) -> Result<(), AuthenticationError> {
        sqlx::query("DELETE FROM sessions WHERE expires_at <= ?")
            .bind(Utc::now())
            .execute(&self.0)
            .await?;

        Ok(())
    }

    /// Count the number of active sessions
    pub async fn count(&self) -> Result<u32, AuthenticationError> {
        let now = Utc::now();
        let count = sqlx::query_scalar!(
            r#"SELECT COUNT(*) AS "count: u32" FROM sessions WHERE expires_at > ?"#,
            now
        )
        .fetch_one(&self.0)
        .await?;

        Ok(count)
    }

    pub(super) async fn extend_session(
        &self,
        session: &Session,
    ) -> Result<Session, AuthenticationError> {
        let new_expires_at = get_expires_at(SESSION_LIFE_TIME)?;
        let session_key = session.session_key();

        let session = sqlx::query_as!(
            Session,
            r#"
          UPDATE sessions
          SET expires_at = ?
          WHERE session_key = ?
          RETURNING
              session_key,
              user_id as "user_id: u32",
              expires_at as "expires_at: _",
              created_at as "created_at: _"
          "#,
            new_expires_at,
            session_key
        )
        .fetch_one(&self.0)
        .await?;

        Ok(session)
    }
}

impl FromRef<AppState> for Sessions {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}

#[cfg(test)]
mod test {
    use chrono::TimeDelta;
    use sqlx::SqlitePool;
    use test_log::test;

    use crate::authentication::session::Sessions;

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_create_and_get_session(pool: SqlitePool) {
        let sessions = Sessions::new(pool);

        let session = sessions.create(1, TimeDelta::seconds(60)).await.unwrap();

        let session_from_db = sessions
            .get_by_key(&session.session_key)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(session, session_from_db);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_delete_session(pool: SqlitePool) {
        let sessions = Sessions::new(pool);
        let session = sessions.create(1, TimeDelta::seconds(60)).await.unwrap();

        let session_from_db = sessions.get_by_key(&session.session_key).await.unwrap();
        assert_eq!(session_from_db, Some(session.clone()));

        sessions.delete(&session.session_key).await.unwrap();

        let session_from_db = sessions.get_by_key(session.session_key()).await.unwrap();

        assert_eq!(None, session_from_db);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_delete_old_sessions(pool: SqlitePool) {
        let sessions = Sessions::new(pool);

        let session = sessions.create(1, TimeDelta::seconds(0)).await.unwrap();

        sessions.delete_expired_sessions().await.unwrap();

        let session_from_db = sessions.get_by_key(session.session_key()).await.unwrap();

        assert_eq!(None, session_from_db);
    }
}
