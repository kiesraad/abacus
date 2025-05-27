use crate::APIError;
use axum::{
    extract::{Request, State},
    http::HeaderValue,
    middleware::Next,
    response::Response,
};

use super::AirgapDetection;

const API_PREFIX: &str = "/api/";

/// Middleware to block requests if an airgap violation is detected.
/// If `block_requests_on_violation` is true, it will return an error.
/// If false, it will add a header to the response indicating the violation status.
/// This middleware only operates on requests thating with `API_PREFIX`
pub async fn block_request_on_airgap_violation(
    State(airgap_detection): State<AirgapDetection>,
    request: Request,
    next: Next,
) -> Result<Response, APIError> {
    let is_api_request = request.uri().path().starts_with(API_PREFIX);

    if is_api_request {
        if airgap_detection.violation_detected() {
            if airgap_detection.block_requests_on_violation {
                tracing::error!("Blocking request due to airgap violation");

                Err(APIError::AirgapViolation(
                    "Blocking request due to airgap violation".to_string(),
                ))
            } else {
                let mut response = next.run(request).await;
                response
                    .headers_mut()
                    .insert("X-Airgap-Violation", HeaderValue::from_static("true"));

                Ok(response)
            }
        } else {
            let mut response = next.run(request).await;
            response
                .headers_mut()
                .insert("X-Airgap-Violation", HeaderValue::from_static("false"));

            Ok(response)
        }
    } else {
        Ok(next.run(request).await)
    }
}
