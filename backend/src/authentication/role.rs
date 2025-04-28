use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

use super::{
    error::AuthenticationError,
    user::{User, Users},
};
use crate::APIError;

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
    Users: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        Admin::try_from(user).map_err(|_| AuthenticationError::Unauthorized.into())
    }
}

impl<S> FromRequestParts<S> for Coordinator
where
    Users: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        Coordinator::try_from(user).map_err(|_| AuthenticationError::Unauthorized.into())
    }
}

impl<S> FromRequestParts<S> for Typist
where
    Users: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        Typist::try_from(user).map_err(|_| AuthenticationError::Unauthorized.into())
    }
}

impl<S> FromRequestParts<S> for AdminOrCoordinator
where
    Users: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        AdminOrCoordinator::try_from(user).map_err(|_| AuthenticationError::Unauthorized.into())
    }
}
