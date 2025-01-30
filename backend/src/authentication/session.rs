use axum::extract::FromRef;
use axum_extra::extract::cookie::Cookie;
use cookie::CookieBuilder;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use std::time::Duration;

use crate::AppState;

use super::{
    error::AuthenticationError,
    util::{create_new_session_key, get_current_unix_time, get_expires_at},
    SESSION_COOKIE_NAME, SESSION_LIFE_TIME,
};

/// A session object, corresponds to a row in the sessions table
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
pub(super) struct Session {
    session_key: String,
    user_id: u32,
    expires_at: i64,
    created_at: i64,
}

impl Session {
    // Create a new session for a specific user
    pub(super) fn new(user_id: u32, life_time: Duration) -> Result<Self, AuthenticationError> {
        let session_key = create_new_session_key();
        let expires_at = get_expires_at(life_time)? as i64;
        let created_at = get_current_unix_time()? as i64;

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
    #[cfg(test)]
    pub(super) fn session_key(&self) -> &str {
        &self.session_key
    }

    /// Get a cookie containing this session key
    pub(super) fn get_cookie(&self) -> Cookie<'static> {
        CookieBuilder::new(SESSION_COOKIE_NAME, self.session_key.clone())
            .max_age(cookie::time::Duration::seconds(
                SESSION_LIFE_TIME.as_secs() as i64
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
    pub(super) async fn create(
        &self,
        user_id: u32,
        life_time: Duration,
    ) -> Result<Session, AuthenticationError> {
        let session = Session::new(user_id, life_time)?;

        let saved_session = sqlx::query_as!(
            Session,
            r#"INSERT INTO sessions (session_key, user_id, expires_at, created_at)
            VALUES (?, ?, ?, ?)
            RETURNING
                session_key,
                user_id as "user_id: u32",
                expires_at,
                created_at
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
                expires_at,
                created_at
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

    /// Delete all sessions that have expired
    pub async fn delete_expired_sessions(&self) -> Result<(), AuthenticationError> {
        sqlx::query("DELETE FROM sessions WHERE expires_at <= ?")
            .bind(get_current_unix_time()? as i64)
            .execute(&self.0)
            .await?;

        Ok(())
    }
}

impl FromRef<AppState> for Sessions {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}

#[cfg(test)]
mod test {
    use sqlx::SqlitePool;
    use std::time::Duration;
    use test_log::test;

    use crate::authentication::session::Sessions;

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_create_and_get_session(pool: SqlitePool) {
        let sessions = Sessions::new(pool);

        let session = sessions.create(1, Duration::from_secs(60)).await.unwrap();

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
        let session = sessions.create(1, Duration::from_secs(60)).await.unwrap();

        let session_from_db = sessions.get_by_key(&session.session_key).await.unwrap();
        assert_eq!(session_from_db, Some(session.clone()));

        sessions.delete(&session.session_key).await.unwrap();

        let session_from_db = sessions.get_by_key(session.session_key()).await.unwrap();

        assert_eq!(None, session_from_db);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_delete_old_sessions(pool: SqlitePool) {
        let sessions = Sessions::new(pool);

        let session = sessions.create(1, Duration::from_secs(0)).await.unwrap();

        sessions.delete_expired_sessions().await.unwrap();

        let session_from_db = sessions.get_by_key(session.session_key()).await.unwrap();

        assert_eq!(None, session_from_db);
    }
}
