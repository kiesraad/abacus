use std::net::{IpAddr, Ipv4Addr, SocketAddr};

use axum::{
    extract::{ConnectInfo, FromRequestParts},
    http::request::Parts,
};
use axum_extra::{TypedHeader, extract::CookieJar, headers::UserAgent};
use cookie::Cookie;

use super::{SESSION_COOKIE_NAME, error::AuthenticationError};
use crate::APIError;

#[derive(Debug)]
pub struct RequestSessionData {
    pub user_agent: String,
    pub ip_address: IpAddr,
    pub session_cookie: Cookie<'static>,
}

impl<S> FromRequestParts<S> for RequestSessionData
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

        Ok(RequestSessionData {
            user_agent,
            ip_address,
            session_cookie: session_cookie.clone(),
        })
    }
}
