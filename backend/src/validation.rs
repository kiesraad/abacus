use std::fmt;

use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, ToSchema, Debug, Default)]
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

#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ValidationResult {
    pub fields: Vec<String>,
    pub code: ValidationResultCode,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq)]
pub enum ValidationResultCode {
    F201,
    F202,
    F203,
    F204,
    F301,
    F302,
    F303,
    F304,
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
    W210,
    W301,
    W302,
    W303,
    W304,
    W305,
    W306,
}

impl fmt::Display for ValidationResultCode {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ValidationResultCode::F201 => write!(f, "F.201"),
            ValidationResultCode::F202 => write!(f, "F.202"),
            ValidationResultCode::F203 => write!(f, "F.203"),
            ValidationResultCode::F204 => write!(f, "F.204"),
            ValidationResultCode::F301 => write!(f, "F.301"),
            ValidationResultCode::F302 => write!(f, "F.302"),
            ValidationResultCode::F303 => write!(f, "F.303"),
            ValidationResultCode::F304 => write!(f, "F.304"),
            ValidationResultCode::F401 => write!(f, "F.401"),
            ValidationResultCode::W201 => write!(f, "W.201"),
            ValidationResultCode::W202 => write!(f, "W.202"),
            ValidationResultCode::W203 => write!(f, "W.203"),
            ValidationResultCode::W204 => write!(f, "W.204"),
            ValidationResultCode::W205 => write!(f, "W.205"),
            ValidationResultCode::W206 => write!(f, "W.206"),
            ValidationResultCode::W207 => write!(f, "W.207"),
            ValidationResultCode::W208 => write!(f, "W.208"),
            ValidationResultCode::W209 => write!(f, "W.209"),
            ValidationResultCode::W210 => write!(f, "W.210"),
            ValidationResultCode::W301 => write!(f, "W.301"),
            ValidationResultCode::W302 => write!(f, "W.302"),
            ValidationResultCode::W303 => write!(f, "W.303"),
            ValidationResultCode::W304 => write!(f, "W.304"),
            ValidationResultCode::W305 => write!(f, "W.305"),
            ValidationResultCode::W306 => write!(f, "W.306"),
        }
    }
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
