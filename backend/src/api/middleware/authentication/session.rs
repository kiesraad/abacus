use axum::{extract::OptionalFromRequestParts, http::request::Parts};
use axum_extra::extract::cookie::Cookie;
use cookie::CookieBuilder;

use crate::{
    APIError,
    api::middleware::authentication::{SESSION_COOKIE_NAME, SESSION_LIFE_TIME},
    repository::session_repo::Session,
};

impl<S> OptionalFromRequestParts<S> for Session
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> Result<Option<Self>, Self::Rejection> {
        Ok(parts.extensions.get::<Session>().cloned())
    }
}

impl Session {
    /// Get a cookie containing this session key
    pub(crate) fn get_cookie(&self) -> Cookie<'static> {
        CookieBuilder::new(SESSION_COOKIE_NAME, self.session_key().to_owned())
            .max_age(cookie::time::Duration::seconds(
                SESSION_LIFE_TIME.num_seconds(),
            ))
            .build()
            .clone()
    }
}
