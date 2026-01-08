use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::data_entry::domain::{compare::Compare, field_path::FieldPath};

/// Yes/No response structure for boolean questions with separate yes and no fields.
#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct YesNo {
    yes: bool,
    no: bool,
}

impl YesNo {
    pub fn new(yes: bool, no: bool) -> Self {
        Self { yes, no }
    }

    pub fn yes() -> Self {
        Self::new(true, false)
    }

    pub fn no() -> Self {
        Self::new(false, true)
    }

    pub fn both() -> Self {
        Self::new(true, true)
    }

    /// true if both `yes` and `no` are false
    pub fn is_empty(&self) -> bool {
        !self.yes && !self.no
    }

    /// true if both `yes` and `no` are true
    pub fn is_both(&self) -> bool {
        self.yes && self.no
    }

    /// Some(true) if `yes` is true and `no` is false,
    /// Some(false) if `yes` is false and `no` is true, otherwise None
    pub fn as_bool(&self) -> Option<bool> {
        match (self.yes, self.no) {
            (true, false) => Some(true),
            (false, true) => Some(false),
            _ => None,
        }
    }
}

impl Compare for YesNo {
    fn compare(&self, first_entry: &Self, different_fields: &mut Vec<String>, path: &FieldPath) {
        if self != first_entry {
            different_fields.push(path.to_string());
        }
    }
}
