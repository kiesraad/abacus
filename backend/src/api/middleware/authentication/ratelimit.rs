//! Login rate limiting
//!
//! Allow one login attempt per source IP every five seconds. A successful login
//! resets the rate limit. A rate limited attempt doesn't cause the rate limit
//! to be extended. The state is in-memory only, so restarting the server clears
//! all rate limits. At most `MAX_SOURCES` sources are tracked, after that the
//! source with the earliest deadline is evicted.

use std::{
    collections::HashMap,
    net::IpAddr,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};

const INTERVAL: Duration = Duration::from_secs(5);
const MAX_SOURCES: usize = 4096;

#[derive(Clone, Debug)]
pub struct LoginRateLimit {
    deadlines: Arc<Mutex<HashMap<IpAddr, Instant>>>,
    interval: Duration,
}

impl Default for LoginRateLimit {
    fn default() -> Self {
        Self::with_interval(INTERVAL)
    }
}

impl LoginRateLimit {
    /// Use an explicit interval, set to zero for tests unrelated to rate limiting.
    pub fn with_interval(interval: Duration) -> Self {
        Self {
            deadlines: Arc::default(),
            interval,
        }
    }

    /// Check and start the rate limit for the source, before authentication.
    pub fn admit(&self, source: IpAddr) -> bool {
        let mut deadlines = self.deadlines.lock().unwrap_or_else(|e| e.into_inner());
        Self::admit_at(&mut deadlines, source, Instant::now(), self.interval)
    }

    /// Allow the source to log in again immediately after a successful login.
    pub fn clear(&self, source: IpAddr) {
        let mut deadlines = self.deadlines.lock().unwrap_or_else(|e| e.into_inner());
        deadlines.remove(&source);
    }

    fn admit_at(
        deadlines: &mut HashMap<IpAddr, Instant>,
        source: IpAddr,
        now: Instant,
        interval: Duration,
    ) -> bool {
        if let Some(deadline) = deadlines.get_mut(&source) {
            if now < *deadline {
                return false;
            }
            *deadline = now + interval;
            return true;
        }

        if deadlines.len() >= MAX_SOURCES {
            deadlines.retain(|_, deadline| now < *deadline);
            // Prefer availability: an attacker with this many addresses is
            // limited by password hashing, not by this rate limit
            if deadlines.len() >= MAX_SOURCES
                && let Some(earliest) = deadlines
                    .iter()
                    .min_by_key(|(_, deadline)| **deadline)
                    .map(|(source, _)| *source)
            {
                deadlines.remove(&earliest);
            }
        }

        deadlines.insert(source, now + interval);
        true
    }
}

#[cfg(test)]
mod tests {
    use std::{net::Ipv4Addr, sync::Barrier};

    use super::*;

    const SOURCE: IpAddr = IpAddr::V4(Ipv4Addr::LOCALHOST);

    #[test]
    fn test_admission_interval_and_rejections() {
        let mut deadlines = HashMap::new();
        let start = Instant::now();
        let admit = |deadlines: &mut _, elapsed| {
            LoginRateLimit::admit_at(deadlines, SOURCE, start + elapsed, INTERVAL)
        };
        for attempt in 0..3 {
            let elapsed = INTERVAL * attempt;
            assert!(admit(&mut deadlines, elapsed));
            assert!(!admit(&mut deadlines, elapsed));
            assert!(!admit(
                &mut deadlines,
                elapsed + INTERVAL - Duration::from_millis(1)
            ));
        }
    }

    #[test]
    fn test_sources_are_independent() {
        let ratelimit = LoginRateLimit::default();
        assert!(ratelimit.admit(SOURCE));
        assert!(ratelimit.admit(Ipv4Addr::new(127, 0, 0, 2).into()));
        assert!(ratelimit.admit("::1".parse().unwrap()));
        assert!(!ratelimit.admit(SOURCE));
    }

    #[test]
    fn test_clear_only_releases_the_given_source() {
        let ratelimit = LoginRateLimit::default();
        let other = Ipv4Addr::new(127, 0, 0, 2).into();
        assert!(ratelimit.admit(SOURCE));
        assert!(ratelimit.admit(other));
        assert!(!ratelimit.admit(SOURCE));

        ratelimit.clear(SOURCE);
        ratelimit.clear(SOURCE);
        assert!(ratelimit.admit(SOURCE));
        assert!(!ratelimit.admit(other));
    }

    #[test]
    fn test_concurrent_admission() {
        let ratelimit = LoginRateLimit::default();
        let barrier = Arc::new(Barrier::new(8));
        let threads: Vec<_> = (0..8)
            .map(|_| {
                let ratelimit = ratelimit.clone();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    ratelimit.admit(SOURCE)
                })
            })
            .collect();
        assert_eq!(
            threads
                .into_iter()
                .map(|t| t.join().unwrap())
                .filter(|admitted| *admitted)
                .count(),
            1
        );
    }

    #[test]
    fn test_capacity_and_expiry() {
        let mut deadlines = HashMap::new();
        let start = Instant::now();
        let admit = |deadlines: &mut _, source, now| {
            LoginRateLimit::admit_at(deadlines, source, now, INTERVAL)
        };

        // Fill the table and give each source its own deadline, so there is a
        // single earliest one
        for ip in 0..u32::try_from(MAX_SOURCES).unwrap() {
            let now = start + Duration::from_micros(ip.into());
            assert!(admit(&mut deadlines, Ipv4Addr::from(ip).into(), now));
        }
        assert_eq!(deadlines.len(), MAX_SOURCES);

        // A full table evicts the earliest deadline
        let full = start + Duration::from_millis(100);
        let earliest = Ipv4Addr::from(0).into();
        assert!(admit(&mut deadlines, SOURCE, full));
        assert_eq!(deadlines.len(), MAX_SOURCES);
        assert!(!deadlines.contains_key(&earliest));
        assert!(!admit(&mut deadlines, Ipv4Addr::from(1).into(), full));

        // All initial deadlines have expired, but not that of SOURCE. An
        // existing source renews its deadline without taking up another entry.
        let later = start + INTERVAL + Duration::from_millis(5);
        let existing = Ipv4Addr::from(1).into();
        assert!(admit(&mut deadlines, existing, later));
        assert_eq!(deadlines.len(), MAX_SOURCES);

        // Expired entries are removed before evicting active ones
        assert!(admit(&mut deadlines, earliest, later));
        assert_eq!(deadlines.len(), 3);
        assert!(!admit(&mut deadlines, existing, later));
        assert!(!admit(&mut deadlines, SOURCE, later));
    }
}
