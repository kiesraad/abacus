use crate::data_entry::Count;
use std::fmt;
use std::fmt::{Debug, Display, Formatter};

pub struct Fraction {
    numerator: u64,
    denominator: u64,
}

impl Fraction {
    pub fn from_count(numerator: Count) -> Self {
        Self::new(numerator as u64, 1)
    }

    pub fn from_u64(numerator: u64) -> Self {
        Self {
            numerator,
            denominator: 1,
        }
    }

    pub fn new(numerator: u64, denominator: u64) -> Self {
        Self {
            numerator,
            denominator,
        }
    }

    pub fn divide(&self, other: &Self) -> Self {
        Self {
            numerator: self.numerator * other.denominator,
            denominator: self.denominator * other.numerator,
        }
    }

    // divide by whole number and return the whole number
    pub fn divide_whole(&self, other: &Self) -> u64 {
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
        let whole_part = self.numerator / self.denominator;
        let remainder = self.numerator % self.denominator;
        if whole_part > 0 && remainder > 0 {
            if remainder > 0 {
                write!(f, "{} {}/{}", whole_part, remainder, self.denominator)
            } else {
                write!(f, "{}", whole_part)
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
