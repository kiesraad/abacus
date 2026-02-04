use std::time::Duration;

use chrono::{DateTime, TimeDelta, Utc};
use rand::{Rng, distr::Alphanumeric};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqliteConnection};

use crate::{
    api::middleware::authentication::{
        SESSION_LIFE_TIME, error::AuthenticationError, request_data::RequestSessionData,
    },
    repository::user_repo::UserId,
};

/// A session object, corresponds to a row in the sessions table
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow)]
#[serde(deny_unknown_fields)]
pub struct Session {
    session_key: String,
    user_id: UserId,
    user_agent: String,
    ip_address: String,
    expires_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
}

impl Session {
    // Create a new session for a specific user
    pub(crate) fn new(
        user_id: UserId,
        user_agent: String,
        ip_address: String,
        life_time: TimeDelta,
    ) -> Result<Self, AuthenticationError> {
        let session_key = create_new_session_key();
        let expires_at = get_expires_at(life_time);
        let created_at = Utc::now();

        Ok(Self {
            session_key,
            user_id,
            user_agent,
            ip_address,
            expires_at,
            created_at,
        })
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
    pub fn duration(&self) -> Duration {
        Utc::now()
            .signed_duration_since(self.created_at)
            .to_std()
            .unwrap_or_default()
    }
}

/// Create a new session, note this converts any i64 timestamps to i64
pub(crate) async fn create(
    conn: &mut SqliteConnection,
    user_id: UserId,
    user_agent: &str,
    ip_address: &str,
    life_time: TimeDelta,
) -> Result<Session, AuthenticationError> {
    let session = Session::new(
        user_id,
        user_agent.to_string(),
        ip_address.to_string(),
        life_time,
    )?;

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

/// Get a session by its key and validate user agent and IP address
pub(crate) async fn get_by_request_data(
    conn: &mut SqliteConnection,
    request_data: &RequestSessionData,
) -> Result<Option<Session>, AuthenticationError> {
    let now = Utc::now();
    let session_key = request_data.session_cookie.value();
    let ip_address = request_data.ip_address.to_string();

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
        session_key,
        request_data.user_agent,
        ip_address,
        now
    )
    .fetch_optional(conn)
    .await?;

    Ok(session)
}

/// Get a session by its key
pub async fn get_by_key(
    conn: &mut SqliteConnection,
    session_key: &str,
) -> Result<Option<Session>, AuthenticationError> {
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
pub async fn delete(
    conn: &mut SqliteConnection,
    session_key: &str,
) -> Result<(), AuthenticationError> {
    sqlx::query!("DELETE FROM sessions WHERE session_key = ?", session_key)
        .execute(conn)
        .await?;

    Ok(())
}

/// Delete a session for a certain user
pub async fn delete_user_session(
    conn: &mut SqliteConnection,
    user_id: UserId,
) -> Result<(), AuthenticationError> {
    sqlx::query!("DELETE FROM sessions WHERE user_id = ?", user_id)
        .execute(conn)
        .await?;

    Ok(())
}

/// Delete all sessions that have expired
pub async fn delete_expired_sessions(
    conn: &mut SqliteConnection,
) -> Result<(), AuthenticationError> {
    sqlx::query("DELETE FROM sessions WHERE expires_at <= ?")
        .bind(Utc::now())
        .execute(conn)
        .await?;

    Ok(())
}

/// Count the number of active sessions
pub async fn count(conn: &mut SqliteConnection) -> Result<u32, AuthenticationError> {
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
) -> Result<Session, AuthenticationError> {
    let new_expires_at = get_expires_at(SESSION_LIFE_TIME);
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
        new_expires_at,
        session_key
    )
    .fetch_one(conn)
    .await?;

    Ok(session)
}

/// Create a new session key, a secure random alphanumeric string of 24 characters
/// Which corresponds to ~142 bits of entropy
fn create_new_session_key() -> String {
    rand::rng()
        .sample_iter(&Alphanumeric)
        .take(24)
        .map(char::from)
        .collect()
}

/// Get the time when the session expires
/// Note this will return the current time if adding the duration would be out of range,
/// which will not happen in the next 260117 years, since the duration is only set using constants in out codebase
fn get_expires_at(duration: TimeDelta) -> DateTime<Utc> {
    Utc::now()
        .checked_add_signed(duration)
        .unwrap_or(Utc::now())
}

#[cfg(test)]
mod tests {
    use chrono::{TimeDelta, Utc};
    use sqlx::SqlitePool;
    use test_log::test;

    use crate::repository::user_repo::UserId;

    const TEST_USER_AGENT: &str = "TestAgent/1.0";
    const TEST_IP_ADDRESS: &str = "0.0.0.0";

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_create_and_get_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let session = super::create(
            &mut conn,
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(60),
        )
        .await
        .unwrap();

        let session_from_db = super::get_by_key(&mut conn, &session.session_key)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(session, session_from_db);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_delete_session(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let session = super::create(
            &mut conn,
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(60),
        )
        .await
        .unwrap();

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
        let session = super::create(
            &mut conn,
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(0),
        )
        .await
        .unwrap();

        super::delete_expired_sessions(&mut conn).await.unwrap();

        let session_from_db = super::get_by_key(&mut conn, session.session_key())
            .await
            .unwrap();

        assert_eq!(None, session_from_db);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_session_count(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let _active_session1 = super::create(
            &mut conn,
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(60),
        )
        .await
        .unwrap();
        let _active_session2 = super::create(
            &mut conn,
            UserId::from(2),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(120),
        )
        .await
        .unwrap();
        let _expired_session = super::create(
            &mut conn,
            UserId::from(2),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(0),
        )
        .await
        .unwrap();

        assert_eq!(2, super::count(&mut conn).await.unwrap());
    }

    #[test]
    fn test_create_new_session_key() {
        let key = super::create_new_session_key();

        assert_eq!(key.len(), 24);
        assert!(key.chars().all(|c| c.is_ascii_alphanumeric()));
    }

    #[test]
    fn test_get_current_time() {
        let current_time = Utc::now();
        let current_time2 = Utc::now();

        assert!(current_time <= current_time2);
    }

    #[test]
    fn test_get_expires_at() {
        let current_time = Utc::now();
        let expires_at = super::get_expires_at(TimeDelta::seconds(60));

        assert!(expires_at > current_time);
        assert_eq!((expires_at - current_time).num_seconds(), 60);
    }
}
