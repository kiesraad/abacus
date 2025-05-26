use std::sync::{Arc, atomic::AtomicBool};

use tracing::error;

#[derive(Debug, Clone)]
pub struct AirgapDetection {
    airgap_violation_detected: Arc<AtomicBool>,
}

const DETECTION_SERVER_SOCKET: &str = "8.8.8.8:53"; // Google's public DNS server

impl AirgapDetection {
    pub fn nop() -> Self {
        Self {
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
        }
    }

    pub async fn start() -> AirgapDetection {
        let airgap_detection = AirgapDetection {
            airgap_violation_detected: Arc::new(AtomicBool::new(false)),
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
                error!(
                    "Airgap violation detected, abacus is connected to the internet: {}",
                    stream
                        .peer_addr()
                        .map(|a| a.to_string())
                        .unwrap_or_default()
                );
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
