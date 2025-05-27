use std::sync::{Arc, atomic::AtomicBool};

use tracing::error;

#[derive(Debug, Clone)]
pub struct AirgapDetection {
    airgap_violation_detected: Arc<AtomicBool>,
    pub block_requests_on_violation: bool,
}

const DETECTION_SERVER_SOCKET: &str = "1.1.1.1:53"; // Cloudflare's public DNS server

pub const FORCE_DETECTION_ENV_NAME: &str = "ABACUS_FORCE_AIRGAP_DETECTION";

impl AirgapDetection {
    pub fn nop() -> Self {
        Self {
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            block_requests_on_violation: false,
        }
    }

    pub async fn start() -> AirgapDetection {
        let airgap_detection = AirgapDetection {
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
            block_requests_on_violation: (cfg!(feature = "force-airgap-detection")
                || std::env::var(FORCE_DETECTION_ENV_NAME)
                    .map(|v| v == "true")
                    .unwrap_or(false)),
        };

        tokio::spawn({
            let airgap_detection = airgap_detection.clone();
            async move {
                // run every 30 seconds
                loop {
                    let _ = Self::detect_airgap(airgap_detection.clone()).await;
                    tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
                }
            }
        });

        airgap_detection
    }

    async fn detect_airgap(
        airgap_detection: AirgapDetection,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // detect airgap by making a tcp connection to a known server
        match tokio::net::TcpStream::connect(DETECTION_SERVER_SOCKET).await {
            Ok(stream) => {
                // if we can connect, it means we are not in an airgap
                if airgap_detection.block_requests_on_violation {
                    error!(
                        "Airgap violation detected, abacus is connected to the internet: {}",
                        stream
                            .peer_addr()
                            .map(|a| a.to_string())
                            .unwrap_or_default()
                    );
                }

                airgap_detection
                    .airgap_violation_detected
                    .store(true, std::sync::atomic::Ordering::Relaxed);
            }
            Err(_) => {
                if airgap_detection.violation_detected() {
                    airgap_detection
                        .airgap_violation_detected
                        .store(false, std::sync::atomic::Ordering::Relaxed);
                }
            }
        }

        Ok(())
    }

    pub fn violation_detected(&self) -> bool {
        self.airgap_violation_detected
            .load(std::sync::atomic::Ordering::Relaxed)
    }
}
