use serde::{Deserialize, Serialize};

use crate::election::Election;
use crate::polling_station::structs::PollingStation;
use crate::summary::ElectionSummary;

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Input {
    pub election: Election,
    pub summary: ElectionSummary,
    pub polling_stations: Vec<PollingStation>,
    pub hash: String,
    pub creation_date_time: String,
}
