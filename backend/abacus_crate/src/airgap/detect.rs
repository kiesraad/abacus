use sqlx::SqlitePool;
use std::{
    net::{IpAddr, Ipv4Addr, Ipv6Addr},
    sync::{Arc, RwLock, atomic::AtomicBool},
    time::{Duration, Instant},
};
use tokio::{task::JoinSet, time::timeout};
use tracing::{debug, error, info, trace, warn};

use crate::audit_log::AuditEvent;

#[derive(Clone)]
pub struct AirgapDetection {
    enabled: bool,
    pool: Option<SqlitePool>,
    airgap_violation_detected: Arc<AtomicBool>,
    last_check: Arc<RwLock<Option<Instant>>>,
}

const SECURE_PORT: u16 = 443; // Default secure port for HTTPS

const CONNECT_TIMEOUT: Duration = Duration::from_secs(10); // Timeout for TCP connections

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

pub const AIRGAP_DETECTION_INTERVAL: u64 = 30; // interval in seconds

impl AirgapDetection {
    /// Creates a new AirgapDetection instance that does not perform any detection.
    pub fn nop() -> Self {
        Self {
            enabled: false,
            pool: None,
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            last_check: Arc::new(RwLock::new(None)),
        }
    }

    /// Starts the airgap detection in a background task.
    /// It will periodically check for airgap violations by attempting to connect to a known server.
    pub async fn start(pool: SqlitePool) -> AirgapDetection {
        let airgap_detection = AirgapDetection {
            enabled: true,
            pool: Some(pool),
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            last_check: Arc::new(RwLock::new(None)),
        };

        let inner_airgap_detection = airgap_detection.clone();
        tokio::task::spawn(async move {
            loop {
                let start = Instant::now();
                inner_airgap_detection.perform_detection().await;
                debug!("Airgap detection took {} ms", start.elapsed().as_millis());
                tokio::time::sleep(Duration::from_secs(AIRGAP_DETECTION_INTERVAL)).await;
            }
        });

        airgap_detection
    }

    #[allow(clippy::cognitive_complexity)]
    async fn log_status_change(&self) {
        let event = if self.violation_detected() {
            AuditEvent::AirGapViolationDetected
        } else {
            AuditEvent::AirGapViolationResolved
        };

        if let Some(pool) = &self.pool {
            if let Ok(mut conn) = pool.acquire().await {
                if let Err(e) = crate::audit_log::create(&mut conn, &event, None, None, None).await
                {
                    error!("Failed to log air gap status change: {e:#?}");
                }
            } else {
                error!("Failed to acquire database connection for air gap status logging");
            }
        }
    }

    #[allow(clippy::cognitive_complexity)]
    async fn perform_detection(&self) {
        let was_connected = self.violation_detected();

        if self.is_connected().await {
            self.set_airgap_violation_detected(true);

            if was_connected {
                warn!("Airgap violation detected, abacus is still connected to the internet.");
            } else {
                error!("Airgap violation detected, abacus is connected to the internet!");
                self.log_status_change().await;
            }
        } else {
            self.set_airgap_violation_detected(false);

            if was_connected {
                info!("Airgap violation resolved, abacus is no longer connected to the internet.");
                self.log_status_change().await;
            } else {
                trace!("No airgap violation detected.");
            }
        }
    }

