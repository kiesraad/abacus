CREATE TABLE polling_station_investigations
(
    id                   INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    polling_station_id   INTEGER                           NOT NULL,
    committee_session_id INTEGER                           NOT NULL,
    reason               TEXT                              NOT NULL,
    findings             TEXT                              ,

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id),
    FOREIGN KEY (committee_session_id) REFERENCES committee_sessions (id),
    CONSTRAINT unique_polling_station_committee_session UNIQUE (polling_station_id, committee_session_id)
) STRICT;
