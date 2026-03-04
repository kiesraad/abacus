use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Json};
use utoipa::ToSchema;

use crate::domain::{
    data_entry_status::{DataEntryStatus, DataEntryStatusName},
    election::PGNumber,
    id::id,
    polling_station_results::count::Count,
};

id!(DataEntryId);

#[derive(Serialize, Deserialize, Clone, ToSchema, Debug, FromRow)]
#[serde(deny_unknown_fields)]
pub struct PollingStationDataEntry {
    pub id: DataEntryId,
    #[schema(value_type = DataEntryStatus)]
    pub state: Json<DataEntryStatus>,
    #[schema(value_type = String)]
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, ToSchema, Clone, Debug, PartialEq, Eq, Hash)]
#[serde(deny_unknown_fields)]
pub struct PoliticalGroupTotalVotes {
    #[schema(value_type = u32)]
    pub number: PGNumber,
    #[schema(value_type = u32)]
    pub total: Count,
}

#[derive(Serialize, Deserialize, ToSchema, Debug)]
#[serde(deny_unknown_fields)]
pub struct DataEntryStatusResponse {
    pub status: DataEntryStatusName,
}

impl From<PollingStationDataEntry> for DataEntryStatusResponse {
    fn from(data_entry: PollingStationDataEntry) -> Self {
        DataEntryStatusResponse {
            status: data_entry.state.0.status_name(),
        }
    }
}

impl From<DataEntryStatus> for DataEntryStatusResponse {
    fn from(data_entry_status: DataEntryStatus) -> Self {
        DataEntryStatusResponse {
            status: data_entry_status.status_name(),
        }
    }
}

#[cfg(test)]
pub mod tests {
    pub trait ValidDefault {
        fn valid_default() -> Self;
    }
}
