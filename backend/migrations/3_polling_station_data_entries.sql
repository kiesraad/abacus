CREATE TABLE polling_station_data_entries
(
    polling_station_id INTEGER,
    entry_number       INTEGER,
    data               BLOB,
    CONSTRAINT pk
        PRIMARY KEY (entry_number, polling_station_id)
    FOREIGN KEY (polling_station_id) REFERENCES polling_stations(id)
);

CREATE INDEX polling_station_id_index
    ON polling_station_data_entries (polling_station_id);