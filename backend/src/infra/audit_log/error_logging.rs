use axum::{
    extract::{OriginalUri, State},
    response::Response,
};
use sqlx::SqlitePool;
use tracing::error;

use super::{AsAuditEvent, AuditService, ErrorDetails};
use crate::ErrorResponse;

#[allow(clippy::cognitive_complexity)]
pub async fn log_error(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    OriginalUri(original_uri): OriginalUri,
    mut response: Response,
) -> Response {
    if let Some(error_response) = response.extensions_mut().remove::<ErrorResponse>()
        && let Some(error_details) =
            ErrorDetails::from_error_response(&error_response, original_uri)
        && audit_service.has_user()
    {
        match pool.acquire().await {
            Ok(mut conn) => {
                match &error_details.as_audit_event() {
                    Ok(event) => {
                        if let Err(e) = audit_service
                            .log(&mut conn, event, Some(error_response.error.clone()))
                            .await
                        {
                            error!("Failed to log error: {e:?}");
                        }
                    }
                    Err(e) => error!("Failed to serialize audit event into JSON: {e:?}"),
                };
            }
            Err(e) => {
                error!("Failed to acquire database connection: {e:?}");
            }
        }
    }

    response
}
