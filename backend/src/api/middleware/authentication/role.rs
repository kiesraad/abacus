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

/// A user with the coordinator GSB role
#[allow(unused)]
pub struct CoordinatorGSB(pub User);

/// A user with the typist GSB role
#[allow(unused)]
pub struct TypistGSB(pub User);

/// A user with the admin or any coordinator role
#[allow(unused)]
pub struct AdminOrCoordinator(pub User);

/// A user with the admin or coordinator GSB role
#[allow(unused)]
pub struct AdminOrCoordinatorGSB(pub User);

/// A user with potentially no fullname or needs_password_change=true
#[allow(unused)]
pub struct IncompleteUser(pub User);

impl TryFrom<User> for Admin {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::Administrator => Ok(Self(user)),
            _ => Err(()),
        }
    }
}

impl TryFrom<User> for CoordinatorGSB {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::CoordinatorGSB => Ok(Self(user)),
            _ => Err(()),
        }
    }
}

impl TryFrom<User> for TypistGSB {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::TypistGSB => Ok(Self(user)),
            _ => Err(()),
        }
    }
}

impl TryFrom<User> for AdminOrCoordinator {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::Administrator | Role::CoordinatorCSB | Role::CoordinatorGSB => Ok(Self(user)),
            _ => Err(()),
        }
    }
}

impl TryFrom<User> for AdminOrCoordinatorGSB {
    type Error = ();

    fn try_from(user: User) -> Result<Self, Self::Error> {
        match user.role() {
            Role::Administrator | Role::CoordinatorGSB => Ok(Self(user)),
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

impl<S> FromRequestParts<S> for CoordinatorGSB
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        CoordinatorGSB::try_from(user).map_err(|_| AuthenticationError::Forbidden.into())
    }
}

impl<S> FromRequestParts<S> for TypistGSB
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        TypistGSB::try_from(user).map_err(|_| AuthenticationError::Forbidden.into())
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

impl<S> FromRequestParts<S> for AdminOrCoordinatorGSB
where
    SqlitePool: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;

        AdminOrCoordinatorGSB::try_from(user).map_err(|_| AuthenticationError::Forbidden.into())
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

/// Implement the OptionalFromRequestParts trait for User, this allows us to extract an `Option<User>` from a request
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
