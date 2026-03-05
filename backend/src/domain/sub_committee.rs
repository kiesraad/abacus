use serde::{Deserialize, Serialize};

use crate::domain::{
    committee_session::CommitteeSessionId, data_entry::DataEntryId, election::CommitteeCategory,
    id::id,
};

id!(SubCommitteeId);

/// Sub electoral committee base entity, independent
/// of the election, committee session and data entry.
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(deny_unknown_fields)]
pub struct SubCommittee {
    pub id: SubCommitteeId,
    pub number: String,
    pub name: String,
    pub category: CommitteeCategory,
}

/// Sub electoral committee in a first committee session.
#[derive(Debug, Clone)]
pub struct SubCommitteeFirstSession {
    pub committee_session_id: CommitteeSessionId,
    pub sub_committee: SubCommittee,
    pub data_entry_id: DataEntryId,
}
