CREATE TABLE polling_station_results
(
    polling_station_id INTEGER PRIMARY KEY NOT NULL,
    data               BLOB                NOT NULL,
    timestamp          INTEGER             NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id)
);
