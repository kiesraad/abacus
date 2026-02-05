use std::time::Duration;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqliteConnection};

use crate::repository::user_repo::UserId;

/// A session object, corresponds to a row in the sessions table
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
#[serde(deny_unknown_fields)]
pub(crate) struct Session {
    session_key: String,
    user_id: UserId,
    user_agent: String,
    ip_address: String,
    expires_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
}

impl Session {
    pub(crate) fn new(
        session_key: String,
        user_id: UserId,
        user_agent: String,
        ip_address: String,
        expires_at: DateTime<Utc>,
        created_at: DateTime<Utc>,
    ) -> Self {
        Self {
            session_key,
            user_id,
            user_agent,
            ip_address,
            expires_at,
            created_at,
        }
    }

    /// Get the session user id
    pub(crate) fn user_id(&self) -> UserId {
        self.user_id
    }

    /// Get the session key
    pub(crate) fn session_key(&self) -> &str {
        &self.session_key
    }

    /// Get the session expiration time
    pub(crate) fn expires_at(&self) -> DateTime<Utc> {
        self.expires_at
    }

    /// Get the age of a session
    pub(crate) fn duration(&self) -> Duration {
        Utc::now()
            .signed_duration_since(self.created_at)
            .to_std()
            .unwrap_or_default()
    }
}

/// Save a session, note this converts any i64 timestamps to i64
pub(crate) async fn save(
    conn: &mut SqliteConnection,
    session: &Session,
) -> Result<Session, sqlx::Error> {
    let saved_session = sqlx::query_as!(
        Session,
        r#"INSERT INTO sessions (session_key, user_id, user_agent, ip_address, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING
            session_key,
            user_id as "user_id: UserId",
            user_agent,
            ip_address,
            expires_at as "expires_at: _",
            created_at as "created_at: _"
        "#,
        session.session_key,
        session.user_id,
        session.user_agent,
        session.ip_address,
        session.expires_at,
        session.created_at
    )
        .fetch_one(conn)
        .await?;

    Ok(saved_session)
}

#[derive(Debug)]
pub(crate) struct SessionIdentifier {
    pub session_key: String,
    pub user_agent: String,
    pub ip_address: String,
}

/// Get a session by its key and validate user agent and IP address
pub(crate) async fn get_by_identifier(
    conn: &mut SqliteConnection,
    session: &SessionIdentifier,
) -> Result<Option<Session>, sqlx::Error> {
    let now = Utc::now();

    let session: Option<Session> = sqlx::query_as!(
        Session,
        r#"
        SELECT
            session_key,
            user_id as "user_id: UserId",
            user_agent,
            ip_address,
            expires_at as "expires_at: _",
            created_at as "created_at: _"
        FROM sessions
        WHERE session_key = ?
        AND user_agent = ?
        AND ip_address = ?
        AND expires_at > ?
        "#,
        session.session_key,
        session.user_agent,
        session.ip_address,
        now
    )
    .fetch_optional(conn)
    .await?;

    Ok(session)
}

/// Get a session by its key
pub(crate) async fn get_by_key(
    conn: &mut SqliteConnection,
    session_key: &str,
) -> Result<Option<Session>, sqlx::Error> {
    let now = Utc::now();
    let session: Option<Session> = sqlx::query_as!(
        Session,
        r#"
        SELECT
            session_key,
            user_id as "user_id: UserId",
            user_agent,
            ip_address,
            expires_at as "expires_at: _",
            created_at as "created_at: _"
        FROM sessions
        WHERE session_key = ?
        AND expires_at > ?
        "#,
        session_key,
        now
    )
    .fetch_optional(conn)
    .await?;

    Ok(session)
}

/// Delete a session by its key
pub(crate) async fn delete(
    conn: &mut SqliteConnection,
    session_key: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query!("DELETE FROM sessions WHERE session_key = ?", session_key)
        .execute(conn)
        .await?;

    Ok(())
}

/// Delete a session for a certain user
pub(crate) async fn delete_user_session(
    conn: &mut SqliteConnection,
    user_id: UserId,
) -> Result<(), sqlx::Error> {
    sqlx::query!("DELETE FROM sessions WHERE user_id = ?", user_id)
        .execute(conn)
        .await?;

    Ok(())
}

/// Delete all sessions that have expired
pub(crate) async fn delete_expired_sessions(
    conn: &mut SqliteConnection,
) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM sessions WHERE expires_at <= ?")
        .bind(Utc::now())
        .execute(conn)
        .await?;

    Ok(())
}

/// Count the number of active sessions
pub(crate) async fn count(conn: &mut SqliteConnection) -> Result<u32, sqlx::Error> {
    let now = Utc::now();
    let count = sqlx::query_scalar!(
        r#"SELECT COUNT(*) AS "count: u32" FROM sessions WHERE expires_at > ?"#,
        now
    )
    .fetch_one(conn)
    .await?;

    Ok(count)
}

pub(crate) async fn extend_session(
    conn: &mut SqliteConnection,
    session: &Session,
    expires_at: DateTime<Utc>,
) -> Result<Session, sqlx::Error> {
    let session_key = session.session_key();

    let session = sqlx::query_as!(
        Session,
        r#"
        UPDATE sessions
        SET expires_at = ?
        WHERE session_key = ?
        RETURNING
            session_key,
            user_id as "user_id: UserId",
            user_agent,
            ip_address,
            expires_at as "expires_at: _",
            created_at as "created_at: _"
        "#,
        expires_at,
        session_key
    )
    .fetch_one(conn)
    .await?;

    Ok(session)
}

#[cfg(test)]
mod tests {
    use chrono::TimeDelta;
    use sqlx::SqlitePool;
    use test_log::test;

    use super::*;
    use crate::repository::user_repo::UserId;

    const TEST_USER_AGENT: &str = "TestAgent/1.0";
    const TEST_IP_ADDRESS: &str = "0.0.0.0";

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_create_and_get_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let session = Session::create(
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(60),
        );
        save(&mut conn, &session).await.unwrap();

        let session_from_db = super::get_by_key(&mut conn, &session.session_key)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(session, session_from_db);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_delete_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let session = Session::create(
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(60),
        );
        save(&mut conn, &session).await.unwrap();

        let session_from_db = super::get_by_key(&mut conn, &session.session_key)
            .await
            .unwrap();
        assert_eq!(session_from_db, Some(session.clone()));

        super::delete(&mut conn, &session.session_key)
            .await
            .unwrap();

        let session_from_db = super::get_by_key(&mut conn, session.session_key())
            .await
            .unwrap();

        assert_eq!(None, session_from_db);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_delete_old_sessions(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let session = Session::create(
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(0),
        );
        save(&mut conn, &session).await.unwrap();

        delete_expired_sessions(&mut conn).await.unwrap();

        let session_from_db = super::get_by_key(&mut conn, session.session_key())
            .await
            .unwrap();

        assert_eq!(None, session_from_db);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_session_count(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let active_session1 = Session::create(
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(60),
        );
        save(&mut conn, &active_session1).await.unwrap();

        let active_session2 = Session::create(
            UserId::from(2),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(120),
        );
        save(&mut conn, &active_session2).await.unwrap();

        let expired_session = Session::create(
            UserId::from(2),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(0),
        );
        save(&mut conn, &expired_session).await.unwrap();

        assert_eq!(2, super::count(&mut conn).await.unwrap());
    }
}
