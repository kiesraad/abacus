use std::sync::{Arc, atomic::AtomicBool};

use tracing::error;

#[derive(Debug, Clone)]
pub struct AirgapDetection {
    airgap_violation_detected: Arc<AtomicBool>,
}

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
                    tokio::time::sleep(tokio::time::Duration::from_secs(30)).await;
                }
            }
        });

        airgap_detection
    }

    async fn detect_airgap(
        airgap_detection: AirgapDetection,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // detect airgap by making a tcp connection to a known server
        match tokio::net::TcpStream::connect("8.8.8.8").await {
            Ok(stream) => {
                error!(
                    "Airgap violation detected: connected to the internet: {:?}",
                    stream.peer_addr()
                );
                airgap_detection
                    .airgap_violation_detected
                    .store(true, std::sync::atomic::Ordering::Relaxed);
            }
            Err(_) => {
                airgap_detection
                    .airgap_violation_detected
                    .store(false, std::sync::atomic::Ordering::Relaxed);
            }
        }

        Ok(())
    }
}
