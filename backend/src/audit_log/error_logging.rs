use axum::{extract::OriginalUri, response::Response};
use tracing::error;

use super::{AuditEvent, AuditService, ErrorDetails};
use crate::ErrorResponse;

pub async fn log_error(
    audit_service: AuditService,
    OriginalUri(original_uri): OriginalUri,
    mut response: Response,
) -> Response {
    if let Some(error_response) = response.extensions_mut().remove::<ErrorResponse>() {
        if let Some(error_details) =
            ErrorDetails::from_error_response(&error_response, original_uri)
        {
            if audit_service.has_user() {
                if let Err(e) = audit_service
                    .log(
                        &AuditEvent::Error(error_details),
                        Some(error_response.error.clone()),
                    )
                    .await
                {
                    error!("Failed to log error: {e:?}");
                }
            }
        }
    }

    response
}
