CREATE TABLE polling_station_data_entries
(
    polling_station_id   INTEGER  NOT NULL,
    committee_session_id INTEGER  NOT NULL,
    state                TEXT     NOT NULL,
    updated_at           TEXT     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id),
    FOREIGN KEY (committee_session_id) REFERENCES committee_sessions (id),
    CONSTRAINT unique_polling_station_committee_session UNIQUE (polling_station_id, committee_session_id)
) STRICT;
