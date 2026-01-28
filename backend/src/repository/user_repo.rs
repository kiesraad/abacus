use axum::{
    extract::{FromRequestParts, OptionalFromRequestParts},
    http::request::Parts,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqliteConnection, SqlitePool, query, query_as};
use utoipa::ToSchema;

use crate::{
    APIError,
    domain::id::id,
    infra::{
        audit_log::UserDetails,
        authentication::{
            IncompleteUser, Role,
            error::AuthenticationError,
            password::{HashedPassword, ValidatedPassword, hash_password, verify_password},
        },
    },
};

const MIN_UPDATE_LAST_ACTIVITY_AT_SECS: i64 = 60; // 1 minute

id!(UserId);

/// User object, corresponds to a row in the users table
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow, ToSchema)]
// can't set `deny_unknown_fields` because this would break tests where `needs_password_change` is returned from API
pub struct User {
    id: UserId,
    username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    fullname: Option<String>,
    role: Role,
    #[serde(skip_deserializing)]
    needs_password_change: bool,
    #[serde(skip)]
    password_hash: HashedPassword,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String)]
    last_activity_at: Option<DateTime<Utc>>,
    #[schema(value_type = String)]
    updated_at: DateTime<Utc>,
    #[schema(value_type = String)]
    created_at: DateTime<Utc>,
}

impl From<User> for UserDetails {
    fn from(user: User) -> Self {
        Self {
            user_id: user.id,
            fullname: user.fullname,
            username: user.username,
            role: user.role.to_string(),
        }
    }
}

impl User {
    pub fn id(&self) -> UserId {
        self.id
    }

    pub fn username(&self) -> &str {
        &self.username
    }

    pub fn last_activity_at(&self) -> Option<DateTime<Utc>> {
        self.last_activity_at
    }

    /// Updates the `last_activity_at` field, but first checks if it has been
    /// longer than `MIN_UPDATE_LAST_ACTIVITY_AT_SECS`, to prevent excessive
    /// database writes.
    pub async fn update_last_activity_at(
        &self,
        conn: &mut SqliteConnection,
    ) -> Result<(), sqlx::Error> {
        if self.should_update_last_activity_at() {
            update_last_activity_at(conn, self.id()).await?;
        }

        Ok(())
    }

    fn should_update_last_activity_at(&self) -> bool {
        if let Some(last_activity_at) = self.last_activity_at {
            Utc::now()
                .signed_duration_since(last_activity_at)
                .num_seconds()
                > MIN_UPDATE_LAST_ACTIVITY_AT_SECS
        } else {
            // Also update when no timestamp is set yet
            true
        }
    }

    pub fn fullname(&self) -> Option<&str> {
        self.fullname.as_deref()
    }

    pub fn role(&self) -> Role {
        self.role
    }

    pub fn needs_password_change(&self) -> bool {
        self.needs_password_change
    }

    #[cfg(test)]
    pub fn test_user(role: Role, user_id: UserId) -> Self {
        Self {
            id: user_id,
            username: "test_user_1".to_string(),
            fullname: Some("Full Name".to_string()),
            role,
            needs_password_change: false,
            password_hash: hash_password(
                ValidatedPassword::new("test_user_1", "TotallyValidP4ssW0rd", None).unwrap(),
            )
            .unwrap(),
            last_activity_at: None,
            updated_at: Utc::now(),
            created_at: Utc::now(),
        }
    }
}

/// Implement the FromRequestParts trait for User, this allows us to extract a User from a request
impl<S> FromRequestParts<S> for User
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let Some(user) = parts.extensions.get::<User>() else {
            return Err(AuthenticationError::Unauthenticated.into());
        };

        if user.fullname.is_none() || user.needs_password_change() {
            return Err(AuthenticationError::Unauthenticated.into());
        }

        Ok(user.clone())
    }
}

/// Implement the FromRequestParts trait for IncompleteUser,
/// for endpoints that are needed to fully set up the account
impl<S> FromRequestParts<S> for IncompleteUser
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let Some(user) = parts.extensions.get::<User>() else {
            return Err(AuthenticationError::Unauthenticated.into());
        };

        if user.fullname.is_some() && !user.needs_password_change() {
            return Err(AuthenticationError::UserAlreadySetup.into());
        }

        Ok(IncompleteUser(user.clone()))
    }
}

/// Implement the OptionalFromRequestParts trait for User, this allows us to extract an Option<User> from a request
impl<S> OptionalFromRequestParts<S> for User
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Option<Self>, Self::Rejection> {
        Ok(parts.extensions.get::<User>().cloned())
    }
}

