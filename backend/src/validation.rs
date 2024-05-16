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
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
pub struct ValidationResult {
    pub fields: Vec<String>,
    pub code: ValidationResultCode,
}

#[derive(Serialize, Deserialize, ToSchema, Debug, PartialEq, Eq)]
pub enum ValidationResultCode {
    OutOfRange,
    IncorrectTotal,
    AboveThreshold,
}

impl fmt::Display for ValidationResultCode {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ValidationResultCode::OutOfRange => write!(f, "Out of range"),
            ValidationResultCode::IncorrectTotal => write!(f, "Incorrect sum"),
            ValidationResultCode::AboveThreshold => write!(f, "Above threshold"),
        }
    }
}

pub trait Validate {
    fn validate(&self, validation_results: &mut ValidationResults, field_name: String);
}

/// Validate that a value is equal to or above a certain percentage threshold of the total,
/// using only integers to avoid floating point arithmetic issues.
/// The threshold is calculated as the percentage of the total, rounded up.
/// For example, if the total is 101 and the percentage is 10, the threshold is 11.
pub fn above_percentage_threshold(value: u32, total: u32, percentage: u8) -> bool {
    let threshold = (total as u64 * percentage as u64).div_ceil(100);
    value as u64 >= threshold
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_append() {
        let mut result1 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field1".to_string()],
                code: ValidationResultCode::OutOfRange,
            }],
            warnings: vec![],
        };

        let mut result2 = ValidationResults {
            errors: vec![ValidationResult {
                fields: vec!["field2".to_string()],
                code: ValidationResultCode::OutOfRange,
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
    }
}
