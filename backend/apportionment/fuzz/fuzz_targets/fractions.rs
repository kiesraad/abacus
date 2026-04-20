#![no_main]

use apportionment::Fraction;
use libfuzzer_sys::{
    arbitrary::{Arbitrary, Error, Result, Unstructured},
    fuzz_target,
};

/// Fuzzed Fractions with a numerator and denominator of any size (e.g. u16, u32, etc.)
#[derive(Debug)]
pub struct FuzzedFraction<T: Into<u64>> {
    pub numerator: T,
    pub denominator: T,
    pub fraction: Fraction,
}

impl<'a, T: Arbitrary<'a> + Into<u64> + Copy> Arbitrary<'a> for FuzzedFraction<T> {
    fn arbitrary(u: &mut Unstructured<'a>) -> Result<Self> {
        let numerator = T::arbitrary(u)?;
        let denominator = T::arbitrary(u)?;

        // prevent denominators from being 0
        if denominator.into() == 0u64 {
            return Err(Error::IncorrectFormat);
        }

        Ok(FuzzedFraction {
            numerator,
            denominator,
            fraction: Fraction::new(numerator.into(), denominator.into()),
        })
    }
}

fuzz_target!(|inputs: [FuzzedFraction<u32>; 3]| {
    let [a, b, c] = inputs;

    // if a == b, then whatever b is to c (less, equal, or greater), a must be to c
    if a.fraction == b.fraction {
        assert!(b.fraction.cmp(&c.fraction) == a.fraction.cmp(&c.fraction));
    }

    // if a < b and b <= c, then a < c
    if a.fraction < b.fraction && b.fraction <= c.fraction {
        assert!(a.fraction < c.fraction);
    }
});
