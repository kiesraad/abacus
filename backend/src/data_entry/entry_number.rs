use serde::{Deserialize, Serialize};
use sqlx::Sqlite;
use std::fmt::Display;

#[derive(Debug, Copy, Clone, Serialize, PartialEq, Eq)]
pub enum EntryNumber {
    FirstEntry,
    SecondEntry,
}

#[derive(Debug)]
pub struct InvalidEntryNumberError(u8);

impl Display for InvalidEntryNumberError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "invalid entry number `{}`", self.0)
    }
}

impl TryFrom<u8> for EntryNumber {
    type Error = InvalidEntryNumberError;
    fn try_from(n: u8) -> Result<Self, Self::Error> {
        match n {
            1 => Ok(Self::FirstEntry),
            2 => Ok(Self::SecondEntry),
            _ => Err(InvalidEntryNumberError(n)),
        }
    }
}

impl<'de> Deserialize<'de> for EntryNumber {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let n = u8::deserialize(deserializer)?;
        Self::try_from(n).map_err(serde::de::Error::custom)
    }
}

impl<'q> sqlx::Encode<'q, Sqlite> for EntryNumber {
    fn encode_by_ref(
        &self,
        buf: &mut <Sqlite as sqlx::Database>::ArgumentBuffer<'q>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        let n: u8 = match self {
            EntryNumber::FirstEntry => 1,
            EntryNumber::SecondEntry => 2,
        };
        n.encode(buf)
    }
}

impl sqlx::Type<Sqlite> for EntryNumber {
    fn type_info() -> <Sqlite as sqlx::Database>::TypeInfo {
        u8::type_info()
    }
}
