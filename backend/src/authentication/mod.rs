use std::time::Duration;

mod error;
mod handlers;
mod password;
mod session;
mod user;
mod util;

pub use error::AuthenticationError;
pub use handlers::{login, logout};

/// Session life time, for both cookie and database
pub const SESSION_LIFE_TIME: Duration = Duration::from_secs(60 * 60 * 2);

/// Session cookie name
pub const SESSION_COOKIE_NAME: &str = "ABACUS_SESSION";

/// Only send cookies over a secure (https) connection
pub const SECURE_COOKIES: bool = false;
