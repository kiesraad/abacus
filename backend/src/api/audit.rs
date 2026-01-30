use axum::{Json, extract::State};
use axum_extra::extract::Query;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::{IntoParams, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse,
    api::middleware::authentication::AdminOrCoordinator,
    domain::role::Role,
    infra::audit_log::{AuditLogEvent, LogFilter},
};

pub fn router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(audit_log_list))
        .routes(routes!(audit_log_list_users))
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
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
async fn audit_log_list(
    _user: AdminOrCoordinator,
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
    security(("cookie_auth" = ["administrator", "coordinator"])),
)]
async fn audit_log_list_users(
    _user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<AuditLogUser>>, APIError> {
    let mut conn = pool.acquire().await?;
    let users = crate::audit_log::list_users(&mut conn).await?;

    Ok(Json(users))
}

#[cfg(test)]
mod tests {
    use std::net::Ipv4Addr;

    use axum::{
        Router,
        body::Body,
        http::{
            Method, Request,
            header::{COOKIE, USER_AGENT},
        },
        middleware,
        routing::get,
    };
    use chrono::TimeDelta;
    use http_body_util::BodyExt;
    use sqlx::SqlitePool;
    use test_log::test;
    use tower::ServiceExt;

    use crate::{
        AppState,
        api::{
            audit::{audit_log_list, audit_log_list_users},
            middleware::authentication::inject_user,
        },
        infra::{
            airgap::AirgapDetection,
            audit_log::{
                AuditEvent, AuditLogListResponse, AuditLogUser, AuditService, UserLoggedInDetails,
            },
        },
        repository::user_repo::{self, User, UserId},
    };

    const TEST_USER_AGENT: &str = "TestAgent/1.0";
    const TEST_IP_ADDRESS: &str = "0.0.0.0";

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
        let audit_event = AuditEvent::UserLoggedIn(UserLoggedInDetails {
            user_agent: "Mozilla/5.0".to_string(),
            logged_in_users_count: 1,
        });
        service.log(&mut conn, &audit_event, None).await.unwrap();
        service.log(&mut conn, &audit_event, None).await.unwrap();
        service.log(&mut conn, &audit_event, None).await.unwrap();
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list(pool: SqlitePool) {
        let state = AppState {
            pool: pool.clone(),
            airgap_detection: AirgapDetection::nop(),
        };

        let mut conn = pool.acquire().await.unwrap();
        let session = crate::api::middleware::authentication::session::create(
            &mut conn,
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(60 * 30),
        )
        .await
        .unwrap();

        let app = Router::new()
            .route("/api/log", get(audit_log_list))
            .layer(middleware::map_request_with_state(
                state.clone(),
                inject_user,
            ))
            .with_state(state);

        create_log_entries(pool).await;

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, session.get_cookie().encoded().to_string())
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
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, session.get_cookie().encoded().to_string())
                    .uri("/api/log?per_page=2&page=2")
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

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_list_users(pool: SqlitePool) {
        let state = AppState {
            pool: pool.clone(),
            airgap_detection: AirgapDetection::nop(),
        };

        let mut conn = pool.acquire().await.unwrap();
        let session = crate::api::middleware::authentication::session::create(
            &mut conn,
            UserId::from(1),
            TEST_USER_AGENT,
            TEST_IP_ADDRESS,
            TimeDelta::seconds(60 * 30),
        )
        .await
        .unwrap();

        let app = Router::new()
            .route("/api/log-users", get(audit_log_list_users))
            .layer(middleware::map_request_with_state(
                state.clone(),
                inject_user,
            ))
            .with_state(state);

        create_log_entries(pool).await;

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(Method::GET)
                    .header(USER_AGENT, TEST_USER_AGENT)
                    .header(COOKIE, session.get_cookie().encoded().to_string())
                    .uri("/api/log-users")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: Vec<AuditLogUser> = serde_json::from_slice(&body).unwrap();

        assert_eq!(result.len(), 1);
        assert_eq!(result[0].username, "admin1");
    }
}