    /// Detects if the system is in an airgap by attempting to connect to IPv4, IPv6 addresses and performing DNS lookups
    async fn is_connected(&self) -> bool {
        let mut set = JoinSet::new();

        let all_ip_adresses = IPV4
            .iter()
            .map(|ip| IpAddr::V4(*ip))
            .chain(IPV6.iter().map(|ip| IpAddr::V6(*ip)));

        // attempt to connect to known IP addresses over TCP
        for ip in all_ip_adresses {
            set.spawn(async move {
                match timeout(
                    CONNECT_TIMEOUT,
                    tokio::net::TcpStream::connect((ip, SECURE_PORT)),
                )
                .await
                {
                    Ok(Ok(_)) => {
                        warn!("TCP connection to IP address {ip} successful");
                        true
                    }
                    _ => false,
                }
            });
        }

        // attempt to resolve known domains
        for domain in DOMAINS {
            set.spawn(async move {
                match timeout(
                    CONNECT_TIMEOUT,
                    tokio::net::lookup_host((domain, SECURE_PORT)),
                )
                .await
                {
                    Ok(Ok(_)) => {
                        warn!("DNS lookup of domain {domain} successful");
                        true
                    }
                    _ => false,
                }
            });
        }

        // if one of the connection attempts or lookups succeeded, return the result
        while let Some(res) = set.join_next().await {
            if matches!(res, Ok(true)) {
                return true;
            }
        }

        false
    }

    fn set_airgap_violation_detected(&self, status: bool) {
        self.airgap_violation_detected
            .store(status, std::sync::atomic::Ordering::Relaxed);

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
    use crate::{
        airgap::block_request_on_airgap_violation, router, router::openapi_router, shutdown_signal,
    };
    use std::net::SocketAddr;

    use super::*;
    use axum::{
        Router,
        body::Body,
        http::{Method, Request},
        middleware,
        routing::get,
    };
    use hyper::StatusCode;
    use test_log::test;
    use tokio::net::TcpListener;
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_block_request_on_airgap_violation() {
        let airgap_detection = AirgapDetection {
            enabled: true,
            pool: None,
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
            let mut conn = pool.acquire().await.unwrap();
            events = crate::audit_log::list_all(&mut conn).await.unwrap();

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
            pool: None,
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

    async fn serve_api_with_airgap_detection(pool: SqlitePool) -> SocketAddr {
        let airgap_detection = AirgapDetection::start(pool.clone()).await;
        let mut violation_detected = false;

        for i in 0..=200 {
            if i == 200 {
                panic!("Airgap detection failed to detect violation after 10 seconds");
            }

            if airgap_detection.violation_detected() {
                violation_detected = true;
                break;
            }

            tokio::time::sleep(Duration::from_millis(50)).await;
        }

        assert!(violation_detected, "Airgap detection did not run");

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        tokio::spawn(async move {
            let app = router::create_router(pool, airgap_detection).unwrap();

            axum::serve(
                listener,
                app.into_make_service_with_connect_info::<SocketAddr>(),
            )
            .with_graceful_shutdown(shutdown_signal())
            .await
            .unwrap();
        });

        addr
    }

    #[test(sqlx::test(fixtures(path = "../../fixtures", scripts("election_2", "users"))))]
    async fn test_airgap_detection(pool: SqlitePool) {
        let openapi = openapi_router().into_openapi();
        let addr = serve_api_with_airgap_detection(pool).await;

        // loop through all the paths in the openapi spec
        for (path, item) in openapi.paths.paths.iter() {
            let operations = [
                (Method::GET, &item.get),
                (Method::POST, &item.post),
                (Method::PUT, &item.put),
                (Method::PATCH, &item.patch),
                (Method::DELETE, &item.delete),
            ];

            // loop through all the operations for each path
            for (method, operation) in operations.into_iter() {
                if let Some(operation) = operation {
                    let mut path = path.to_string();

                    // replace path parameters with (dummy) values
                    if let Some(parameters) = operation.parameters.as_ref() {
                        for param in parameters.iter() {
                            path = path.replace(&format!("{{{}}}", &param.name), "1");
                        }
                    }

                    // make a request, given the path and a method
                    let url = format!("http://{addr}{path}");
                    let response = reqwest::Client::new()
                        .request(method.clone(), url)
                        .send()
                        .await
                        .unwrap();

                    assert_eq!(
                        response.status(),
                        503,
                        "expected response code 503 for {method} {path} when airgap violation is detected",
                    );
                }
            }
        }
    }
}
