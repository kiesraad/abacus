use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use axum::{
    extract::{ConnectInfo, FromRequestParts},
    http::request::Parts,
};
use axum_extra::{TypedHeader, extract::CookieJar, headers::UserAgent};

use super::{SESSION_COOKIE_NAME, error::AuthenticationError};
use crate::{APIError, repository::session_repo::SessionIdentifier};

impl<S> FromRequestParts<S> for SessionIdentifier
where
    S: Send + Sync,
{
    type Rejection = APIError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let jar = CookieJar::from_headers(&parts.headers);

        let Some(session_cookie) = jar.get(SESSION_COOKIE_NAME) else {
            return Err(APIError::from(AuthenticationError::NoSessionCookie));
        };

        let user_agent = TypedHeader::<UserAgent>::from_request_parts(parts, _state)
            .await
            .ok()
            .map(|ua| ua.to_string())
            .unwrap_or_default();

        let ip_address = ConnectInfo::<SocketAddr>::from_request_parts(parts, _state)
            .await
            .ok()
            .map(|a| a.ip())
            .unwrap_or(IpAddr::V4(Ipv4Addr::UNSPECIFIED));

        Ok(SessionIdentifier {
            session_key: session_cookie.value().to_string(),
            user_agent,
            ip_address: ip_address.to_string(),
        })
    }
}
