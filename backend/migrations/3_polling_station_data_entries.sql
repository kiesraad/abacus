CREATE TABLE polling_station_data_entries
(
    polling_station_id INTEGER  PRIMARY KEY NOT NULL,
    state              BLOB     NOT NULL,
    updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id)
);
