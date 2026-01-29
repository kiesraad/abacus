use apportionment::Fraction;

/// Fraction with the integer part split out for display purposes
#[derive(Clone, Copy, Debug)]
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

impl From<DisplayFraction> for Fraction {
    fn from(display_fraction: DisplayFraction) -> Self {
        Self {
            numerator: display_fraction.numerator
                + display_fraction.integer * display_fraction.denominator,
            denominator: display_fraction.denominator,
        }
    }
}

impl PartialEq for DisplayFraction {
    fn eq(&self, other: &Self) -> bool {
        Fraction::from(*self) == Fraction::from(*other)
    }
}

#[cfg(test)]
mod tests {
    use super::{DisplayFraction, Fraction};

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

    #[test]
    fn test_display_fraction_eq() {
        assert_eq!(
            DisplayFraction {
                integer: 1,
                numerator: 1,
                denominator: 4
            },
            DisplayFraction {
                integer: 0,
                numerator: 10,
                denominator: 8
            }
        );
    }

    #[test]
    fn test_display_fraction_ne() {
        assert_ne!(
            DisplayFraction {
                integer: 1,
                numerator: 1,
                denominator: 4
            },
            DisplayFraction {
                integer: 0,
                numerator: 9,
                denominator: 8
            }
        );
    }
}
