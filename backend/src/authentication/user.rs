use axum::{
    extract::{FromRef, FromRequestParts, OptionalFromRequestParts},
    http::request::Parts,
};
use axum_extra::extract::CookieJar;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Error, FromRow, SqlitePool, query, query_as};
use utoipa::ToSchema;

use crate::{APIError, AppState};

use super::{
    SESSION_COOKIE_NAME,
    error::AuthenticationError,
    password::{HashedPassword, ValidatedPassword, hash_password, verify_password},
    role::Role,
    session::Sessions,
};

const MIN_UPDATE_LAST_ACTIVITY_AT_SECS: i64 = 60; // 1 minute

/// User object, corresponds to a row in the users table
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow, ToSchema)]
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
    pub async fn update_last_activity_at(&self, users: &Users) -> Result<(), sqlx::Error> {
        if self.should_update_last_activity_at() {
            users.update_last_activity_at(self.id()).await?;
        }

        Ok(())
    }

    fn should_update_last_activity_at(&self) -> bool {
        if let Some(last_activity_at) = self.last_activity_at {
            chrono::Utc::now()
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
    pub fn test_user(role: Role) -> Self {
        Self {
            id: 1,
            username: "test_user_1".to_string(),
            fullname: Some("Full Name".to_string()),
            role,
            needs_password_change: false,
            password_hash: hash_password(
                ValidatedPassword::new("test_user_1", "TotallyValidP4ssW0rd", None).unwrap(),
            )
            .unwrap(),
            last_activity_at: None,
            updated_at: chrono::Utc::now(),
            created_at: chrono::Utc::now(),
        }
    }
}

/// Implement the FromRequestParts trait for User, this allows us to extract a User from a request
/// using the user repository and the session cookie
impl<S> FromRequestParts<S> for User
where
    Users: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let users = Users::from_ref(state);

        let jar = CookieJar::from_headers(&parts.headers);
        let Some(session_cookie) = jar.get(SESSION_COOKIE_NAME) else {
            return Err(AuthenticationError::NoSessionCookie.into());
        };

        let user = users.get_by_session_key(session_cookie.value()).await?;
        user.update_last_activity_at(&users).await?;
        Ok(user)
    }
}

