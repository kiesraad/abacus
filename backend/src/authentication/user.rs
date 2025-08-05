use axum::{
    extract::{FromRequestParts, OptionalFromRequestParts},
    http::request::Parts,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Error, FromRow, query, query_as};
use utoipa::ToSchema;

use super::{
    error::AuthenticationError,
    password::{HashedPassword, ValidatedPassword, hash_password, verify_password},
    role::Role,
};
use crate::{APIError, DbConnLike, audit_log::UserDetails};

const MIN_UPDATE_LAST_ACTIVITY_AT_SECS: i64 = 60; // 1 minute

/// User object, corresponds to a row in the users table
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow, ToSchema)]
// can't set `deny_unknown_fields` because this would break tests where `needs_password_change` is returned from API
pub struct User {
    id: u32,
    username: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
    fullname: Option<String>,
    role: Role,
    #[serde(skip_deserializing)]
    needs_password_change: bool,
    #[serde(skip)]
    password_hash: HashedPassword,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[schema(value_type = String, nullable = false)]
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
    pub fn id(&self) -> u32 {
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
    pub async fn update_last_activity_at(&self, conn: impl DbConnLike<'_>) -> Result<(), Error> {
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
    pub fn test_user(role: Role, id: u32) -> Self {
        Self {
            id,
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

        Ok(user.clone())
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
    conn: impl DbConnLike<'_>,
    username: &str,
    password: &str,
) -> Result<User, AuthenticationError> {
    let Some(user) = get_by_username(conn, username).await? else {
        return Err(AuthenticationError::UserNotFound);
    };

    if verify_password(password, &user.password_hash) {
        Ok(user)
    } else {
        Err(AuthenticationError::InvalidPassword)
    }
}

/// Create a new user, save an Argon2id v19 hash of the password
pub async fn create(
    conn: impl DbConnLike<'_>,
    username: &str,
    fullname: Option<&str>,
    password: &str,
    role: Role,
) -> Result<User, AuthenticationError> {
    let password_hash: HashedPassword =
        hash_password(ValidatedPassword::new(username, password, None)?)?;

    let user = sqlx::query_as!(
        User,
        r#"INSERT INTO users (username, fullname, password_hash, role)
        VALUES (?, ?, ?, ?)
        RETURNING
            id as "id: u32",
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
pub async fn delete(conn: impl DbConnLike<'_>, user_id: u32) -> Result<bool, AuthenticationError> {
    let rows_affected = sqlx::query_as!(User, r#" DELETE FROM users WHERE id = ?"#, user_id)
        .execute(conn)
        .await?
        .rows_affected();

    Ok(rows_affected > 0)
}

/// Update a user's password
pub async fn update_password(
    conn: impl DbConnLike<'_>,
    user_id: u32,
    username: &str,
    new_password: &str,
) -> Result<(), AuthenticationError> {
    let mut conn = conn.acquire().await?;
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
    .execute(&mut *conn)
    .await?;

    Ok(())
}

/// Update a user's fullname
pub async fn update_fullname(
    conn: impl DbConnLike<'_>,
    user_id: u32,
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
    conn: impl DbConnLike<'_>,
    user_id: u32,
    temp_password: &str,
) -> Result<(), AuthenticationError> {
    let mut conn = conn.acquire().await?;
    let username = username_by_id(&mut *conn, user_id).await?;
    let password_hash = hash_password(ValidatedPassword::new(&username, temp_password, None)?)?;
    sqlx::query!(
        r#"UPDATE users SET password_hash = ?, needs_password_change = TRUE WHERE id = ?"#,
        password_hash,
        user_id
    )
    .execute(&mut *conn)
    .await?;

    Ok(())
}

/// Get a user by their username
pub async fn get_by_username(
    conn: impl DbConnLike<'_>,
    username: &str,
) -> Result<Option<User>, AuthenticationError> {
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT
            id as "id: u32",
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
    conn: impl DbConnLike<'_>,
    id: u32,
) -> Result<Option<User>, AuthenticationError> {
    let user = sqlx::query_as!(
        User,
        r#"
        SELECT
            id as "id: u32",
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
        id
    )
    .fetch_optional(conn)
    .await?;

    Ok(user)
}

pub async fn list(conn: impl DbConnLike<'_>) -> Result<Vec<User>, Error> {
    let users = query_as!(
        User,
        r#"SELECT
            id as "id: u32",
            username,
            fullname,
            password_hash,
            needs_password_change as "needs_password_change: bool",
            role,
            last_activity_at as "last_activity_at: _",
            updated_at as "updated_at: _",
            created_at as "created_at: _"
        FROM users"#
    )
    .fetch_all(conn)
    .await?;
    Ok(users)
}

/// Fetch the first admin user ever created
pub async fn get_active_user_count(conn: impl DbConnLike<'_>) -> Result<u32, AuthenticationError> {
    let row = sqlx::query!(
        r#"
        SELECT COUNT(*) AS "count: u32"
        FROM users
        WHERE last_activity_at IS NOT NULL
        "#,
    )
    .fetch_one(conn)
    .await?;

    Ok(row.count)
}

pub async fn username_by_id(conn: impl DbConnLike<'_>, user_id: u32) -> Result<String, Error> {
    Ok(
        sqlx::query!("SELECT username FROM users WHERE id = ?", user_id)
            .fetch_one(conn)
            .await?
            .username,
    )
}

pub async fn update_last_activity_at(conn: impl DbConnLike<'_>, user_id: u32) -> Result<(), Error> {
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

    use crate::authentication::{error::AuthenticationError, password, role::Role, user::User};

    #[test(sqlx::test)]
    async fn test_create_user(pool: SqlitePool) {
        const USERNAME: &str = "test_user";

        let user = super::create(&pool, USERNAME, None, "TotallyValidP4ssW0rd", Role::Typist)
            .await
            .unwrap();

        assert_eq!(user.username, USERNAME);

        let fetched_user = super::get_by_id(&pool, user.id).await.unwrap().unwrap();

        assert_eq!(user, fetched_user);

        let fetched_user = super::get_by_username(&pool, USERNAME)
            .await
            .unwrap()
            .unwrap();

        assert_eq!(user, fetched_user);

        assert_eq!(
            super::username_by_id(&pool, user.id).await.unwrap(),
            USERNAME
        );
    }

    #[test(sqlx::test)]
    async fn test_create_user_duplicate_username(pool: SqlitePool) {
        let user = super::create(
            &pool,
            "test_user",
            None,
            "TotallyValidP4ssW0rd",
            Role::Typist,
        )
        .await
        .unwrap();

        assert_eq!(user.username, "test_user");

        // Try to create a user with the same username, case-insensitive
        let error = super::create(
            &pool,
            "test_User",
            None,
            "TotallyValidP4ssW0rd",
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
        let user = super::create(
            &pool,
            "test_user",
            Some("Full Name"),
            "TotallyValidP4ssW0rd",
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

        let user = super::create(
            &pool,
            "test_user",
            Some("Full Name"),
            old_password,
            Role::Administrator,
        )
        .await
        .unwrap();

        super::update_password(&pool, user.id(), "test_user", new_password)
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
        let user = super::create(
            &pool,
            "test_user",
            Some("Full Name"),
            "TotallyValidP4ssW0rd",
            Role::Administrator,
        )
        .await
        .unwrap();

        // User should need password change
        assert!(user.needs_password_change());

        super::update_password(&pool, user.id(), "test_user", "temp_password")
            .await
            .unwrap();

        let user = super::get_by_id(&pool, user.id()).await.unwrap().unwrap();

        // User now shouldn't need to change their password
        assert!(!user.needs_password_change());

        // Set a temporary password via update
        super::set_temporary_password(&pool, user.id(), "temp_password")
            .await
            .unwrap();

        let user = super::get_by_id(&pool, user.id()).await.unwrap().unwrap();

        // User needs to change their password again
        assert!(user.needs_password_change());
    }

    #[test(sqlx::test)]
    async fn password_hash_does_not_serialize(pool: SqlitePool) {
        let user = super::create(
            &pool,
            "test_user",
            Some("Full Name"),
            "TotallyValidP4ssW0rd",
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
            id: 2,
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
    async fn test_get_active_user_count(pool: SqlitePool) {
        let count = super::get_active_user_count(&pool).await.unwrap();
        assert_eq!(count, 2);

        let user = User::test_user(Role::Typist, 5);
        user.update_last_activity_at(&pool).await.unwrap();

        let count = super::get_active_user_count(&pool).await.unwrap();
        assert_eq!(count, 3);
    }
}
