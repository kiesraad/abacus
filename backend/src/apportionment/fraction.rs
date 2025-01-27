use crate::data_entry::Count;
use serde::Serialize;
use std::{
    fmt::{Debug, Display, Formatter, Result},
    ops::{Add, Div, Mul, Sub},
};
use utoipa::{PartialSchema, ToSchema};

#[derive(Clone, Copy, Serialize)]
#[serde(into = "DisplayFraction")]
pub struct Fraction {
    numerator: u64,
    denominator: u64,
}

impl PartialSchema for Fraction {
    fn schema() -> utoipa::openapi::RefOr<utoipa::openapi::schema::Schema> {
        DisplayFraction::schema()
    }
}
impl ToSchema for Fraction {}

impl Fraction {
    pub const ZERO: Fraction = Fraction::new(0, 1);

    pub const fn new(numerator: u64, denominator: u64) -> Self {
        Self {
            numerator,
            denominator,
        }
    }

    /// Returns the whole number part of the fraction
    pub fn integer_part(self) -> u64 {
        self.numerator / self.denominator
    }

    /// Returns the remainder of the fraction after the integer part is removed
    pub fn fractional_part(self) -> Fraction {
        Fraction::new(self.numerator % self.denominator, self.denominator)
    }
}

impl From<u64> for Fraction {
    fn from(numerator: u64) -> Self {
        Self::new(numerator, 1)
    }
}

impl From<Count> for Fraction {
    fn from(count: Count) -> Self {
        Self::new(u64::from(count), 1)
    }
}

impl Add for Fraction {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self {
            numerator: self.numerator * other.denominator + other.numerator * self.denominator,
            denominator: self.denominator * other.denominator,
        }
    }
}

impl Sub for Fraction {
    type Output = Self;

    fn sub(self, other: Self) -> Self {
        Self {
            numerator: self.numerator * other.denominator - other.numerator * self.denominator,
            denominator: self.denominator * other.denominator,
        }
    }
}

impl Mul for Fraction {
    type Output = Self;

    fn mul(self, other: Self) -> Self {
        Self {
            numerator: self.numerator * other.numerator,
            denominator: self.denominator * other.denominator,
        }
    }
}

impl Div for Fraction {
    type Output = Self;

    fn div(self, other: Self) -> Self {
        Self {
            numerator: self.numerator * other.denominator,
            denominator: self.denominator * other.numerator,
        }
    }
}

impl PartialOrd for Fraction {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Fraction {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // compare using integer math
        let lhs = self.numerator * other.denominator;
        let rhs = self.denominator * other.numerator;
        lhs.cmp(&rhs)
    }
}

impl PartialEq for Fraction {
    fn eq(&self, other: &Self) -> bool {
        self.numerator * other.denominator == self.denominator * other.numerator
    }
}

impl Eq for Fraction {}

impl Display for Fraction {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result {
        if self.denominator == 0 {
            return write!(f, "NaN");
        }
        let integer = self.numerator / self.denominator;
        let remainder = self.numerator % self.denominator;
        if integer > 0 {
            if remainder > 0 {
                write!(f, "{} {}/{}", integer, remainder, self.denominator)
            } else {
                write!(f, "{}", integer)
            }
        } else {
            write!(f, "{}/{}", self.numerator, self.denominator)
        }
    }
}

impl Debug for Fraction {
    fn fmt(&self, f: &mut Formatter<'_>) -> Result {
        write!(f, "{}", self)
    }
}

impl PartialEq for DisplayFraction {
    fn eq(&self, other: &Self) -> bool {
        (self.integer == other.integer)
            && (self.numerator * other.denominator == self.denominator * other.numerator)
    }
}

/// Fraction with the integer part split out for display purposes
#[derive(Clone, Copy, Debug, Serialize, ToSchema)]
#[schema(as = Fraction)]
pub struct DisplayFraction {
    integer: u64,
    numerator: u64,
    denominator: u64,
}

impl From<Fraction> for DisplayFraction {
    fn from(fraction: Fraction) -> Self {
        let remainder = fraction.fractional_part();
        Self {
            integer: fraction.integer_part(),
            numerator: remainder.numerator,
            denominator: remainder.denominator,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::apportionment::fraction::Fraction;
    use test_log::test;

    #[test]
    fn test_from_count() {
        let count = 5 as Count;
        let fraction = Fraction::from(count);
        assert_eq!(fraction, Fraction::new(5, 1));
        assert_eq!(fraction.to_string(), "5")
    }

    #[test]
    fn test_from_u64() {
        let numerator = 10u64;
        let fraction = Fraction::from(numerator);
        assert_eq!(fraction, Fraction::new(10, 1));
        assert_eq!(fraction.to_string(), "10")
    }

    #[test]
    fn test_nan() {
        let fraction = Fraction::new(1, 0);
        assert_eq!(fraction.to_string(), "NaN");
    }

    #[test]
    fn test_integer_and_fractional_part_after_division() {
        let fraction = Fraction::new(11, 5);
        let other_fraction = Fraction::new(1, 2);
        let div = fraction / other_fraction;
        assert_eq!(div.integer_part(), 4u64);
        assert_eq!(div.fractional_part(), Fraction::new(2, 5));
    }

    #[test]
    fn test_add() {
        let fraction = Fraction::new(1, 3);
        let other_fraction = Fraction::new(2, 4);
        let added = fraction + other_fraction;
        assert_eq!(added, Fraction::new(10, 12));
        assert_eq!(added.to_string(), "10/12")
    }

    #[test]
    fn test_sub() {
        let fraction = Fraction::new(2, 5);
        let other_fraction = Fraction::new(1, 4);
        let subtracted = fraction - other_fraction;
        assert_eq!(subtracted, Fraction::new(3, 20));
        assert_eq!(subtracted.to_string(), "3/20")
    }

    #[test]
    fn test_mul() {
        let fraction = Fraction::new(1, 5);
        let other_fraction = Fraction::new(2, 9);
        let multiplied = fraction * other_fraction;
        assert_eq!(multiplied, Fraction::new(2, 45));
        assert_eq!(multiplied.to_string(), "2/45")
    }

    #[test]
    fn test_div() {
        let fraction = Fraction::new(11, 5);
        let other_fraction = Fraction::new(1, 2);
        let divided = fraction / other_fraction;
        assert_eq!(divided, Fraction::new(22, 5));
        assert_eq!(divided.to_string(), "4 2/5")
    }

    #[test]
    fn test_eq() {
        assert_eq!(Fraction::new(1, 4), Fraction::new(2, 8));
    }

    #[test]
    fn test_ne() {
        assert_ne!(Fraction::new(1, 4), Fraction::new(2, 4));
    }

    #[test]
    fn test_greater_than() {
        assert!(Fraction::new(1, 2) > Fraction::new(1, 3));
    }

    #[test]
    fn test_smaller_than() {
        assert!(Fraction::new(1, 3) < Fraction::new(1, 2));
    }

    #[test]
    fn test_display_fraction_integer_gt_0() {
        let fraction = DisplayFraction::from(Fraction::new(11, 5));
        assert_eq!(
            fraction,
            DisplayFraction {
                integer: 2,
                numerator: 1,
                denominator: 5
            }
        );
    }

    #[test]
    fn test_display_fraction_integer_0() {
        let fraction = DisplayFraction::from(Fraction::new(2, 5));
        assert_eq!(
            fraction,
            DisplayFraction {
                integer: 0,
                numerator: 2,
                denominator: 5
            }
        );
    }
}
