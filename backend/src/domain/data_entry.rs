use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Json};
use utoipa::ToSchema;
pub use yes_no::YesNo;

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

mod yes_no {
    use super::*;

    /// Yes/No response structure for boolean questions with separate yes and no fields.
    #[derive(Serialize, Deserialize, ToSchema, Clone, Debug, Default, PartialEq, Eq, Hash)]
    #[serde(deny_unknown_fields)]
    pub struct YesNo {
        yes: bool,
        no: bool,
    }

    impl YesNo {
        pub fn new(yes: bool, no: bool) -> Self {
            Self { yes, no }
        }

        pub fn yes() -> Self {
            Self::new(true, false)
        }

        pub fn no() -> Self {
            Self::new(false, true)
        }

        pub fn both() -> Self {
            Self::new(true, true)
        }

        /// true if both `yes` and `no` are false
        pub fn is_empty(&self) -> bool {
            !self.yes && !self.no
        }

        /// true if both `yes` and `no` are true
        pub fn is_both(&self) -> bool {
            self.yes && self.no
        }

        /// Some(true) if `yes` is true and `no` is false,
        /// Some(false) if `yes` is false and `no` is true, otherwise None
        pub fn as_bool(&self) -> Option<bool> {
            match (self.yes, self.no) {
                (true, false) => Some(true),
                (false, true) => Some(false),
                _ => None,
            }
        }
    }
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
