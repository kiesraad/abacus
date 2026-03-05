use axum::{
    extract::{FromRef, FromRequestParts, OptionalFromRequestParts},
    http::request::Parts,
};
use sqlx::SqlitePool;

use super::error::AuthenticationError;
use crate::{APIError, domain::role::Role, repository::user_repo::User};

/// Defines a user role newtype
macro_rules! user_role {
    ($(#[doc = $doc:expr])* $name:ident => $($role:pat_param)|+) => {
        $(#[doc = $doc])*
        pub struct $name(pub User);

        impl TryFrom<User> for $name {
            type Error = ();

            fn try_from(user: User) -> Result<Self, Self::Error> {
                match user.role() {
                    $($role)|+ => Ok(Self(user)),
                    _ => Err(()),
                }
            }
        }

        impl<S> FromRequestParts<S> for $name
        where
            SqlitePool: FromRef<S>,
            S: Send + Sync,
        {
            type Rejection = APIError;

            async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
                let user = <User as FromRequestParts<S>>::from_request_parts(parts, state).await?;
                $name::try_from(user).map_err(|_| AuthenticationError::Forbidden.into())
            }
        }
    };
}

user_role! {
    /// A user with the admin role
    Admin => Role::Administrator
}

user_role! {
    /// A user with any coordinator role
    Coordinator => Role::CoordinatorCSB | Role::CoordinatorGSB
}

user_role! {
    /// A user with the coordinator GSB role
    CoordinatorGSB => Role::CoordinatorGSB
}

user_role! {
    /// A user with the typist GSB role
    TypistGSB => Role::TypistGSB
}

user_role! {
    /// A user with the admin or any coordinator role
    AdminOrCoordinator => Role::Administrator | Role::CoordinatorCSB | Role::CoordinatorGSB
}

user_role! {
    /// A user with the admin or coordinator GSB role
    AdminOrCoordinatorGSB => Role::Administrator | Role::CoordinatorGSB
}

user_role! {
    /// A user with admin or GSB role
    AdminOrGSB => Role::Administrator | Role::CoordinatorGSB | Role::TypistGSB
}

/// A user with potentially no fullname or needs_password_change=true
pub struct IncompleteUser(pub User);

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
