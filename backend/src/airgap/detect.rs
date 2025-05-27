use std::{
    net::ToSocketAddrs,
    sync::{Arc, RwLock, atomic::AtomicBool},
    time::{Duration, Instant},
};
use tracing::error;

#[derive(Debug, Clone)]
pub struct AirgapDetection {
    enabled: bool,
    airgap_violation_detected: Arc<AtomicBool>,
    last_check: Arc<RwLock<Option<Instant>>>,
}

const DNS_LOOKUP_DOMAIN: &str = "kiesraad.nl:443"; // A known domain that should not resolve in an airgapped environment

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
        let dns_lookup_result = DNS_LOOKUP_DOMAIN.to_socket_addrs();

        match dns_lookup_result {
            Ok(_) => {
                // if we get a result from the DNS lookup, the system is not in an airgap
                error!("Airgap violation detected, abacus is connected to the internet!");

                self.set_airgap_violation_detected(true);
            }
            Err(_) => {
                self.set_airgap_violation_detected(false);
            }
        }

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
            last_check: Arc::new(RwLock::new(
                Instant::now().checked_sub(Duration::from_secs(AIRGAP_DETECTION_INTERVAL * 3)),
            )),
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

        let mut last_check = airgap_detection.last_check.write().unwrap();
        *last_check = Some(
            Instant::now()
                .checked_sub(Duration::from_secs(AIRGAP_DETECTION_INTERVAL * 3))
                .unwrap(),
        );

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
