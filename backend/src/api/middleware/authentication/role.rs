use axum::{
    extract::{FromRef, FromRequestParts, OptionalFromRequestParts},
    http::request::Parts,
};
use sqlx::SqlitePool;

use super::error::AuthenticationError;
use crate::{APIError, domain::role::Role, repository::user_repo::User};

/// A user with the admin role
#[allow(unused)]
pub struct Admin(pub User);

/// A user with the coordinator role
#[allow(unused)]
pub struct Coordinator(pub User);

/// A user with the typist role
#[allow(unused)]
pub struct Typist(pub User);

/// A user with the admin or coordinator role
#[allow(unused)]
pub struct AdminOrCoordinator(pub User);

/// A user with potentially no fullname or needs_password_change=true
#[allow(unused)]
pub struct IncompleteUser(pub User);

impl AdminOrCoordinator {
    /// Returns true if the user is an administrator
    pub fn is_administrator(&self) -> bool {
        self.0.role() == Role::Administrator
    }

    /// Returns true if the user is a coordinator
    pub fn is_coordinator(&self) -> bool {
        self.0.role() == Role::Coordinator
    }
}

impl TryFrom<User> for Admin {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::Administrator => Ok(Self(user)),
            _ => Err(()),
        }
    }
}

impl TryFrom<User> for Coordinator {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::Coordinator => Ok(Self(user)),
            _ => Err(()),
        }
    }
}

impl TryFrom<User> for Typist {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::Typist => Ok(Self(user)),
            _ => Err(()),
        }
    }
}

impl TryFrom<User> for AdminOrCoordinator {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::Administrator | Role::Coordinator => Ok(Self(user)),
            _ => Err(()),
        }
    }
}

impl<S> FromRequestParts<S> for Admin
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        Admin::try_from(user).map_err(|_| AuthenticationError::Forbidden.into())
    }
}

impl<S> FromRequestParts<S> for Coordinator
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        Coordinator::try_from(user).map_err(|_| AuthenticationError::Forbidden.into())
    }
}

impl<S> FromRequestParts<S> for Typist
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        Typist::try_from(user).map_err(|_| AuthenticationError::Forbidden.into())
    }
}

impl<S> FromRequestParts<S> for AdminOrCoordinator
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        AdminOrCoordinator::try_from(user).map_err(|_| AuthenticationError::Forbidden.into())
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

        if user.fullname().is_some() && !user.needs_password_change() {
            return Err(AuthenticationError::UserAlreadySetup.into());
        }

        Ok(IncompleteUser(user.clone()))
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

        if user.fullname().is_none() || user.needs_password_change() {
            return Err(AuthenticationError::Unauthenticated.into());
        }

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
