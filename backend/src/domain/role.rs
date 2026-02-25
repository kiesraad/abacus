use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

#[derive(
    Serialize,
    Deserialize,
    strum::Display,
    strum::EnumString,
    strum::VariantArray,
    Clone,
    Copy,
    Debug,
    PartialEq,
    Eq,
    Hash,
    ToSchema,
    Type,
)]
#[serde(rename_all = "snake_case")]
#[strum(serialize_all = "snake_case")]
#[sqlx(rename_all = "snake_case")]
pub enum Role {
    Administrator,
    #[serde(rename = "coordinator_gsb")]
    CoordinatorGSB,
    #[serde(rename = "coordinator_csb")]
    CoordinatorCSB,
    #[serde(rename = "typist_gsb")]
    TypistGSB,
    #[serde(rename = "typist_csb")]
    TypistCSB,
}

impl Role {
    pub(crate) fn is_administrator(&self) -> bool {
        matches!(self, Self::Administrator)
    }

    pub(crate) fn is_coordinator(&self) -> bool {
        matches!(self, Self::CoordinatorGSB | Self::CoordinatorCSB)
    }

    pub(crate) fn is_typist(&self) -> bool {
        matches!(self, Self::TypistGSB | Self::TypistCSB)
    }
}

#[cfg(test)]
mod tests {
    use std::str::FromStr;

    use strum::VariantArray;
    use test_log::test;

    use super::*;

    const EXPECTED_NAMES: [&str; 5] = [
        "administrator",
        "coordinator_gsb",
        "coordinator_csb",
        "typist_gsb",
        "typist_csb",
    ];

    #[test]
    fn from_to_string_snake_case() {
        for str in EXPECTED_NAMES {
            let role = Role::from_str(str).unwrap_or_else(|_| panic!("Could not parse {}", str));
            assert_eq!(role.to_string(), str);
        }
    }

    #[test]
    fn serde_snake_case() {
        for str in EXPECTED_NAMES {
            let quoted = format!("\"{str}\"");
            let role: Role = serde_json::from_str(&quoted).unwrap();
            assert_eq!(serde_json::to_string(&role).unwrap(), quoted);
        }
    }

    #[test]
    fn is_exactly_one() {
        for role in Role::VARIANTS {
            match (
                role.is_administrator(),
                role.is_coordinator(),
                role.is_typist(),
            ) {
                (true, false, false) | (false, true, false) | (false, false, true) => {}
                _ => panic!("Expected exactly one is_* == true for {}", role),
            }
        }
    }
}
