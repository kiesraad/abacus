use axum::{Json, extract::State, http::StatusCode};
use chrono::Local;
use serde::Serialize;
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::middleware::authentication::RouteAuthorization,
    domain::role::Role,
    infra::{
        audit_log::{AsAuditEvent, AuditEventLevel, AuditEventType, AuditService},
        backup::{BackupConfig, BackupResult, create_local_backup},
    },
};

#[derive(Serialize, ToSchema)]
pub struct BackupResponse {
    pub filename: String,
    pub created_at: chrono::DateTime<Local>,
}

#[derive(Serialize)]
struct DatabaseBackupCreatedAuditData {
    filename: String,
}

impl AsAuditEvent for DatabaseBackupCreatedAuditData {
    const EVENT_TYPE: AuditEventType = AuditEventType::DatabaseBackupCreated;
    const EVENT_LEVEL: AuditEventLevel = AuditEventLevel::Success;
}

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;
    const ALLOWED_ROLES: &[Role] = &[Administrator, CoordinatorCSB, CoordinatorGSB];
    OpenApiRouter::default().routes(routes!(create_backup).authorize(ALLOWED_ROLES))
}

#[utoipa::path(
    post,
    path = "/api/backup",
    responses(
        (status = 201, description = "Backup created successfully", body = BackupResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 409, description = "Backup already exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn create_backup(
    State(pool): State<SqlitePool>,
    State(backup_config): State<BackupConfig>,
    audit_service: AuditService,
) -> Result<(StatusCode, Json<BackupResponse>), APIError> {
    let BackupResult {
        filename,
        created_at,
    } = create_local_backup(&pool, &backup_config).await?;
    let response = BackupResponse {
        filename,
        created_at,
    };

    let mut conn = pool.acquire().await?;
    audit_service
        .log(
            &mut conn,
            &DatabaseBackupCreatedAuditData {
                filename: response.filename.clone(),
            },
            None,
        )
        .await?;

    Ok((StatusCode::CREATED, Json(response)))
}