/// Implement the OptionalFromRequestParts trait for User, this allows us to extract a Option<User> from a request
/// using the user repository and the session cookie
impl<S> OptionalFromRequestParts<S> for User
where
    Users: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> Result<Option<Self>, Self::Rejection> {
        let users = Users::from_ref(state);
        let jar = CookieJar::from_headers(&parts.headers);

        let Some(session_cookie) = jar.get(SESSION_COOKIE_NAME) else {
            return Ok(None);
        };

        match users.get_by_session_key(session_cookie.value()).await {
            Ok(user) => {
                user.update_last_activity_at(&users).await?;
                Ok(Some(user))
            }
            Err(AuthenticationError::UserNotFound)
            | Err(AuthenticationError::SessionKeyNotFound) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}

pub struct Users(SqlitePool);

impl Users {
    #[cfg(test)]
    pub fn new(pool: SqlitePool) -> Self {
        Self(pool)
    }

    /// Authenticate a user by their username and password, returns a user instance on success or an error
    pub async fn authenticate(
        &self,
        username: &str,
        password: &str,
    ) -> Result<User, AuthenticationError> {
        let Some(user) = self.get_by_username(username).await? else {
            return Err(AuthenticationError::UserNotFound);
        };

        if verify_password(password, &user.password_hash) {
            Ok(user)
        } else {
            Err(AuthenticationError::InvalidPassword)
        }
    }

    /// Get a user by their session key
    pub async fn get_by_session_key(&self, session_key: &str) -> Result<User, AuthenticationError> {
        let sessions = Sessions::new(self.0.clone());

        // fetch the session from the database
        let Some(session) = sessions.get_by_key(session_key).await? else {
            return Err(AuthenticationError::SessionKeyNotFound);
        };

        // fetch the user from the database
        let Some(user) = self.get_by_id(session.user_id()).await? else {
            return Err(AuthenticationError::UserNotFound);
        };

        Ok(user)
    }

    /// Create a new user, save an Argon2id v19 hash of the password
    pub async fn create(
        &self,
        username: &str,
        fullname: Option<&str>,
        password: &str,
        role: Role,
    ) -> Result<User, AuthenticationError> {
        let password_hash = hash_password(ValidatedPassword::new(username, password, None)?)?;

        let user = sqlx::query_as!(
            User,
            r#"INSERT INTO users (username, fullname, password_hash, role)
            VALUES (?, ?, ?, ?)
            RETURNING
                id as "id: u32",
                username,
                fullname,
                password_hash,
                needs_password_change,
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
        .fetch_one(&self.0)
        .await?;

        Ok(user)
    }

    /// Update a user
    pub async fn update(
        &self,
        user_id: u32,
        fullname: Option<&str>,
        temp_password: Option<&str>,
    ) -> Result<User, AuthenticationError> {
        if let Some(pw) = temp_password {
            self.set_temporary_password(user_id, pw).await?;
        }

        let updated_user = sqlx::query_as!(
            User,
            r#"
              UPDATE
                users
              SET
                fullname = ?
              WHERE id = ?
            RETURNING
                id as "id: u32",
                username,
                fullname,
                password_hash,
                needs_password_change,
                role,
                last_activity_at as "last_activity_at: _",
                updated_at as "updated_at: _",
                created_at as "created_at: _"
            "#,
            fullname,
            user_id
        )
        .fetch_one(&self.0)
        .await?;

        Ok(updated_user)
    }

    /// Delete a user
    pub async fn delete(&self, user_id: u32) -> Result<bool, AuthenticationError> {
        let rows_affected = sqlx::query_as!(User, r#" DELETE FROM users WHERE id = ?"#, user_id)
            .execute(&self.0)
            .await?
            .rows_affected();

        Ok(rows_affected > 0)
    }

    /// Update a user's password
    pub async fn update_password(
        &self,
        user_id: u32,
        username: &str,
        new_password: &str,
    ) -> Result<(), AuthenticationError> {
        let mut tx = self.0.begin().await?;
        let old_password = sqlx::query!("SELECT password_hash FROM users WHERE id = ?", user_id)
            .fetch_one(tx.as_mut())
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
        .execute(tx.as_mut())
        .await?;

        tx.commit().await?;
        Ok(())
    }

    /// Update a user's fullname
    pub async fn update_fullname(
        &self,
        user_id: u32,
        fullname: &str,
    ) -> Result<(), AuthenticationError> {
        sqlx::query!(
            r#"UPDATE users SET fullname = ? WHERE id = ?"#,
            fullname,
            user_id
        )
        .execute(&self.0)
        .await?;

        Ok(())
    }

    /// Set a temporary password for a user
    pub async fn set_temporary_password(
        &self,
        user_id: u32,
        temp_password: &str,
    ) -> Result<(), AuthenticationError> {
        let username = self.username_by_id(user_id).await?;
        let password_hash = hash_password(ValidatedPassword::new(&username, temp_password, None)?)?;
        sqlx::query!(
            r#"UPDATE users SET password_hash = ?, needs_password_change = TRUE WHERE id = ?"#,
            password_hash,
            user_id
        )
        .execute(&self.0)
        .await?;

        Ok(())
    }

    /// Get a user by their username
    pub async fn get_by_username(
        &self,
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
                needs_password_change,
                last_activity_at as "last_activity_at: _",
                updated_at as "updated_at: _",
                created_at as "created_at: _"
            FROM users WHERE username = ?
            "#,
            username
        )
        .fetch_optional(&self.0)
        .await?;

        Ok(user)
    }

    /// Get a user by their id
    pub async fn get_by_id(&self, id: u32) -> Result<Option<User>, AuthenticationError> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT
                id as "id: u32",
                username,
                fullname,
                role,
                password_hash,
                needs_password_change,
                last_activity_at as "last_activity_at: _",
                updated_at as "updated_at: _",
                created_at as "created_at: _"
            FROM users WHERE id = ?
            "#,
            id
        )
        .fetch_optional(&self.0)
        .await?;

        Ok(user)
    }

    pub async fn list(&self) -> Result<Vec<User>, Error> {
        let users = query_as!(
            User,
            r#"SELECT
                id as "id: u32",
                username,
                fullname,
                password_hash,
                needs_password_change,
                role,
                last_activity_at as "last_activity_at: _",
                updated_at as "updated_at: _",
                created_at as "created_at: _"
            FROM users"#
        )
        .fetch_all(&self.0)
        .await?;
        Ok(users)
    }

    pub async fn username_by_id(&self, user_id: u32) -> Result<String, Error> {
        Ok(
            sqlx::query!("SELECT username FROM users WHERE id = ?", user_id)
                .fetch_one(&self.0)
                .await?
                .username,
        )
    }

    pub async fn update_last_activity_at(&self, user_id: u32) -> Result<(), Error> {
        query!(
            r#"UPDATE users SET last_activity_at = CURRENT_TIMESTAMP WHERE id = ?"#,
            user_id,
        )
        .fetch_all(&self.0)
        .await?;
        Ok(())
    }
}

