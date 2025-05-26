use axum::{
    extract::{Request, State},
    middleware::Next,
    response::Response,
};

use crate::APIError;

use super::AirgapDetection;

pub async fn block_request_on_airgap_violation(
    State(airgap_detection): State<AirgapDetection>,
    request: Request,
    next: Next,
) -> Result<Response, APIError> {
    if airgap_detection.violation_detected() {
        tracing::error!("Airgap violation detected, blocking request");

        return Err(APIError::AirgapViolation(
            "Blocking request due to airgap violation".to_string(),
        ));
    }

    Ok(next.run(request).await)
}
