use serde::{Deserialize, Serialize};

use crate::{
    election::ElectionWithPoliticalGroups, polling_station::structs::PollingStation,
    summary::ElectionSummary,
};

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Input {
    pub election: ElectionWithPoliticalGroups,
    pub summary: ElectionSummary,
    pub polling_stations: Vec<PollingStation>,
    pub hash: String,
    pub creation_date_time: String,
}

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Bijlage1Input {
    pub election: ElectionWithPoliticalGroups,
    pub polling_station: PollingStation,
}
