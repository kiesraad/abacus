CREATE TABLE polling_station_data_entries
(
    polling_station_id INTEGER PRIMARY KEY NOT NULL,
    state              BLOB    NOT NULL,
    updated_at         INTEGER NOT NULL DEFAULT (unixepoch()),
    finalised_at       INTEGER,

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id)
);
