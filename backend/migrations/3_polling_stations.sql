CREATE TABLE polling_stations
(
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    election_id           INTEGER NOT NULL,
    name                  TEXT NOT NULL,
    number                INTEGER NOT NULL,
    voter_amount          INTEGER,
    polling_station_type  TEXT CHECK( polling_station_type IN ('vaste_locatie', 'bijzonder', 'mobiel') ) NOT NULL,
    street                TEXT NOT NULL,
    housenumber           TEXT NOT NULL,
    addition              TEXT,
    postal_code           TEXT NOT NULL,
    locality              TEXT NOT NULL,

    FOREIGN KEY (election_id) REFERENCES elections(id)
);
