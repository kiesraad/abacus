macro_rules! id {
    ($identifier:ident) => {
        #[derive(
            serde::Serialize,
            serde::Deserialize,
            Clone,
            Copy,
            Debug,
            Hash,
            sqlx::Type,
            sqlx::FromRow,
            utoipa::ToSchema,
            PartialEq,
            Eq,
        )]
        #[sqlx(transparent)]
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
    };
}

pub(crate) use id;