impl FromRef<AppState> for Users {
    fn from_ref(input: &AppState) -> Self {
        Self(input.pool.clone())
    }
}

#[cfg(test)]
mod tests {
    use chrono::TimeDelta;
    use sqlx::SqlitePool;
    use test_log::test;

    use crate::authentication::{
        error::AuthenticationError,
        password,
        role::Role,
        session::Sessions,
        user::{User, Users},
    };

    #[test(sqlx::test)]
    async fn test_create_user(pool: SqlitePool) {
        let users = Users::new(pool.clone());

        let user = users
            .create("test_user", None, "TotallyValidP4ssW0rd", Role::Typist)
            .await
            .unwrap();

        assert_eq!(user.username, "test_user");

        let fetched_user = users.get_by_id(user.id).await.unwrap().unwrap();

        assert_eq!(user, fetched_user);

        let fetched_user = users.get_by_username("test_user").await.unwrap().unwrap();

        assert_eq!(user, fetched_user);
    }

    #[test(sqlx::test)]
    async fn test_authenticate_user(pool: SqlitePool) {
        let users = Users::new(pool.clone());

        let user = users
            .create(
                "test_user",
                Some("Full Name"),
                "TotallyValidP4ssW0rd",
                Role::Coordinator,
            )
            .await
            .unwrap();

        let authenticated_user = users
            .authenticate("test_user", "TotallyValidP4ssW0rd")
            .await
            .unwrap();

        assert_eq!(user, authenticated_user);

        let authenticated_user = users
            .authenticate("test_user", "wrong_password")
            .await
            .unwrap_err();

        assert!(matches!(
            authenticated_user,
            AuthenticationError::InvalidPassword
        ));

        let authenticated_user = users
            .authenticate("other_user", "TotallyValidP4ssW0rd")
            .await
            .unwrap_err();

        assert!(matches!(
            authenticated_user,
            AuthenticationError::UserNotFound
        ));
    }

    #[test(sqlx::test)]
    async fn test_from_session_key(pool: SqlitePool) {
        let users = Users::new(pool.clone());
        let sessions = Sessions::new(pool.clone());

        let user = users
            .create(
                "test_user",
                Some("Full Name"),
                "TotallyValidP4ssW0rd",
                Role::Administrator,
            )
            .await
            .unwrap();
        let session = sessions
            .create(user.id, TimeDelta::seconds(60))
            .await
            .unwrap();

        let fetched_user = users
            .get_by_session_key(session.session_key())
            .await
            .unwrap();

        assert_eq!(user, fetched_user);

        sessions.delete(session.session_key()).await.unwrap();

        let fetched_user = users
            .get_by_session_key(session.session_key())
            .await
            .unwrap_err();

        assert!(matches!(
            fetched_user,
            AuthenticationError::SessionKeyNotFound
        ));
    }

    #[test(sqlx::test)]
    async fn test_change_password(pool: SqlitePool) {
        let users = Users::new(pool.clone());

        let old_password = "TotallyValidP4ssW0rd";
        let new_password = "TotallyValidNewP4ssW0rd";

        let user = users
            .create(
                "test_user",
                Some("Full Name"),
                old_password,
                Role::Administrator,
            )
            .await
            .unwrap();

        users
            .update_password(user.id(), "test_user", new_password)
            .await
            .unwrap();

        let authenticated_user = users.authenticate("test_user", new_password).await.unwrap();

        assert_eq!(user.id(), authenticated_user.id());

        let authenticated_user = users
            .authenticate("test_user", old_password)
            .await
            .unwrap_err();

        assert!(matches!(
            authenticated_user,
            AuthenticationError::InvalidPassword
        ));
    }

    #[test(sqlx::test)]
    async fn test_set_temp_password(pool: SqlitePool) {
        let users = Users::new(pool.clone());

        // Create new user, password needs change
        let user = users
            .create(
                "test_user",
                Some("Full Name"),
                "TotallyValidP4ssW0rd",
                Role::Administrator,
            )
            .await
            .unwrap();

        // User should need password change
        assert!(user.needs_password_change);

        users
            .update_password(user.id(), "test_user", "temp_password")
            .await
            .unwrap();

        let user = users.get_by_id(user.id()).await.unwrap().unwrap();

        // User now shouldn't need to change their password
        assert!(!user.needs_password_change);

        // Set a temporary password via update
        let user = users
            .update(user.id(), user.fullname(), Some("temp_password"))
            .await
            .unwrap();

        // User needs to change their password again
        assert!(user.needs_password_change);
    }

    #[test(sqlx::test)]
    async fn password_hash_does_not_serialize(pool: SqlitePool) {
        let users = Users::new(pool.clone());
        let user = users
            .create(
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
}
