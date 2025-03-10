use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{APIError, ErrorResponse, authentication::Admin};

use super::{AuditLog, AuditLogEvent};

#[derive(Serialize, Deserialize, ToSchema)]
pub struct AuditLogListResponse {
    pub events: Vec<AuditLogEvent>,
}

/// Lists all users
#[utoipa::path(
    get,
    path = "/api/log",
    responses(
        (status = 200, description = "Audit log event list", body = AuditLogListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn audit_log_list(
    _user: Admin,
    State(audit_log): State<AuditLog>,
) -> Result<Json<AuditLogListResponse>, APIError> {
    Ok(Json(AuditLogListResponse {
        events: audit_log.list().await?,
    }))
}
