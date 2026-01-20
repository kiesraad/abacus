use chrono::{DateTime, TimeDelta, Utc};
use cookie::{Cookie, SameSite};
use rand::{Rng, distr::Alphanumeric};

use crate::infra::authentication::SECURE_COOKIES;

/// Create a new session key, a secure random alphanumeric string of 24 characters
/// Which corresponds to ~142 bits of entropy
pub fn create_new_session_key() -> String {
    rand::rng()
        .sample_iter(&Alphanumeric)
        .take(24)
        .map(char::from)
        .collect()
}

/// Get the time when the session expires
/// Note this will return the current time if adding the duration would be out of range,
/// which will not happen in the next 260117 years, since the duration is only set using constants in out codebase
pub fn get_expires_at(duration: TimeDelta) -> DateTime<Utc> {
    Utc::now()
        .checked_add_signed(duration)
        .unwrap_or(Utc::now())
}

/// Set default session cookie properties
pub fn set_default_cookie_properties(cookie: &mut Cookie) {
    cookie.set_path("/");
    cookie.set_http_only(true);
    cookie.set_secure(SECURE_COOKIES);
    cookie.set_same_site(SameSite::Strict);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_new_session_key() {
        let key = create_new_session_key();

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

    #[test]
    fn test_set_default_cookie_properties() {
        let mut cookie = Cookie::new("test-cookie", "");

        set_default_cookie_properties(&mut cookie);

        assert_eq!(cookie.path().unwrap(), "/");
        assert!(cookie.http_only().unwrap());
        assert_eq!(cookie.secure().unwrap(), SECURE_COOKIES);
        assert_eq!(cookie.same_site().unwrap(), SameSite::Strict);
    }
}
