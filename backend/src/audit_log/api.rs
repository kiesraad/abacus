use axum::{
    Json,
    extract::{Query, State},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{APIError, ErrorResponse, authentication::AdminOrCoordinator};

use super::{AuditLog, AuditLogEvent};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AuditLogListResponse {
    pub events: Vec<AuditLogEvent>,
    pub page: u32,
    pub pages: u32,
    pub per_page: u32,
}

/// Starting page number
fn default_page() -> u32 {
    1
}

/// Number of items per page
fn default_per_page() -> u32 {
    200
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Pagination {
    #[serde(default = "default_page")]
    page: u32,
    #[serde(default = "default_per_page")]
    per_page: u32,
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
    _user: AdminOrCoordinator,
    pagination: Query<Pagination>,
    State(audit_log): State<AuditLog>,
) -> Result<Json<AuditLogListResponse>, APIError> {
    let offset = (pagination.page - 1) * pagination.per_page;
    let limit = pagination.per_page;

    let events = audit_log.list(offset, limit).await?;
    let count = audit_log.count().await?;
    let pages = if count > 0 && limit > 0 {
        count.div_ceil(limit)
    } else {
        1
    };

    Ok(Json(AuditLogListResponse {
        events,
        pages,
        page: pagination.page,
        per_page: pagination.per_page,
    }))
}

#[cfg(test)]
mod tests {
    use axum::{
        Router,
        body::Body,
        http::{Method, Request},
        routing::get,
    };
    use chrono::TimeDelta;
    use http_body_util::BodyExt;
    use sqlx::SqlitePool;
    use std::net::Ipv4Addr;
    use test_log::test;
    use tower::ServiceExt;

    use crate::{
        AppState,
        audit_log::{
            AuditEvent, AuditLog, AuditLogListResponse, AuditService, UserLoggedInDetails,
            audit_log_list,
        },
        authentication::{Sessions, Users},
    };

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list(pool: SqlitePool) {
        let state = AppState { pool: pool.clone() };

        let session = Sessions::new(pool.clone())
            .create(1, TimeDelta::seconds(60 * 30))
            .await
            .unwrap();

        let app = Router::new()
            .route("/api/log", get(audit_log_list))
            .with_state(state);

        // create some log entries
        let service = AuditService::new(
            AuditLog::new(pool.clone()),
            Ipv4Addr::new(203, 0, 113, 0).into(),
            Users::new(pool)
                .get_by_username("admin")
                .await
                .unwrap()
                .unwrap(),
        );
        let audit_event = AuditEvent::UserLoggedIn(UserLoggedInDetails {
            user_agent: "Mozilla/5.0".to_string(),
            logged_in_users_count: 1,
        });
        service.log_success(&audit_event, None).await.unwrap();
        service.log_success(&audit_event, None).await.unwrap();
        service.log_success(&audit_event, None).await.unwrap();

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .header("cookie", session.get_cookie().encoded().to_string())
                    .uri("/api/log")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: AuditLogListResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.events.len(), 3);
        assert_eq!(result.page, 1);
        assert_eq!(result.pages, 1);

        let response = app
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .header("cookie", session.get_cookie().encoded().to_string())
                    .uri("/api/log?perPage=2&page=2")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: AuditLogListResponse = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.events.len(), 1);
        assert_eq!(result.page, 2);
        assert_eq!(result.pages, 2);
    }
}
