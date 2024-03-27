create table polling_station_data_entry
(
    id                 INTEGER PRIMARY KEY,
    polling_station_id INTEGER,
    entry_number       INTEGER,
    data               BLOB
);