/// Authenticate a user by their username and password, returns a user instance on success or an error
pub async fn authenticate(
    pool: &SqlitePool,
    username: &str,
    password: &str,
) -> Result<User, AuthenticationError> {
    // acquire a connection from the pool and drop it before verifying the password,
    // to ensure that the connection is not held open for too long
    let mut conn = pool.acquire().await?;
    let Some(user) = get_by_username(&mut conn, username).await? else {
        return Err(AuthenticationError::UserNotFound);
    };
    drop(conn);

    if verify_password(password, &user.password_hash) {
        Ok(user)
    } else {
        Err(AuthenticationError::InvalidPassword)
    }
}

/// Create a new user, save an Argon2id v19 hash of the password
pub async fn create(
    conn: &mut SqliteConnection,
    username: &str,
    fullname: Option<&str>,
    password: &str,
    needs_password_change: bool,
    role: Role,
) -> Result<User, AuthenticationError> {
    let password_hash: HashedPassword =
        hash_password(ValidatedPassword::new(username, password, None)?)?;

    let user = sqlx::query_as!(
        User,
        r#"INSERT INTO users (username, fullname, password_hash, needs_password_change, role)
        VALUES (?, ?, ?, ?, ?)
        RETURNING
            id as "id: UserId",
            username,
            fullname,
            password_hash,
            needs_password_change as "needs_password_change: bool",
            role,
            last_activity_at as "last_activity_at: _",
            updated_at as "updated_at: _",
            created_at as "created_at: _"
        "#,
        username,
        fullname,
        password_hash,
        needs_password_change,
        role,
    )
    .fetch_one(conn)
    .await
    .map_err(|e| {
        if e.as_database_error()
            .map(|e| e.is_unique_violation())
            .unwrap_or(false)
        {
            AuthenticationError::UsernameAlreadyExists
        } else {
            e.into()
        }
    })?;

    Ok(user)
}

/// Delete a user
pub async fn delete(
    conn: &mut SqliteConnection,
    user_id: UserId,
) -> Result<bool, AuthenticationError> {
    let rows_affected = sqlx::query_as!(User, r#" DELETE FROM users WHERE id = ?"#, user_id)
        .execute(conn)
        .await?
        .rows_affected();

    Ok(rows_affected > 0)
}

/// Update a user's password
pub async fn update_password(
    conn: &mut SqliteConnection,
    user_id: UserId,
    username: &str,
    new_password: &str,
) -> Result<(), AuthenticationError> {
    let old_password = sqlx::query!("SELECT password_hash FROM users WHERE id = ?", user_id)
        .fetch_one(&mut *conn)
        .await?
        .password_hash
        .into();

    let password_hash = hash_password(ValidatedPassword::new(
        username,
        new_password,
        Some(&old_password),
    )?)?;

    sqlx::query!(
        r#"UPDATE users SET password_hash = ?, needs_password_change = FALSE WHERE id = ?"#,
        password_hash,
        user_id
    )
    .execute(conn)
    .await?;

    Ok(())
}

/// Update a user's fullname
pub async fn update_fullname(
    conn: &mut SqliteConnection,
    user_id: UserId,
    fullname: &str,
) -> Result<(), AuthenticationError> {
    sqlx::query!(
        r#"UPDATE users SET fullname = ? WHERE id = ?"#,
        fullname,
        user_id
    )
    .execute(conn)
    .await?;

    Ok(())
}

/// Set a temporary password for a user
pub async fn set_temporary_password(
    conn: &mut SqliteConnection,
    user_id: UserId,
    temp_password: &str,
) -> Result<(), AuthenticationError> {
    let username = username_by_id(conn, user_id).await?;
    let password_hash = hash_password(ValidatedPassword::new(&username, temp_password, None)?)?;
    sqlx::query!(
        r#"UPDATE users SET password_hash = ?, needs_password_change = TRUE WHERE id = ?"#,
        password_hash,
        user_id
    )
    .execute(conn)
    .await?;

    Ok(())
}

/// Get a user by their username
pub async fn get_by_username(
    conn: &mut SqliteConnection,
    username: &str,
) -> Result<Option<User>, AuthenticationError> {
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT
            id as "id: UserId",
            username,
            fullname,
            role,
            password_hash,
            needs_password_change as "needs_password_change: bool",
            last_activity_at as "last_activity_at: _",
            updated_at as "updated_at: _",
            created_at as "created_at: _"
        FROM users WHERE username = ? COLLATE NOCASE
        "#,
        username
    )
    .fetch_optional(conn)
    .await?;

    Ok(user)
}

