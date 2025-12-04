use axum::{
    extract::{OriginalUri, State},
    response::Response,
};
use sqlx::SqlitePool;
use tracing::error;

use super::{AuditEvent, AuditService, ErrorDetails};
use crate::ErrorResponse;

#[allow(clippy::cognitive_complexity)]
pub async fn log_error(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    OriginalUri(original_uri): OriginalUri,
    mut response: Response,
) -> Response {
    if let Some(error_response) = response.extensions_mut().remove::<ErrorResponse>() {
        if let Some(error_details) =
            ErrorDetails::from_error_response(&error_response, original_uri)
        {
            if audit_service.has_user() {
                match pool.acquire().await {
                    Ok(mut conn) => {
                        if let Err(e) = audit_service
                            .log(
                                &mut conn,
                                &AuditEvent::Error(error_details),
                                Some(error_response.error.clone()),
                            )
                            .await
                        {
                            error!("Failed to log error: {e:?}");
                        }
                    }
                    Err(e) => {
                        error!("Failed to acquire database connection: {e:?}");
                    }
                }
            }
        }
    }

    response
}
