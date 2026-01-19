mod api;

mod repository;

mod structs;

pub use self::structs::PollingStationId;

#[cfg(feature = "dev-database")]
pub(crate) use self::repository::create;
pub use self::structs::PollingStation;
#[cfg(fuzzing)]
pub use self::structs::PollingStationType;
#[cfg(all(any(feature = "dev-database", test), not(fuzzing)))]
pub(crate) use self::structs::PollingStationType;
pub(crate) use self::{
    api::{create_imported_polling_stations, router},
    repository::{duplicate_for_committee_session, get, list},
    structs::{PollingStationNumber, PollingStationRequest, PollingStationsRequest},
};
#[cfg(test)]
pub(crate) use self::{
    repository::insert_test_polling_station, structs::tests::polling_station_fixture,
};
