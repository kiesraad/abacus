use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use serde::{Deserialize, Serialize};
use sqlx::{SqlitePool, Type};
use utoipa::ToSchema;

use super::error::AuthenticationError;
use crate::{APIError, repository::user_repo::User};

#[derive(
    Serialize, Deserialize, strum::Display, Clone, Copy, Debug, PartialEq, Eq, Hash, ToSchema, Type,
)]
#[serde(rename_all = "lowercase")]
#[strum(serialize_all = "lowercase")]
#[sqlx(rename_all = "snake_case")]
pub enum Role {
    Administrator,
    Typist,
    Coordinator,
}

impl From<String> for Role {
    fn from(s: String) -> Self {
        match s.as_str() {
            "administrator" => Self::Administrator,
            "typist" => Self::Typist,
            "coordinator" => Self::Coordinator,
            _ => unreachable!(),
        }
    }
}

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
