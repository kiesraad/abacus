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

        impl PartialEq<$identifier> for u32 {
            fn eq(&self, other: &$identifier) -> bool {
                *self == other.0
            }
        }
    };
}

pub(crate) use int_newtype;
