use axum::{Json, extract::State};
use axum_extra::extract::Query;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::middleware::authentication::RouteAuthorization,
    domain::role::Role,
    infra::audit_log::{AuditLogEvent, LogFilter},
};

pub fn router() -> OpenApiRouter<AppState> {
    use Role::*;

    const ALLOWED_ROLES: &[Role] = &[Administrator, CoordinatorGSB];

    OpenApiRouter::default()
        .routes(routes!(audit_log_list).authorize(ALLOWED_ROLES))
        .routes(routes!(audit_log_list_users).authorize(ALLOWED_ROLES))
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
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

#[derive(Debug, Deserialize, ToSchema, IntoParams)]
#[serde(deny_unknown_fields)]
#[into_params(parameter_in = Query)]
pub struct LogFilterQuery {
    /// Page number, default 1
    #[serde(default = "default_page")]
    pub page: u32,
    /// Number of items per page
    #[serde(default = "default_per_page")]
    pub per_page: u32,
    /// Filter by log level
    #[serde(default)]
    pub level: Vec<String>,
    /// Filter by event type
    #[serde(default)]
    pub event: Vec<String>,
    /// Filter by user ID
    #[serde(default)]
    pub user: Vec<u32>,
    /// Only show events since the specified timestamp
    #[serde(default)]
    pub since: Option<i64>,
}

/// List audit events
#[utoipa::path(
    get,
    path = "/api/log",
    params(LogFilterQuery),
    responses(
        (status = 200, description = "Audit log event list", body = AuditLogListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn audit_log_list(
    Query(filter_query): Query<LogFilterQuery>,
    State(pool): State<SqlitePool>,
) -> Result<Json<AuditLogListResponse>, APIError> {
    let filter = LogFilter::from_query(&filter_query);

    let mut conn = pool.acquire().await?;
    let events = crate::audit_log::list(&mut conn, &filter).await?;
    let count = crate::audit_log::count(&mut conn, &filter).await?;

    let pages = if count > 0 && filter.limit > 0 {
        count.div_ceil(filter.limit)
    } else {
        1
    };

    Ok(Json(AuditLogListResponse {
        events,
        pages,
        page: filter_query.page,
        per_page: filter_query.per_page,
    }))
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct AuditLogUser {
    pub id: u32,
    pub username: String,
    pub fullname: String,
    pub role: Role,
}

/// Lists all users that appear in the audit log
#[utoipa::path(
    get,
    path = "/api/log-users",
    responses(
        (status = 200, description = "Audit log list of all users", body = Vec<AuditLogUser>),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn audit_log_list_users(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<AuditLogUser>>, APIError> {
    let mut conn = pool.acquire().await?;
    let users = crate::audit_log::list_users(&mut conn).await?;

    Ok(Json(users))
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use axum::{extract::State, response::IntoResponse};
    use axum_extra::extract::Query;
    use http_body_util::BodyExt;
    use sqlx::SqlitePool;
    use test_log::test;

    use crate::{
        api::{
            audit::{LogFilterQuery, audit_log_list, audit_log_list_users},
            authentication::{UserLoggedInAuditData, UserLoginFailedAuditData},
        },
        infra::audit_log::{AuditLogListResponse, AuditLogUser, AuditService},
        repository::user_repo::{self, User},
    };

    fn new_test_audit_service(user: Option<User>) -> AuditService {
        AuditService::new(user, Some(Ipv4Addr::new(203, 0, 113, 0).into()))
    }

    async fn create_log_entries(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = user_repo::get_by_username(&mut conn, "admin1")
            .await
            .unwrap()
            .unwrap();
        let service = new_test_audit_service(Some(user));
        let audit_event = UserLoggedInAuditData {
            user_agent: "Mozilla/5.0".to_string(),
            logged_in_users_count: 1,
        };
        service.log(&mut conn, &audit_event, None).await.unwrap();
        service.log(&mut conn, &audit_event, None).await.unwrap();
        service.log(&mut conn, &audit_event, None).await.unwrap();

        let service = new_test_audit_service(None);
        let audit_event = UserLoginFailedAuditData {
            username: "random".to_string(),
            user_agent: "Mozilla/5.0".to_string(),
        };
        service.log(&mut conn, &audit_event, None).await.unwrap();
    }

    async fn get_list(pool: SqlitePool, query: LogFilterQuery) -> AuditLogListResponse {
        let response = audit_log_list(Query(query), State(pool))
            .await
            .into_response();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        serde_json::from_slice(&body).unwrap()
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list(pool: SqlitePool) {
        create_log_entries(pool.clone()).await;

        let result = get_list(
            pool.clone(),
            LogFilterQuery {
                page: 1,
                per_page: 200,
                level: vec![],
                event: vec![],
                user: vec![],
                since: None,
            },
        )
        .await;
        assert_eq!(result.events.len(), 4);
        assert_eq!(result.page, 1);
        assert_eq!(result.pages, 1);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list_paging(pool: SqlitePool) {
        create_log_entries(pool.clone()).await;

        let result = get_list(
            pool.clone(),
            LogFilterQuery {
                page: 2,
                per_page: 3,
                level: vec![],
                event: vec![],
                user: vec![],
                since: None,
            },
        )
        .await;
        assert_eq!(result.events.len(), 1);
        assert_eq!(result.page, 2);
        assert_eq!(result.pages, 2);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list_filter_event(pool: SqlitePool) {
        create_log_entries(pool.clone()).await;

        let result = get_list(
            pool.clone(),
            LogFilterQuery {
                page: 1,
                per_page: 200,
                level: vec![],
                event: vec!["UserLoginFailed".to_string()],
                user: vec![],
                since: None,
            },
        )
        .await;
        assert_eq!(result.events.len(), 1);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list_filter_level(pool: SqlitePool) {
        create_log_entries(pool.clone()).await;

        let result = get_list(
            pool.clone(),
            LogFilterQuery {
                page: 1,
                per_page: 200,
                level: vec!["warning".to_string()],
                event: vec![],
                user: vec![],
                since: None,
            },
        )
        .await;
        assert_eq!(result.events.len(), 1);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list_filter_user(pool: SqlitePool) {
        create_log_entries(pool.clone()).await;

        let result = get_list(
            pool.clone(),
            LogFilterQuery {
                page: 1,
                per_page: 200,
                level: vec![],
                event: vec![],
                user: vec![1],
                since: None,
            },
        )
        .await;
        assert_eq!(result.events.len(), 3);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list_users(pool: SqlitePool) {
        create_log_entries(pool.clone()).await;

        let response = audit_log_list_users(State(pool)).await.into_response();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: Vec<AuditLogUser> = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].username, "admin1");
    }
}
