//! Data entry
//!
//! Contains API endpoints, structures, state machine for status tracking,
//! comparison and validation logic, and database repository for polling station data entry.

mod api;
mod comparison;
pub mod entry_number;
pub mod repository;
pub mod status;
pub mod structs;
mod validation;

pub use self::{api::*, comparison::*, structs::*, validation::*};
