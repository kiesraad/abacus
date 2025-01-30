use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, Hash, ToSchema)]
#[serde(rename = "snake_case")]
pub enum Role {
    Administrator,
    Typist,
    Coordinator,
}

impl From<String> for Role {
    fn from(s: String) -> Self {
        match s.as_str() {
            "Administrator" => Self::Administrator,
            "Typist" => Self::Typist,
            "Coordinator" => Self::Coordinator,
            _ => unreachable!(),
        }
    }
}
