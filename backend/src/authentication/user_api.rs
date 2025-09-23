use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::{Error, SqlitePool};
use utoipa::ToSchema;
use utoipa_axum::{router::OpenApiRouter, routes};

use super::{Admin, AdminOrCoordinator, error::AuthenticationError, user::User};
use crate::{
    APIError, AppState, ErrorResponse, SqlitePoolExt,
    audit_log::{AuditEvent, AuditService},
    authentication::{CreateUserRequest, Role},
};

pub fn user_router() -> OpenApiRouter<AppState> {
    OpenApiRouter::default()
        .routes(routes!(user_list))
        .routes(routes!(user_create))
        .routes(routes!(user_get))
        .routes(routes!(user_update))
        .routes(routes!(user_delete))
}

#[derive(Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct UserListResponse {
    pub users: Vec<User>,
}

/// Lists all users
#[utoipa::path(
    get,
    path = "/api/user",
    responses(
        (status = 200, description = "User list", body = UserListResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn user_list(
    user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
) -> Result<Json<UserListResponse>, APIError> {
    let mut conn = pool.acquire().await?;

    let only_allow_role = if user.is_coordinator() {
        Some(Role::Typist)
    } else {
        None
    };

    Ok(Json(UserListResponse {
        users: super::user::list(&mut conn, only_allow_role).await?,
    }))
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
    path = "/api/user",
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
    user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(create_user_req): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), APIError> {
    // Coordinators can only create Typists
    if user.is_coordinator() && create_user_req.role != Role::Typist {
        return Err(AuthenticationError::Forbidden.into());
    }

    let mut tx = pool.begin_immediate().await?;
    let user = super::user::create(
        &mut tx,
        &create_user_req.username,
        create_user_req.fullname.as_deref(),
        &create_user_req.temp_password,
        true,
        create_user_req.role,
    )
    .await?;
    audit_service
        .log(&mut tx, &AuditEvent::UserCreated(user.clone().into()), None)
        .await?;
    tx.commit().await?;

    Ok((StatusCode::CREATED, Json(user)))
}

/// Get a user
#[utoipa::path(
    get,
    path = "/api/user/{user_id}",
    responses(
        (status = 200, description = "User found", body = User),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
    params(
        ("user_id" = u32, description = "User id"),
    ),
)]
async fn user_get(
    logged_in_user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    Path(user_id): Path<u32>,
) -> Result<Json<User>, APIError> {
    let mut conn = pool.acquire().await?;
    let user = super::user::get_by_id(&mut conn, user_id)
        .await?
        .ok_or(Error::RowNotFound)?;

    // Coordinators can only fetch Typists
    if logged_in_user.is_coordinator() && user.role() != Role::Typist {
        return Err(AuthenticationError::Forbidden.into());
    }

    Ok(Json(user))
}

/// Update a user
#[utoipa::path(
    put,
    path = "/api/user/{user_id}",
    request_body = UpdateUserRequest,
    responses(
        (status = 200, description = "User updated", body = User),
        (status = 400, description = "Bad request", body = ErrorResponse),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
pub async fn user_update(
    user: AdminOrCoordinator,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(user_id): Path<u32>,
    Json(update_user_req): Json<UpdateUserRequest>,
) -> Result<Json<User>, APIError> {
    // fetch the current user
    if user.is_coordinator() {
        let mut conn = pool.acquire().await?;
        let target_user = super::user::get_by_id(&mut conn, user_id)
            .await?
            .ok_or(Error::RowNotFound)?;

        // Coordinators can only update Typists
        if target_user.role() != Role::Typist {
            return Err(AuthenticationError::Forbidden.into());
        }
    }

    let mut tx = pool.begin_immediate().await?;

    if let Some(fullname) = update_user_req.fullname {
        super::user::update_fullname(&mut tx, user_id, &fullname).await?
    };

    if let Some(temp_password) = update_user_req.temp_password {
        super::user::set_temporary_password(&mut tx, user_id, &temp_password).await?;

        super::session::delete_user_session(&mut tx, user_id).await?;
    };

    let user = super::user::get_by_id(&mut tx, user_id)
        .await?
        .ok_or(Error::RowNotFound)?;

    audit_service
        .log(&mut tx, &AuditEvent::UserUpdated(user.clone().into()), None)
        .await?;

    tx.commit().await?;

    Ok(Json(user))
}

/// Delete a user
#[utoipa::path(
    delete,
    path = "/api/user/{user_id}",
    responses(
        (status = 200, description = "User deleted successfully"),
        (status = 401, description = "Unauthorized", body = ErrorResponse),
        (status = 403, description = "Forbidden", body = ErrorResponse),
        (status = 404, description = "User not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse),
    ),
)]
async fn user_delete(
    logged_in_user: Admin,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Path(user_id): Path<u32>,
) -> Result<StatusCode, APIError> {
    let mut tx = pool.begin_immediate().await?;

    let user = super::user::get_by_id(&mut tx, user_id)
        .await?
        .ok_or(Error::RowNotFound)?;

    // Prevent user from deleting their own account
    if logged_in_user.0.id() == user_id {
        return Err(AuthenticationError::OwnAccountCannotBeDeleted.into());
    }

    let deleted = super::user::delete(&mut tx, user_id).await?;

    if deleted {
        audit_service
            .log(&mut tx, &AuditEvent::UserDeleted(user.clone().into()), None)
            .await?;

        tx.commit().await?;

        Ok(StatusCode::OK)
    } else {
        tx.rollback().await?;

        Err(Error::RowNotFound.into())
    }
}
