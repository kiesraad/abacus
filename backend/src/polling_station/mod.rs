mod api;

mod repository;

mod structs;

#[cfg(feature = "dev-database")]
pub(crate) use self::repository::create_polling_station;
pub use self::structs::PollingStation;
#[cfg(fuzzing)]
pub use self::structs::PollingStationType;
#[cfg(all(any(feature = "dev-database", test), not(fuzzing)))]
pub(crate) use self::structs::PollingStationType;
pub(crate) use self::{
    api::{create_imported_polling_stations, router},
    repository::{duplicate_for_committee_session, get_polling_station, list_polling_stations},
    structs::{PollingStationRequest, PollingStationsRequest},
};
#[cfg(test)]
pub(crate) use self::{
    repository::insert_test_polling_station, structs::tests::polling_station_fixture,
};
