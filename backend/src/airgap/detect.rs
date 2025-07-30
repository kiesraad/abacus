use sqlx::SqlitePool;
use std::{
    net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, TcpStream, ToSocketAddrs},
    sync::{Arc, RwLock, atomic::AtomicBool},
    time::{Duration, Instant},
};
use tokio::sync::watch::{self, Sender};
use tracing::{error, info, trace, warn};

use crate::audit_log::AuditEvent;

#[derive(Debug, Clone)]
pub enum AirGapStatusChange {
    AirGapViolationDetected,
    AirGapViolationResolved,
}

#[derive(Clone)]
pub struct AirgapDetection {
    enabled: bool,
    updates: Option<Sender<AirGapStatusChange>>,
    airgap_violation_detected: Arc<AtomicBool>,
    last_check: Arc<RwLock<Option<Instant>>>,
}

const SECURE_PORT: u16 = 443; // Default secure port for HTTPS

const TCP_CONNECT_TIMEOUT: Duration = Duration::from_secs(5); // Timeout for TCP connections

const IPV4: [Ipv4Addr; 2] = [
    Ipv4Addr::new(104, 26, 1, 225), // Cloudflare (informatiebeveiligingsdienst.nl)
    Ipv4Addr::new(145, 100, 190, 243), // SURFnet
];

const IPV6: [Ipv6Addr; 2] = [
    Ipv6Addr::new(0x2606, 0x4700, 0x20, 0x0, 0x0, 0x0, 0x681a, 0xe1), // Cloudflare (informatiebeveiligingsdienst.nl)
    Ipv6Addr::new(0x2001, 0x610, 0x188, 0x410, 0x145, 0x100, 0x190, 0x243), // SURFnet
];

const DOMAINS: [&str; 3] = [
    "kiesraad.nl",
    "informatiebeveiligingsdienst.nl",
    "surfnet.nl",
];

pub const AIRGAP_DETECTION_INTERVAL: u64 = 60; // interval in seconds

impl AirgapDetection {
    /// Creates a new AirgapDetection instance that does not perform any detection.
    pub fn nop() -> Self {
        Self {
            enabled: false,
            updates: None,
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            last_check: Arc::new(RwLock::new(None)),
        }
    }

    /// Starts the airgap detection in a background task.
    /// It will periodically check for airgap violations by attempting to connect to a known server.
    pub async fn start(pool: SqlitePool) -> AirgapDetection {
        let (tx, mut rx) = watch::channel(AirGapStatusChange::AirGapViolationResolved);

        let airgap_detection = AirgapDetection {
            enabled: true,
            updates: Some(tx),
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            last_check: Arc::new(RwLock::new(None)),
        };

        tokio::task::spawn(async move {
            loop {
                match rx.changed().await {
                    Ok(_) => {
                        let event = match *rx.borrow() {
                            AirGapStatusChange::AirGapViolationDetected => {
                                AuditEvent::AirGapViolationDetected
                            }
                            AirGapStatusChange::AirGapViolationResolved => {
                                AuditEvent::AirGapViolationResolved
                            }
                        };

                        if let Err(e) =
                            crate::audit_log::create(&pool, &event, None, None, None).await
                        {
                            error!("Failed to log air gap status change: {e:#?}");
                        }
                    }
                    Err(e) => {
                        error!("Failed to receive air gap status change: {e:#?}");
                        break;
                    }
                }
            }
        });

        std::thread::spawn({
            let airgap_detection = airgap_detection.clone();

            move || {
                loop {
                    airgap_detection.perform_detection();

                    std::thread::sleep(Duration::from_secs(AIRGAP_DETECTION_INTERVAL));
                }
            }
        });

        airgap_detection
    }

    fn send_update(&self) {
        if let Some(sender) = self.updates.as_ref() {
            let status = if self.violation_detected() {
                AirGapStatusChange::AirGapViolationDetected
            } else {
                AirGapStatusChange::AirGapViolationResolved
            };

            if let Err(e) = sender.send(status) {
                error!("Failed to send airgap status update: {e}");
            }
        }
    }

    fn perform_detection(&self) {
        let was_connected = self.violation_detected();

        if self.is_connected() {
            self.set_airgap_violation_detected(true);

            if was_connected {
                warn!("Airgap violation detected, abacus is still connected to the internet.");
            } else {
                error!("Airgap violation detected, abacus is connected to the internet!");
                self.send_update();
            }
        } else {
            self.set_airgap_violation_detected(false);

            if was_connected {
                info!("Airgap violation resolved, abacus is no longer connected to the internet.");
                self.send_update();
            } else {
                trace!("No airgap violation detected.");
            }
        }

        self.set_last_check();
    }

