use std::time::{Duration, SystemTime};

use rand::{distributions::Alphanumeric, Rng};

use super::error::AuthenticationError;

/// Create a new session key, a secure random alphanumeric string of 24 characters
/// Which corresponds to ~142 bits of entropy
pub(super) fn create_new_session_key() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(24)
        .map(char::from)
        .collect()
}

/// Get the current time as a unix timestamp in seconds
pub(super) fn get_current_unix_time() -> Result<u64, AuthenticationError> {
    Ok(SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|_| AuthenticationError::BackwardTimeTravel)?
        .as_secs())
}

/// Get the time when the session expires as a unix timestamp in seconds
pub(super) fn get_expires_at(duration: Duration) -> Result<u64, AuthenticationError> {
    Ok(SystemTime::now()
        .checked_add(duration)
        .ok_or(AuthenticationError::InvalidSessionDuration)?
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_err(|_| AuthenticationError::BackwardTimeTravel)?
        .as_secs())
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
        let current_time = get_current_unix_time().unwrap();
        let current_time2 = get_current_unix_time().unwrap();

        assert!(current_time <= current_time2);
    }

    #[test]
    fn test_get_expires_at() {
        let current_time = get_current_unix_time().unwrap();
        let expires_at = get_expires_at(Duration::from_secs(60)).unwrap();

        assert!(expires_at > current_time);
        assert_eq!(expires_at - current_time, 60);
    }
}
