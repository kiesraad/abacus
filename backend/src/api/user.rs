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
        middleware::authentication::{
            RouteAuthorization,
            error::AuthenticationError,
            password::{ValidatedPassword, hash_password},
        },
    },
    domain::role::Role,
    error::ErrorReference,
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

/// Validates username and fullname length and allowed characters
pub trait ValidateUserRequest {
    fn username(&self) -> Option<&str>;
    fn fullname(&self) -> Option<&str>;

    fn validate(&self) -> Result<(), APIError> {
        // username: any ASCII except whitespace or control characters
        Self::validate_string(self.username(), |c| c.is_ascii_graphic())
            .map_err(|msg| APIError::Unprocessable(msg, ErrorReference::InvalidUsername))?;

        // fullname: no control characters
        Self::validate_string(self.fullname(), |c| !c.is_control())
            .map_err(|msg| APIError::Unprocessable(msg, ErrorReference::InvalidFullname))?;

        Ok(())
    }

    fn validate_string(
        input: Option<&str>,
        is_valid_char: impl Fn(char) -> bool,
    ) -> Result<(), String> {
        if let Some(input) = input {
            if input.is_empty() {
                return Err("Empty".to_string());
            };

            if input.chars().nth(255).is_some() {
                return Err("Too long".to_string());
            };

            if !input.chars().all(is_valid_char) {
                return Err("Invalid character".into());
            };
        };

        Ok(())
    }
}

impl ValidateUserRequest for CreateUserRequest {
    fn username(&self) -> Option<&str> {
        Some(&self.username)
    }

    fn fullname(&self) -> Option<&str> {
        self.fullname.as_deref()
    }
}

impl ValidateUserRequest for UpdateUserRequest {
    fn username(&self) -> Option<&str> {
        None
    }

    fn fullname(&self) -> Option<&str> {
        self.fullname.as_deref()
    }
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
        (status = 422, description = "Invalid username or fullname", body = ErrorResponse),
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

    create_user_req.validate()?;

    // Hash before transaction to prevent write lock
    let password_hash = hash_password(
        &ValidatedPassword::new(
            &create_user_req.username,
            &create_user_req.temp_password,
            None,
        )
        .await?,
    )
    .await?;

