use std::fmt;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema, Debug, Default, PartialEq, Eq)]
pub struct ValidationResults {
    pub errors: Vec<ValidationResult>,
    pub warnings: Vec<ValidationResult>,
}

impl ValidationResults {
    pub fn append(&mut self, other: &mut Self) {
        self.errors.append(&mut other.errors);
        self.warnings.append(&mut other.warnings);
    }

    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }

    pub fn has_warnings(&self) -> bool {
        !self.warnings.is_empty()
    }
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq)]
pub struct ValidationResult {
    pub fields: Vec<String>,
    pub code: ValidationResultCode,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum ValidationResultCode {
    F101,
    F201,
    F202,
    F203,
    F204,
    F301,
    F302,
    F303,
    F304,
    F305,
    F401,
    W201,
    W202,
    W203,
    W204,
    W205,
    W206,
    W207,
    W208,
    W209,
    W301,
    W302,
}

/// Validate that a value is equal to or above a certain percentage threshold of the total,
/// using only integers to avoid floating point arithmetic issues.
/// The threshold is calculated as the percentage of the total, rounded up.
/// For example, if the total is 101 and the percentage is 10, the threshold is 11.
pub fn above_percentage_threshold(value: u32, total: u32, percentage: u8) -> bool {
    if value == 0 && total == 0 {
        false
    } else {
        let threshold = (total as u64 * percentage as u64).div_ceil(100);
        value as u64 >= threshold
    }
}

#[derive(Debug, Clone)]
pub struct FieldPath {
    components: Vec<String>,
}

impl FieldPath {
    pub fn new(field: impl Into<String>) -> Self {
        Self {
            components: vec![field.into()],
        }
    }

    pub fn field(&self, field: impl Into<String>) -> Self {
        let mut path = self.clone();
        path.components.push(field.into());
        path
    }

    pub fn index(&self, index: usize) -> Self {
        let mut path = self.clone();
        path.components
            .last_mut()
            .expect("FieldPath constructed with no components")
            .push_str(&format!("[{}]", index));
        path
    }

    pub fn last(&self) -> &str {
        self.components
            .last()
            .expect("FieldPath constructed with no components")
    }
}

impl fmt::Display for FieldPath {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for (i, component) in self.components.iter().enumerate() {
            if i > 0 {
                write!(f, ".")?;
            }
            write!(f, "{}", component)?;
        }

        Ok(())
    }
}

impl From<&str> for FieldPath {
    fn from(s: &str) -> Self {
        Self {
            components: s.split(".").map(|s| s.to_owned()).collect(),
        }
    }
}

impl From<String> for FieldPath {
    fn from(s: String) -> Self {
        Self::from(&s[..])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_append() {
        let mut result1 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field1".to_string()],
                code: ValidationResultCode::F201,
            }],
            warnings: vec![],
        };

        let mut result2 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field2".to_string()],
                code: ValidationResultCode::F202,
            }],
            warnings: vec![],
        };

        result1.append(&mut result2);

        // appending should combine the errors and warnings
        assert_eq!(result1.errors.len(), 2);
        assert_eq!(result1.warnings.len(), 0);
    }

    #[test]
    fn test_above_percentage_threshold() {
        assert!(above_percentage_threshold(11, 101, 10));
        assert!(!above_percentage_threshold(10, 101, 10));
        assert!(above_percentage_threshold(10, 100, 10));

        assert!(above_percentage_threshold(10, 0, 10));
    }

    #[test]
    fn test_below_percentage_threshold() {
        assert!(!above_percentage_threshold(9, 100, 10));
        assert!(!above_percentage_threshold(0, 0, 10));
    }
}
