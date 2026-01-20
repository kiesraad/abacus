pub mod api;
pub mod app_error;
pub mod domain;
pub mod eml;
mod error;
#[cfg(feature = "dev-database")]
pub mod fixtures;
pub mod infra;
pub mod repository;
pub mod service;

pub use app_error::AppError;
pub use error::{APIError, ErrorResponse};