/// Get a user by their id
pub async fn get_by_id(
    conn: &mut SqliteConnection,
    user_id: UserId,
) -> Result<Option<User>, AuthenticationError> {
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT
            id as "id: UserId",
            username,
            fullname,
            role,
            password_hash,
            needs_password_change as "needs_password_change: bool",
            last_activity_at as "last_activity_at: _",
            updated_at as "updated_at: _",
            created_at as "created_at: _"
        FROM users WHERE id = ?
        "#,
        user_id
    )
    .fetch_optional(conn)
    .await?;

    Ok(user)
}

pub async fn list(
    conn: &mut SqliteConnection,
    only_allow_role: Option<Role>,
) -> Result<Vec<User>, sqlx::Error> {
    let users = query_as!(
        User,
        r#"SELECT
            id as "id: UserId",
            username,
            fullname,
            password_hash,
            needs_password_change as "needs_password_change: bool",
            role,
            last_activity_at as "last_activity_at: _",
            updated_at as "updated_at: _",
            created_at as "created_at: _"
        FROM users
        WHERE ($1 IS NULL OR role = $1)
        "#,
        only_allow_role,
    )
    .fetch_all(conn)
    .await?;
    Ok(users)
}

/// Fetch the first admin user ever created
pub async fn has_active_users(conn: &mut SqliteConnection) -> Result<bool, AuthenticationError> {
    let result = sqlx::query!(
        r#"SELECT 1 AS 'exists' FROM users WHERE last_activity_at IS NOT NULL LIMIT 1"#,
    )
    .fetch_optional(conn)
    .await?;

    Ok(result.is_some())
}

pub async fn admin_exists(conn: &mut SqliteConnection) -> Result<bool, AuthenticationError> {
    let result = sqlx::query!(
        r#"SELECT 1 AS 'exists' FROM users WHERE role = ? LIMIT 1"#,
        Role::Administrator
    )
    .fetch_optional(conn)
    .await?;

    Ok(result.is_some())
}

pub async fn username_by_id(
    conn: &mut SqliteConnection,
    user_id: UserId,
) -> Result<String, sqlx::Error> {
    Ok(
        sqlx::query!("SELECT username FROM users WHERE id = ?", user_id)
            .fetch_one(conn)
            .await?
            .username,
    )
}