    /// Detects if the system is in an airgap by attempting to connect to IPv4, IPv6 addresses and performing DNS lookups
    fn is_connected(&self) -> bool {
        // attempt to connect to known IPv4 addresses over TCP
        let tcp_ipv4_connection_success = IPV4
            .iter()
            .map(|ip| SocketAddr::new(IpAddr::V4(*ip), SECURE_PORT))
            .map(|addr| TcpStream::connect_timeout(&addr, TCP_CONNECT_TIMEOUT))
            .filter_map(Result::ok)
            .count();

        if tcp_ipv4_connection_success > 0 {
            trace!("TCP IPv4 connections: {tcp_ipv4_connection_success}");

            return true;
        }

        // attempt to connect to known IPv6 addresses over TCP
        let tcp_ipv6_connection_success = IPV6
            .iter()
            .map(|ip| SocketAddr::new(IpAddr::V6(*ip), SECURE_PORT))
            .map(|addr| TcpStream::connect_timeout(&addr, TCP_CONNECT_TIMEOUT))
            .filter_map(Result::ok)
            .count();

        if tcp_ipv6_connection_success > 0 {
            trace!("TCP IPv6 connections: {tcp_ipv6_connection_success}");

            return true;
        }

        // perform a DNS lookup using the default resolver
        let dns_lookup_success = DOMAINS
            .iter()
            .map(|d| format!("{d}:{SECURE_PORT}").to_socket_addrs())
            .filter_map(Result::ok)
            .count();

        if dns_lookup_success > 0 {
            trace!("DNS lookup success: {dns_lookup_success}");

            return true;
        }

        false
    }

    fn set_airgap_violation_detected(&self, status: bool) {
        self.airgap_violation_detected
            .store(status, std::sync::atomic::Ordering::Relaxed);
    }

    fn set_last_check(&self) {
        if let Ok(mut last_check) = self.last_check.write() {
            *last_check = Some(Instant::now());
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn get_last_check(&self) -> Option<Instant> {
        self.last_check
            .read()
            .ok()
            .and_then(|last_check| *last_check)
    }

    pub fn violation_detected(&self) -> bool {
        self.airgap_violation_detected
            .load(std::sync::atomic::Ordering::Relaxed)
    }
}

#[cfg(test)]
mod tests {
    use crate::airgap::block_request_on_airgap_violation;

    use super::*;
    use axum::{Router, body::Body, http::Request, middleware, routing::get};
    use hyper::StatusCode;
    use test_log::test;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_block_request_on_airgap_violation() {
        let airgap_detection = AirgapDetection {
            enabled: true,
            updates: None,
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            last_check: Arc::new(RwLock::new(None)),
        };

        async fn handle() -> String {
            "test".to_string()
        }

        let app =
            Router::new()
                .route("/api/test", get(handle))
                .layer(middleware::from_fn_with_state(
                    airgap_detection.clone(),
                    block_request_on_airgap_violation,
                ));

        let res = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(res.status(), StatusCode::OK);

        airgap_detection.set_airgap_violation_detected(true);
        airgap_detection.set_last_check();

        let res = app
            .oneshot(
                Request::builder()
                    .uri("/api/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(res.status(), StatusCode::SERVICE_UNAVAILABLE);
    }

    #[test(sqlx::test)]
    async fn test_log_status_changes_to_audit_log(pool: SqlitePool) {
        AirgapDetection::start(pool.clone()).await;

        let mut events = Vec::new();

        for _ in 0..20 {
            events = crate::audit_log::list_all(&pool).await.unwrap();

            if events.len() == 1 {
                break;
            }

            tokio::time::sleep(Duration::from_millis(50)).await;
        }

        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event(), &AuditEvent::AirGapViolationDetected);
    }

    #[tokio::test]
    async fn test_block_request_on_airgap_detection_outdated() {
        let airgap_detection = AirgapDetection {
            enabled: true,
            updates: None,
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            last_check: Arc::new(RwLock::new(Some(Instant::now()))),
        };

        async fn handle() -> String {
            "test".to_string()
        }

        let app =
            Router::new()
                .route("/api/test", get(handle))
                .layer(middleware::from_fn_with_state(
                    airgap_detection.clone(),
                    block_request_on_airgap_violation,
                ));

        let res = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(res.status(), StatusCode::OK);

        {
            let mut last_check = airgap_detection.last_check.write().unwrap();
            *last_check = Some(
                Instant::now()
                    .checked_sub(Duration::from_secs(AIRGAP_DETECTION_INTERVAL * 3))
                    .unwrap(),
            );
        }

        let res = app
            .oneshot(
                Request::builder()
                    .uri("/api/test")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(res.status(), StatusCode::SERVICE_UNAVAILABLE);
    }
}
