use sqlx::{FromRow, types::Json};

use crate::domain::{
    committee_session::CommitteeSessionId,
    data_entry::{DataEntryId, DataEntrySource},
    election::CommitteeCategory,
    investigation::InvestigationStatus,
    polling_station::{
        PollingStation, PollingStationFirstSession, PollingStationForSession, PollingStationId,
        PollingStationNextSession, PollingStationNumber, PollingStationType,
    },
    sub_committee::{SubCommittee, SubCommitteeFirstSession, SubCommitteeId, SubCommitteeNumber},
};

pub trait PollingStationRowLike: Sized {
    fn as_polling_station(&self) -> PollingStation;

    fn into_polling_station(self) -> PollingStation {
        self.as_polling_station()
    }

    fn as_polling_station_first_session(&self) -> PollingStationFirstSession;

    fn into_polling_station_first_session(self) -> PollingStationFirstSession {
        self.as_polling_station_first_session()
    }

    fn as_polling_station_next_session(&self) -> PollingStationNextSession;

    fn into_polling_station_next_session(self) -> PollingStationNextSession {
        self.as_polling_station_next_session()
    }

    fn as_polling_station_for_session(&self) -> PollingStationForSession;

    fn into_polling_station_for_session(self) -> PollingStationForSession {
        self.as_polling_station_for_session()
    }

    fn as_polling_station_data_source(&self) -> DataEntrySource {
        DataEntrySource::PollingStation(self.as_polling_station_for_session())
    }

    fn into_polling_station_data_source(self) -> DataEntrySource {
        self.as_polling_station_data_source()
    }
}

/// Polling station database row, matching the SQL schema
#[derive(FromRow, Debug, Clone)]
pub struct PollingStationRow {
    pub id: PollingStationId,
    pub committee_session_id: CommitteeSessionId,
    pub committee_session_number: u32,
    pub prev_data_entry_id: Option<DataEntryId>,
    pub data_entry_id: Option<DataEntryId>,
    pub investigation_state: Option<Json<InvestigationStatus>>,
    pub name: String,
    pub number: PollingStationNumber,
    pub number_of_voters: Option<u32>,
    pub polling_station_type: Option<PollingStationType>,
    pub address: String,
    pub postal_code: String,
    pub locality: String,
}

impl PollingStationRowLike for PollingStationRow {
    fn as_polling_station(&self) -> PollingStation {
        PollingStation {
            id: self.id,
            name: self.name.clone(),
            number: self.number,
            number_of_voters: self.number_of_voters,
            polling_station_type: self.polling_station_type,
            address: self.address.clone(),
            postal_code: self.postal_code.clone(),
            locality: self.locality.clone(),
        }
    }

    fn as_polling_station_first_session(&self) -> PollingStationFirstSession {
        PollingStationFirstSession {
            committee_session_id: self.committee_session_id,
            data_entry_id: self
                .data_entry_id
                .expect("first-session polling stations always have a data_entry_id"),
            polling_station: self.as_polling_station(),
        }
    }

    fn as_polling_station_next_session(&self) -> PollingStationNextSession {
        PollingStationNextSession {
            committee_session_id: self.committee_session_id,
            prev_data_entry_id: self.prev_data_entry_id,
            investigation_status: self.investigation_state.clone().map(|Json(status)| {
                match (&status, self.data_entry_id) {
                    (InvestigationStatus::ConcludedWithNewResults(_), Some(id)) => {
                        status.with_data_entry_id(id)
                    }
                    _ => status,
                }
            }),
            polling_station: self.as_polling_station(),
        }
    }

    fn as_polling_station_for_session(&self) -> PollingStationForSession {
        if self.committee_session_number > 1 {
            PollingStationForSession::Next(self.as_polling_station_next_session())
        } else {
            PollingStationForSession::First(self.as_polling_station_first_session())
        }
    }
}

/// Sub electoral committee database row, matching the SQL schema
#[derive(FromRow, Debug, Clone)]
pub struct SubCommitteeRow {
    pub id: SubCommitteeId,
    pub committee_session_id: CommitteeSessionId,
    pub data_entry_id: DataEntryId,
    pub number: SubCommitteeNumber,
    pub name: String,
    pub category: CommitteeCategory,
}

pub trait SubCommitteeRowLike: Sized {
    fn as_sub_committee(&self) -> SubCommittee;

    fn as_sub_committee_first_session(&self) -> SubCommitteeFirstSession;

    fn into_sub_committee_first_session(self) -> SubCommitteeFirstSession {
        self.as_sub_committee_first_session()
    }

    fn as_sub_committee_data_source(&self) -> DataEntrySource {
        DataEntrySource::SubCommittee(self.as_sub_committee_first_session())
    }

    fn into_sub_committee_data_source(self) -> DataEntrySource {
        self.as_sub_committee_data_source()
    }
}

impl SubCommitteeRowLike for SubCommitteeRow {
    fn as_sub_committee(&self) -> SubCommittee {
        SubCommittee {
            id: self.id,
            number: self.number,
            name: self.name.clone(),
            category: self.category,
        }
    }

    fn as_sub_committee_first_session(&self) -> SubCommitteeFirstSession {
        SubCommitteeFirstSession {
            committee_session_id: self.committee_session_id,
            data_entry_id: self.data_entry_id,
            sub_committee: self.as_sub_committee(),
        }
    }
}
