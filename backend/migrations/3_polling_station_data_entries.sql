CREATE TABLE polling_station_data_entries
(
    polling_station_id INTEGER NOT NULL,
    progress           INTEGER NOT NULL,
    status             BLOB    NOT NULL,
    data               BLOB,
    client_state       BLOB,
    updated_at         INTEGER NOT NULL DEFAULT (unixepoch()),
    finalised_at       INTEGER,

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id)
);
