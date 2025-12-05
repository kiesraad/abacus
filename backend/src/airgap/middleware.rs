use std::time::Instant;

use crate::APIError;
use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};

use super::{AirgapDetection, detect::AIRGAP_DETECTION_INTERVAL};

const API_PREFIX: &str = "/api/";

/// Middleware to block requests if an airgap violation is detected.
/// If `block_requests_on_violation` is true, it will return an error.
/// If false, it will add a header to the response indicating the violation status.
/// This middleware only operates on requests thating with `API_PREFIX`
#[allow(clippy::cognitive_complexity)]
pub async fn block_request_on_airgap_violation(
    State(airgap_detection): State<AirgapDetection>,
    request: Request,
    next: Next,
) -> Result<Response, APIError> {
    if airgap_detection.is_enabled() {
        let is_api_request = request.uri().path().starts_with(API_PREFIX);

        if is_api_request {
            if let Some(last_check) = airgap_detection.get_last_check() {
                let elapsed = Instant::now().duration_since(last_check);

                if elapsed.as_secs() > AIRGAP_DETECTION_INTERVAL * 2 {
                    tracing::error!(
                        "Airgap detection last check was more than {} seconds ago!",
                        AIRGAP_DETECTION_INTERVAL * 2
                    );

                    return Err(APIError::AirgapViolation(
                        "Airgap detection is not running. Please restart the application."
                            .to_string(),
                    ));
                }
            } else {
                tracing::warn!("No last check time available for airgap detection");
            }

            if airgap_detection.violation_detected() {
                tracing::error!(
                    "Blocking request due to airgap violation: {}",
                    request.uri()
                );

                return Err(APIError::AirgapViolation(
                    "Blocking request due to airgap violation".to_string(),
                ));
            }
        }
    }

    Ok(next.run(request).await)
}
