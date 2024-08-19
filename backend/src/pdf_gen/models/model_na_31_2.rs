use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Input {
    pub aanduiding_verkiezing: String,
    pub datum: String,
    pub plek: String,
}
