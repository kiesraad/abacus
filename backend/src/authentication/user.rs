use axum::{
    extract::{FromRef, FromRequestParts, OptionalFromRequestParts},
    http::request::Parts,
};
use axum_extra::extract::CookieJar;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{query_as, Error, FromRow, SqlitePool};
use utoipa::ToSchema;

use crate::{APIError, AppState};

use super::{
    error::AuthenticationError,
    password::{hash_password, verify_password},
    session::Sessions,
    SESSION_COOKIE_NAME,
};

/// User object, corresponds to a row in the users table
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, FromRow, ToSchema)]
pub struct User {
    id: u32,
    username: String,
    password_hash: String,
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

        Ok(users.get_by_session_key(session_cookie.value()).await?)
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
            Ok(user) => Ok(Some(user)),
            Err(AuthenticationError::UserNotFound)
            | Err(AuthenticationError::SessionKeyNotFound) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
}

#[derive(Serialize, FromRow, ToSchema)]
#[cfg_attr(test, derive(Deserialize))]
pub struct ListedUser {
    id: u32,
    username: String,
    #[schema(value_type = String)]
    updated_at: DateTime<Utc>,
    #[schema(value_type = String)]
    created_at: DateTime<Utc>,
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
    #[allow(unused)]
    pub async fn create(
        &self,
        username: &str,
        password: &str,
    ) -> Result<User, AuthenticationError> {
        let password_hash = hash_password(password)?;

        let user = sqlx::query_as!(
            User,
            r#"INSERT INTO users (username, password_hash)
            VALUES (?, ?)
            RETURNING
                id as "id: u32",
                username,
                password_hash,
                updated_at as "updated_at: _",
                created_at as "created_at: _"
            "#,
            username,
            password_hash
        )
        .fetch_one(&self.0)
        .await?;

        Ok(user)
    }

    /// Update a user's password
    pub async fn update_password(
        &self,
        user_id: u32,
        new_password: &str,
    ) -> Result<(), AuthenticationError> {
        let password_hash = hash_password(new_password)?;

        sqlx::query!(
            r#"UPDATE users SET password_hash = ? WHERE id = ?"#,
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
                password_hash,
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
                password_hash,
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

    pub async fn list(&self) -> Result<Vec<ListedUser>, Error> {
        let users = query_as!(
            ListedUser,
            r#"SELECT
                id as "id: u32",
                username,
                updated_at as "updated_at: _",
                created_at as "created_at: _"
            FROM users"#
        )
        .fetch_all(&self.0)
        .await?;
        Ok(users)
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

    use crate::authentication::{error::AuthenticationError, session::Sessions, user::Users};

    #[test(sqlx::test)]
    async fn test_create_user(pool: SqlitePool) {
        let users = Users::new(pool.clone());

        let user = users.create("test_user", "password").await.unwrap();

        assert_eq!(user.username, "test_user");

        let fetched_user = users.get_by_id(user.id).await.unwrap().unwrap();

        assert_eq!(user, fetched_user);

        let fetched_user = users.get_by_username("test_user").await.unwrap().unwrap();

        assert_eq!(user, fetched_user);
    }

    #[test(sqlx::test)]
    async fn test_authenticate_user(pool: SqlitePool) {
        let users = Users::new(pool.clone());

        let user = users.create("test_user", "password").await.unwrap();

        let authenticated_user = users.authenticate("test_user", "password").await.unwrap();

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
            .authenticate("other_user", "password")
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

        let user = users.create("test_user", "password").await.unwrap();
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

        let user = users.create("test_user", "password").await.unwrap();

        users
            .update_password(user.id, "new_password")
            .await
            .unwrap();

        let authenticated_user = users
            .authenticate("test_user", "new_password")
            .await
            .unwrap();

        assert_eq!(user.id(), authenticated_user.id());

        let authenticated_user = users
            .authenticate("test_user", "password")
            .await
            .unwrap_err();

        assert!(matches!(
            authenticated_user,
            AuthenticationError::InvalidPassword
        ));
    }
}
