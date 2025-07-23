use serde::{Deserialize, Serialize};

use crate::{
    committee_session::CommitteeSession, election::ElectionWithPoliticalGroups,
    polling_station::structs::PollingStation, summary::ElectionSummary,
};

#[derive(Serialize, Deserialize)]
pub struct ModelNa31_2Input {
    pub committee_session: CommitteeSession,
    pub election: ElectionWithPoliticalGroups,
    pub summary: ElectionSummary,
    pub polling_stations: Vec<PollingStation>,
    pub hash: String,
    pub creation_date_time: String,
}
