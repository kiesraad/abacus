use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Json};
use utoipa::ToSchema;

use crate::{domain::data_entry_status::DataEntryStatus, service::audit_log::DataEntryDetails};

#[derive(Serialize, Deserialize, Clone, ToSchema, Debug, FromRow, Default)]
#[serde(deny_unknown_fields)]
pub struct PollingStationDataEntry {
    pub polling_station_id: u32,
    pub committee_session_id: u32,
    #[schema(value_type = DataEntryStatus)]
    pub state: Json<DataEntryStatus>,
    #[schema(value_type = String)]
    pub updated_at: DateTime<Utc>,
}

impl From<PollingStationDataEntry> for DataEntryDetails {
    fn from(value: PollingStationDataEntry) -> Self {
        let state = value.state.0;

        Self {
            polling_station_id: value.polling_station_id,
            committee_session_id: value.committee_session_id,
            data_entry_status: state.status_name().to_string(),
            data_entry_progress: format!("{}%", state.get_progress()),
            finished_at: state.finished_at().cloned(),
            first_entry_user_id: state.get_first_entry_user_id(),
            second_entry_user_id: state.get_second_entry_user_id(),
        }
    }
}
