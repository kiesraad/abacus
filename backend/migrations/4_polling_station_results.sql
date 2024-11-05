CREATE TABLE polling_station_results
(
    polling_station_id INTEGER PRIMARY KEY NOT NULL,
    data               BLOB                NOT NULL,
    created_at         INTEGER             NOT NULL DEFAULT (unixepoch()),

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id)
);
