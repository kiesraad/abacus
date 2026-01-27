macro_rules! id {
    ($identifier:ident) => {
        #[derive(Clone, Copy, Debug, PartialEq, Eq)]
        pub struct $identifier(u32);

        impl From<u32> for $identifier {
            fn from(u: u32) -> Self {
                Self(u)
            }
        }

        impl std::ops::Deref for $identifier {
            type Target = u32;

            fn deref(&self) -> &Self::Target {
                &self.0
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
    };
}

pub(crate) use id;
