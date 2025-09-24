CREATE TABLE polling_station_investigations
(
    polling_station_id   INTEGER PRIMARY KEY               NOT NULL,
    reason               TEXT                              NOT NULL,
    findings             TEXT                              ,
    corrected_results    INTEGER                           ,

    FOREIGN KEY (polling_station_id) REFERENCES polling_stations (id) ON DELETE CASCADE
) STRICT;
