macro_rules! int_newtype {
    ($identifier:ident) => {
        #[derive(Clone, Copy, Debug, PartialEq, Eq)]
        pub struct $identifier(u32);

        impl From<u32> for $identifier {
            fn from(u: u32) -> Self {
                Self(u)
            }
        }

        impl std::fmt::Display for $identifier {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "{}", self.0)
            }
        }

        impl TryFrom<usize> for $identifier {
            type Error = std::num::TryFromIntError;

            fn try_from(value: usize) -> Result<Self, Self::Error> {
                Ok(Self::from(u32::try_from(value)?))
            }
        }

        impl PartialEq<u32> for $identifier {
            fn eq(&self, other: &u32) -> bool {
                self.0 == *other
            }
        }
    };
}

pub(crate) use int_newtype;

#[cfg(test)]
mod tests {
    int_newtype!(TestIntNewType);

    #[test]
    fn test_int_newtype() {
        let value = TestIntNewType::from(42);
        assert_eq!(value, 42);
        assert_eq!(value.0, 42);
    }

    #[test]
    fn test_try_from_usize() {
        let value = TestIntNewType::try_from(42_usize).unwrap();
        assert_eq!(value, 42);
    }

    #[test]
    fn test_try_from_usize_overflow() {
        // Bitshifting << 42 overflows a u32, so this should return an error
        let result = TestIntNewType::try_from((1_usize) << 42);
        assert!(result.is_err());
    }

    #[test]
    fn test_display() {
        let value = TestIntNewType::from(42);
        assert_eq!(value.to_string(), "42");
    }

    #[test]
    fn test_partial_eq() {
        let value = TestIntNewType::from(42);
        assert!(value == 42);
        assert!(value != 43);
        assert!(value == TestIntNewType::from(42));
    }
}
