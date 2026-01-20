use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Json};
use utoipa::ToSchema;

use crate::{
    domain::polling_station_results::PollingStationResults, infra::audit_log::ResultDetails,
};

#[derive(Serialize, Deserialize, Clone, ToSchema, Debug, FromRow)]
#[serde(deny_unknown_fields)]
pub struct PollingStationResult {
    pub polling_station_id: u32,
    pub committee_session_id: u32,
    #[schema(value_type = PollingStationResults)]
    pub data: Json<PollingStationResults>,
    #[schema(value_type = String)]
    pub created_at: DateTime<Utc>,
}

impl From<PollingStationResult> for ResultDetails {
    fn from(value: PollingStationResult) -> Self {
        Self {
            polling_station_id: value.polling_station_id,
            committee_session_id: value.committee_session_id,
            created_at: value.created_at,
        }
    }
}