    let mut tx = pool.begin_immediate().await?;
    let user = user_repo::create(
        &mut tx,
        &create_user_req.username,
        create_user_req.fullname.as_deref(),
        &password_hash,
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
        (status = 422, description = "Invalid fullname", body = ErrorResponse),
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
    let mut conn = pool.acquire().await?;
    let user = user_repo::get_by_id(&mut conn, user_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)?;
    drop(conn);

    // Coordinators can only update Typists for the same committee category
    if logged_in_user.role().is_coordinator() && !logged_in_user.role().manages(&user.role()) {
        return Err(AuthenticationError::Forbidden.into());
    }

    // Hash before transaction to prevent write lock
    let temp_password_hash = match &update_user_req.temp_password {
        Some(temp_password) => Some(
            hash_password(&ValidatedPassword::new(user.username(), temp_password, None).await?)
                .await?,
        ),
        None => None,
    };

    let mut tx = pool.begin_immediate().await?;

    update_user_req.validate()?;

    if let Some(fullname) = update_user_req.fullname {
        user_repo::update_fullname(&mut tx, user_id, &fullname).await?
    };

    if let Some(password_hash) = temp_password_hash {
        user_repo::set_temporary_password(&mut tx, user_id, &password_hash).await?;

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

#[cfg(test)]
mod tests {
    use axum::response::IntoResponse;
    use http_body_util::BodyExt;

    use super::*;

    impl CreateUserRequest {
        pub fn from_username(username: &str) -> Self {
            Self {
                username: username.to_string(),
                fullname: None,
                temp_password: "test_password_123".to_string(),
                role: Role::TypistGSB,
            }
        }

        pub fn from_fullname(fullname: &str) -> Self {
            Self {
                username: "username".to_string(),
                fullname: Some(fullname.to_string()),
                temp_password: "test_password_123".to_string(),
                role: Role::TypistGSB,
            }
        }
    }

    impl UpdateUserRequest {
        pub fn from_fullname(fullname: &str) -> Self {
            Self {
                fullname: Some(fullname.to_string()),
                temp_password: None,
            }
        }
    }

    #[test_log::test(sqlx::test)]
    async fn test_user_create_fullname_invalid(pool: SqlitePool) {
        let request = CreateUserRequest::from_fullname("Invalid\n");

        let response = user_create(
            User::test_user(Role::CoordinatorGSB, UserId::from(1)),
            State(pool),
            AuditService::new(None, None),
            Json(request),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::InvalidFullname);
        assert_eq!(result.error, "Invalid character");
    }

    #[test_log::test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_user_update_fullname_invalid(pool: SqlitePool) {
        let request = UpdateUserRequest::from_fullname("Invalid\n");

        let response = user_update(
            User::test_user(Role::CoordinatorGSB, UserId::from(1)),
            State(pool),
            AuditService::new(None, None),
            Path(UserId::from(5)),
            Json(request),
        )
        .await
        .into_response();

        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);

        let body = response.into_body().collect().await.unwrap().to_bytes();
        let result: ErrorResponse = serde_json::from_slice(&body).unwrap();
        assert_eq!(result.reference, ErrorReference::InvalidFullname);
        assert_eq!(result.error, "Invalid character");
    }

    mod validate_user_request {
        use std::assert_matches;

        use super::*;

        #[test]
        fn test_username_ok() {
            for username in [
                "username",
                "username01",
                "username_one",
                "username-testing01",
                "username+suffix",
            ] {
                assert!(
                    CreateUserRequest::from_username(username)
                        .validate()
                        .is_ok(),
                    "'{}' should be a valid username",
                    username,
                );
            }
        }

        #[test]
        fn test_username_invalid_character() {
            for username in [
                "user\n",
                "user\t",
                "user\u{007f}",
                "François",
                "Piet Pietersen",
                "ダメです",
            ] {
                assert_matches!(
                    CreateUserRequest::from_username(username)
                        .validate()
                        .unwrap_err(),
                    APIError::Unprocessable(msg, ErrorReference::InvalidUsername)
                        if msg == "Invalid character"
                );
            }
        }

        #[test]
        fn test_username_empty() {
            assert_matches!(
                CreateUserRequest::from_username("")
                    .validate()
                    .unwrap_err(),
                APIError::Unprocessable(msg, ErrorReference::InvalidUsername)
                    if msg == "Empty"
            );
        }

        #[test]
        fn test_username_too_long() {
            let mut username = "A".repeat(255);
            assert!(
                CreateUserRequest::from_username(&username)
                    .validate()
                    .is_ok(),
            );

            username.push('A');
            assert_matches!(
                CreateUserRequest::from_username(&username)
                    .validate()
                    .unwrap_err(),
                APIError::Unprocessable(msg, ErrorReference::InvalidUsername)
                    if msg == "Too long"
            );
        }

        #[test]
        fn test_fullname_ok() {
            for fullname in [
                "Piet Pietersen",
                "François Lastnamé",
                "Mick O'Connell",
                "H.G.I.V. van Voorst tot Voorst-ten Cate",
                "石川祐希",
            ] {
                assert!(
                    CreateUserRequest::from_fullname(fullname)
                        .validate()
                        .is_ok(),
                    "'{}' should be a valid fullname for CreateUserRequest",
                    fullname,
                );

                assert!(
                    UpdateUserRequest::from_fullname(fullname)
                        .validate()
                        .is_ok(),
                    "'{}' should be a valid fullname for UpdateUserRequest",
                    fullname,
                );
            }
        }

        #[test]
        fn test_fullname_invalid_character() {
            for fullname in ["name\n", "name\t", "name\u{007f}"] {
                assert_matches!(
                    CreateUserRequest::from_fullname(fullname)
                        .validate()
                        .unwrap_err(),
                    APIError::Unprocessable(msg, ErrorReference::InvalidFullname)
                        if msg == "Invalid character"

                );

                assert_matches!(
                    UpdateUserRequest::from_fullname(fullname)
                        .validate()
                        .unwrap_err(),
                    APIError::Unprocessable(msg, ErrorReference::InvalidFullname)
                        if msg == "Invalid character"

                );
            }
        }

        #[test]
        fn test_fullname_empty() {
            assert_matches!(
                CreateUserRequest::from_fullname("")
                    .validate()
                    .unwrap_err(),
                APIError::Unprocessable(msg, ErrorReference::InvalidFullname)
                    if msg == "Empty"
            );

            assert_matches!(
                UpdateUserRequest::from_fullname("")
                    .validate()
                    .unwrap_err(),
                APIError::Unprocessable(msg, ErrorReference::InvalidFullname)
                    if msg == "Empty"
            );
        }

        #[test]
        fn test_fullname_too_long() {
            let mut fullname = "A".repeat(255);
            assert!(
                CreateUserRequest::from_fullname(&fullname)
                    .validate()
                    .is_ok(),
            );

            assert!(
                UpdateUserRequest::from_fullname(&fullname)
                    .validate()
                    .is_ok(),
            );

            fullname.push('A');
            assert_matches!(
                CreateUserRequest::from_fullname(&fullname)
                    .validate()
                    .unwrap_err(),
                APIError::Unprocessable(msg, ErrorReference::InvalidFullname)
                    if msg == "Too long"
            );

            assert_matches!(
                UpdateUserRequest::from_fullname(&fullname)
                    .validate()
                    .unwrap_err(),
                APIError::Unprocessable(msg, ErrorReference::InvalidFullname)
                    if msg == "Too long"
            );
        }
    }
}
