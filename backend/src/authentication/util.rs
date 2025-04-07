use chrono::{DateTime, TimeDelta, Utc};
use rand::{Rng, distr::Alphanumeric};

/// Create a new session key, a secure random alphanumeric string of 24 characters
/// Which corresponds to ~142 bits of entropy
pub(super) fn create_new_session_key() -> String {
    rand::rng()
        .sample_iter(&Alphanumeric)
        .take(24)
        .map(char::from)
        .collect()
}

/// Get the time when the session expires
/// Note this will return the current time if adding the duration would be out of range,
/// which will happen in the next 260117 years, since the duration is only set using constants in out codebase
pub(super) fn get_expires_at(duration: TimeDelta) -> DateTime<Utc> {
    Utc::now()
        .checked_add_signed(duration)
        .unwrap_or(Utc::now())
}

#[cfg(test)]
mod tests {
    use super::*;
    use test_log::test;

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
}
