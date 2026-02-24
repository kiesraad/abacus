CREATE TABLE polling_stations
(
    id                    INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    committee_session_id  INTEGER                           NOT NULL,
    prev_data_entry_id    INTEGER,
    data_entry_id         INTEGER,
    name                  TEXT                              NOT NULL,
    number                INTEGER                           NOT NULL,
    number_of_voters      INTEGER,
    polling_station_type  TEXT,
    address               TEXT                              NOT NULL,
    postal_code           TEXT                              NOT NULL,
    locality              TEXT                              NOT NULL,

    FOREIGN KEY (committee_session_id) REFERENCES committee_sessions (id),
    FOREIGN KEY (prev_data_entry_id) REFERENCES data_entries (id),
    FOREIGN KEY (data_entry_id) REFERENCES data_entries (id),
    CONSTRAINT number UNIQUE (committee_session_id, number)
) STRICT;
