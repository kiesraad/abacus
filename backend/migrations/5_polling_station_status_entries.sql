-- Add migration script here
CREATE TABLE polling_station_status_entries
(
    polling_station_id  INTEGER NOT NULL,
    status              BLOB    NOT NULL,

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id)
);
