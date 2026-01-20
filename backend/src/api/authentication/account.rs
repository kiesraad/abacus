use axum::{Json, extract::State, response::IntoResponse};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use utoipa::ToSchema;

use crate::{
    APIError, ErrorResponse, SqlitePoolExt,
    api::authentication::login::LoginResponse,
    infra::authentication::{User, error::AuthenticationError, role::IncompleteUser},
    repository::user_repo,
    service::audit_log::{AuditEvent, AuditService},
};

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[serde(deny_unknown_fields)]
pub struct AccountUpdateRequest {
    pub username: String,
    pub password: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
    pub fullname: Option<String>,
}

/// Get current logged-in user endpoint
#[utoipa::path(
  get,
  path = "/api/account",
  responses(
      (status = 200, description = "The current user name and id", body = LoginResponse),
      (status = 401, description = "Invalid user session", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
  security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
pub async fn account(user: Option<User>) -> Result<impl IntoResponse, APIError> {
    let user = user.ok_or(AuthenticationError::UserNotFound)?;

    Ok(Json(LoginResponse::from(&user)))
}

/// Update the user's account with a new password and optionally new fullname
#[utoipa::path(
  put,
  path = "/api/account",
  request_body = AccountUpdateRequest,
  responses(
      (status = 200, description = "The logged in user", body = LoginResponse),
      (status = 400, description = "Bad request", body = ErrorResponse),
      (status = 500, description = "Internal server error", body = ErrorResponse),
  ),
  security(("cookie_auth" = ["administrator", "coordinator", "typist"])),
)]
pub async fn account_update(
    IncompleteUser(user): IncompleteUser,
    State(pool): State<SqlitePool>,
    audit_service: AuditService,
    Json(account): Json<AccountUpdateRequest>,
) -> Result<impl IntoResponse, APIError> {
    let mut tx = pool.begin_immediate().await?;

    if user.username() != account.username {
        return Err(AuthenticationError::UserNotFound.into());
    }

    // Update the password
    user_repo::update_password(&mut tx, user.id(), &account.username, &account.password).await?;

    // Update the fullname
    if let Some(fullname) = account.fullname {
        user_repo::update_fullname(&mut tx, user.id(), &fullname).await?;
    }

    let Some(updated_user) = user_repo::get_by_username(&mut tx, user.username()).await? else {
        return Err(AuthenticationError::UserNotFound.into());
    };

    let response = LoginResponse::from(&updated_user);

    audit_service
        .log(
            &mut tx,
            &AuditEvent::UserAccountUpdated(response.clone().into()),
            None,
        )
        .await?;

    tx.commit().await?;

    Ok(Json(response))
}

#[cfg(test)]
mod tests {}
