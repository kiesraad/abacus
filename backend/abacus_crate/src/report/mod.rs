//! Report API.
//!
//! Contains API endpoints to produce reports as PDF ('proces-verbaal')
//! and XML using the EML_NL standard.

mod api;

pub use self::api::*;

/// Default date time format for reports
pub const DEFAULT_DATE_TIME_FORMAT: &str = "%d-%m-%Y %H:%M:%S %Z";
