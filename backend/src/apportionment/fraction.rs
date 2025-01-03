use crate::data_entry::Count;
use std::fmt;
use std::fmt::{Debug, Display, Formatter};

pub struct Fraction {
    numerator: u64,
    denominator: u64,
}

impl Fraction {
    pub fn new(numerator: u64, denominator: u64) -> Self {
        Self {
            numerator,
            denominator,
        }
    }

    pub fn from_count(numerator: Count) -> Self {
        Self::new(numerator as u64, 1)
    }

    pub fn from_u64(numerator: u64) -> Self {
        Self::new(numerator, 1)
    }

    pub fn divide(&self, other: &Self) -> Self {
        Self {
            numerator: self.numerator * other.denominator,
            denominator: self.denominator * other.numerator,
        }
    }

    // divide and return the whole number (integer division)
    pub fn divide_and_return_whole_number(&self, other: &Self) -> u64 {
        (self.numerator * other.denominator) / (self.denominator * other.numerator)
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
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        if self.denominator == 0 {
            return write!(f, "NaN");
        }
        let whole_number = self.numerator / self.denominator;
        let remainder = self.numerator % self.denominator;
        if whole_number > 0 {
            if remainder > 0 {
                write!(f, "{} {}/{}", whole_number, remainder, self.denominator)
            } else {
                write!(f, "{}", whole_number)
            }
        } else {
            write!(f, "{}/{}", self.numerator, self.denominator)
        }
    }
}

impl Debug for Fraction {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::apportionment::fraction::Fraction;

    #[test]
    fn test_from_count() {
        let count = 5 as Count;
        let fraction = Fraction::from_count(count);
        assert_eq!(fraction, Fraction::new(5, 1));
        assert_eq!(fraction.to_string(), "5")
    }

    #[test]
    fn test_from_u64() {
        let numerator = 10u64;
        let fraction = Fraction::from_u64(numerator);
        assert_eq!(fraction, Fraction::new(10, 1));
        assert_eq!(fraction.to_string(), "10")
    }

    #[test]
    fn test_divide_whole_number_larger_than_zero() {
        let fraction = Fraction::new(11, 5);
        let other_fraction = Fraction::new(1, 2);
        let divided = fraction.divide(&other_fraction);
        assert_eq!(divided, Fraction::new(22, 5));
        assert_eq!(divided.to_string(), "4 2/5")
    }

    #[test]
    fn test_divide_whole_number_smaller_than_zero() {
        let fraction = Fraction::new(1, 5);
        let other_fraction = Fraction::new(2, 9);
        let divided = fraction.divide(&other_fraction);
        assert_eq!(divided, Fraction::new(9, 10));
        assert_eq!(divided.to_string(), "9/10")
    }

    #[test]
    fn test_divide_and_return_whole_number() {
        let fraction = Fraction::new(11, 5);
        let other_fraction = Fraction::new(1, 2);
        assert_eq!(
            fraction.divide_and_return_whole_number(&other_fraction),
            4u64
        );
    }

    #[test]
    fn test_nan() {
        let fraction = Fraction::new(1, 0);
        assert_eq!(fraction.to_string(), "NaN");
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
}
