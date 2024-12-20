CREATE TABLE polling_stations
(
    id                    INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    election_id           INTEGER                           NOT NULL,
    name                  TEXT                              NOT NULL,
    number                INTEGER                           NOT NULL,
    number_of_voters      INTEGER,
    polling_station_type  TEXT                              ,
    address               TEXT                              NOT NULL,
    postal_code           TEXT                              NOT NULL,
    locality              TEXT                              NOT NULL,

    FOREIGN KEY (election_id) REFERENCES elections (id),
    CONSTRAINT number UNIQUE (election_id, number)
);
