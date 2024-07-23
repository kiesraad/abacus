CREATE TABLE polling_station_results
(
    polling_station_id INTEGER PRIMARY KEY,
    data               BLOB,
    FOREIGN KEY (polling_station_id) REFERENCES polling_stations(id)
);
