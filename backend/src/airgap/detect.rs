use std::{
    net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr, TcpStream, ToSocketAddrs},
    sync::{Arc, RwLock, atomic::AtomicBool},
    time::{Duration, Instant},
};
use tracing::{error, trace};

#[derive(Debug, Clone)]
pub struct AirgapDetection {
    enabled: bool,
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
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            last_check: Arc::new(RwLock::new(None)),
        }
    }

    /// Starts the airgap detection in a background task.
    /// It will periodically check for airgap violations by attempting to connect to a known server.
    pub async fn start() -> AirgapDetection {
        let airgap_detection = AirgapDetection {
            enabled: true,
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            last_check: Arc::new(RwLock::new(None)),
        };

        std::thread::spawn({
            let airgap_detection = airgap_detection.clone();

            move || {
                loop {
                    airgap_detection.detect_airgap();

                    std::thread::sleep(Duration::from_secs(AIRGAP_DETECTION_INTERVAL));
                }
            }
        });

        airgap_detection
    }

    /// Detects if the system is in an airgap by attempting to connect to a known server.
    fn detect_airgap(&self) {
        // attempt to connect to known IPv4 addresses over TCP
        let tcp_ipv4_connection_success = IPV4
            .iter()
            .map(|ip| SocketAddr::new(IpAddr::V4(*ip), SECURE_PORT))
            .map(|addr| TcpStream::connect_timeout(&addr, TCP_CONNECT_TIMEOUT))
            .filter_map(Result::ok)
            .count();

        if tcp_ipv4_connection_success > 0 {
            error!("Airgap violation detected, abacus is connected to the internet!");
            trace!("TCP IPv4 connections: {tcp_ipv4_connection_success}");
            self.set_airgap_violation_detected(true);
            self.set_last_check();
            return;
        }

        // attempt to connect to known IPv6 addresses over TCP
        let tcp_ipv6_connection_success = IPV6
            .iter()
            .map(|ip| SocketAddr::new(IpAddr::V6(*ip), SECURE_PORT))
            .map(|addr| TcpStream::connect_timeout(&addr, TCP_CONNECT_TIMEOUT))
            .filter_map(Result::ok)
            .count();

        if tcp_ipv6_connection_success > 0 {
            error!("Airgap violation detected, abacus is connected to the internet!");
            trace!("TCP IPv6 connections: {tcp_ipv6_connection_success}");
            self.set_airgap_violation_detected(true);
            self.set_last_check();
            return;
        }

        // persorm a DNS lookup using the default resolver
        let dns_lookup_success = DOMAINS
            .iter()
            .map(|d| format!("{d}:{SECURE_PORT}").to_socket_addrs())
            .filter_map(Result::ok)
            .count();

        if dns_lookup_success > 0 {
            error!("Airgap violation detected, abacus is connected to the internet!");
            trace!("DNS lookup success: {dns_lookup_success}");
            self.set_airgap_violation_detected(true);
            self.set_last_check();
            return;
        }

        trace!("No airgap violation detected.");
        self.set_airgap_violation_detected(false);
        self.set_last_check();
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
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_block_request_on_airgap_violation() {
        let airgap_detection = AirgapDetection {
            enabled: true,
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

    #[tokio::test]
    async fn test_block_request_on_airgap_detection_outdated() {
        let airgap_detection = AirgapDetection {
            enabled: true,
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
