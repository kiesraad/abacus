mod api;

mod repository;

mod structs;

#[cfg(feature = "dev-database")]
pub(crate) use self::repository::create;
#[cfg(fuzzing)]
pub use self::structs::PollingStationType;
#[cfg(all(any(feature = "dev-database", test), not(fuzzing)))]
pub(crate) use self::structs::PollingStationType;
pub use self::structs::{PollingStation, PollingStationId};
pub(crate) use self::{
    api::{create_imported_polling_stations, router},
    repository::{duplicate_for_committee_session, get, list},
    structs::{PollingStationNumber, PollingStationRequest, PollingStationsRequest},
};
#[cfg(test)]
pub(crate) use self::{
    repository::insert_test_polling_station, structs::tests::polling_station_fixture,
};
