use serde::{Deserialize, Serialize};
use sqlx::Type;
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Hash, ToSchema, Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(rename_all = "snake_case")]
pub enum Role {
    Administrator,
    Typist,
    Coordinator,
}

impl From<String> for Role {
    fn from(s: String) -> Self {
        match s.as_str() {
            "administrator" => Self::Administrator,
            "typist" => Self::Typist,
            "coordinator" => Self::Coordinator,
            _ => unreachable!(),
        }
    }
}
