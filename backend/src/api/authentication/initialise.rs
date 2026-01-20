use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use sqlx::SqlitePool;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    error::ErrorReference,
    infra::authentication::{CreateUserRequest, Role, User, error::AuthenticationError},
    repository::user_repo,
    service::audit_log::{AuditEvent, AuditService},
};

/// Check whether the application is initialised (an admin user exists + has logged in at least once)
#[utoipa::path(
  get,
  path = "/api/initialised",
  responses(
      (status = 204, description = "The application is initialised"),
      (status = 418, description = "The application is not initialised", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
)]
pub async fn initialised(State(pool): State<SqlitePool>) -> Result<impl IntoResponse, APIError> {
    let mut conn = pool.acquire().await?;
    if user_repo::has_active_users(&mut conn).await? {
        Ok(StatusCode::NO_CONTENT)
    } else {
        Err(AuthenticationError::NotInitialised.into())
    }
}

/// Create the first admin user, only allowed if no users exist yet
#[utoipa::path(
    post,
    path = "/api/initialise/first-admin",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "First admin user created", body = User),
        (status = 403, description = "Forbidden, an active user already exists", body = ErrorResponse),
        (status = 409, description = "Conflict (username already exists)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn create_first_admin(
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(create_user_req): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), APIError> {
    let mut tx = pool.begin_immediate().await?;

    if user_repo::has_active_users(&mut tx).await? {
        return Err(AuthenticationError::AlreadyInitialised.into());
    }

    // Delete any existing admin user
    let users = user_repo::list(&mut tx, None).await?;
    for user in users {
        if user.role() == Role::Administrator {
            user_repo::delete(&mut tx, user.id()).await?;

            audit_service
                .log(&mut tx, &AuditEvent::UserDeleted(user.into()), None)
                .await?;
        }
    }

    // Create the first admin user
    let user = user_repo::create(
        &mut tx,
        &create_user_req.username,
        create_user_req.fullname.as_deref(),
        &create_user_req.temp_password,
        false,
        Role::Administrator,
    )
    .await?;

    audit_service
        .log(&mut tx, &AuditEvent::UserCreated(user.clone().into()), None)
        .await?;

    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(user)))
}

#[utoipa::path(
    get,
    path = "/api/initialise/admin-exists",
    responses(
        (status = 204, description = "First admin user exists"),
        (status = 403, description = "Forbidden, the application is already initialised", body = ErrorResponse),
        (status = 404, description = "No admin user exists", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn admin_exists(State(pool): State<SqlitePool>) -> Result<StatusCode, APIError> {
    let mut conn = pool.acquire().await?;
    if user_repo::has_active_users(&mut conn).await? {
        return Err(AuthenticationError::AlreadyInitialised.into());
    }

    if user_repo::admin_exists(&mut conn).await? {
        return Ok(StatusCode::NO_CONTENT);
    }

    Err(APIError::NotFound(
        "No admin user exists".into(),
        ErrorReference::UserNotFound,
    ))
}

#[cfg(test)]
mod tests {
    use test_log::test;

    use super::*;
    use crate::repository::user_repo::update_last_activity_at;

    #[test(sqlx::test)]
    async fn test_initialised(pool: SqlitePool) {
        let result = initialised(State(pool.clone())).await;

        assert!(matches!(
            result,
            Err(APIError::Authentication(
                AuthenticationError::NotInitialised
            ))
        ));

        // Create an admin user to mark the application as initialised
        let mut conn = pool.acquire().await.unwrap();
        let admin = user_repo::create(
            &mut conn,
            "admin",
            Some("Admin User"),
            "admin_password",
            false,
            Role::Administrator,
        )
        .await
        .unwrap();

        admin.update_last_activity_at(&mut conn).await.unwrap();

        let result = initialised(State(pool)).await;
        assert!(result.is_ok());

        let response = result.unwrap().into_response();
        assert_eq!(response.status(), StatusCode::NO_CONTENT);
    }

    #[test(sqlx::test)]
    async fn test_create_first_admin(pool: SqlitePool) {
        let create_user_req = CreateUserRequest {
            username: "admin".to_string(),
            fullname: Some("Admin User".to_string()),
            temp_password: "admin_password".to_string(),
            role: Role::Administrator,
        };

        let response = create_first_admin(
            State(pool.clone()),
            AuditService::new(None, None),
            Json(create_user_req),
        )
        .await;

        assert!(response.is_ok());
        let (status, user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(user.username(), "admin");

        // Create a new user again is allowed as long as the admin has not logged in yet
        let create_user_req = CreateUserRequest {
            username: "admin2".to_string(),
            fullname: Some("Admin User 2".to_string()),
            temp_password: "admin_password".to_string(),
            role: Role::Administrator,
        };
        let response = create_first_admin(
            State(pool.clone()),
            AuditService::new(None, None),
            Json(create_user_req),
        )
        .await;

        assert!(response.is_ok());
        let (status, user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);
        assert_eq!(user.username(), "admin2");

        // Not allowed to create a new user after the first admin has logged in
        let mut conn = pool.acquire().await.unwrap();
        update_last_activity_at(&mut conn, user.id()).await.unwrap();

        let create_user_req = CreateUserRequest {
            username: "admin2".to_string(),
            fullname: Some("Admin User 3".to_string()),
            temp_password: "admin_password".to_string(),
            role: Role::Administrator,
        };
        let response = create_first_admin(
            State(pool.clone()),
            AuditService::new(None, None),
            Json(create_user_req),
        )
        .await;

        assert!(response.is_err());
    }

    #[test(sqlx::test)]
    async fn test_admin_exists(pool: SqlitePool) {
        // No admin user exists yet
        let response = admin_exists(State(pool.clone())).await;
        assert!(response.is_err());
        assert!(matches!(response, Err(APIError::NotFound(_, _))));

        // Create an admin user
        let create_user_req = CreateUserRequest {
            username: "admin".to_string(),
            fullname: Some("Admin User".to_string()),
            temp_password: "admin_password".to_string(),
            role: Role::Administrator,
        };
        let response = super::create_first_admin(
            State(pool.clone()),
            AuditService::new(None, None),
            Json(create_user_req),
        )
        .await;

        assert!(response.is_ok());
        let (status, _user) = response.unwrap();
        assert_eq!(status, StatusCode::CREATED);

        let response = admin_exists(State(pool.clone())).await;
        assert_eq!(response.unwrap(), StatusCode::NO_CONTENT);
    }
}
