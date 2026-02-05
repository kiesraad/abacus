use axum::{extract::OptionalFromRequestParts, http::request::Parts};
use axum_extra::extract::cookie::Cookie;
use chrono::{DateTime, TimeDelta, Utc};
use cookie::CookieBuilder;
use rand::{Rng, distr::Alphanumeric};

use crate::{
    APIError,
    api::middleware::authentication::{SESSION_COOKIE_NAME, SESSION_LIFE_TIME},
    repository::{session_repo::Session, user_repo::UserId},
};

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
    pub(crate) fn create(
        user_id: UserId,
        user_agent: &str,
        ip_address: &str,
        life_time: TimeDelta,
    ) -> Self {
        let session_key = create_new_session_key();
        let expires_at = get_expires_at(life_time);
        let created_at = Utc::now();

        Self::new(
            session_key,
            user_id,
            user_agent.to_string(),
            ip_address.to_string(),
            expires_at,
            created_at,
        )
    }

    /// Get a cookie containing this session key
    pub(crate) fn get_cookie(&self) -> Cookie<'static> {
        CookieBuilder::new(SESSION_COOKIE_NAME, self.session_key().to_owned())
            .max_age(cookie::time::Duration::seconds(
                SESSION_LIFE_TIME.num_seconds(),
            ))
            .build()
    }
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
pub(crate) fn get_expires_at(duration: TimeDelta) -> DateTime<Utc> {
    Utc::now()
        .checked_add_signed(duration)
        .unwrap_or(Utc::now())
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;

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
        let expires_at = get_expires_at(TimeDelta::seconds(60));

        assert!(expires_at > current_time);
        assert_eq!((expires_at - current_time).num_seconds(), 60);
    }
}
