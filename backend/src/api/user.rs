use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    api::{
        authentication::{UserCreatedAuditData, UserDeletedAuditData, UserUpdatedAuditData},
        middleware::authentication::{RouteAuthorization, error::AuthenticationError},
    },
    domain::role::Role,
    infra::audit_log::AuditService,
    repository::{
        session_repo,
        user_repo::{self, User, UserId},
    },
};

pub fn user_router() -> OpenApiRouter<AppState> {
    use Role::*;

    const ALLOWED_ROLES: &[Role] = &[Administrator, CoordinatorCSB, CoordinatorGSB];

    OpenApiRouter::default()
        .routes(routes!(user_list).authorize(ALLOWED_ROLES))
        .routes(routes!(user_create).authorize(ALLOWED_ROLES))
        .routes(routes!(user_get).authorize(ALLOWED_ROLES))
        .routes(routes!(user_update).authorize(ALLOWED_ROLES))
        .routes(routes!(user_delete).authorize(ALLOWED_ROLES))
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserListResponse {
    pub users: Vec<User>,
}

/// Lists all users
#[utoipa::path(
    get,
    path = "/api/users",
    responses(
        (status = 200, description = "User list", body = UserListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn user_list(
    user: User,
    State(pool): State<SqlitePool>,
) -> Result<Json<UserListResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let role_filter = match user.role() {
        Role::CoordinatorCSB => Some(Role::TypistCSB),
        Role::CoordinatorGSB => Some(Role::TypistGSB),
        _ => None,
    };

    Ok(Json(UserListResponse {
        users: user_repo::list(&mut conn, role_filter).await?,
    }))
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct CreateUserRequest {
    pub username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub fullname: Option<String>,
    pub temp_password: String,
    pub role: Role,
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UpdateUserRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub fullname: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub temp_password: Option<String>,
}

/// Create a new user
#[utoipa::path(
    post,
    path = "/api/users",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "User created", body = User),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 409, description = "Conflict (username already exists)", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn user_create(
    logged_in_user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(create_user_req): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), APIError> {
    // Coordinators can only create Typists for the same committee category
    if !logged_in_user.role().manages(&create_user_req.role) {
        return Err(AuthenticationError::Forbidden.into());
    }

    let mut tx = pool.begin_immediate().await?;
    let user = user_repo::create(
        &mut tx,
        &create_user_req.username,
        create_user_req.fullname.as_deref(),
        &create_user_req.temp_password,
        true,
        create_user_req.role,
    )
    .await?;
    audit_service
        .log(&mut tx, &UserCreatedAuditData(user.clone().into()), None)
        .await?;
    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(user)))
}

/// Get a user
#[utoipa::path(
    get,
    path = "/api/users/{user_id}",
    responses(
        (status = 200, description = "User found", body = User),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("user_id" = UserId, description = "User id"),
    ),
)]
async fn user_get(
    logged_in_user: User,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<UserId>,
) -> Result<Json<User>, APIError> {
    let mut conn = pool.acquire().await?;
    let user = user_repo::get_by_id(&mut conn, user_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)?;

    // Coordinators can only fetch Typists for the same committee category
    if !logged_in_user.role().manages(&user.role()) {
        return Err(AuthenticationError::Forbidden.into());
    }

    Ok(Json(user))
}

/// Update a user
#[utoipa::path(
    put,
    path = "/api/users/{user_id}",
    request_body = UpdateUserRequest,
    responses(
        (status = 200, description = "User updated", body = User),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("user_id" = UserId, description = "User id"),
    ),
)]
pub async fn user_update(
    logged_in_user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(user_id): Path<UserId>,
    Json(update_user_req): Json<UpdateUserRequest>,
) -> Result<Json<User>, APIError> {
    let mut tx = pool.begin_immediate().await?;

    if logged_in_user.role().is_coordinator() {
        // fetch the current user to determine role
        let user = user_repo::get_by_id(&mut tx, user_id)
            .await?
            .ok_or(sqlx::Error::RowNotFound)?;

        // Coordinators can only update Typists for the same committee category
        if !logged_in_user.role().manages(&user.role()) {
            return Err(AuthenticationError::Forbidden.into());
        }
    }

    if let Some(fullname) = update_user_req.fullname {
        user_repo::update_fullname(&mut tx, user_id, &fullname).await?
    };

    if let Some(temp_password) = update_user_req.temp_password {
        user_repo::set_temporary_password(&mut tx, user_id, &temp_password).await?;

        session_repo::delete_user_session(&mut tx, user_id).await?;
    };

    let user = user_repo::get_by_id(&mut tx, user_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)?;

    audit_service
        .log(&mut tx, &UserUpdatedAuditData(user.clone().into()), None)
        .await?;

    tx.commit().await?;

    Ok(Json(user))
}

/// Delete a user
#[utoipa::path(
    delete,
    path = "/api/users/{user_id}",
    responses(
        (status = 204, description = "User deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("user_id" = UserId, description = "User id"),
    ),
)]
async fn user_delete(
    logged_in_user: User,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(user_id): Path<UserId>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    // fetch the current user to determine role and audit logging
    let user = user_repo::get_by_id(&mut tx, user_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)?;

    // Coordinators can only delete Typists for the same committee category
    if !logged_in_user.role().manages(&user.role()) {
        return Err(AuthenticationError::Forbidden.into());
    }

    // Prevent user from deleting their own account
    if logged_in_user.id() == user_id {
        return Err(AuthenticationError::OwnAccountCannotBeDeleted.into());
    }

    let deleted = user_repo::delete(&mut tx, user_id).await?;

    if deleted {
        audit_service
            .log(&mut tx, &UserDeletedAuditData(user.clone().into()), None)
            .await?;

        tx.commit().await?;

        Ok(StatusCode::NO_CONTENT)
    } else {
        tx.rollback().await?;

        Err(sqlx::Error::RowNotFound.into())
    }
}
