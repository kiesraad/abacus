use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::domain::{
    committee_session::CommitteeSessionId, data_entry::DataEntryId, election::CommitteeCategory,
    identifier::id,
};

id!(SubCommitteeId);

pub type SubCommitteeNumber = u32;

/// Sub electoral committee base entity, independent
/// of the election, committee session and data entry.
#[derive(Serialize, Deserialize, ToSchema, Debug, Clone)]
#[serde(deny_unknown_fields)]
pub struct SubCommittee {
    pub id: SubCommitteeId,
    #[schema(value_type = u32)]
    pub number: SubCommitteeNumber,
    pub name: String,
    pub category: CommitteeCategory,
}

/// Sub electoral committee in a first committee session.
#[derive(Serialize, Deserialize, ToSchema, Debug, Clone)]
pub struct SubCommitteeFirstSession {
    pub committee_session_id: CommitteeSessionId,
    #[serde(flatten)]
    pub sub_committee: SubCommittee,
    pub data_entry_id: DataEntryId,
}