pub async fn update_last_activity_at(
    conn: &mut SqliteConnection,
    user_id: UserId,
) -> Result<(), sqlx::Error> {
    query!(
        r#"UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?"#,
        user_id,
    )
    .fetch_all(conn)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use sqlx::SqlitePool;
    use test_log::test;

    use crate::{
        infra::authentication::{Role, error::AuthenticationError, password},
        repository::user_repo::{User, UserId},
    };

    #[test(sqlx::test)]
    async fn test_create_user(pool: SqlitePool) {
        const USERNAME: &str = "test_user";

        let mut conn = pool.acquire().await.unwrap();
        let user = super::create(
            &mut conn,
            USERNAME,
            None,
            "TotallyValidP4ssW0rd",
            true,
            Role::Typist,
        )
        .await
        .unwrap();

        assert_eq!(user.username, USERNAME);

        let fetched_user = super::get_by_id(&mut conn, user.id).await.unwrap().unwrap();

        assert_eq!(user, fetched_user);

        let fetched_user = super::get_by_username(&mut conn, USERNAME)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(user, fetched_user);

        assert_eq!(
            super::username_by_id(&mut conn, user.id).await.unwrap(),
            USERNAME
        );
    }

    #[test(sqlx::test)]
    async fn test_create_user_duplicate_username(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = super::create(
            &mut conn,
            "test_user",
            None,
            "TotallyValidP4ssW0rd",
            true,
            Role::Typist,
        )
        .await
        .unwrap();

        assert_eq!(user.username, "test_user");

        // Try to create a user with the same username, case-insensitive
        let error = super::create(
            &mut conn,
            "test_User",
            None,
            "TotallyValidP4ssW0rd",
            true,
            Role::Typist,
        )
        .await;

        assert!(matches!(
            error,
            Err(AuthenticationError::UsernameAlreadyExists)
        ));
    }

    #[test(sqlx::test)]
    async fn test_authenticate_user(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = super::create(
            &mut conn,
            "test_user",
            Some("Full Name"),
            "TotallyValidP4ssW0rd",
            true,
            Role::Coordinator,
        )
        .await
        .unwrap();

        let authenticated_user = super::authenticate(&pool, "test_user", "TotallyValidP4ssW0rd")
            .await
            .unwrap();

        assert_eq!(user, authenticated_user);

        // Username should be case-insensitive
        let authenticated_user = super::authenticate(&pool, "Test_User", "TotallyValidP4ssW0rd")
            .await
            .unwrap();

        assert_eq!(user, authenticated_user);

        let authenticated_user = super::authenticate(&pool, "test_user", "wrong_password")
            .await
            .unwrap_err();

        assert!(matches!(
            authenticated_user,
            AuthenticationError::InvalidPassword
        ));

        let authenticated_user = super::authenticate(&pool, "other_user", "TotallyValidP4ssW0rd")
            .await
            .unwrap_err();

        assert!(matches!(
            authenticated_user,
            AuthenticationError::UserNotFound
        ));
    }

    #[test(sqlx::test)]
    async fn test_change_password(pool: SqlitePool) {
        let old_password = "TotallyValidP4ssW0rd";
        let new_password = "TotallyValidNewP4ssW0rd";

        let mut conn = pool.acquire().await.unwrap();
        let user = super::create(
            &mut conn,
            "test_user",
            Some("Full Name"),
            old_password,
            true,
            Role::Administrator,
        )
        .await
        .unwrap();

        super::update_password(&mut conn, user.id(), "test_user", new_password)
            .await
            .unwrap();

        let authenticated_user = super::authenticate(&pool, "test_user", new_password)
            .await
            .unwrap();

        assert_eq!(user.id(), authenticated_user.id());

        let authenticated_user = super::authenticate(&pool, "test_user", old_password)
            .await
            .unwrap_err();

        assert!(matches!(
            authenticated_user,
            AuthenticationError::InvalidPassword
        ));
    }

    #[test(sqlx::test)]
    async fn test_set_temp_password(pool: SqlitePool) {
        // Create new user, password needs change
        let mut conn = pool.acquire().await.unwrap();
        let user = super::create(
            &mut conn,
            "test_user",
            Some("Full Name"),
            "TotallyValidP4ssW0rd",
            true,
            Role::Administrator,
        )
        .await
        .unwrap();

        // User should need password change
        assert!(user.needs_password_change());

        super::update_password(&mut conn, user.id(), "test_user", "temp_password")
            .await
            .unwrap();

        let user = super::get_by_id(&mut conn, user.id())
            .await
            .unwrap()
            .unwrap();

        // User now shouldn't need to change their password
        assert!(!user.needs_password_change());

        // Set a temporary password via update
        super::set_temporary_password(&mut conn, user.id(), "temp_password")
            .await
            .unwrap();

        let user = super::get_by_id(&mut conn, user.id())
            .await
            .unwrap()
            .unwrap();

        // User needs to change their password again
        assert!(user.needs_password_change());
    }

    #[test(sqlx::test)]
    async fn password_hash_does_not_serialize(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let user = super::create(
            &mut conn,
            "test_user",
            Some("Full Name"),
            "TotallyValidP4ssW0rd",
            true,
            Role::Administrator,
        )
        .await
        .unwrap();

        let serialized_user = serde_json::to_value(user).unwrap();
        assert_eq!(serialized_user["username"], "test_user".to_string());
        assert!(serialized_user.get("password_hash").is_none());
    }

    #[test]
    fn test_should_update_last_activity_at() {
        let mut user = User {
            id: UserId::from(2),
            username: "user1".to_string(),
            fullname: Some("Full Name".to_string()),
            role: Role::Typist,
            needs_password_change: false,
            password_hash: password::hash_password(
                password::ValidatedPassword::new("test_user_1", "TotallyValidP4ssW0rd", None)
                    .unwrap(),
            )
            .unwrap(),
            last_activity_at: None,
            updated_at: chrono::Utc::now(),
            created_at: chrono::Utc::now(),
        };

        // Should update when no timestamp is net
        assert!(user.should_update_last_activity_at());

        // Should not update when trying to update too soon
        user.last_activity_at = Some(chrono::Utc::now());
        assert!(!user.should_update_last_activity_at());

        // Should update when `last_activity_at` was 2 minutes ago
        user.last_activity_at = Some(chrono::Utc::now() - chrono::Duration::minutes(2));
        assert!(user.should_update_last_activity_at());
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_has_active_users(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let result = super::has_active_users(&mut conn).await.unwrap();
        assert!(result);

        // delete all users
        sqlx::query!("DELETE FROM users")
            .execute(&pool)
            .await
            .unwrap();

        let result = super::has_active_users(&mut conn).await.unwrap();
        assert!(!result);
    }

    #[test(sqlx::test(fixtures("../../fixtures/users.sql")))]
    async fn test_admin_exists(pool: SqlitePool) {
        let mut conn = pool.acquire().await.unwrap();
        let result = super::admin_exists(&mut conn).await.unwrap();
        assert!(result);

        // delete all users
        sqlx::query!("DELETE FROM users")
            .execute(&pool)
            .await
            .unwrap();

        let result = super::admin_exists(&mut conn).await.unwrap();
        assert!(!result);
    }
}
